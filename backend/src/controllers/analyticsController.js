const Order = require('../models/Order')
const Product = require('../models/Product')
const User = require('../models/User')
const Payment = require('../models/Payment')
const {
  validateAnalyticsRange,
  validateLimit,
  generateDateSeries,
} = require('../validators/analyticsValidator')

// Established TrendVolt inventory convention: stock <= 5 represents low-inventory alert (see ProductDetailsPage)
const LOW_STOCK_THRESHOLD = 5

// ─── 1. Overview Analytics ──────────────────────────────────────────────────
// GET /api/analytics/overview
const getOverviewAnalytics = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate, isMonthly, dateFormat } = rangeValidation

  try {
    const [
      revenueAgg,
      newCustomers,
      paymentAgg,
      orderStatusAgg,
      trendAgg,
      customerTrendAgg,
    ] = await Promise.all([
      // A. Verified Revenue & Paid Orders (paymentStatus === 'paid' && orderStatus !== 'cancelled')
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'paid',
            orderStatus: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            paidOrders: { $sum: 1 },
          },
        },
      ]),

      // B. New Customers in range (role === 'customer')
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: startDate, $lte: endDate },
      }),

      // C. Payment Attempts & Status Breakdown
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // D. Fulfillment Status Counts & Cancelled Count (All orders in range)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$orderStatus',
            count: { $sum: 1 },
          },
        },
      ]),

      // E. Daily / Monthly Revenue & Order Trend
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'paid',
            orderStatus: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt',
                timezone: '+05:30',
              },
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),

      // F. Daily / Monthly Customer Acquisition Trend
      User.aggregate([
        {
          $match: {
            role: 'customer',
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt',
                timezone: '+05:30',
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
    ])

    // Compute Primary KPIs
    const totalRevenue =
      revenueAgg.length > 0 && typeof revenueAgg[0].totalRevenue === 'number'
        ? Number(revenueAgg[0].totalRevenue.toFixed(2))
        : 0
    const paidOrders = revenueAgg.length > 0 ? revenueAgg[0].paidOrders : 0
    const averageOrderValue =
      paidOrders > 0 ? Number((totalRevenue / paidOrders).toFixed(2)) : 0

    // Compute Payment Performance
    let totalAttempts = 0
    let successful = 0
    let failed = 0
    let pending = 0

    paymentAgg.forEach((item) => {
      totalAttempts += item.count
      if (item._id === 'successful') {
        successful = item.count
      } else if (item._id === 'failed') {
        failed = item.count
      } else if (item._id === 'pending') {
        pending = item.count
      }
    })

    const paymentSuccessRate =
      totalAttempts > 0
        ? Number(((successful / totalAttempts) * 100).toFixed(2))
        : 0

    // Compute Fulfillment Status Pipeline
    const fulfillment = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
    orderStatusAgg.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(fulfillment, item._id)) {
        fulfillment[item._id] = item.count
      }
    })

    // Continuous IST Date Series Alignment
    const dateSeries = generateDateSeries(startDate, endDate, isMonthly)

    const trendMap = new Map()
    trendAgg.forEach((item) => {
      trendMap.set(item._id, {
        revenue: Number(item.revenue.toFixed(2)),
        orders: item.orders,
      })
    })

    const userTrendMap = new Map()
    customerTrendAgg.forEach((item) => {
      userTrendMap.set(item._id, item.count)
    })

    // Separate trends for revenue, orders, and customers
    const trends = {
      revenue: dateSeries.map((dateStr) => ({
        date: dateStr,
        value: trendMap.get(dateStr)?.revenue || 0,
        revenue: trendMap.get(dateStr)?.revenue || 0,
      })),
      orders: dateSeries.map((dateStr) => ({
        date: dateStr,
        value: trendMap.get(dateStr)?.orders || 0,
        orders: trendMap.get(dateStr)?.orders || 0,
      })),
      customers: dateSeries.map((dateStr) => ({
        date: dateStr,
        value: userTrendMap.get(dateStr) || 0,
        count: userTrendMap.get(dateStr) || 0,
      })),
    }

    // Merged trend for table/relative-bar rendering
    const trend = dateSeries.map((dateStr) => {
      const match = trendMap.get(dateStr)
      return {
        date: dateStr,
        revenue: match ? match.revenue : 0,
        orders: match ? match.orders : 0,
      }
    })

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      kpis: {
        revenue: totalRevenue,
        totalRevenue,
        orders: paidOrders,
        paidOrders,
        averageOrderValue,
        newCustomers,
        paymentSuccessRate,
        cancelledOrders: fulfillment.cancelled,
      },
      trends,
      trend,
      fulfillment,
      fulfillmentStatus: fulfillment,
      payments: {
        totalAttempts,
        successful,
        failed,
        pending,
        successRate: paymentSuccessRate,
        paymentSuccessRate,
      },
    })
  } catch {
    return res.status(500).json({ success: false, message: 'Server error retrieving overview analytics' })
  }
}

