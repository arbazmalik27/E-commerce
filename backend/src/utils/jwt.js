const jwt = require('jsonwebtoken')

const COOKIE_NAME = 'token'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days (customer)
const ADMIN_MAX_AGE_MS = 8 * 60 * 60 * 1000 // 8 hours (admin)
const ADMIN_JWT_EXPIRES_IN = '8h'

const signToken = (userId, options = {}) => {
  const expiresIn = options.expiresIn || '7d'
  const payload = { id: userId }
  if (options.role) {
    payload.role = options.role
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn })
}

const getCookieOptions = (customMaxAge = MAX_AGE_MS) => {
  const isProduction = process.env.NODE_ENV === 'production'
  const sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')
  const secure = isProduction || process.env.COOKIE_SECURE === 'true'

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: typeof customMaxAge === 'number' ? customMaxAge : MAX_AGE_MS,
    path: '/',
  }
}

const setTokenCookie = (res, token, maxAge = MAX_AGE_MS) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions(maxAge))
}

const clearTokenCookie = (res) => {
  const options = getCookieOptions()
  delete options.maxAge
  res.clearCookie(COOKIE_NAME, options)
}

module.exports = {
  COOKIE_NAME,
  MAX_AGE_MS,
  ADMIN_MAX_AGE_MS,
  ADMIN_JWT_EXPIRES_IN,
  signToken,
  setTokenCookie,
  clearTokenCookie,
  getCookieOptions,
}
