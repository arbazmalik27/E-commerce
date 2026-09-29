const Coupon = require('../models/Coupon')
const Cart = require('../models/Cart')
const Product = require('../models/Product')
const Order = require('../models/Order')
const {
  isValidObjectId,
  validateCreateCouponInput,
  validateUpdateCouponInput,
  validateValidateCouponInput,
} = require('../validators/couponValidator')
const {
  validateCouponEligibility,
} = require('../services/couponService')

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Customer validation endpoint: POST /api/coupons/validate
 */
const validateCoupon = async (req, res) => {
  const { isValid, errors, sanitized } = validateValidateCouponInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { code } = sanitized

  try {
    const coupon = await Coupon.findOne({ code })

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code.' })
    }

    // Retrieve authoritative cart for the authenticated user
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product',
      'name price stock isActive category brand'
    )

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Cannot apply coupon.',
      })
    }

    // Filter and check for valid/active items
    const validItems = []
    for (const item of cart.items) {
      if (!item.product) continue

      if (!item.product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.product.name}" is no longer active`,
        })
      }

      if (item.quantity > item.product.stock) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity for "${item.product.name}" exceeds available stock (${item.product.stock})`,
        })
      }

      validItems.push(item)
    }

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart contains no valid active products.',
      })
    }

    const eligibility = await validateCouponEligibility({
      coupon,
      user: req.user,
      cartItems: validItems,
    })

    if (!eligibility.isValid) {
      return res.status(400).json({
        success: false,
        message: eligibility.message,
        details: eligibility.details || null,
      })
    }

    const { calculation } = eligibility

    return res.status(200).json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        buyQuantity: coupon.buyQuantity,
        freeQuantity: coupon.freeQuantity,
        minimumOrderValue: coupon.minimumOrderValue,
        maximumDiscount: coupon.maximumDiscount,
      },
      subtotal: calculation.subtotal,
      discountAmount: calculation.discountAmount,
      finalAmount: calculation.finalAmount,
      freeItems: calculation.freeItems,
      eligibleQuantity: calculation.eligibleQuantity,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: GET /api/coupons/admin
 */
const getAdminCoupons = async (req, res) => {
  try {
    const { search, type, isActive } = req.query
    const filter = {}

    if (search && typeof search === 'string' && search.trim() !== '') {
      filter.code = { $regex: escapeRegex(search.trim()), $options: 'i' }
    }

    if (type && typeof type === 'string' && type.trim() !== '' && type !== 'all') {
      filter.type = type.trim().toLowerCase()
    }

    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      filter.isActive = isActive === 'true'
    }

    const coupons = await Coupon.find(filter).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      coupons,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: GET /api/coupons/admin/:id
 */
const getCouponById = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid coupon ID' })
  }

  try {
    const coupon = await Coupon.findById(id)

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' })
    }

    return res.status(200).json({
      success: true,
      coupon,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: POST /api/coupons/admin
 */
const createCoupon = async (req, res) => {
  const { isValid, errors, sanitized } = validateCreateCouponInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const existing = await Coupon.findOne({ code: sanitized.code })
    if (existing) {
      return res.status(400).json({
        success: false,
        errors: { code: 'A coupon with this code already exists' },
      })
    }

    const coupon = await Coupon.create(sanitized)

    return res.status(201).json({
      success: true,
      coupon,
      message: 'Coupon created successfully',
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        errors: { code: 'A coupon with this code already exists' },
      })
    }
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: PATCH /api/coupons/admin/:id
 */
const updateCoupon = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid coupon ID' })
  }

  try {
    const existingCoupon = await Coupon.findById(id)
    if (!existingCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' })
    }

    const { isValid, errors, sanitized } = validateUpdateCouponInput(req.body, existingCoupon.toObject())

    if (!isValid) {
      return res.status(400).json({ success: false, errors })
    }

    if (sanitized.code !== existingCoupon.code) {
      const duplicate = await Coupon.findOne({ code: sanitized.code, _id: { $ne: id } })
      if (duplicate) {
        return res.status(400).json({
          success: false,
          errors: { code: 'A coupon with this code already exists' },
        })
      }
    }

    Object.assign(existingCoupon, sanitized)
    await existingCoupon.save()

    return res.status(200).json({
      success: true,
      coupon: existingCoupon,
      message: 'Coupon updated successfully',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: PATCH /api/coupons/admin/:id/status
 */
const toggleCouponStatus = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid coupon ID' })
  }

  try {
    const coupon = await Coupon.findById(id)
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' })
    }

    if (typeof req.body.isActive === 'boolean') {
      coupon.isActive = req.body.isActive
    } else {
      coupon.isActive = !coupon.isActive
    }

    await coupon.save()

    return res.status(200).json({
      success: true,
      coupon,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: DELETE /api/coupons/admin/:id
 */
const deleteCoupon = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid coupon ID' })
  }

  try {
    const coupon = await Coupon.findByIdAndDelete(id)
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' })
    }

    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Customer: GET /api/coupons/offers
 * Returns only currently active, date-valid, and not exhausted coupons.
 * Exposes safe customer-facing fields only — no usedCount, perUserLimit, or internal data.
 */
const getCustomerOffers = async (req, res) => {
  try {
    const now = new Date()

    // Build filter: active, started (or no start date), not expired (or no expiry)
    const filter = {
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    }

    const rawCoupons = await Coupon.find(filter).sort({ createdAt: -1 }).lean()

    // Server-side filter: skip coupons whose global usageLimit is exhausted
    const validCoupons = rawCoupons.filter(
      (c) => c.usageLimit == null || c.usedCount < c.usageLimit
    )

    // Filter out coupons unavailable to current user because of per-user usage limits
    const eligibleCoupons = []
    if (req.user) {
      const userId = req.user._id || req.user.id
      for (const c of validCoupons) {
        if (c.perUserLimit !== null && c.perUserLimit !== undefined && c.perUserLimit >= 0) {
          const count = await Order.countDocuments({
            user: userId,
            'coupon.code': c.code,
            paymentStatus: 'paid',
          })
          if (count < c.perUserLimit) {
            eligibleCoupons.push(c)
          }
        } else {
          eligibleCoupons.push(c)
        }
      }
    } else {
      eligibleCoupons.push(...validCoupons)
    }

    // Return only safe customer-visible fields
    const offers = eligibleCoupons.map((c) => ({
      code: c.code,
      type: c.type,
      value: c.value,
      buyQuantity: c.buyQuantity ?? null,
      freeQuantity: c.freeQuantity ?? null,
      minimumOrderValue: c.minimumOrderValue ?? 0,
      maximumDiscount: c.maximumDiscount ?? null,
      expiresAt: c.expiresAt ?? null,
    }))

    return res.status(200).json({ success: true, offers })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  validateCoupon,
  getAdminCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getCustomerOffers,
}
