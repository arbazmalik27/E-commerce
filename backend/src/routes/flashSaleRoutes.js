const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  getActiveFlashSales,
  getFlashSaleById,
  getAdminFlashSales,
  createFlashSale,
  updateFlashSale,
  toggleFlashSaleStatus,
  deleteFlashSale
} = require('../controllers/flashSaleController');

// Customer-facing public endpoints
router.get('/', getActiveFlashSales);
router.get('/:id', getFlashSaleById);

// Admin-only endpoints
router.get('/admin/all', authenticate, authorize('admin'), getAdminFlashSales);
router.post('/admin', authenticate, authorize('admin'), createFlashSale);
router.patch('/admin/:id', authenticate, authorize('admin'), updateFlashSale);
router.patch('/admin/:id/toggle', authenticate, authorize('admin'), toggleFlashSaleStatus);
router.delete('/admin/:id', authenticate, authorize('admin'), deleteFlashSale);

module.exports = router;