// ─── 2. Product Performance & Catalog Health ────────────────────────────────
// GET /api/analytics/products
const getProductAnalytics = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const limitValidation = validateLimit(req.query.limit)
  if (!limitValidation.isValid) {
    return res.status(400).json({ success: false, message: limitValidation.message })
  }

  const { range, startDate, endDate } = rangeValidation
  const limit = limitValidation.limit

  try {
    const [salesFacetResult, catalogHealthAgg] = await Promise.all([
      // Top products by units & revenue from Order.items snapshot (paid, non-cancelled orders)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'paid',
            orderStatus: { $ne: 'cancelled' },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: { $ifNull: ['$items.product', '$items.name'] },
            productId: { $first: '$items.product' },
            name: { $first: '$items.name' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
          },
        },
        {
          $facet: {
            topByUnits: [
              { $sort: { unitsSold: -1, revenue: -1 } },
              { $limit: limit },
              {
                $project: {
                  _id: 0,
                  productId: 1,
                  name: 1,
                  unitsSold: 1,
                  revenue: { $round: ['$revenue', 2] },
                },
              },
            ],
            topByRevenue: [
              { $sort: { revenue: -1, unitsSold: -1 } },
              { $limit: limit },
              {
                $project: {
                  _id: 0,
                  productId: 1,
                  name: 1,
                  unitsSold: 1,
                  revenue: { $round: ['$revenue', 2] },
                },
              },
            ],
          },
        },
      ]),

      // Catalog Health (Product collection)
      Product.aggregate([
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
            outOfStock: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$isActive', true] }, { $lte: ['$stock', 0] }] },
                  1,
                  0,
                ],
              },
            },
            lowStock: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$isActive', true] },
                      { $gt: ['$stock', 0] },
                      { $lte: ['$stock', LOW_STOCK_THRESHOLD] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ])

    const topByUnits = salesFacetResult[0]?.topByUnits || []
    const topByRevenue = salesFacetResult[0]?.topByRevenue || []

    const rawCatalog = catalogHealthAgg[0] || {}
    const catalogHealth = {
      active: rawCatalog.active || 0,
      inactive: rawCatalog.inactive || 0,
      outOfStock: rawCatalog.outOfStock || 0,
      lowStock: rawCatalog.lowStock || 0,
    }

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      topByUnits,
      topByRevenue,
      catalogHealth,
    })
  } catch {
    return res.status(500).json({ success: false, message: 'Server error retrieving product analytics' })
  }
}

// ─── 3. Customer Retention & Acquisition Analytics ──────────────────────────
// GET /api/analytics/customers
const getCustomerAnalytics = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate, isMonthly, dateFormat } = rangeValidation

  try {
    const [
      totalCustomers,
      activeCustomers,
      newCustomers,
      customerOrderAgg,
      newCustomersTrendAgg,
    ] = await Promise.all([
      // Lifetime customer account count (role === 'customer')
      User.countDocuments({ role: 'customer' }),

      // Active customer accounts
      User.countDocuments({ role: 'customer', isActive: true }),

      // New customer registrations in range
      User.countDocuments({
        role: 'customer',
        createdAt: { $gte: startDate, $lte: endDate },
      }),

      // Customer order frequency in range (verified paid, non-cancelled orders by customer role)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'paid',
            orderStatus: { $ne: 'cancelled' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        { $unwind: '$userInfo' },
        {
          $match: {
            'userInfo.role': 'customer',
          },
        },
        {
          $group: {
            _id: '$user',
            orderCount: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
          },
        },
      ]),

      // New customers acquisition trend
      User.aggregate([
        {
          $match: {
            role: 'customer',
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt',
                timezone: '+05:30',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ])

    const customersWithPaidOrders = customerOrderAgg.length
    const repeatCustomers = customerOrderAgg.filter((c) => c.orderCount > 1).length
    const repeatCustomerRate =
      customersWithPaidOrders > 0
        ? Number(((repeatCustomers / customersWithPaidOrders) * 100).toFixed(2))
        : 0

    // Continuous date series for new customer acquisition
    const dateSeries = generateDateSeries(startDate, endDate, isMonthly)
    const userTrendMap = new Map()
    newCustomersTrendAgg.forEach((item) => {
      userTrendMap.set(item._id, item.count)
    })

    const newCustomersTrend = dateSeries.map((dateStr) => ({
      date: dateStr,
      count: userTrendMap.get(dateStr) || 0,
      value: userTrendMap.get(dateStr) || 0,
    }))

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      newCustomersTrend,
      totalCustomers,
      activeCustomers,
      newCustomers,
      customersWithPaidOrders,
      repeatCustomers,
      repeatCustomerRate,
      customers: {
        totalCustomers,
        activeCustomers,
        newCustomers,
        customersWithPaidOrders,
        repeatCustomers,
        repeatCustomerRate,
        newCustomersTrend,
      },
    })
  } catch {
    return res.status(500).json({ success: false, message: 'Server error retrieving customer analytics' })
  }
}

