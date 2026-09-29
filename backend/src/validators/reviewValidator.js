const mongoose = require('mongoose')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id.trim()) && mongoose.isValidObjectId(id.trim())

const validateCreateReviewInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { productId, orderId, rating, title, comment } = body

  // 1. productId validation
  if (!productId || !isValidObjectId(productId)) {
    errors.productId = 'Valid product ID is required'
  }

  // 2. orderId validation
  if (!orderId || !isValidObjectId(orderId)) {
    errors.orderId = 'Valid order ID is required'
  }

  // 3. rating validation (integer 1 - 5)
  if (rating === undefined || rating === null || typeof rating !== 'number' || !Number.isInteger(rating)) {
    errors.rating = 'Rating must be an integer between 1 and 5'
  } else if (rating < 1 || rating > 5) {
    errors.rating = 'Rating must be between 1 and 5'
  }

  // 4. title validation (optional, string <= 100 chars)
  let sanitizedTitle = ''
  if (title !== undefined && title !== null && title !== '') {
    if (typeof title !== 'string') {
      errors.title = 'Title must be a string'
    } else if (title.trim().length > 100) {
      errors.title = 'Title cannot exceed 100 characters'
    } else {
      sanitizedTitle = title.trim()
    }
  }

  // 5. comment validation (required, string 5 - 1000 chars)
  let sanitizedComment = ''
  if (comment === undefined || comment === null || typeof comment !== 'string' || comment.trim() === '') {
    errors.comment = 'Review comment is required'
  } else if (comment.trim().length < 5) {
    errors.comment = 'Review comment must be at least 5 characters'
  } else if (comment.trim().length > 1000) {
    errors.comment = 'Review comment cannot exceed 1000 characters'
  } else {
    sanitizedComment = comment.trim()
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      productId: typeof productId === 'string' ? productId.trim() : productId,
      orderId: typeof orderId === 'string' ? orderId.trim() : orderId,
      rating,
      title: sanitizedTitle,
      comment: sanitizedComment,
    },
  }
}

const validateUpdateReviewInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { rating, title, comment } = body
  const sanitized = {}

  if (rating !== undefined) {
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.rating = 'Rating must be an integer between 1 and 5'
    } else {
      sanitized.rating = rating
    }
  }

  if (title !== undefined) {
    if (title === null || title === '') {
      sanitized.title = ''
    } else if (typeof title !== 'string') {
      errors.title = 'Title must be a string'
    } else if (title.trim().length > 100) {
      errors.title = 'Title cannot exceed 100 characters'
    } else {
      sanitized.title = title.trim()
    }
  }

  if (comment !== undefined) {
    if (typeof comment !== 'string' || comment.trim() === '') {
      errors.comment = 'Review comment cannot be empty'
    } else if (comment.trim().length < 5) {
      errors.comment = 'Review comment must be at least 5 characters'
    } else if (comment.trim().length > 1000) {
      errors.comment = 'Review comment cannot exceed 1000 characters'
    } else {
      sanitized.comment = comment.trim()
    }
  }

  if (Object.keys(sanitized).length === 0 && Object.keys(errors).length === 0) {
    errors.body = 'At least one field (rating, title, comment) must be provided for update'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  }
}

const validateReviewStatusInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { status } = body
  const allowed = ['approved', 'rejected', 'pending']

  if (!status || typeof status !== 'string' || !allowed.includes(status.trim().toLowerCase())) {
    errors.status = `Status must be one of: ${allowed.join(', ')}`
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      status: typeof status === 'string' ? status.trim().toLowerCase() : '',
    },
  }
}

module.exports = {
  isValidObjectId,
  validateCreateReviewInput,
  validateUpdateReviewInput,
  validateReviewStatusInput,
}
