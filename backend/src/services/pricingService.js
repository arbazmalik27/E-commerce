const FlashSale = require('../models/FlashSale')

/**
 * Calculates authoritative sale price and discount metrics based on product price and discount configuration.
 * Guarantees that sale price is never <= 0 and rounded consistently.
 */
function calculateSalePrice(originalPrice, discountType, discountValue) {
  const price = typeof originalPrice === 'number' ? originalPrice : 0
  if (price <= 0) {
    return { salePrice: price, discountAmount: 0, discountPercentage: 0 }
  }

  let discountAmount = 0
  let discountPercentage = 0

  if (discountType === 'percentage') {
    discountPercentage = Math.min(100, Math.max(0, Number(discountValue) || 0))
    discountAmount = Number(((price * discountPercentage) / 100).toFixed(2))
  } else if (discountType === 'fixed') {
    const rawVal = Number(discountValue) || 0
    discountAmount = Number(Math.min(rawVal, price - 1).toFixed(2))
    discountPercentage = Math.round((discountAmount / price) * 100)
  }

  let salePrice = Number((price - discountAmount).toFixed(2))
  if (salePrice <= 0) {
    salePrice = 1
    discountAmount = Number((price - 1).toFixed(2))
    discountPercentage = Math.round((discountAmount / price) * 100)
  }

  return {
    salePrice,
    discountAmount,
    discountPercentage,
  }
}

/**
 * Computes the authoritative effective price for a single product at a given date.
 */
async function getEffectiveProductPrice(product, date = new Date()) {
  if (!product) {
    return {
      price: 0,
      originalPrice: 0,
      salePrice: null,
      discountPercentage: 0,
      isFlashSale: false,
      flashSale: null,
      upcomingFlashSale: null,
    }
  }

  const productId = product._id || product
  const originalPrice = typeof product.price === 'number' ? product.price : 0
  const checkTime = new Date(date)

  // 1. Query for currently active flash sale covering this product
  const activeSale = await FlashSale.findOne({
    products: productId,
    active: true,
    startAt: { $lte: checkTime },
    endAt: { $gte: checkTime },
  }).lean()

  if (activeSale) {
    const { salePrice, discountPercentage } = calculateSalePrice(
      originalPrice,
      activeSale.discountType,
      activeSale.discountValue
    )

    return {
      price: salePrice,
      originalPrice,
      salePrice,
      discountPercentage,
      isFlashSale: true,
      flashSale: {
        _id: activeSale._id,
        name: activeSale.name,
        slug: activeSale.slug,
        discountType: activeSale.discountType,
        discountValue: activeSale.discountValue,
        startAt: activeSale.startAt,
        endAt: activeSale.endAt,
      },
      upcomingFlashSale: null,
    }
  }

  // 2. Check for upcoming flash sale (for informational storefront countdown)
  const upcomingSale = await FlashSale.findOne({
    products: productId,
    active: true,
    startAt: { $gt: checkTime },
  })
    .sort({ startAt: 1 })
    .lean()

  let upcomingFlashSale = null
  if (upcomingSale) {
    const { salePrice, discountPercentage } = calculateSalePrice(
      originalPrice,
      upcomingSale.discountType,
      upcomingSale.discountValue
    )
    upcomingFlashSale = {
      _id: upcomingSale._id,
      name: upcomingSale.name,
      slug: upcomingSale.slug,
      discountType: upcomingSale.discountType,
      discountValue: upcomingSale.discountValue,
      projectedSalePrice: salePrice,
      discountPercentage,
      startAt: upcomingSale.startAt,
      endAt: upcomingSale.endAt,
    }
  }

  return {
    price: originalPrice,
    originalPrice,
    salePrice: null,
    discountPercentage: 0,
    isFlashSale: false,
    flashSale: null,
    upcomingFlashSale,
  }
}

/**
 * Batch-computes authoritative effective prices for a collection of products.
 * Avoids N+1 queries by retrieving all applicable active flash sales in a single roundtrip.
 */
async function getBatchEffectivePrices(products, date = new Date()) {
  if (!Array.isArray(products) || products.length === 0) {
    return new Map()
  }

  const checkTime = new Date(date)
  const productIds = products
    .map((p) => {
      if (!p) return null
      if (p._id) return p._id.toString()
      if (p.product && p.product._id) return p.product._id.toString()
      if (p.product) return p.product.toString()
      return p.toString()
    })
    .filter(Boolean)

  if (productIds.length === 0) {
    return new Map()
  }

  const activeSales = await FlashSale.find({
    products: { $in: productIds },
    active: true,
    startAt: { $lte: checkTime },
    endAt: { $gte: checkTime },
  }).lean()

  // Map each productId to its active sale
  const saleMap = new Map()
  for (const sale of activeSales) {
    if (Array.isArray(sale.products)) {
      for (const pId of sale.products) {
        saleMap.set(pId.toString(), sale)
      }
    }
  }

  return saleMap
}

/**
 * Enriches a raw product object with effective pricing and flash sale metadata.
 */
function enrichProductWithPricing(productObj, saleMap) {
  if (!productObj) return productObj

  const pId = (productObj._id || productObj.id || '').toString()
  const originalPrice = typeof productObj.price === 'number' ? productObj.price : 0
  const activeSale = saleMap ? saleMap.get(pId) : null

  if (activeSale) {
    const { salePrice, discountPercentage } = calculateSalePrice(
      originalPrice,
      activeSale.discountType,
      activeSale.discountValue
    )

    return {
      ...productObj,
      price: salePrice,
      originalPrice,
      salePrice,
      discountPercentage,
      isFlashSale: true,
      flashSale: {
        _id: activeSale._id,
        name: activeSale.name,
        slug: activeSale.slug,
        discountType: activeSale.discountType,
        discountValue: activeSale.discountValue,
        startAt: activeSale.startAt,
        endAt: activeSale.endAt,
      },
    }
  }

  return {
    ...productObj,
    price: originalPrice,
    originalPrice,
    salePrice: null,
    discountPercentage: 0,
    isFlashSale: false,
    flashSale: null,
  }
}

/**
 * Checks for overlapping flash sales for any of the given products.
 * Prevents ambiguous pricing where a product is active in multiple sales simultaneously.
 */
async function checkProductConflict(productIds, startAt, endAt, excludeSaleId = null) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { hasConflict: false }
  }

  const query = {
    active: true,
    products: { $in: productIds },
    startAt: { $lt: new Date(endAt) },
    endAt: { $gt: new Date(startAt) },
  }

  if (excludeSaleId) {
    query._id = { $ne: excludeSaleId }
  }

  const conflictingSales = await FlashSale.find(query)
    .populate('products', 'name')
    .lean()

  if (conflictingSales.length > 0) {
    const conflicts = []
    const targetSet = new Set(productIds.map((id) => id.toString()))

    for (const sale of conflictingSales) {
      for (const p of sale.products || []) {
        const idStr = p._id ? p._id.toString() : p.toString()
        if (targetSet.has(idStr)) {
          conflicts.push(`"${p.name || idStr}" in sale "${sale.name}"`)
        }
      }
    }

    return {
      hasConflict: true,
      conflicts,
      message: `The following product(s) have an overlapping active flash sale: ${[...new Set(conflicts)].join(', ')}`,
    }
  }

  return { hasConflict: false }
}

module.exports = {
  calculateSalePrice,
  getEffectiveProductPrice,
  getBatchEffectivePrices,
  enrichProductWithPricing,
  checkProductConflict,
}
