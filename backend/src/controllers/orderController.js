const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Product = require('../models/Product')
const User = require('../models/User')
const {
  isValidObjectId,
  validateCreateOrderInput,
  validateOrderStatusInput,
} = require('../validators/orderValidator')

const createOrder = async (req, res) => {
  const { isValid, errors, sanitized } = validateCreateOrderInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const cart = await Cart.findOne({ user: req.user.id })

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Cannot create an order.',
      })
    }

    const orderItems = []
    let calculatedSubtotal = 0

    for (const item of cart.items) {
      const product = await Product.findById(item.product)

      if (!product) {
        return res.status(400).json({
          success: false,
          message: 'One or more products in your cart no longer exist',
        })
      }

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${product.name}" is no longer active`,
        })
      }

      if (item.quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity for "${product.name}" exceeds available stock (${product.stock})`,
        })
      }

      const price = product.price
      const itemSubtotal = Number((price * item.quantity).toFixed(2))
      calculatedSubtotal += itemSubtotal

      orderItems.push({
        product: product._id,
        name: product.name,
        price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        images: product.images || [],
      })
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2))
    const discount = 0
    const shippingFee = 0
    const totalAmount = Number((calculatedSubtotal - discount + shippingFee).toFixed(2))

    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`

    const order = await Order.create({
      user: req.user.id,
      orderNumber,
      items: orderItems,
      shippingAddress: sanitized.shippingAddress,
      subtotal: calculatedSubtotal,
      discount,
      shippingFee,
      totalAmount,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    })

    return res.status(201).json({
      success: true,
      order,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      orders,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getOrderById = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID' })
  }

  try {
    const order = await Order.findById(id)

    if (!order || order.user.toString() !== req.user.id.toString()) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    return res.status(200).json({
      success: true,
      order,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getAdminOrders = async (_req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      orders,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateOrderStatus = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid order ID' })
  }

  const { isValid, errors, sanitized } = validateOrderStatusInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    order.orderStatus = sanitized.status
    await order.save()

    return res.status(200).json({
      success: true,
      order,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/orders/admin/dashboard
const getAdminDashboard = async (_req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenueAgg,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      recentOrders,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            orderStatus: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      Order.countDocuments({ orderStatus: 'pending' }),
      Order.countDocuments({ orderStatus: 'processing' }),
      Order.countDocuments({ orderStatus: 'shipped' }),
      Order.countDocuments({ orderStatus: 'delivered' }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .select('orderNumber totalAmount orderStatus paymentStatus createdAt user')
        .lean(),
    ])

    const totalRevenue =
      revenueAgg.length > 0 && typeof revenueAgg[0].totalRevenue === 'number'
        ? Number(revenueAgg[0].totalRevenue.toFixed(2))
        : 0

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
      },
      recentOrders,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAdminOrders,
  updateOrderStatus,
  getAdminDashboard,
}
