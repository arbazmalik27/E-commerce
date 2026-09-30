const Notification = require('../models/Notification')

/**
 * Generic internal helper to safely create a notification.
 * Customers have no direct creation endpoint.
 *
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.user - Recipient user ID
 * @param {'order_confirmed'|'order_status_updated'|'back_in_stock'} options.type - Notification category
 * @param {string} options.title - Short header
 * @param {string} options.message - Body text
 * @param {string|null} [options.link] - In-app navigation route
 * @param {Object} [options.metadata] - Contextual metadata snapshot
 * @returns {Promise<Notification|null>}
 */
const createNotification = async ({
  user,
  type,
  title,
  message,
  link = null,
  metadata = {},
}) => {
  if (!user || !type || !title || !message) {
    return null
  }

  try {
    const notification = await Notification.create({
      user,
      type,
      title: String(title).trim().slice(0, 120),
      message: String(message).trim().slice(0, 500),
      link: link ? String(link).trim() : null,
      metadata: {
        orderId: metadata.orderId || null,
        productId: metadata.productId || null,
        orderNumber: metadata.orderNumber ? String(metadata.orderNumber).trim() : null,
        status: metadata.status ? String(metadata.status).trim() : null,
      },
    })

    return notification
  } catch (err) {
    console.error('Non-fatal error in createNotification:', err.message)
    return null
  }
}

/**
 * Dispatches an idempotent 'order_confirmed' notification when payment is successfully verified.
 *
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.user - User ID
 * @param {Object} options.order - Order document
 * @returns {Promise<Notification|null>}
 */
const createOrderConfirmedNotification = async ({ user, order }) => {
  if (!user || !order || !order._id) {
    return null
  }

  try {
    // Idempotency: verify this order confirmation hasn't already been notified
    const existing = await Notification.findOne({
      user,
      type: 'order_confirmed',
      'metadata.orderId': order._id,
    })

    if (existing) {
      return existing
    }

    const orderNumber = order.orderNumber || String(order._id)
    return await createNotification({
      user,
      type: 'order_confirmed',
      title: 'Order confirmed',
      message: `Your order ${orderNumber} has been confirmed and is now being prepared.`,
      link: `/orders/${order._id}`,
      metadata: {
        orderId: order._id,
        orderNumber,
        status: 'confirmed',
      },
    })
  } catch (err) {
    console.error('Non-fatal error in createOrderConfirmedNotification:', err.message)
    return null
  }
}

const ORDER_STATUS_CONFIG = {
  processing: {
    title: 'Order is being prepared',
    getMessage: (num) => `Your order ${num} is now being prepared.`,
  },
  shipped: {
    title: 'Order shipped',
    getMessage: (num) => `Your order ${num} has been shipped.`,
  },
  delivered: {
    title: 'Order delivered',
    getMessage: (num) => `Your order ${num} has been delivered.`,
  },
  cancelled: {
    title: 'Order cancelled',
    getMessage: (num) => `Your order ${num} has been cancelled.`,
  },
}

/**
 * Dispatches an idempotent 'order_status_updated' notification when an order status changes.
 *
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.user - User ID
 * @param {Object} options.order - Order document
 * @param {string} options.previousStatus - Prior status
 * @param {string} options.newStatus - Transitioned status
 * @returns {Promise<Notification|null>}
 */
const createOrderStatusNotification = async ({
  user,
  order,
  previousStatus,
  newStatus,
}) => {
  if (!user || !order || !order._id) {
    return null
  }

  // Only notify when previousStatus !== newStatus
  if (previousStatus === newStatus) {
    return null
  }

  // Only notify for supported customer milestone statuses
  const config = ORDER_STATUS_CONFIG[newStatus]
  if (!config) {
    return null
  }

  try {
    // Idempotency: verify notification for this exact order & status hasn't already been created
    const existing = await Notification.findOne({
      user,
      type: 'order_status_updated',
      'metadata.orderId': order._id,
      'metadata.status': newStatus,
    })

    if (existing) {
      return existing
    }

    const orderNumber = order.orderNumber || String(order._id)
    return await createNotification({
      user,
      type: 'order_status_updated',
      title: config.title,
      message: config.getMessage(orderNumber),
      link: `/orders/${order._id}`,
      metadata: {
        orderId: order._id,
        orderNumber,
        status: newStatus,
      },
    })
  } catch (err) {
    console.error('Non-fatal error in createOrderStatusNotification:', err.message)
    return null
  }
}

/**
 * Dispatches a 'back_in_stock' notification when a subscribed product/size is replenished.
 *
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.user - User ID
 * @param {Object} options.product - Product document
 * @param {string|null} [options.size] - Specific size replenished
 * @returns {Promise<Notification|null>}
 */
const createBackInStockNotification = async ({ user, product, size = null }) => {
  if (!user || !product || !product._id) {
    return null
  }

  try {
    const sizeText = size ? ` in Size ${size}` : ''
    const title = 'Back in stock'
    const message = `Good news: ${product.name}${sizeText} is back in stock.`

    // Idempotency: check if an identical notification was recently generated (within last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const existing = await Notification.findOne({
      user,
      type: 'back_in_stock',
      'metadata.productId': product._id,
      createdAt: { $gte: oneHourAgo },
    })

    if (existing) {
      return existing
    }

    return await createNotification({
      user,
      type: 'back_in_stock',
      title,
      message,
      link: `/products/${product._id}`,
      metadata: {
        productId: product._id,
        status: size || null,
      },
    })
  } catch (err) {
    console.error('Non-fatal error in createBackInStockNotification:', err.message)
    return null
  }
}

module.exports = {
  createNotification,
  createOrderConfirmedNotification,
  createOrderStatusNotification,
  createBackInStockNotification,
}
