const mongoose = require('mongoose')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

const validateCreatePaymentOrderInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { orderId } = body

  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    errors.orderId = 'Order ID is required'
  } else if (!isValidObjectId(orderId.trim())) {
    errors.orderId = 'Invalid order ID'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      orderId: typeof orderId === 'string' ? orderId.trim() : orderId,
    },
  }
}

const validateVerifyPaymentInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const orderId = body.orderId
  const razorpayOrderId = body.razorpay_order_id || body.razorpayOrderId
  const razorpayPaymentId = body.razorpay_payment_id || body.razorpayPaymentId
  const razorpaySignature = body.razorpay_signature || body.razorpaySignature

  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    errors.orderId = 'Order ID is required'
  } else if (!isValidObjectId(orderId.trim())) {
    errors.orderId = 'Invalid order ID'
  }

  if (!razorpayOrderId || typeof razorpayOrderId !== 'string' || razorpayOrderId.trim() === '') {
    errors.razorpay_order_id = 'Razorpay order ID is required'
  }

  if (!razorpayPaymentId || typeof razorpayPaymentId !== 'string' || razorpayPaymentId.trim() === '') {
    errors.razorpay_payment_id = 'Razorpay payment ID is required'
  }

  if (!razorpaySignature || typeof razorpaySignature !== 'string' || razorpaySignature.trim() === '') {
    errors.razorpay_signature = 'Razorpay signature is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      orderId: typeof orderId === 'string' ? orderId.trim() : orderId,
      razorpayOrderId: typeof razorpayOrderId === 'string' ? razorpayOrderId.trim() : '',
      razorpayPaymentId: typeof razorpayPaymentId === 'string' ? razorpayPaymentId.trim() : '',
      razorpaySignature: typeof razorpaySignature === 'string' ? razorpaySignature.trim() : '',
    },
  }
}

module.exports = {
  isValidObjectId,
  validateCreatePaymentOrderInput,
  validateVerifyPaymentInput,
}
