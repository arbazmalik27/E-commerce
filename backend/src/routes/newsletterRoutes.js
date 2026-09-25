const express = require('express')
const { subscribe } = require('../controllers/newsletterController')
const { newsletterLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// Public endpoint for newsletter subscription with rate limiting
router.post('/subscribe', newsletterLimiter, subscribe)

module.exports = router
