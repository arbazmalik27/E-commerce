const validateRegisterInput = (body) => {
  const errors = {}

  const name = (body.name || '').trim()
  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!name) {
    errors.name = 'Name is required'
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters'
  } else if (name.length > 50) {
    errors.name = 'Name must be at most 50 characters'
  }

  if (!email) {
    errors.email = 'Email is required'
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Please provide a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: { name, email, password },
  }
}

const validateLoginInput = (body) => {
  const errors = {}

  const email = (body.email || '').trim().toLowerCase()
  const password = body.password || ''

  if (!email) {
    errors.email = 'Email is required'
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Please provide a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: { email, password },
  }
}

const validateForgotPasswordInput = (body = {}) => {
  const errors = {}

  const email = (body.email || '').trim().toLowerCase()

  if (!email) {
    errors.email = 'Email is required'
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Please provide a valid email address'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: { email },
  }
}

const validateResetPasswordInput = (body = {}) => {
  const errors = {}

  const token = (body.token || '').trim()
  const password = body.password || ''

  if (!token) {
    errors.token = 'Reset token is required'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: { token, password },
  }
}

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
}
