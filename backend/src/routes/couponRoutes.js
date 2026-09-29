const express = require('express')
const {
  validateCoupon,
  getAdminCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getCustomerOffers,
} = require('../controllers/couponController')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { couponLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// Customer endpoints — require authentication & rate limiter
router.get('/offers', authenticate, couponLimiter, getCustomerOffers)
router.post('/validate', authenticate, couponLimiter, validateCoupon)

// Admin endpoints — all require admin authorization
router.get('/admin', authenticate, authorize('admin'), getAdminCoupons)
router.post('/admin', authenticate, authorize('admin'), createCoupon)
router.get('/admin/:id', authenticate, authorize('admin'), getCouponById)
router.patch('/admin/:id', authenticate, authorize('admin'), updateCoupon)
router.patch('/admin/:id/status', authenticate, authorize('admin'), toggleCouponStatus)
router.delete('/admin/:id', authenticate, authorize('admin'), deleteCoupon)

module.exports = router
