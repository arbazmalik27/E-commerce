const FlashSale = require('../models/FlashSale')
const Product = require('../models/Product')
const {
  isValidObjectId,
  validateCreateFlashSaleInput,
  validateUpdateFlashSaleInput,
} = require('../validators/flashSaleValidator')
const {
  checkProductConflict,
  calculateSalePrice,
} = require('../services/pricingService')

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function computeSaleStatus(sale, now = new Date()) {
  if (!sale.active) return 'INACTIVE'
  const start = new Date(sale.startAt).getTime()
  const end = new Date(sale.endAt).getTime()
  const current = now.getTime()

  if (current < start) return 'UPCOMING'
  if (current > end) return 'EXPIRED'
  return 'ACTIVE'
}

/**
 * Customer: GET /api/flash-sales
 * Returns currently active flash sales for storefront display.
 * Exposes safe customer-visible fields only.
 */
const getActiveFlashSales = async (_req, res) => {
  try {
    const now = new Date()
    const activeSales = await FlashSale.find({
      active: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'products',
        match: { isActive: true },
        select: 'name price images category department subcategory brand stock isActive sizes',
      })
      .lean()

    const formattedSales = activeSales.map((sale) => {
      const validProducts = (sale.products || [])
        .filter(Boolean)
        .map((prod) => {
          const { salePrice, discountPercentage } = calculateSalePrice(
            prod.price,
            sale.discountType,
            sale.discountValue
          )
          return {
            _id: prod._id,
            name: prod.name,
            originalPrice: prod.price,
            price: salePrice,
            salePrice,
            discountPercentage,
            images: prod.images || [],
            category: prod.category,
            brand: prod.brand,
            stock: prod.stock,
            isActive: prod.isActive,
            sizes: prod.sizes || [],
            isFlashSale: true,
            flashSale: {
              _id: sale._id,
              name: sale.name,
              endAt: sale.endAt,
              discountType: sale.discountType,
              discountValue: sale.discountValue,
            },
          }
        })

      return {
        _id: sale._id,
        name: sale.name,
        slug: sale.slug,
        description: sale.description || '',
        discountType: sale.discountType,
        discountValue: sale.discountValue,
        startAt: sale.startAt,
        endAt: sale.endAt,
        products: validProducts,
      }
    })

    return res.status(200).json({
      success: true,
      flashSales: formattedSales,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Customer / Admin: GET /api/flash-sales/:id
 */
const getFlashSaleById = async (req, res) => {
  const { id } = req.params

  try {
    let query = isValidObjectId(id) ? { _id: id } : { slug: id }
    const sale = await FlashSale.findOne(query)
      .populate({
        path: 'products',
        match: { isActive: true },
        select: 'name price images category brand stock isActive sizes',
      })
      .lean()

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Flash sale not found' })
    }

    const now = new Date()
    const status = computeSaleStatus(sale, now)

    const validProducts = (sale.products || [])
      .filter(Boolean)
      .map((prod) => {
        const { salePrice, discountPercentage } = calculateSalePrice(
          prod.price,
          sale.discountType,
          sale.discountValue
        )
        return {
          _id: prod._id,
          name: prod.name,
          originalPrice: prod.price,
          price: status === 'ACTIVE' ? salePrice : prod.price,
          salePrice: status === 'ACTIVE' ? salePrice : null,
          discountPercentage,
          images: prod.images || [],
          category: prod.category,
          brand: prod.brand,
          stock: prod.stock,
          isActive: prod.isActive,
          sizes: prod.sizes || [],
          isFlashSale: status === 'ACTIVE',
        }
      })

    return res.status(200).json({
      success: true,
      flashSale: {
        _id: sale._id,
        name: sale.name,
        slug: sale.slug,
        description: sale.description || '',
        discountType: sale.discountType,
        discountValue: sale.discountValue,
        startAt: sale.startAt,
        endAt: sale.endAt,
        active: sale.active,
        status,
        products: validProducts,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: GET /api/flash-sales/admin
 * Returns full administrative list of all flash sales with filtering.
 */
const getAdminFlashSales = async (req, res) => {
  try {
    const { search, type, status } = req.query
    const filter = {}

    if (search && typeof search === 'string' && search.trim() !== '') {
      filter.name = { $regex: escapeRegex(search.trim()), $options: 'i' }
    }

    if (type && typeof type === 'string' && type.trim() !== '' && type !== 'all') {
      filter.discountType = type.trim().toLowerCase()
    }

    const sales = await FlashSale.find(filter)
      .sort({ createdAt: -1 })
      .populate('products', 'name price stock images isActive')
      .populate('createdBy', 'name email')
      .lean()

    const now = new Date()
    const enrichedSales = sales
      .map((sale) => {
        const saleStatus = computeSaleStatus(sale, now)
        return {
          ...sale,
          status: saleStatus,
          productsCount: Array.isArray(sale.products) ? sale.products.length : 0,
        }
      })
      .filter((sale) => {
        if (!status || status === 'all') return true
        return sale.status.toLowerCase() === status.toLowerCase()
      })

    return res.status(200).json({
      success: true,
      flashSales: enrichedSales,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: POST /api/flash-sales/admin
 * Creates a new flash sale with product conflict detection.
 */
const createFlashSale = async (req, res) => {
  const { isValid, errors, sanitized } = validateCreateFlashSaleInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    // 1. Verify all selected products exist and are active
    const productsInDb = await Product.find({
      _id: { $in: sanitized.products },
      isActive: true,
    }).select('_id name price')

    if (productsInDb.length !== sanitized.products.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected products are invalid, inactive, or not found',
      })
    }

    // 2. Check for overlapping flash sales for any of these products
    if (sanitized.active !== false) {
      const conflict = await checkProductConflict(
        sanitized.products,
        sanitized.startAt,
        sanitized.endAt
      )
      if (conflict.hasConflict) {
        return res.status(400).json({
          success: false,
          message: conflict.message,
          conflicts: conflict.conflicts,
        })
      }
    }

    const flashSale = await FlashSale.create({
      ...sanitized,
      createdBy: req.user ? req.user.id : null,
    })

    const populatedSale = await FlashSale.findById(flashSale._id)
      .populate('products', 'name price stock images')
      .lean()

    return res.status(201).json({
      success: true,
      flashSale: {
        ...populatedSale,
        status: computeSaleStatus(populatedSale, new Date()),
      },
      message: 'Flash sale created successfully',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: PATCH /api/flash-sales/admin/:id
 * Updates an existing flash sale.
 */
const updateFlashSale = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid flash sale ID' })
  }

  try {
    const existingSale = await FlashSale.findById(id)
    if (!existingSale) {
      return res.status(404).json({ success: false, message: 'Flash sale not found' })
    }

    const { isValid, errors, sanitized } = validateUpdateFlashSaleInput(
      req.body,
      existingSale.toObject()
    )

    if (!isValid) {
      return res.status(400).json({ success: false, errors })
    }

    // Verify products if updated
    if (sanitized.products) {
      const productsInDb = await Product.find({
        _id: { $in: sanitized.products },
        isActive: true,
      }).select('_id name price')

      if (productsInDb.length !== sanitized.products.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected products are invalid, inactive, or not found',
        })
      }
    }

    const targetProducts = sanitized.products || existingSale.products
    const targetStartAt = sanitized.startAt || existingSale.startAt
    const targetEndAt = sanitized.endAt || existingSale.endAt
    const targetActive = sanitized.active !== undefined ? sanitized.active : existingSale.active

    // Check conflict if sale is active
    if (targetActive) {
      const conflict = await checkProductConflict(
        targetProducts,
        targetStartAt,
        targetEndAt,
        existingSale._id
      )
      if (conflict.hasConflict) {
        return res.status(400).json({
          success: false,
          message: conflict.message,
          conflicts: conflict.conflicts,
        })
      }
    }

    Object.assign(existingSale, sanitized)
    await existingSale.save()

    const updated = await FlashSale.findById(id)
      .populate('products', 'name price stock images')
      .lean()

    return res.status(200).json({
      success: true,
      flashSale: {
        ...updated,
        status: computeSaleStatus(updated, new Date()),
      },
      message: 'Flash sale updated successfully',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: PATCH /api/flash-sales/admin/:id/toggle
 * Toggles flash sale active state.
 */
const toggleFlashSaleStatus = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid flash sale ID' })
  }

  try {
    const sale = await FlashSale.findById(id)
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Flash sale not found' })
    }

    const newActiveState =
      typeof req.body.active === 'boolean' ? req.body.active : !sale.active

    // If activating, verify no conflicting sales exist for these products
    if (newActiveState) {
      const conflict = await checkProductConflict(
        sale.products,
        sale.startAt,
        sale.endAt,
        sale._id
      )
      if (conflict.hasConflict) {
        return res.status(400).json({
          success: false,
          message: conflict.message,
          conflicts: conflict.conflicts,
        })
      }
    }

    sale.active = newActiveState
    await sale.save()

    return res.status(200).json({
      success: true,
      active: sale.active,
      status: computeSaleStatus(sale, new Date()),
      message: `Flash sale ${sale.active ? 'activated' : 'deactivated'} successfully`,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Admin: DELETE /api/flash-sales/admin/:id
 */
const deleteFlashSale = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid flash sale ID' })
  }

  try {
    const sale = await FlashSale.findByIdAndDelete(id)
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Flash sale not found' })
    }

    return res.status(200).json({
      success: true,
      message: 'Flash sale deleted successfully',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getActiveFlashSales,
  getFlashSaleById,
  getAdminFlashSales,
  createFlashSale,
  updateFlashSale,
  toggleFlashSaleStatus,
  deleteFlashSale,
}
