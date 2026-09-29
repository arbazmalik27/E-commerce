const express = require('express')
const {
  getProductReviews,
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
  getAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview,
} = require('../controllers/reviewController')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { reviewLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// Public endpoint: Fetch approved reviews & rating aggregates for a product
router.get('/product/:productId', getProductReviews)

// Customer endpoints (Authentication required)
router.get('/eligibility/:productId', authenticate, checkReviewEligibility)
router.post('/', authenticate, reviewLimiter, createReview)
router.put('/:id', authenticate, reviewLimiter, updateReview)
router.delete('/:id', authenticate, deleteReview)

// Admin endpoints (Admin role required)
router.get('/admin', authenticate, authorize('admin'), getAdminReviews)
router.patch('/admin/:id/status', authenticate, authorize('admin'), updateAdminReviewStatus)
router.delete('/admin/:id', authenticate, authorize('admin'), deleteAdminReview)

module.exports = router
