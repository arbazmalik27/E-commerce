const express = require('express')
const {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../controllers/userController')
const authenticate = require('../middleware/authenticate')

const router = express.Router()

// All user profile and address routes require authentication
router.use(authenticate)

router.get('/profile', getProfile)
router.put('/profile', updateProfile)

router.get('/addresses', getAddresses)
router.post('/addresses', createAddress)
router.put('/addresses/:id', updateAddress)
router.delete('/addresses/:id', deleteAddress)
router.patch('/addresses/:id/default', setDefaultAddress)

router.get('/wishlist', getWishlist)
router.post('/wishlist/:productId', addToWishlist)
router.delete('/wishlist/:productId', removeFromWishlist)

module.exports = router
