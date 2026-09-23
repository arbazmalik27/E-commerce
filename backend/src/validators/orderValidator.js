const mongoose = require('mongoose')

const ALLOWED_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

const validateCreateOrderInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { shippingAddress } = body

  if (!shippingAddress || typeof shippingAddress !== 'object' || Array.isArray(shippingAddress)) {
    errors.shippingAddress = 'Shipping address is required and must be an object'
    return {
      isValid: false,
      errors,
      sanitized: {},
    }
  }

  const { fullName, phone, addressLine, city, state, postalCode, country } = shippingAddress

  if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
    errors.fullName = 'Full name is required'
  }

  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    errors.phone = 'Phone is required'
  } else if (phone.trim().length < 5 || phone.trim().length > 20) {
    errors.phone = 'Phone number must be between 5 and 20 characters'
  }

  if (!addressLine || typeof addressLine !== 'string' || addressLine.trim() === '') {
    errors.addressLine = 'Address line is required'
  }

  if (!city || typeof city !== 'string' || city.trim() === '') {
    errors.city = 'City is required'
  }

  if (!state || typeof state !== 'string' || state.trim() === '') {
    errors.state = 'State is required'
  }

  if (!postalCode || typeof postalCode !== 'string' || postalCode.trim() === '') {
    errors.postalCode = 'Postal code is required'
  }

  if (!country || typeof country !== 'string' || country.trim() === '') {
    errors.country = 'Country is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      shippingAddress: {
        fullName: typeof fullName === 'string' ? fullName.trim() : '',
        phone: typeof phone === 'string' ? phone.trim() : '',
        addressLine: typeof addressLine === 'string' ? addressLine.trim() : '',
        city: typeof city === 'string' ? city.trim() : '',
        state: typeof state === 'string' ? state.trim() : '',
        postalCode: typeof postalCode === 'string' ? postalCode.trim() : '',
        country: typeof country === 'string' ? country.trim() : '',
      },
    },
  }
}

const validateOrderStatusInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { status } = body

  if (!status || typeof status !== 'string' || status.trim() === '') {
    errors.status = 'Order status is required'
  } else {
    const trimmedStatus = status.trim().toLowerCase()
    if (!ALLOWED_ORDER_STATUSES.includes(trimmedStatus)) {
      errors.status = `Invalid order status. Allowed: ${ALLOWED_ORDER_STATUSES.join(', ')}`
    } else {
      return {
        isValid: true,
        errors: {},
        sanitized: { status: trimmedStatus },
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {},
  }
}

module.exports = {
  isValidObjectId,
  validateCreateOrderInput,
  validateOrderStatusInput,
  ALLOWED_ORDER_STATUSES,
}
