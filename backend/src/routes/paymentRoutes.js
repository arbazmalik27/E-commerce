const express = require('express')
const {
  createRazorpayOrder,
  verifyPayment,
} = require('../controllers/paymentController')
const authenticate = require('../middleware/authenticate')
const { paymentLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

router.use(authenticate)

router.post('/create-order', paymentLimiter, createRazorpayOrder)
router.post('/razorpay-order', paymentLimiter, createRazorpayOrder)
router.post('/verify', paymentLimiter, verifyPayment)

module.exports = router
