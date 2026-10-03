const Order = require('../models/Order')
const Product = require('../models/Product')
const {
  validateAnalyticsRange,
  generateDateSeries,
} = require('../validators/analyticsValidator')

// Clamps pagination / query limit safely (default: 50, bounds: 1..100)
function clampLimit(queryLimit, defaultLimit = 50, maxLimit = 100) {
  if (queryLimit === undefined || queryLimit === null || queryLimit === '') {
    return defaultLimit
  }
  const parsed = parseInt(queryLimit, 10)
  if (isNaN(parsed) || parsed < 1) return defaultLimit
  return Math.min(parsed, maxLimit)
}

// ─── 1. Product Performance ─────────────────────────────────────────────────
// GET /api/sales-insights/products
// Returns product-level sales metrics, catalog enrichment, and contribution %
const getProductSalesPerformance = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate } = rangeValidation
  const limit = clampLimit(req.query.limit, 50, 100)
  const sortBy = ['units', 'orders', 'revenue'].includes(req.query.sortBy)
    ? req.query.sortBy
    : 'revenue'
  const sortDirection = req.query.sortOrder === 'asc' ? 1 : -1

  const orderMatch = {
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'paid',
    orderStatus: { $ne: 'cancelled' },
  }

  try {
    const [overallSummary, productSalesAgg] = await Promise.all([
      // Overall qualifying total product revenue and units in selected window
      Order.aggregate([
        { $match: orderMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$items.subtotal' },
            totalUnits: { $sum: '$items.quantity' },
            uniqueOrders: { $addToSet: '$_id' },
          },
        },
      ]),

      // Product-level aggregation with order grouping to avoid double-counting orderCount
      Order.aggregate([
        { $match: orderMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              product: { $ifNull: ['$items.product', '$items.name'] },
              order: '$_id',
            },
            productId: { $first: '$items.product' },
            historicalName: { $first: '$items.name' },
            historicalImage: { $first: { $arrayElemAt: ['$items.images', 0] } },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
          },
        },
        {
          $group: {
            _id: '$_id.product',
            productId: { $first: '$productId' },
            historicalName: { $first: '$historicalName' },
            historicalImage: { $first: '$historicalImage' },
            unitsSold: { $sum: '$unitsSold' },
            revenue: { $sum: '$revenue' },
            orderCount: { $sum: 1 },
          },
        },
        // Enrich with live product catalog metadata
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'catalog',
          },
        },
        {
          $unwind: {
            path: '$catalog',
            preserveNullAndEmptyArrays: true,
          },
        },
      ]),
    ])

    const totalProductRevenue = overallSummary[0]?.totalRevenue || 0
    const totalProductUnits = overallSummary[0]?.totalUnits || 0
    const totalQualifyingOrders = overallSummary[0]?.uniqueOrders?.length || 0

    // Format and calculate ASP and contribution %
    const formattedProducts = productSalesAgg.map((item) => {
      const rev = Number(item.revenue || 0)
      const units = Number(item.unitsSold || 0)
      const orders = Number(item.orderCount || 0)
      const asp = units > 0 ? Number((rev / units).toFixed(2)) : 0
      const contribution =
        totalProductRevenue > 0
          ? Number(((rev / totalProductRevenue) * 100).toFixed(2))
          : 0

      return {
        productId: item.productId ? String(item.productId) : null,
        name: item.catalog?.name || item.historicalName || 'Product',
        image: item.catalog?.images?.[0] || item.historicalImage || null,
        department: item.catalog?.department || null,
        category: item.catalog?.category || 'fashion',
        subcategory: item.catalog?.subcategory || null,
        brand: item.catalog?.brand || 'Unbranded',
        currentStock: typeof item.catalog?.stock === 'number' ? item.catalog.stock : null,
        isActive: typeof item.catalog?.isActive === 'boolean' ? item.catalog.isActive : null,
        unitsSold: units,
        orderCount: orders,
        revenue: Number(rev.toFixed(2)),
        averageSellingPrice: asp,
        salesContributionPercentage: contribution,
      }
    })

    // Sort according to user preference
    formattedProducts.sort((a, b) => {
      if (sortBy === 'units') {
        return (a.unitsSold - b.unitsSold) * sortDirection
      }
      if (sortBy === 'orders') {
        return (a.orderCount - b.orderCount) * sortDirection
      }
      return (a.revenue - b.revenue) * sortDirection
    })

    const paginatedProducts = formattedProducts.slice(0, limit)

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalRevenue: Number(totalProductRevenue.toFixed(2)),
        totalUnits: totalProductUnits,
        totalOrders: totalQualifyingOrders,
        uniqueProductsSold: formattedProducts.length,
      },
      products: paginatedProducts,
      totalCount: formattedProducts.length,
    })
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving product sales performance',
    })
  }
}

