const Cart = require('../models/Cart')
const Product = require('../models/Product')
const {
  isValidObjectId,
  validateAddToCartInput,
  validateUpdateQuantityInput,
} = require('../validators/cartValidator')

const formatCart = (cart) => {
  if (!cart || !cart.items) {
    return {
      items: [],
      totalAmount: 0,
      totalItems: 0,
    }
  }

  const validItems = cart.items
    .filter((item) => item.product && typeof item.product === 'object' && item.product._id)
    .map((item) => {
      const price = typeof item.product.price === 'number' ? item.product.price : 0
      const itemTotal = Number((price * item.quantity).toFixed(2))

      return {
        _id: item._id,
        product: {
          _id: item.product._id,
          name: item.product.name,
          price: item.product.price,
          images: item.product.images || [],
          category: item.product.category,
          brand: item.product.brand,
          stock: item.product.stock,
          isActive: item.product.isActive,
        },
        quantity: item.quantity,
        itemTotal,
      }
    })

  const totalAmount = Number(
    validItems.reduce((acc, item) => acc + item.itemTotal, 0).toFixed(2)
  )
  const totalItems = validItems.reduce((acc, item) => acc + item.quantity, 0)

  return {
    _id: cart._id,
    items: validItems,
    totalAmount,
    totalItems,
  }
}

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      'items.product',
      'name price images category brand stock isActive'
    )

    if (!cart) {
      return res.status(200).json({
        success: true,
        cart: {
          items: [],
          totalAmount: 0,
          totalItems: 0,
        },
      })
    }

    const hasMissingProducts = cart.items.some((item) => !item.product)
    if (hasMissingProducts) {
      cart.items = cart.items.filter((item) => item.product)
      await cart.save()
    }

    return res.status(200).json({
      success: true,
      cart: formatCart(cart),
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const addToCart = async (req, res) => {
  const { isValid, errors, sanitized } = validateAddToCartInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { productId, quantity } = sanitized

  try {
    const product = await Product.findById(productId)

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    if (!product.isActive) {
      return res.status(400).json({ success: false, message: 'Product is inactive' })
    }

    if (product.stock < 1) {
      return res.status(400).json({ success: false, message: 'Product is out of stock' })
    }

    let cart = await Cart.findOne({ user: req.user.id })

    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        items: [],
      })
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.product && item.product.toString() === productId.toString()
    )

    if (existingItemIndex > -1) {
      const combinedQuantity = cart.items[existingItemIndex].quantity + quantity

      if (combinedQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity exceeds available stock (${product.stock})`,
        })
      }

      cart.items[existingItemIndex].quantity = combinedQuantity
    } else {
      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity exceeds available stock (${product.stock})`,
        })
      }

      cart.items.push({
        product: productId,
        quantity,
      })
    }

    await cart.save()
    await cart.populate('items.product', 'name price images category brand stock isActive')

    return res.status(200).json({
      success: true,
      cart: formatCart(cart),
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateCartItem = async (req, res) => {
  const { productId } = req.params

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  const { isValid, errors, sanitized } = validateUpdateQuantityInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { quantity } = sanitized

  try {
    const cart = await Cart.findOne({ user: req.user.id })

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' })
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product && item.product.toString() === productId.toString()
    )

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in cart' })
    }

    const product = await Product.findById(productId)

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    if (!product.isActive) {
      return res.status(400).json({ success: false, message: 'Product is inactive' })
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock})`,
      })
    }

    cart.items[itemIndex].quantity = quantity
    await cart.save()
    await cart.populate('items.product', 'name price images category brand stock isActive')

    return res.status(200).json({
      success: true,
      cart: formatCart(cart),
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const removeCartItem = async (req, res) => {
  const { productId } = req.params

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  try {
    const cart = await Cart.findOne({ user: req.user.id })

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Product not found in cart' })
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product && item.product.toString() === productId.toString()
    )

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in cart' })
    }

    cart.items.splice(itemIndex, 1)
    await cart.save()
    await cart.populate('items.product', 'name price images category brand stock isActive')

    return res.status(200).json({
      success: true,
      cart: formatCart(cart),
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })

    if (cart) {
      cart.items = []
      await cart.save()
    }

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      cart: {
        items: [],
        totalAmount: 0,
        totalItems: 0,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
}
