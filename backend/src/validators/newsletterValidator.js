const validateSubscribeInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || body.email === undefined || body.email === null || typeof body.email !== 'string') {
    errors.email = 'Email is required'
    return {
      isValid: false,
      errors,
      sanitized: { email: '' },
    }
  }

  const email = body.email.trim().toLowerCase()

  if (!email) {
    errors.email = 'Email is required'
  } else if (email.length > 254) {
    errors.email = 'Email address cannot exceed 254 characters'
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Please provide a valid email address'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: { email },
  }
}

module.exports = {
  validateSubscribeInput,
}
