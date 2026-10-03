const express = require('express')
const router = express.Router()

const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { analyticsLimiter } = require('../middleware/rateLimiter')

const {
  getProductSalesPerformance,
  getCategorySalesPerformance,
  getBrandSalesPerformance,
  getSalesTrends,
  getZeroSalesProducts,
  getStockVsSalesInsights,
} = require('../controllers/salesInsightsController')

// All sales-insights routes are read-only, rate-limited, and restricted to authenticated Admins
router.use(authenticate, authorize('admin'), analyticsLimiter)

router.get('/products', getProductSalesPerformance)
router.get('/categories', getCategorySalesPerformance)
router.get('/brands', getBrandSalesPerformance)
router.get('/trends', getSalesTrends)
router.get('/zero-sales', getZeroSalesProducts)
router.get('/stock-sales', getStockVsSalesInsights)

module.exports = router