// ─── 4. Coupon Impact & Usage Analytics ─────────────────────────────────────
// GET /api/analytics/coupons
const getCouponAnalytics = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate } = rangeValidation

  try {
    const couponAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid',
          orderStatus: { $ne: 'cancelled' },
          'coupon.code': { $ne: null, $exists: true, $nin: ['', null] },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                ordersUsingCoupons: { $sum: 1 },
                totalDiscount: {
                  $sum: { $ifNull: ['$coupon.discountAmount', '$discount'] },
                },
                couponAttributedRevenue: { $sum: '$totalAmount' },
              },
            },
          ],
          topCoupons: [
            {
              $group: {
                _id: '$coupon.code',
                uses: { $sum: 1 },
                totalDiscount: {
                  $sum: { $ifNull: ['$coupon.discountAmount', '$discount'] },
                },
                revenue: { $sum: '$totalAmount' },
              },
            },
            { $sort: { uses: -1, revenue: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 0,
                code: '$_id',
                uses: 1,
                totalDiscount: { $round: ['$totalDiscount', 2] },
                revenue: { $round: ['$revenue', 2] },
              },
            },
          ],
        },
      },
    ])

    const summary = couponAgg[0]?.summary[0] || {}
    const topCoupons = couponAgg[0]?.topCoupons || []
    const ordersWithCoupon = summary.ordersUsingCoupons || 0
    const totalDiscountGiven = summary.totalDiscount ? Number(summary.totalDiscount.toFixed(2)) : 0
    const couponAttributedRevenue = summary.couponAttributedRevenue
      ? Number(summary.couponAttributedRevenue.toFixed(2))
      : 0

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      ordersWithCoupon,
      ordersUsingCoupons: ordersWithCoupon,
      totalDiscountGiven,
      totalDiscount: totalDiscountGiven,
      couponAttributedRevenue,
      topCoupons,
      coupons: {
        ordersWithCoupon,
        ordersUsingCoupons: ordersWithCoupon,
        totalDiscountGiven,
        totalDiscount: totalDiscountGiven,
        couponAttributedRevenue,
        topCoupons,
      },
    })
  } catch {
    return res.status(500).json({ success: false, message: 'Server error retrieving coupon analytics' })
  }
}

// ─── 5. Payment Performance Analytics (Direct Endpoint) ─────────────────────
// GET /api/analytics/payments
const getPaymentAnalytics = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate } = rangeValidation

  try {
    const paymentAgg = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ])

    let totalAttempts = 0
    let successful = 0
    let failed = 0
    let pending = 0

    paymentAgg.forEach((item) => {
      totalAttempts += item.count
      if (item._id === 'successful') {
        successful = item.count
      } else if (item._id === 'failed') {
        failed = item.count
      } else if (item._id === 'pending') {
        pending = item.count
      }
    })

    const paymentSuccessRate =
      totalAttempts > 0
        ? Number(((successful / totalAttempts) * 100).toFixed(2))
        : 0

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      payments: {
        totalAttempts,
        successful,
        failed,
        pending,
        successRate: paymentSuccessRate,
        paymentSuccessRate,
      },
    })
  } catch {
    return res.status(500).json({ success: false, message: 'Server error retrieving payment analytics' })
  }
}

module.exports = {
  getOverviewAnalytics,
  getProductAnalytics,
  getCustomerAnalytics,
  getCouponAnalytics,
  getPaymentAnalytics,
}
