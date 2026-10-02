const express = require('express')
const {
  getOverviewAnalytics,
  getProductAnalytics,
  getCustomerAnalytics,
  getCouponAnalytics,
  getPaymentAnalytics,
} = require('../controllers/analyticsController')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { analyticsLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// All analytics routes require authentication, admin role, and rate limiting
router.use(authenticate)
router.use(authorize('admin'))
router.use(analyticsLimiter)

// Read-only Admin Analytics Endpoints
router.get('/overview', getOverviewAnalytics)
router.get('/products', getProductAnalytics)
router.get('/customers', getCustomerAnalytics)
router.get('/coupons', getCouponAnalytics)
router.get('/payments', getPaymentAnalytics)

module.exports = router
