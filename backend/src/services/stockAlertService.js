const BackInStockAlert = require('../models/BackInStockAlert')
const { sendBackInStockEmail } = require('./emailService')
const { createBackInStockNotification } = require('./notificationService')

/**
 * Evaluates whether inventory transitions on a product make any registered
 * back-in-stock alerts eligible, and processes delivery if email service is active.
 * 
 * Rules:
 * - Product-level alerts: triggered when product stock transitions from <= 0 to > 0.
 * - Size-level alerts: triggered when a specific size transitions from unavailable to available (and product stock > 0).
 * - Lifecycle: alerts only transition to 'notified' if email delivery successfully completes.
 *   If email delivery is disabled, alerts remain active for future delivery.
 * 
 * @param {Object} options
 * @param {Object} options.product - Updated product state
 * @param {Object|null} [options.previousProduct] - Prior product state before update
 * @returns {Promise<{ eligibleCount: number, notifiedCount: number, errors: string[] }>}
 */
const processBackInStockAlerts = async ({ product, previousProduct = null }) => {
  if (!product || !product._id || product.isActive === false) {
    return { eligibleCount: 0, notifiedCount: 0, errors: [] }
  }

  const errors = []
  let eligibleCount = 0
  let notifiedCount = 0

  const isCurrentProductInStock = typeof product.stock === 'number' && product.stock > 0

  // 1. Identify product-level replenishment (stock <= 0 -> stock > 0)
  const wasProductOutOfStock = !previousProduct || typeof previousProduct.stock !== 'number' || previousProduct.stock <= 0
  const productReplenished = wasProductOutOfStock && isCurrentProductInStock

  // 2. Identify size-level replenishments (available: false -> available: true, while product in stock)
  const replenishedSizes = []
  if (isCurrentProductInStock && Array.isArray(product.sizes)) {
    for (const currSize of product.sizes) {
      if (currSize && currSize.available !== false) {
        const prevSize = previousProduct?.sizes?.find(
          (s) => s.label.toLowerCase() === currSize.label.toLowerCase()
        )
        const wasSizeUnavailable =
          !prevSize ||
          prevSize.available === false ||
          (previousProduct && (previousProduct.stock <= 0 || !previousProduct.isActive))

        if (wasSizeUnavailable) {
          replenishedSizes.push(currSize.label)
        }
      }
    }
  }

  // If neither product-level nor any size transitioned, nothing to process
  if (!productReplenished && replenishedSizes.length === 0) {
    return { eligibleCount: 0, notifiedCount: 0, errors: [] }
  }

  // Find all active alerts matching product-level replenishment
  const queryConditions = []
  if (productReplenished) {
    queryConditions.push({ product: product._id, size: null, status: 'active' })
  }
  if (replenishedSizes.length > 0) {
    queryConditions.push({ product: product._id, size: { $in: replenishedSizes }, status: 'active' })
  }

  const eligibleAlerts = await BackInStockAlert.find({ $or: queryConditions }).populate(
    'user',
    'name email isActive'
  )

  eligibleCount = eligibleAlerts.length
  if (eligibleCount === 0) {
    return { eligibleCount: 0, notifiedCount: 0, errors: [] }
  }

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '')
  const productUrl = `${clientUrl}/products/${product._id}`

  // Process eligible alerts
  for (const alert of eligibleAlerts) {
    // Skip if user account is disabled or missing email
    if (!alert.user || !alert.user.email || alert.user.isActive === false) {
      continue
    }

    // Dispatch in-app customer notification (non-fatal side effect)
    try {
      await createBackInStockNotification({
        user: alert.user._id,
        product,
        size: alert.size || null,
      })
    } catch (notifErr) {
      console.error('Non-fatal error creating back-in-stock notification:', notifErr.message)
    }

    try {
      if (process.env.EMAIL_SERVICE_ENABLED === 'true') {
        await sendBackInStockEmail({
          to: alert.user.email,
          productName: product.name,
          size: alert.size || null,
          productUrl,
        })

        // Transition to notified state only upon confirmed email dispatch
        alert.status = 'notified'
        alert.notifiedAt = new Date()
        await alert.save()
        notifiedCount++
      } else {
        // As required: do not falsely claim 'notified' when email service is off.
        // Alert remains active so future delivery or background job can fulfill it.
      }
    } catch (deliveryErr) {
      errors.push(`Failed to notify user ${alert.user.email}: ${deliveryErr.message}`)
    }
  }

  return { eligibleCount, notifiedCount, errors }
}

module.exports = {
  processBackInStockAlerts,
}
