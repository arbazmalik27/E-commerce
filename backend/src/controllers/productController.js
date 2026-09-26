const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Product = require('../models/Product')
const User = require('../models/User')
const { COOKIE_NAME } = require('../utils/jwt')
const {
  validateCreateProductInput,
  validateUpdateProductInput,
} = require('../validators/productValidator')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

const getProducts = async (req, res) => {
  try {
    let includeInactive = false
    if (req.query.all === 'true' || req.query.includeInactive === 'true') {
      const token = req.cookies && req.cookies[COOKIE_NAME]
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

    const { category, department, subcategory, search, sort, minPrice, maxPrice } = req.query

    if (category && typeof category === 'string' && category.trim()) {
      filter.category = category.trim().toLowerCase()
    }
    if (department && typeof department === 'string' && department.trim()) {
      filter.department = department.trim().toLowerCase()
    }
    if (subcategory && typeof subcategory === 'string' && subcategory.trim()) {
      filter.subcategory = subcategory.trim().toLowerCase()
    }
    if (search && typeof search === 'string' && search.trim()) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = new RegExp(sanitizedSearch, 'i')
      filter.$or = [{ name: searchRegex }, { brand: searchRegex }]
    }

    // Sanitize and apply price range filters
    let parsedMin
    if (minPrice !== undefined && minPrice !== null && String(minPrice).trim() !== '') {
      const num = Number(minPrice)
      if (!isNaN(num) && num >= 0) {
        parsedMin = num
      }
    }

    let parsedMax
    if (maxPrice !== undefined && maxPrice !== null && String(maxPrice).trim() !== '') {
      const num = Number(maxPrice)
      if (!isNaN(num) && num >= 0) {
        parsedMax = num
      }
    }

    if (parsedMin !== undefined && parsedMax !== undefined) {
      filter.price = { $gte: parsedMin, $lte: parsedMax }
    } else if (parsedMin !== undefined) {
      filter.price = { $gte: parsedMin }
    } else if (parsedMax !== undefined) {
      filter.price = { $lte: parsedMax }
    }

    // Determine sort ordering
    let sortObj = { createdAt: -1 }
    if (sort === 'price-asc') {
      sortObj = { price: 1, createdAt: -1 }
    } else if (sort === 'price-desc') {
      sortObj = { price: -1, createdAt: -1 }
    } else if (sort === 'newest') {
      sortObj = { createdAt: -1 }
    }

    // Sanitize pagination parameters
    let page = parseInt(req.query.page, 10)
    if (isNaN(page) || page < 1) {
      page = 1
    }

    let limit = parseInt(req.query.limit, 10)
    if (isNaN(limit) || limit < 1) {
      limit = 12
    } else {
      limit = Math.min(limit, 100) // Prevent unreasonable limit values
    }

    const skip = (page - 1) * limit

    const [totalProducts, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter).sort(sortObj).skip(skip).limit(limit),
    ])

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
    const token = req.cookies && req.cookies[COOKIE_NAME]
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id)
        if (user && user.role === 'admin' && user.isActive !== false) {
          query = { _id: id }
        }
      } catch {}
    }

    const product = await Product.findOne(query)

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' })
    }

    return res.status(200).json({
      success: true,
      product,
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

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
}
