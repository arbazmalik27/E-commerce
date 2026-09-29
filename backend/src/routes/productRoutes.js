const express = require('express')
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getPersonalizedProducts,
  getWishlistRecommendations,
} = require('../controllers/productController')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')

const router = express.Router()

router.get('/', getProducts)
router.get('/personalized', getPersonalizedProducts)
router.get('/wishlist-recommendations', authenticate, getWishlistRecommendations)
router.get('/:id', getProductById)
router.post('/', authenticate, authorize('admin'), createProduct)
router.put('/:id', authenticate, authorize('admin'), updateProduct)
router.delete('/:id', authenticate, authorize('admin'), deleteProduct)

module.exports = router
