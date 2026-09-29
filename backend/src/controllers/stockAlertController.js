const BackInStockAlert = require('../models/BackInStockAlert')
const Product = require('../models/Product')
const {
  isValidObjectId,
  validateCreateStockAlertInput,
  validateAlertStatusQuery,
} = require('../validators/stockAlertValidator')

/**
 * Subscribe to a back-in-stock alert for a product or specific size.
 * POST /api/stock-alerts
 */
const subscribeStockAlert = async (req, res) => {
  const { isValid, errors, sanitized } = validateCreateStockAlertInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { productId, size } = sanitized

  try {
    const product = await Product.findById(productId)

    if (!product || product.isActive === false) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' })
    }

    const hasConfiguredSizes = Array.isArray(product.sizes) && product.sizes.length > 0
    let normalizedSize = null

    if (hasConfiguredSizes) {
      if (size) {
        const matched = product.sizes.find(
          (s) => s.label.toLowerCase() === size.toLowerCase()
        )

        if (!matched) {
          return res.status(400).json({
            success: false,
            message: `Size "${size}" is not a valid size for this product`,
          })
        }

        if (matched.available !== false && product.stock > 0) {
          return res.status(400).json({
            success: false,
            message: `Size "${matched.label}" is currently in stock`,
          })
        }

        normalizedSize = matched.label
      } else {
        // Size omitted on a product with sizes
        if (product.stock > 0) {
          return res.status(400).json({
            success: false,
            message: 'Please specify an out-of-stock size to be notified',
          })
        }
        // Entire product is out of stock (stock <= 0)
        normalizedSize = null
      }
    } else {
      // Product has no sizes configured
      if (product.stock > 0) {
        return res.status(400).json({
          success: false,
          message: 'This product is currently in stock',
        })
      }
      normalizedSize = null
    }

    // Check for existing active subscription (idempotent duplicate prevention)
    const existingAlert = await BackInStockAlert.findOne({
      user: req.user.id,
      product: productId,
      size: normalizedSize,
      status: 'active',
    })

    if (existingAlert) {
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to back-in-stock alerts for this item',
        alert: existingAlert,
      })
    }

    // Create new active alert
    const alert = await BackInStockAlert.create({
      user: req.user.id,
      product: productId,
      size: normalizedSize,
      status: 'active',
      notificationChannel: 'email',
    })

    return res.status(201).json({
      success: true,
      message: 'Alert subscription created successfully',
      alert,
    })
  } catch (err) {
    if (err.code === 11000) {
      // Handled duplicate key from unique index
      const existing = await BackInStockAlert.findOne({
        user: req.user.id,
        product: productId,
        size: normalizedSize,
        status: 'active',
      })
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to back-in-stock alerts for this item',
        alert: existing,
      })
    }
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Check whether the current user is subscribed to an active alert for a product/size.
 * GET /api/stock-alerts/status?productId=...&size=...
 */
const getAlertStatus = async (req, res) => {
  const { isValid, errors, sanitized } = validateAlertStatusQuery(req.query)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { productId, size } = sanitized

  try {
    let normalizedSize = size || null

    if (size) {
      const product = await Product.findById(productId)
      if (product && Array.isArray(product.sizes)) {
        const matched = product.sizes.find(
          (s) => s.label.toLowerCase() === size.toLowerCase()
        )
        if (matched) {
          normalizedSize = matched.label
        }
      }
    }

    const alert = await BackInStockAlert.findOne({
      user: req.user.id,
      product: productId,
      size: normalizedSize,
      status: 'active',
    })

    return res.status(200).json({
      success: true,
      isSubscribed: Boolean(alert),
      alertId: alert ? alert._id : null,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Cancel an active stock alert owned by the authenticated user.
 * DELETE /api/stock-alerts/:id
 */
const cancelStockAlert = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid alert ID' })
  }

  try {
    const alert = await BackInStockAlert.findById(id)

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert subscription not found' })
    }

    // IDOR Protection: only owner can cancel alert
    if (alert.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this alert',
      })
    }

    alert.status = 'cancelled'
    await alert.save()

    return res.status(200).json({
      success: true,
      message: 'Alert subscription cancelled successfully',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Retrieve all active back-in-stock alerts for the authenticated user.
 * GET /api/stock-alerts/my
 */
const getMyAlerts = async (req, res) => {
  try {
    const alerts = await BackInStockAlert.find({
      user: req.user.id,
      status: 'active',
    })
      .populate('product', 'name price images category brand stock isActive sizes')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      alerts,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  subscribeStockAlert,
  getAlertStatus,
  cancelStockAlert,
  getMyAlerts,
}
