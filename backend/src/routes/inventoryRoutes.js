const express = require('express')
const {
  getInventoryOverview,
  adjustProductStock,
} = require('../controllers/inventoryController')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')

const router = express.Router()

// All inventory routes are admin-only
router.use(authenticate, authorize('admin'))

router.get('/', getInventoryOverview)
router.patch('/:id', adjustProductStock)

module.exports = router