// ─── 2. Category & Subcategory Performance ──────────────────────────────────
// GET /api/sales-insights/categories
// Aggregates qualifying sales by department, category, and subcategory
const getCategorySalesPerformance = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate } = rangeValidation

  const orderMatch = {
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'paid',
    orderStatus: { $ne: 'cancelled' },
  }

  try {
    const [overallSummary, categorySalesAgg] = await Promise.all([
      Order.aggregate([
        { $match: orderMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$items.subtotal' },
            totalUnits: { $sum: '$items.quantity' },
          },
        },
      ]),

      Order.aggregate([
        { $match: orderMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              product: { $ifNull: ['$items.product', '$items.name'] },
              order: '$_id',
            },
            productId: { $first: '$items.product' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'catalog',
          },
        },
        {
          $unwind: {
            path: '$catalog',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              department: { $ifNull: ['$catalog.department', 'unassigned'] },
              category: { $ifNull: ['$catalog.category', 'fashion'] },
              subcategory: { $ifNull: ['$catalog.subcategory', 'general'] },
            },
            unitsSold: { $sum: '$unitsSold' },
            revenue: { $sum: '$revenue' },
            orderIds: { $addToSet: '$_id.order' },
            productIds: { $addToSet: '$_id.product' },
          },
        },
        {
          $project: {
            _id: 0,
            department: '$_id.department',
            category: '$_id.category',
            subcategory: '$_id.subcategory',
            unitsSold: 1,
            revenue: { $round: ['$revenue', 2] },
            orderCount: { $size: '$orderIds' },
            productCount: { $size: '$productIds' },
          },
        },
        { $sort: { revenue: -1, unitsSold: -1 } },
      ]),
    ])

    const totalRevenue = overallSummary[0]?.totalRevenue || 0
    const totalUnits = overallSummary[0]?.totalUnits || 0

    const categories = categorySalesAgg.map((cat) => ({
      department: cat.department,
      category: cat.category,
      subcategory: cat.subcategory,
      unitsSold: cat.unitsSold,
      orderCount: cat.orderCount,
      productCount: cat.productCount,
      revenue: Number(cat.revenue.toFixed(2)),
      salesContributionPercentage:
        totalRevenue > 0
          ? Number(((cat.revenue / totalRevenue) * 100).toFixed(2))
          : 0,
    }))

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalUnits,
        categoriesCount: categories.length,
      },
      categories,
    })
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving category sales performance',
    })
  }
}

// ─── 3. Brand Performance ───────────────────────────────────────────────────
// GET /api/sales-insights/brands
// Aggregates qualifying sales by brand, units, orders, revenue, contribution
const getBrandSalesPerformance = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate } = rangeValidation

  const orderMatch = {
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'paid',
    orderStatus: { $ne: 'cancelled' },
  }

  try {
    const [overallSummary, brandSalesAgg] = await Promise.all([
      Order.aggregate([
        { $match: orderMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$items.subtotal' },
            totalUnits: { $sum: '$items.quantity' },
          },
        },
      ]),

      Order.aggregate([
        { $match: orderMatch },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              product: { $ifNull: ['$items.product', '$items.name'] },
              order: '$_id',
            },
            productId: { $first: '$items.product' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'catalog',
          },
        },
        {
          $unwind: {
            path: '$catalog',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              $trim: {
                input: { $ifNull: ['$catalog.brand', 'TrendVolt'] },
              },
            },
            unitsSold: { $sum: '$unitsSold' },
            revenue: { $sum: '$revenue' },
            orderIds: { $addToSet: '$_id.order' },
            productIds: { $addToSet: '$_id.product' },
          },
        },
        {
          $project: {
            _id: 0,
            brand: {
              $cond: [
                { $or: [{ $eq: ['$_id', ''] }, { $eq: ['$_id', null] }] },
                'TrendVolt',
                '$_id',
              ],
            },
            unitsSold: 1,
            revenue: { $round: ['$revenue', 2] },
            orderCount: { $size: '$orderIds' },
            productCount: { $size: '$productIds' },
          },
        },
        { $sort: { revenue: -1, unitsSold: -1 } },
      ]),
    ])

    const totalRevenue = overallSummary[0]?.totalRevenue || 0
    const totalUnits = overallSummary[0]?.totalUnits || 0

    const brands = brandSalesAgg.map((b) => ({
      brand: b.brand,
      unitsSold: b.unitsSold,
      orderCount: b.orderCount,
      productCount: b.productCount,
      revenue: Number(b.revenue.toFixed(2)),
      salesContributionPercentage:
        totalRevenue > 0
          ? Number(((b.revenue / totalRevenue) * 100).toFixed(2))
          : 0,
    }))

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalUnits,
        brandsCount: brands.length,
      },
      brands,
    })
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving brand sales performance',
    })
  }
}

