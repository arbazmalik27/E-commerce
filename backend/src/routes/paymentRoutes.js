const express = require('express')
const {
  createRazorpayOrder,
  verifyPayment,
} = require('../controllers/paymentController')
const authenticate = require('../middleware/authenticate')

const router = express.Router()

router.use(authenticate)

router.post('/create-order', createRazorpayOrder)
router.post('/verify', verifyPayment)

module.exports = router
