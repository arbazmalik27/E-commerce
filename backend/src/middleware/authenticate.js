const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { COOKIE_NAME } = require('../utils/jwt')

const authenticate = async (req, res, next) => {
  const token =
    (req.cookies && req.cookies[COOKIE_NAME]) ||
    (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null)

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id)

    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Account has been disabled' })
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }

    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Not authenticated' })
  }
}

module.exports = authenticate
