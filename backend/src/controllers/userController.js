const mongoose = require('mongoose')
const User = require('../models/User')
const Product = require('../models/Product')
const {
  validateUpdateProfileInput,
  validateAddressInput,
} = require('../validators/userValidator')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

// GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  const { isValid, errors, sanitized } = validateUpdateProfileInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Only update permitted fields
    user.name = sanitized.name
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/users/addresses
const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    return res.status(200).json({
      success: true,
      addresses: user.addresses || [],
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/users/addresses
const createAddress = async (req, res) => {
  const { isValid, errors, sanitized } = validateAddressInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // If marked default or this is the first address, ensure it is the only default
    const shouldBeDefault = sanitized.isDefault || user.addresses.length === 0
    if (shouldBeDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false
      })
    }

    const newAddress = {
      ...sanitized,
      isDefault: shouldBeDefault,
    }

    user.addresses.push(newAddress)
    await user.save()

    const createdAddress = user.addresses[user.addresses.length - 1]

    return res.status(201).json({
      success: true,
      message: 'Address saved successfully',
      address: createdAddress,
      addresses: user.addresses,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PUT /api/users/addresses/:id
const updateAddress = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid address ID' })
  }

  const { isValid, errors, sanitized } = validateAddressInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const address = user.addresses.id(id)
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' })
    }

    if (sanitized.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false
      })
    } else if (address.isDefault && user.addresses.length === 1) {
      // If it's the sole address, keep it default
      sanitized.isDefault = true
    }

    address.fullName = sanitized.fullName
    address.phone = sanitized.phone
    address.addressLine = sanitized.addressLine
    address.city = sanitized.city
    address.state = sanitized.state
    address.postalCode = sanitized.postalCode
    address.country = sanitized.country
    address.isDefault = sanitized.isDefault

    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      address,
      addresses: user.addresses,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/users/addresses/:id
const deleteAddress = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid address ID' })
  }

  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const address = user.addresses.id(id)
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' })
    }

    const wasDefault = address.isDefault
    user.addresses.pull(id)

    // If the removed address was default and remaining addresses exist, promote the first one
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true
    }

    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      addresses: user.addresses,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PATCH /api/users/addresses/:id/default
const setDefaultAddress = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid address ID' })
  }

  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const target = user.addresses.id(id)
    if (!target) {
      return res.status(404).json({ success: false, message: 'Address not found' })
    }

    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.toString() === id
    })

    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Default address updated',
      addresses: user.addresses,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET /api/users/wishlist
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      model: 'Product',
      select: 'name description price category department subcategory brand images stock isActive',
    })

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Return all wishlisted products; flag inactive ones so the UI can handle them safely
    const products = (user.wishlist || []).map((product) => ({
      ...product.toObject(),
      _wishlisted: true,
    }))

    return res.status(200).json({
      success: true,
      wishlist: products,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/users/wishlist/:productId
const addToWishlist = async (req, res) => {
  const { productId } = req.params

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  try {
    // Verify product exists and is active
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }
    if (!product.isActive) {
      return res.status(400).json({ success: false, message: 'Product is not available' })
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Prevent duplicate entries
    const alreadyWishlisted = user.wishlist.some(
      (id) => id.toString() === productId
    )
    if (alreadyWishlisted) {
      return res.status(200).json({ success: true, message: 'Already in wishlist' })
    }

    user.wishlist.push(productId)
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Added to wishlist',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/users/wishlist/:productId
const removeFromWishlist = async (req, res) => {
  const { productId } = req.params

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Safe remove — no error if not present
    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId)
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'Removed from wishlist',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
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
}
