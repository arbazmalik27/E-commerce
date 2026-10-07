/**
 * TrendVolt Phase 3C — Avatar Routes
 * Authenticated endpoints for customer 3D avatar profile.
 */

const express = require('express')
const authenticate = require('../middleware/authenticate')
const {
  getAvatar,
  createAvatar,
  updateAvatar,
  deleteAvatar,
} = require('../controllers/avatarController')

const router = express.Router()

// All avatar operations require customer authentication
router.use(authenticate)

router
  .route('/')
  .get(getAvatar)
  .post(createAvatar)
  .put(updateAvatar)
  .delete(deleteAvatar)

module.exports = router
