const express = require('express')
const {
  subscribeStockAlert,
  getAlertStatus,
  cancelStockAlert,
  getMyAlerts,
} = require('../controllers/stockAlertController')
const authenticate = require('../middleware/authenticate')
const { stockAlertLimiter } = require('../middleware/rateLimiter')

const router = express.Router()

// All stock alert operations require authentication
router.use(authenticate)

router.post('/', stockAlertLimiter, subscribeStockAlert)
router.get('/status', getAlertStatus)
router.get('/my', getMyAlerts)
router.delete('/:id', stockAlertLimiter, cancelStockAlert)

module.exports = router
