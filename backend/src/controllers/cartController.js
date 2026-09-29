const Cart = require('../models/Cart')
const Product = require('../models/Product')
const {
  isValidObjectId,
  validateAddToCartInput,
  validateUpdateQuantityInput,
} = require('../validators/cartValidator')
const {
  getBatchEffectivePrices,
  calculateSalePrice,
} = require('../services/pricingService')

const formatCart = async (cart) => {
  if (!cart || !cart.items) {
    return {
      items: [],
      totalAmount: 0,
      totalItems: 0,
    }
  }

  const rawProducts = cart.items
    .filter((item) => item.product && typeof item.product === 'object' && item.product._id)
    .map((item) => item.product)

  // Fetch active flash sales for products in cart authoritatively
  const saleMap = await getBatchEffectivePrices(rawProducts)

  const validItems = cart.items
    .filter((item) => item.product && typeof item.product === 'object' && item.product._id)
    .map((item) => {
      const pId = item.product._id.toString()
      const originalPrice = typeof item.product.price === 'number' ? item.product.price : 0
      const activeSale = saleMap.get(pId)

      let effectivePrice = originalPrice
      let salePrice = null
      let discountPercentage = 0
      let isFlashSale = false
      let flashSaleInfo = null

      if (activeSale) {
        const pricing = calculateSalePrice(
          originalPrice,
          activeSale.discountType,
          activeSale.discountValue
        )
        effectivePrice = pricing.salePrice
        salePrice = pricing.salePrice
        discountPercentage = pricing.discountPercentage
        isFlashSale = true
        flashSaleInfo = {
          _id: activeSale._id,
          name: activeSale.name,
          slug: activeSale.slug,
          discountType: activeSale.discountType,
          discountValue: activeSale.discountValue,
          startAt: activeSale.startAt,
          endAt: activeSale.endAt,
        }
      }

      const itemTotal = Number((effectivePrice * item.quantity).toFixed(2))

      return {
        _id: item._id,
        size: item.size || null,
        product: {
          _id: item.product._id,
          name: item.product.name,
          price: effectivePrice,
          originalPrice,
          salePrice,
          discountPercentage,
          isFlashSale,
          flashSale: flashSaleInfo,
          images: item.product.images || [],
          category: item.product.category,
          brand: item.product.brand,
          stock: item.product.stock,
          isActive: item.product.isActive,
          sizes: item.product.sizes || [],
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
      'name price images category brand stock isActive sizes'
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

    const formattedCart = await formatCart(cart)
    return res.status(200).json({
      success: true,
      cart: formattedCart,
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

  const { productId, quantity, size } = sanitized

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

    let selectedSize = null
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      if (!size) {
        return res.status(400).json({
          success: false,
          message: 'Please select a size for this product',
        })
      }
      const matched = product.sizes.find(
        (s) => s.label.toLowerCase() === size.toLowerCase()
      )
      if (!matched) {
        return res.status(400).json({
          success: false,
          message: `Size "${size}" is not valid for this product`,
        })
      }
      if (matched.available === false) {
        return res.status(400).json({
          success: false,
          message: `Size "${matched.label}" is currently out of stock`,
        })
      }
      selectedSize = matched.label
    }

    let cart = await Cart.findOne({ user: req.user.id })

    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        items: [],
      })
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product &&
        item.product.toString() === productId.toString() &&
        (item.size || null) === (selectedSize || null)
    )

    const otherQty = cart.items
      .filter((item, idx) => item.product && item.product.toString() === productId.toString() && idx !== existingItemIndex)
      .reduce((sum, item) => sum + item.quantity, 0)

    const targetQty = (existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0) + quantity

    if (otherQty + targetQty > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock})`,
      })
    }

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = targetQty
    } else {
      cart.items.push({
        product: productId,
        quantity,
        size: selectedSize,
      })
    }

    await cart.save()
    await cart.populate('items.product', 'name price images category brand stock isActive sizes')

    const formattedCart = await formatCart(cart)
    return res.status(200).json({
      success: true,
      cart: formattedCart,
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
      (item) =>
        (item._id && item._id.toString() === productId.toString()) ||
        (item.product && item.product.toString() === productId.toString() && (!req.query.size || item.size === req.query.size))
    )

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in cart' })
    }

    const targetItem = cart.items[itemIndex]
    const product = await Product.findById(targetItem.product)

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    if (!product.isActive) {
      return res.status(400).json({ success: false, message: 'Product is inactive' })
    }

    const otherQty = cart.items
      .filter((item, idx) => item.product && item.product.toString() === targetItem.product.toString() && idx !== itemIndex)
      .reduce((sum, item) => sum + item.quantity, 0)

    if (otherQty + quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity exceeds available stock (${product.stock})`,
      })
    }

    cart.items[itemIndex].quantity = quantity
    await cart.save()
    await cart.populate('items.product', 'name price images category brand stock isActive sizes')

    const formattedCart = await formatCart(cart)
    return res.status(200).json({
      success: true,
      cart: formattedCart,
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
      (item) =>
        (item._id && item._id.toString() === productId.toString()) ||
        (item.product && item.product.toString() === productId.toString() && (!req.query.size || item.size === req.query.size))
    )

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in cart' })
    }

    cart.items.splice(itemIndex, 1)
    await cart.save()
    await cart.populate('items.product', 'name price images category brand stock isActive sizes')

    const formattedCart = await formatCart(cart)
    return res.status(200).json({
      success: true,
      cart: formattedCart,
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
