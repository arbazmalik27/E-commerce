const express = require('express')
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAdminOrders,
  updateOrderStatus,
} = require('../controllers/orderController')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')

const router = express.Router()

// All order routes require authentication
router.use(authenticate)

// Customer endpoints
router.post('/', createOrder)
router.get('/', getMyOrders)

// Admin endpoints (must define /admin before /:id)
router.get('/admin', authorize('admin'), getAdminOrders)
router.patch('/:id/status', authorize('admin'), updateOrderStatus)

// Customer single order endpoint
router.get('/:id', getOrderById)

module.exports = router
