const jwt = require('jsonwebtoken')

const COOKIE_NAME = 'token'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  const sameSite = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')
  const secure = isProduction || process.env.COOKIE_SECURE === 'true'

  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: MAX_AGE_MS,
    path: '/',
  }
}

const setTokenCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, getCookieOptions())
}

const clearTokenCookie = (res) => {
  const options = getCookieOptions()
  delete options.maxAge
  res.clearCookie(COOKIE_NAME, options)
}

module.exports = { COOKIE_NAME, MAX_AGE_MS, signToken, setTokenCookie, clearTokenCookie, getCookieOptions }
