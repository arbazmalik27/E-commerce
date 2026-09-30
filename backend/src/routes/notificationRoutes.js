const express = require('express')
const {
  getNotifications,
  getUnreadCount,
  markOneRead,
  markAllRead,
} = require('../controllers/notificationController')
const authenticate = require('../middleware/authenticate')
const { notificationLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// All notification routes are customer-scoped and require authentication + rate limiting
router.use(authenticate)
router.use(notificationLimiter)

router.get('/', getNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/mark-all-read', markAllRead)
router.patch('/:id/read', markOneRead)

module.exports = router
