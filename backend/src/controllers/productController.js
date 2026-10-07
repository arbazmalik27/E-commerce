const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Product = require('../models/Product')
const User = require('../models/User')
const FlashSale = require('../models/FlashSale')
const {
  getEffectiveProductPrice,
  getBatchEffectivePrices,
  enrichProductWithPricing,
} = require('../services/pricingService')
const { getPersonalizedFeed } = require('../services/personalizationService')
const { getWishlistRecommendations: getWishlistRecsService } = require('../services/wishlistRecommendationService')
const { COOKIE_NAME } = require('../utils/jwt')
const {
  validateCreateProductInput,
  validateUpdateProductInput,
  validateProductQueryParams,
} = require('../validators/productValidator')
const { processBackInStockAlerts } = require('../services/stockAlertService')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

const getProducts = async (req, res) => {
  try {
    let includeInactive = false
    if (req.query.all === 'true' || req.query.includeInactive === 'true') {
      const token =
        (req.cookies && req.cookies[COOKIE_NAME]) ||
        (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
          ? req.headers.authorization.split(' ')[1]
          : null)
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)
          const user = await User.findById(decoded.id)
          if (user && user.role === 'admin' && user.isActive !== false) {
            includeInactive = true
          }
        } catch {}
      }
    }

    const filter = includeInactive ? {} : { isActive: true }

    if (includeInactive) {
      if (req.query.status === 'active' || req.query.isActive === 'true') {
        filter.isActive = true
      } else if (req.query.status === 'inactive' || req.query.isActive === 'false') {
        filter.isActive = false
      }
    }

    // Validate and sanitize all query parameters
    const sanitizedQuery = validateProductQueryParams(req.query)

    // Category filter
    if (sanitizedQuery.category) {
      filter.category = sanitizedQuery.category
    }

    // Department filter
    if (sanitizedQuery.department) {
      filter.department = sanitizedQuery.department
    }

    // Subcategory filter
    if (sanitizedQuery.subcategory) {
      filter.subcategory = sanitizedQuery.subcategory
    }

    // Try-On capability filter
    if (sanitizedQuery.tryOn) {
      filter['tryOn.enabled'] = true
    }

    // Specific IDs filter (e.g. for batch fetching or recently viewed)
    if (sanitizedQuery.ids && sanitizedQuery.ids.length > 0) {
      filter._id = { $in: sanitizedQuery.ids }
    }

    // Advanced Fashion Search across name, description, brand, category, department, subcategory
    if (sanitizedQuery.search) {
      const escapedSearch = sanitizedQuery.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const fullRegex = new RegExp(escapedSearch, 'i')

      const tokens = sanitizedQuery.search.split(/\s+/).filter(Boolean)
      if (tokens.length <= 1) {
        filter.$or = [
          { name: fullRegex },
          { description: fullRegex },
          { brand: fullRegex },
          { category: fullRegex },
          { department: fullRegex },
          { subcategory: fullRegex },
        ]
      } else {
        const tokenConditions = tokens.map((token) => {
          const tokenRegex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
          return {
            $or: [
              { name: tokenRegex },
              { description: tokenRegex },
              { brand: tokenRegex },
              { category: tokenRegex },
              { department: tokenRegex },
              { subcategory: tokenRegex },
            ],
          }
        })
        filter.$or = [
          { name: fullRegex },
          { description: fullRegex },
          { brand: fullRegex },
          { category: fullRegex },
          { department: fullRegex },
          { subcategory: fullRegex },
          { $and: tokenConditions },
        ]
      }
    }

    // Brand filter (supports single brand or comma-separated list)
    if (sanitizedQuery.brand) {
      const brandList = sanitizedQuery.brand.split(',').map((b) => b.trim()).filter(Boolean)
      if (brandList.length === 1) {
        const escapedBrand = brandList[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        filter.brand = new RegExp(`^${escapedBrand}$`, 'i')
      } else if (brandList.length > 1) {
        filter.brand = {
          $in: brandList.map((b) => new RegExp(`^${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')),
        }
      }
    }

    // Price range filters
    if (sanitizedQuery.minPrice !== undefined && sanitizedQuery.maxPrice !== undefined) {
      filter.price = { $gte: sanitizedQuery.minPrice, $lte: sanitizedQuery.maxPrice }
    } else if (sanitizedQuery.minPrice !== undefined) {
      filter.price = { $gte: sanitizedQuery.minPrice }
    } else if (sanitizedQuery.maxPrice !== undefined) {
      filter.price = { $lte: sanitizedQuery.maxPrice }
    }

    // Stock / Availability filter
    if (sanitizedQuery.availability === 'in-stock') {
      filter.stock = { $gt: 0 }
    } else if (sanitizedQuery.availability === 'out-of-stock') {
      filter.stock = { $lte: 0 }
    }

    // Flash Sale filter: retrieve product IDs belonging to currently active flash sales
    if (sanitizedQuery.flashSale) {
      const now = new Date()
      const activeSales = await FlashSale.find({
        active: true,
        startAt: { $lte: now },
        endAt: { $gte: now },
      }).select('products').lean()
      const flashProductIds = activeSales.flatMap((s) => s.products.map((p) => p.toString()))
      if (filter._id && filter._id.$in) {
        filter._id = { $in: filter._id.$in.filter((id) => flashProductIds.includes(id.toString())) }
      } else {
        filter._id = { $in: flashProductIds }
      }
    }

    // Determine sort ordering
    let sortObj = { createdAt: -1 }
    if (sanitizedQuery.sort === 'price-asc') {
      sortObj = { price: 1, createdAt: -1 }
    } else if (sanitizedQuery.sort === 'price-desc') {
      sortObj = { price: -1, createdAt: -1 }
    } else if (sanitizedQuery.sort === 'newest') {
      sortObj = { createdAt: -1 }
    } else if (sanitizedQuery.sort === 'relevance' || sanitizedQuery.sort === 'default') {
      sortObj = { createdAt: -1 }
    }

    // Pagination
    const page = sanitizedQuery.page
    const limit = sanitizedQuery.limit
    const skip = (page - 1) * limit

    const [totalProducts, rawProducts, brands] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      Product.distinct('brand', includeInactive ? {} : { isActive: true }),
    ])

    // Enrich products with active flash sale pricing
    const saleMap = await getBatchEffectivePrices(rawProducts)
    const products = rawProducts.map((p) => enrichProductWithPricing(p, saleMap))

    const totalPages = Math.ceil(totalProducts / limit) || 1
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        totalProducts,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      brands: brands.filter(Boolean).sort(),
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getProductById = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  try {
    let query = { _id: id, isActive: true }

    // If an authenticated admin requests product details, allow viewing inactive products
    const token =
      (req.cookies && req.cookies[COOKIE_NAME]) ||
      (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null)
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id)
        if (user && user.role === 'admin' && user.isActive !== false) {
          query = { _id: id }
        }
      } catch {}
    }

    const product = await Product.findOne(query).lean()

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    // Enrich product with authoritative flash sale pricing (and upcoming sale if scheduled)
    const pricing = await getEffectiveProductPrice(product)
    const enrichedProduct = {
      ...product,
      price: pricing.price,
      originalPrice: pricing.originalPrice,
      salePrice: pricing.salePrice,
      discountPercentage: pricing.discountPercentage,
      isFlashSale: pricing.isFlashSale,
      flashSale: pricing.flashSale,
      upcomingFlashSale: pricing.upcomingFlashSale,
    }

    return res.status(200).json({
      success: true,
      product: enrichedProduct,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createProduct = async (req, res) => {
  const { isValid, errors, sanitized } = validateCreateProductInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const product = await Product.create(sanitized)

    return res.status(201).json({
      success: true,
      product,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateProduct = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  try {
    const existing = await Product.findById(id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    const { isValid, errors, sanitized } = validateUpdateProductInput(req.body, existing)

    if (!isValid) {
      return res.status(400).json({ success: false, errors })
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, sanitized, {
      new: true,
      runValidators: true,
    })

    // Trigger back-in-stock alerts if stock or size availability replenished
    try {
      await processBackInStockAlerts({
        product: updatedProduct,
        previousProduct: existing,
      })
    } catch (alertErr) {
      console.error('Non-fatal back-in-stock alert trigger error:', alertErr.message)
    }

    return res.status(200).json({
      success: true,
      product: updatedProduct,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const deleteProduct = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  try {
    const product = await Product.findById(id)

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    product.isActive = false
    await product.save()

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      product,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * GET /api/products/personalized
 * Returns personalized recommendations for the homepage.
 * - Authenticated user: uses orders, wishlist, and recently viewed.
 * - Guest user: uses safe recently viewed IDs.
 * - Cold start: returns hasPersonalization: false.
 */
const getPersonalizedProducts = async (req, res) => {
  try {
    let userId = null

    // Safe optional authentication
    const token =
      (req.cookies && req.cookies[COOKIE_NAME]) ||
      (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null)

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id).select('_id isActive role')
        if (user && user.isActive !== false) {
          userId = user._id.toString()
        }
      } catch {
        // Expired/invalid token falls back gracefully to guest mode
      }
    }

    const rawRecent = req.query.recent || req.query.recentIds
    const limit = Math.min(12, Math.max(2, parseInt(req.query.limit, 10) || 4))

    const result = await getPersonalizedFeed({
      userId,
      recentIds: rawRecent,
      limit,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error while generating personalized recommendations',
    })
  }
}

/**
 * GET /api/products/wishlist-recommendations
 * Returns deterministic fashion recommendations derived from the authenticated user's wishlist.
 * User ID is strictly taken from req.user.id (prevent IDOR).
 */
const getWishlistRecommendations = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id.toString() : null
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    const limit = Math.min(8, Math.max(1, parseInt(req.query.limit, 10) || 4))

    const result = await getWishlistRecsService(userId, { limit })

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error while generating wishlist recommendations',
    })
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getPersonalizedProducts,
  getWishlistRecommendations,
}