// ─── 4. Sales Trends ────────────────────────────────────────────────────────
// GET /api/sales-insights/trends
// Continuous date-series data (zero-filled) for units, revenue, orders in IST (+05:30)
const getSalesTrends = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate, isMonthly, dateFormat } = rangeValidation

  const orderMatch = {
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'paid',
    orderStatus: { $ne: 'cancelled' },
  }

  try {
    const trendAgg = await Order.aggregate([
      { $match: orderMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt',
                timezone: '+05:30',
              },
            },
            order: '$_id',
          },
          orderRevenue: { $sum: '$items.subtotal' },
          orderUnits: { $sum: '$items.quantity' },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          revenue: { $sum: '$orderRevenue' },
          unitsSold: { $sum: '$orderUnits' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    const dateSeries = generateDateSeries(startDate, endDate, isMonthly)
    const trendMap = new Map()

    trendAgg.forEach((item) => {
      trendMap.set(item._id, {
        revenue: Number(item.revenue.toFixed(2)),
        unitsSold: item.unitsSold,
        orders: item.orders,
      })
    })

    let totalRevenue = 0
    let totalUnits = 0
    let totalOrders = 0
    let peakRevenue = 0
    let peakDate = null

    const trends = dateSeries.map((dateStr) => {
      const match = trendMap.get(dateStr)
      const rev = match ? match.revenue : 0
      const units = match ? match.unitsSold : 0
      const ord = match ? match.orders : 0

      totalRevenue += rev
      totalUnits += units
      totalOrders += ord

      if (rev > peakRevenue) {
        peakRevenue = rev
        peakDate = dateStr
      }

      return {
        date: dateStr,
        unitsSold: units,
        revenue: rev,
        orders: ord,
      }
    })

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalUnits,
        totalOrders,
        peakRevenue: Number(peakRevenue.toFixed(2)),
        peakDate,
      },
      trends,
    })
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving sales trends',
    })
  }
}

// ─── 5. Zero-Sales Products ─────────────────────────────────────────────────
// GET /api/sales-insights/zero-sales
// Active catalog products with zero qualifying sales in the selected period
const getZeroSalesProducts = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate } = rangeValidation
  const limit = clampLimit(req.query.limit, 50, 100)

  const orderMatch = {
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'paid',
    orderStatus: { $ne: 'cancelled' },
  }

  try {
    // 1. Identify all product ObjectIds that had qualifying sales
    const soldProductIds = await Order.distinct('items.product', {
      ...orderMatch,
      'items.product': { $exists: true, $ne: null },
    })

    // 2. Query active catalog products that are NOT in the sold set
    const [totalActiveProducts, zeroSalesProducts] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.find({
        isActive: true,
        _id: { $nin: soldProductIds },
      })
        .select('name price stock category department subcategory brand images createdAt isActive')
        .sort({ stock: -1, createdAt: -1 })
        .limit(limit)
        .lean(),
    ])

    const zeroCount = await Product.countDocuments({
      isActive: true,
      _id: { $nin: soldProductIds },
    })

    const formatted = zeroSalesProducts.map((p) => ({
      productId: String(p._id),
      name: p.name,
      image: p.images?.[0] || null,
      price: p.price,
      currentStock: p.stock,
      category: p.category || 'fashion',
      department: p.department || null,
      subcategory: p.subcategory || null,
      brand: p.brand || 'Unbranded',
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      unitsSold: 0,
      revenue: 0,
      orderCount: 0,
    }))

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalActiveProducts,
        zeroSalesCount: zeroCount,
        activeWithSalesCount: Math.max(0, totalActiveProducts - zeroCount),
      },
      products: formatted,
      totalCount: zeroCount,
    })
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving zero sales products',
    })
  }
}

