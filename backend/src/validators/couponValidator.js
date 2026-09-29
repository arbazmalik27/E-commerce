const mongoose = require('mongoose')

const ALLOWED_COUPON_TYPES = ['percentage', 'fixed', 'buy_x_get_y']

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

const validateCreateCouponInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const {
    code,
    type,
    value,
    buyQuantity,
    freeQuantity,
    minimumOrderValue,
    maximumDiscount,
    usageLimit,
    perUserLimit,
    startsAt,
    expiresAt,
    isActive,
  } = body

  // Code validation
  if (!code || typeof code !== 'string' || code.trim() === '') {
    errors.code = 'Coupon code is required'
  } else {
    const trimmedCode = code.trim().toUpperCase()
    if (trimmedCode.length < 2 || trimmedCode.length > 30) {
      errors.code = 'Coupon code must be between 2 and 30 characters'
    } else if (!/^[A-Z0-9_-]+$/.test(trimmedCode)) {
      errors.code = 'Coupon code may only contain uppercase letters, numbers, hyphens, and underscores'
    }
  }

  // Type validation
  if (!type || typeof type !== 'string' || !ALLOWED_COUPON_TYPES.includes(type.trim().toLowerCase())) {
    errors.type = `Coupon type is required and must be one of: ${ALLOWED_COUPON_TYPES.join(', ')}`
  }

  const resolvedType = type ? type.trim().toLowerCase() : ''

  // Type-specific combinations validation
  if (resolvedType === 'percentage') {
    if (value === undefined || value === null || typeof value !== 'number' || isNaN(value)) {
      errors.value = 'Value is required for percentage coupons'
    } else if (value <= 0 || value > 100) {
      errors.value = 'Percentage value must be greater than 0 and less than or equal to 100'
    }

    if (buyQuantity !== undefined && buyQuantity !== null) {
      errors.buyQuantity = 'Buy quantity is only allowed for buy_x_get_y coupons'
    }
    if (freeQuantity !== undefined && freeQuantity !== null) {
      errors.freeQuantity = 'Free quantity is only allowed for buy_x_get_y coupons'
    }
  } else if (resolvedType === 'fixed') {
    if (value === undefined || value === null || typeof value !== 'number' || isNaN(value)) {
      errors.value = 'Value is required for fixed coupons'
    } else if (value <= 0) {
      errors.value = 'Fixed discount value must be greater than 0'
    }

    if (buyQuantity !== undefined && buyQuantity !== null) {
      errors.buyQuantity = 'Buy quantity is only allowed for buy_x_get_y coupons'
    }
    if (freeQuantity !== undefined && freeQuantity !== null) {
      errors.freeQuantity = 'Free quantity is only allowed for buy_x_get_y coupons'
    }
  } else if (resolvedType === 'buy_x_get_y') {
    if (value !== undefined && value !== null && value !== 0) {
      errors.value = 'Value should not be provided for buy_x_get_y coupons'
    }

    if (buyQuantity === undefined || buyQuantity === null || typeof buyQuantity !== 'number' || !Number.isInteger(buyQuantity) || buyQuantity < 1) {
      errors.buyQuantity = 'Buy quantity is required and must be an integer >= 1'
    }

    if (freeQuantity === undefined || freeQuantity === null || typeof freeQuantity !== 'number' || !Number.isInteger(freeQuantity) || freeQuantity < 1) {
      errors.freeQuantity = 'Free quantity is required and must be an integer >= 1'
    }
  }

  // Minimum Order Value
  let resolvedMinOrder = 0
  if (resolvedType === 'buy_x_get_y') {
    resolvedMinOrder = 10000 // BOGO explicitly requires ₹10,000 threshold
    if (minimumOrderValue !== undefined && minimumOrderValue !== null) {
      if (typeof minimumOrderValue !== 'number' || isNaN(minimumOrderValue) || minimumOrderValue < 10000) {
        errors.minimumOrderValue = 'Minimum order value for BOGO coupons must be at least ₹10,000'
      } else {
        resolvedMinOrder = minimumOrderValue
      }
    }
  } else if (minimumOrderValue !== undefined && minimumOrderValue !== null) {
    if (typeof minimumOrderValue !== 'number' || isNaN(minimumOrderValue) || minimumOrderValue < 0) {
      errors.minimumOrderValue = 'Minimum order value cannot be negative'
    } else {
      resolvedMinOrder = minimumOrderValue
    }
  }

  // Maximum Discount
  let resolvedMaxDiscount = null
  if (maximumDiscount !== undefined && maximumDiscount !== null) {
    if (typeof maximumDiscount !== 'number' || isNaN(maximumDiscount) || maximumDiscount < 0) {
      errors.maximumDiscount = 'Maximum discount cannot be negative'
    } else {
      resolvedMaxDiscount = maximumDiscount
    }
  }

  // Usage Limit
  let resolvedUsageLimit = null
  if (usageLimit !== undefined && usageLimit !== null) {
    if (typeof usageLimit !== 'number' || !Number.isInteger(usageLimit) || usageLimit < 0) {
      errors.usageLimit = 'Usage limit must be an integer >= 0'
    } else {
      resolvedUsageLimit = usageLimit
    }
  }

  // Per User Limit
  let resolvedPerUserLimit = null
  if (perUserLimit !== undefined && perUserLimit !== null) {
    if (typeof perUserLimit !== 'number' || !Number.isInteger(perUserLimit) || perUserLimit < 0) {
      errors.perUserLimit = 'Per-user limit must be an integer >= 0'
    } else {
      resolvedPerUserLimit = perUserLimit
    }
  }

  // Dates
  let resolvedStartsAt = null
  if (startsAt !== undefined && startsAt !== null && startsAt !== '') {
    const d = new Date(startsAt)
    if (isNaN(d.getTime())) {
      errors.startsAt = 'Start date must be a valid date'
    } else {
      resolvedStartsAt = d
    }
  }

  let resolvedExpiresAt = null
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
    const d = new Date(expiresAt)
    if (isNaN(d.getTime())) {
      errors.expiresAt = 'Expiration date must be a valid date'
    } else {
      resolvedExpiresAt = d
    }
  }

  if (resolvedStartsAt && resolvedExpiresAt && resolvedExpiresAt.getTime() < resolvedStartsAt.getTime()) {
    errors.expiresAt = 'Expiration date cannot be earlier than start date'
  }

  // Active status
  const resolvedIsActive = isActive !== undefined ? Boolean(isActive) : true

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      code: code ? code.trim().toUpperCase() : '',
      type: resolvedType,
      value: resolvedType === 'buy_x_get_y' ? 0 : (value || 0),
      buyQuantity: resolvedType === 'buy_x_get_y' ? buyQuantity : null,
      freeQuantity: resolvedType === 'buy_x_get_y' ? freeQuantity : null,
      minimumOrderValue: resolvedMinOrder,
      maximumDiscount: resolvedMaxDiscount,
      usageLimit: resolvedUsageLimit,
      perUserLimit: resolvedPerUserLimit,
      startsAt: resolvedStartsAt,
      expiresAt: resolvedExpiresAt,
      isActive: resolvedIsActive,
    },
  }
}

const validateUpdateCouponInput = (body = {}, existingCoupon = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const merged = { ...existingCoupon, ...body }
  return validateCreateCouponInput(merged)
}

const validateValidateCouponInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { code } = body

  if (!code || typeof code !== 'string' || code.trim() === '') {
    errors.code = 'Coupon code is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      code: code && typeof code === 'string' ? code.trim().toUpperCase() : '',
    },
  }
}

module.exports = {
  isValidObjectId,
  validateCreateCouponInput,
  validateUpdateCouponInput,
  validateValidateCouponInput,
  ALLOWED_COUPON_TYPES,
}
