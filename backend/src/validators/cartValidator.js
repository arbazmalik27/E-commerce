const mongoose = require('mongoose')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

const validateAddToCartInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { productId, quantity } = body

  if (!productId || typeof productId !== 'string' || productId.trim() === '') {
    errors.productId = 'Product ID is required'
  } else if (!isValidObjectId(productId.trim())) {
    errors.productId = 'Invalid product ID'
  }

  const qty = quantity === undefined ? 1 : quantity
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1) {
    errors.quantity = 'Quantity must be a positive integer'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      productId: typeof productId === 'string' ? productId.trim() : productId,
      quantity: qty,
    },
  }
}

const validateUpdateQuantityInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { quantity } = body

  if (quantity === undefined || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
    errors.quantity = 'Quantity must be a positive integer'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      quantity,
    },
  }
}

module.exports = {
  isValidObjectId,
  validateAddToCartInput,
  validateUpdateQuantityInput,
}
