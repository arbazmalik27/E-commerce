const mongoose = require('mongoose')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

function validateCreateFlashSaleInput(body) {
  const errors = {}
  const sanitized = {}

  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: { general: 'Request body must be an object' }, sanitized: {} }
  }

  // Name
  if (typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.name = 'Flash sale name is required'
  } else if (body.name.trim().length < 2) {
    errors.name = 'Flash sale name must be at least 2 characters'
  } else if (body.name.trim().length > 100) {
    errors.name = 'Flash sale name cannot exceed 100 characters'
  } else {
    sanitized.name = body.name.trim()
  }

  // Description (optional)
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.description = 'Description must be a string'
    } else if (body.description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters'
    } else {
      sanitized.description = body.description.trim()
    }
  } else {
    sanitized.description = ''
  }

  // Discount Type
  const validTypes = ['percentage', 'fixed']
  if (!body.discountType || !validTypes.includes(body.discountType)) {
    errors.discountType = 'Discount type must be either "percentage" or "fixed"'
  } else {
    sanitized.discountType = body.discountType
  }

  // Discount Value
  const val = Number(body.discountValue)
  if (isNaN(val) || val <= 0) {
    errors.discountValue = 'Discount value must be a positive number'
  } else if (body.discountType === 'percentage' && val > 100) {
    errors.discountValue = 'Percentage discount cannot exceed 100%'
  } else {
    sanitized.discountValue = Number(val.toFixed(2))
  }

  // Start Date
  if (!body.startAt) {
    errors.startAt = 'Start date/time is required'
  } else {
    const startDate = new Date(body.startAt)
    if (isNaN(startDate.getTime())) {
      errors.startAt = 'Invalid start date/time format'
    } else {
      sanitized.startAt = startDate
    }
  }

  // End Date
  if (!body.endAt) {
    errors.endAt = 'End date/time is required'
  } else {
    const endDate = new Date(body.endAt)
    if (isNaN(endDate.getTime())) {
      errors.endAt = 'Invalid end date/time format'
    } else {
      sanitized.endAt = endDate
    }
  }

  // Verify endAt > startAt
  if (sanitized.startAt && sanitized.endAt) {
    if (sanitized.endAt.getTime() <= sanitized.startAt.getTime()) {
      errors.endAt = 'End date/time must be strictly after start date/time'
    }
  }

  // Products
  if (!Array.isArray(body.products) || body.products.length === 0) {
    errors.products = 'At least one product must be selected'
  } else {
    const invalidIds = body.products.filter((id) => !isValidObjectId(id))
    if (invalidIds.length > 0) {
      errors.products = 'One or more selected product IDs are invalid'
    } else {
      sanitized.products = [...new Set(body.products)]
    }
  }

  // Active status
  if (body.active !== undefined) {
    sanitized.active = Boolean(body.active)
  } else {
    sanitized.active = true
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  }
}

function validateUpdateFlashSaleInput(body, existingSale = {}) {
  const errors = {}
  const sanitized = {}

  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: { general: 'Request body must be an object' }, sanitized: {} }
  }

  // Name
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.name = 'Flash sale name cannot be empty'
    } else if (body.name.trim().length < 2) {
      errors.name = 'Flash sale name must be at least 2 characters'
    } else if (body.name.trim().length > 100) {
      errors.name = 'Flash sale name cannot exceed 100 characters'
    } else {
      sanitized.name = body.name.trim()
    }
  }

  // Description
  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      errors.description = 'Description must be a string'
    } else if (body.description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters'
    } else {
      sanitized.description = body.description.trim()
    }
  }

  // Discount Type
  const targetType = body.discountType || existingSale.discountType
  if (body.discountType !== undefined) {
    const validTypes = ['percentage', 'fixed']
    if (!validTypes.includes(body.discountType)) {
      errors.discountType = 'Discount type must be either "percentage" or "fixed"'
    } else {
      sanitized.discountType = body.discountType
    }
  }

  // Discount Value
  if (body.discountValue !== undefined) {
    const val = Number(body.discountValue)
    if (isNaN(val) || val <= 0) {
      errors.discountValue = 'Discount value must be a positive number'
    } else if (targetType === 'percentage' && val > 100) {
      errors.discountValue = 'Percentage discount cannot exceed 100%'
    } else {
      sanitized.discountValue = Number(val.toFixed(2))
    }
  }

  // Dates
  let startDate = existingSale.startAt ? new Date(existingSale.startAt) : null
  if (body.startAt !== undefined) {
    startDate = new Date(body.startAt)
    if (isNaN(startDate.getTime())) {
      errors.startAt = 'Invalid start date/time format'
    } else {
      sanitized.startAt = startDate
    }
  }

  let endDate = existingSale.endAt ? new Date(existingSale.endAt) : null
  if (body.endAt !== undefined) {
    endDate = new Date(body.endAt)
    if (isNaN(endDate.getTime())) {
      errors.endAt = 'Invalid end date/time format'
    } else {
      sanitized.endAt = endDate
    }
  }

  if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
    errors.endAt = 'End date/time must be strictly after start date/time'
  }

  // Products
  if (body.products !== undefined) {
    if (!Array.isArray(body.products) || body.products.length === 0) {
      errors.products = 'At least one product must be selected'
    } else {
      const invalidIds = body.products.filter((id) => !isValidObjectId(id))
      if (invalidIds.length > 0) {
        errors.products = 'One or more selected product IDs are invalid'
      } else {
        sanitized.products = [...new Set(body.products)]
      }
    }
  }

  // Active status
  if (body.active !== undefined) {
    sanitized.active = Boolean(body.active)
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  }
}

module.exports = {
  isValidObjectId,
  validateCreateFlashSaleInput,
  validateUpdateFlashSaleInput,
}
