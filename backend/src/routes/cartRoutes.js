const express = require('express')
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController')
const authenticate = require('../middleware/authenticate')

const router = express.Router()

router.use(authenticate)

router.get('/', getCart)
router.delete('/', clearCart)
router.post('/items', addToCart)
router.patch('/items/:productId', updateCartItem)
router.delete('/items/:productId', removeCartItem)

module.exports = router
