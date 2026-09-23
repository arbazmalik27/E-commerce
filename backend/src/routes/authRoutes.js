const express = require('express')
const {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController')
const authenticate = require('../middleware/authenticate')
const { authLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/reset-password', authLimiter, resetPassword)
router.post('/logout', logout)
router.get('/me', authenticate, getMe)

module.exports = router