// ─── 6. Stock vs Sales (Inventory Velocity) ─────────────────────────────────
// GET /api/sales-insights/stock-sales
// Surfaces active products that have inventory (stock > 0) alongside their sales velocity
const getStockVsSalesInsights = async (req, res) => {
  const rangeValidation = validateAnalyticsRange(req.query)
  if (!rangeValidation.isValid) {
    return res.status(400).json({ success: false, message: rangeValidation.message })
  }

  const { range, startDate, endDate } = rangeValidation
  const limit = clampLimit(req.query.limit, 50, 100)

  const orderMatch = {
    createdAt: { $gte: startDate, $lte: endDate },
    paymentStatus: 'paid',
    orderStatus: { $ne: 'cancelled' },
  }

  try {
    // 1. Aggregate sales by product in the selected period
    const salesByProduct = await Order.aggregate([
      { $match: orderMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
          orders: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          productId: '$_id',
          unitsSold: 1,
          revenue: { $round: ['$revenue', 2] },
          orderCount: { $size: '$orders' },
        },
      },
    ])

    const salesMap = new Map()
    salesByProduct.forEach((s) => {
      if (s.productId) {
        salesMap.set(String(s.productId), {
          unitsSold: s.unitsSold,
          revenue: s.revenue,
          orderCount: s.orderCount,
        })
      }
    })

    // 2. Fetch active products with stock > 0
    const inStockProducts = await Product.find({
      isActive: true,
      stock: { $gt: 0 },
    })
      .select('name price stock category department subcategory brand images createdAt isActive')
      .lean()

    // 3. Merge stock and sales velocity
    const merged = inStockProducts.map((p) => {
      const pid = String(p._id)
      const sales = salesMap.get(pid) || { unitsSold: 0, revenue: 0, orderCount: 0 }
      const units = Math.max(0, Number(sales.unitsSold || 0))
      const rev = Math.max(0, Number(sales.revenue || 0))
      const orders = Math.max(0, Number(sales.orderCount || 0))
      // Guard against non-numeric or negative stock values
      const stock = Math.max(0, typeof p.stock === 'number' ? p.stock : 0)

      // Sell-through rate: derived UI metric = units sold / (stock + units sold) * 100
      // Note: This is a derived presentation indicator based on current stock + sold units,
      // not an authoritative historical inventory accounting ledger.
      const totalAvailable = stock + units
      const sellThroughRate =
        totalAvailable > 0
          ? Number(((units / totalAvailable) * 100).toFixed(2))
          : 0

      // Velocity classification: simple descriptive UI presentation grouping (derived indicator,
      // NOT an authoritative business/accounting rule):
      // - 'zero': 0 units sold in selected period
      // - 'slow': 1–2 units sold in selected period
      // - 'healthy': >2 units sold in selected period
      let velocity = 'zero'
      if (units > 2) {
        velocity = 'healthy'
      } else if (units > 0) {
        velocity = 'slow'
      }

      return {
        productId: pid,
        name: p.name,
        image: p.images?.[0] || null,
        price: p.price,
        currentStock: stock,
        unitsSold: units,
        revenue: rev,
        orderCount: orders,
        sellThroughRate,
        velocity,
        department: p.department || null,
        category: p.category || 'fashion',
        subcategory: p.subcategory || null,
        brand: p.brand || 'Unbranded',
        isActive: p.isActive,
      }
    })

    // Sort by lowest velocity first (zero sales, then slow moving, with highest stock on top)
    merged.sort((a, b) => {
      if (a.unitsSold !== b.unitsSold) {
        return a.unitsSold - b.unitsSold
      }
      return b.currentStock - a.currentStock
    })

    const paginated = merged.slice(0, limit)

    const zeroCount = merged.filter((m) => m.unitsSold === 0).length
    const slowCount = merged.filter((m) => m.unitsSold > 0 && m.unitsSold <= 2).length
    const healthyCount = merged.filter((m) => m.unitsSold > 2).length

    return res.status(200).json({
      success: true,
      range: {
        key: range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalInStockProducts: merged.length,
        zeroSalesInStock: zeroCount,
        slowMovingInStock: slowCount,
        healthyVelocityInStock: healthyCount,
      },
      products: paginated,
      totalCount: merged.length,
    })
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving stock vs sales insights',
    })
  }
}

module.exports = {
  getProductSalesPerformance,
  getCategorySalesPerformance,
  getBrandSalesPerformance,
  getSalesTrends,
  getZeroSalesProducts,
  getStockVsSalesInsights,
}
