const mongoose = require('mongoose')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

const validateCreateStockAlertInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { productId, size } = body

  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    errors.productId = 'Product ID is required'
  } else if (!isValidObjectId(productId.trim())) {
    errors.productId = 'Invalid product ID'
  }

  let sanitizedSize = null
  if (size !== undefined && size !== null) {
    if (typeof size !== 'string') {
      errors.size = 'Size must be a string'
    } else if (size.trim().length > 30) {
      errors.size = 'Size cannot exceed 30 characters'
    } else if (size.trim().length > 0) {
      sanitizedSize = size.trim()
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      productId: typeof productId === 'string' ? productId.trim() : productId,
      size: sanitizedSize,
    },
  }
}

const validateAlertStatusQuery = (query = {}) => {
  const errors = {}

  const { productId, size } = query

  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    errors.productId = 'Product ID query parameter is required'
  } else if (!isValidObjectId(productId.trim())) {
    errors.productId = 'Invalid product ID'
  }

  let sanitizedSize = null
  if (size !== undefined && size !== null && typeof size === 'string' && size.trim().length > 0) {
    sanitizedSize = size.trim()
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      productId: typeof productId === 'string' ? productId.trim() : productId,
      size: sanitizedSize,
    },
  }
}

module.exports = {
  isValidObjectId,
  validateCreateStockAlertInput,
  validateAlertStatusQuery,
}
