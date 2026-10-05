const Product = require('../models/Product')
const { processBackInStockAlerts } = require('../services/stockAlertService')
const {
  DEFAULT_LOW_STOCK_THRESHOLD,
  isValidObjectId,
  getStockStatus,
  validateInventoryQueryParams,
  validateUpdateStockInput,
} = require('../validators/inventoryValidator')

/**
 * GET /api/admin/inventory
 * Retrieves paginated, filterable catalog inventory with summary metrics.
 * Restricted to authenticated Admin users.
 */
const getInventoryOverview = async (req, res) => {
  try {
    const sanitizedQuery = validateInventoryQueryParams(req.query)
    const { page, limit, search, stockStatus, department, sortBy, sortOrder } = sanitizedQuery

    // Operational inventory filter strictly targets active products
    const filter = { isActive: true }

    // Search across name, brand, department, subcategory, category, and _id
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      const searchConditions = [
        { name: regex },
        { brand: regex },
        { department: regex },
        { subcategory: regex },
        { category: regex },
      ]
      if (isValidObjectId(search)) {
        searchConditions.push({ _id: search })
      }
      filter.$or = searchConditions
    }

    // Department filter
    if (department) {
      filter.department = department
    }

    // Server-side authoritative stock status filter
    if (stockStatus === 'out_of_stock') {
      filter.stock = { $lte: 0 }
    } else if (stockStatus === 'low_stock') {
      filter.stock = { $gt: 0, $lte: DEFAULT_LOW_STOCK_THRESHOLD }
    } else if (stockStatus === 'in_stock') {
      filter.stock = { $gt: DEFAULT_LOW_STOCK_THRESHOLD }
    }

    // Sort configuration
    const sortDirection = sortOrder === 'desc' ? -1 : 1
    const sortObj = {}
    sortObj[sortBy] = sortDirection
    if (sortBy !== '_id') {
      sortObj._id = 1
    }

    const skip = (page - 1) * limit

    // Execute overview count, paginated query, and catalog summary concurrently
    const [totalProductsFiltered, rawProducts, summaryAgg] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .select('_id name images brand category department price stock isActive updatedAt')
        .lean(),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            inStockCount: {
              $sum: { $cond: [{ $gt: ['$stock', DEFAULT_LOW_STOCK_THRESHOLD] }, 1, 0] },
            },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ['$stock', 0] },
                      { $lte: ['$stock', DEFAULT_LOW_STOCK_THRESHOLD] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            outOfStockCount: {
              $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] },
            },
          },
        },
      ]),
    ])

    const summaryData = summaryAgg[0] || {}
    const summary = {
      totalProducts: summaryData.totalProducts || 0,
      inStockCount: summaryData.inStockCount || 0,
      lowStockCount: summaryData.lowStockCount || 0,
      outOfStockCount: summaryData.outOfStockCount || 0,
    }

    const totalPages = Math.ceil(totalProductsFiltered / limit) || 1

    const products = rawProducts.map((p) => ({
      _id: p._id,
      name: p.name,
      image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      brand: p.brand || 'Unbranded',
      category: p.category || 'fashion',
      department: p.department || null,
      price: typeof p.price === 'number' ? p.price : 0,
      stock: typeof p.stock === 'number' ? p.stock : 0,
      isActive: p.isActive !== false,
      updatedAt: p.updatedAt,
      stockStatus: getStockStatus(p.stock),
    }))

    return res.status(200).json({
      success: true,
      summary,
      pagination: {
        page,
        limit,
        totalProducts: totalProductsFiltered,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      products,
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving inventory overview',
    })
  }
}

/**
 * PATCH /api/admin/inventory/:id
 * Atomically SETS product stock.
 * Evaluates transition <= 0 -> > 0 and dispatches back-in-stock alerts.
 * Restricted to authenticated Admin users.
 */
const adjustProductStock = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid product ID',
    })
  }

  const { isValid, errors, sanitized } = validateUpdateStockInput(req.body)
  if (!isValid) {
    return res.status(400).json({
      success: false,
      errors,
    })
  }

  try {
    // Atomically update stock on the product and retrieve the prior document state
    const previousProduct = await Product.findByIdAndUpdate(
      id,
      { $set: { stock: sanitized.stock } },
      { returnDocument: 'before', runValidators: true }
    )

    if (!previousProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      })
    }

    // Determine if inventory transitioned from out-of-stock (<= 0) to in-stock (> 0)
    const wasOutOfStock =
      typeof previousProduct.stock !== 'number' || previousProduct.stock <= 0
    const isNowInStock = sanitized.stock > 0
    const replenished = wasOutOfStock && isNowInStock

    if (replenished) {
      try {
        const updatedProduct = {
          ...previousProduct.toObject(),
          stock: sanitized.stock,
        }
        await processBackInStockAlerts({
          product: updatedProduct,
          previousProduct,
        })
      } catch (alertErr) {
        console.error('Non-fatal error processing back-in-stock alerts on inventory update:', alertErr.message)
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      product: {
        _id: previousProduct._id,
        name: previousProduct.name,
        stock: sanitized.stock,
        previousStock: previousProduct.stock,
        stockStatus: getStockStatus(sanitized.stock),
        updatedAt: new Date(),
      },
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error updating product stock',
    })
  }
}

module.exports = {
  getInventoryOverview,
  adjustProductStock,
}
