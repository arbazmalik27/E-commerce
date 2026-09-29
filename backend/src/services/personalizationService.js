const Product = require('../models/Product')
const User = require('../models/User')
const Order = require('../models/Order')
const {
  getBatchEffectivePrices,
  enrichProductWithPricing,
} = require('./pricingService')

/**
 * Validates an array of product ID strings.
 * Filters out invalid or non-hexadecimal ObjectId strings and bounds the array length.
 */
function sanitizeProductIds(rawIds, maxCount = 20) {
  if (!rawIds) return []
  let list = []
  if (Array.isArray(rawIds)) {
    list = rawIds
  } else if (typeof rawIds === 'string') {
    list = rawIds.split(',')
  }
  return list
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
    .slice(0, maxCount)
}

/**
 * Fetches personalization signals for an authenticated user:
 * 1. Valid purchased products from completed/paid/active orders (excluding cancelled)
 * 2. User's wishlist products
 * Returns the resolved active products and taxonomy counts.
 */
async function getUserSignals(userId) {
  if (!userId) {
    return {
      purchasedProducts: [],
      wishlistProducts: [],
    }
  }

  // 1. Purchased products from valid orders (exclude cancelled)
  const validOrders = await Order.find({
    user: userId,
    orderStatus: { $ne: 'cancelled' },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('items.product')
    .lean()

  const purchasedProductIds = []
  for (const order of validOrders) {
    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.product) {
          purchasedProductIds.push(item.product.toString())
        }
      }
    }
  }

  // 2. Wishlist products
  const user = await User.findById(userId).select('wishlist').lean()
  const wishlistProductIds = (user?.wishlist || []).map((id) => id.toString())

  // Retrieve actual products for these signals to extract their taxonomy
  const signalProductIds = Array.from(
    new Set([...purchasedProductIds, ...wishlistProductIds])
  )

  let signalProducts = []
  if (signalProductIds.length > 0) {
    signalProducts = await Product.find({
      _id: { $in: signalProductIds },
    })
      .select('_id category department subcategory brand')
      .lean()
  }

  const signalMap = new Map(signalProducts.map((p) => [p._id.toString(), p]))

  const purchasedProducts = purchasedProductIds
    .map((id) => signalMap.get(id))
    .filter(Boolean)

  const wishlistProducts = wishlistProductIds
    .map((id) => signalMap.get(id))
    .filter(Boolean)

  return {
    purchasedProducts,
    wishlistProducts,
  }
}

/**
 * Generates personalized homepage recommendations:
 * - Deterministic, explainable scoring
 * - Resolves all products from MongoDB
 * - Enforces active flash-sale pricing through pricingService
 * - Safe for authenticated users and guests
 * 
 * @param {Object} options
 * @param {string|null} options.userId - Authenticated user ID (if logged in)
 * @param {string[]} options.recentIds - Validated recently viewed product IDs from client
 * @param {number} options.limit - Max products per section
 */
async function getPersonalizedFeed({ userId = null, recentIds = [], limit = 4 }) {
  const sanitizedRecentIds = sanitizeProductIds(recentIds, 12)

  // 1. Resolve recently viewed products from MongoDB (verifying active status & current taxonomy)
  let viewedProducts = []
  if (sanitizedRecentIds.length > 0) {
    const rawViewed = await Product.find({
      _id: { $in: sanitizedRecentIds },
      isActive: true,
    }).lean()

    const viewedMap = new Map(rawViewed.map((p) => [p._id.toString(), p]))
    viewedProducts = sanitizedRecentIds
      .map((id) => viewedMap.get(id))
      .filter(Boolean)
  }

  // 2. Fetch authenticated signals (orders & wishlist)
  let purchasedProducts = []
  let wishlistProducts = []
  if (userId) {
    const signals = await getUserSignals(userId)
    purchasedProducts = signals.purchasedProducts
    wishlistProducts = signals.wishlistProducts
  }

  // Set of all seed product IDs that the user has already interacted with (to avoid recommending the exact same item in recommendations)
  const seedIds = new Set([
    ...viewedProducts.map((p) => p._id.toString()),
    ...wishlistProducts.map((p) => p._id.toString()),
    ...purchasedProducts.map((p) => p._id.toString()),
  ])

  // Count taxonomy weights
  // Purchased: +50 per subcategory, +20 per department, +15 per brand
  // Wishlist: +30 per subcategory, +15 per department, +10 per brand
  // Viewed: +20 per subcategory, +10 per department, +5 per brand
  const subcategoryWeights = new Map()
  const departmentWeights = new Map()
  const brandWeights = new Map()

  function addWeight(map, key, weight) {
    if (!key) return
    const current = map.get(key) || 0
    map.set(key, current + weight)
  }

  for (const p of purchasedProducts) {
    addWeight(subcategoryWeights, p.subcategory, 50)
    addWeight(departmentWeights, p.department, 20)
    addWeight(brandWeights, p.brand, 15)
  }

  for (const p of wishlistProducts) {
    addWeight(subcategoryWeights, p.subcategory, 30)
    addWeight(departmentWeights, p.department, 15)
    addWeight(brandWeights, p.brand, 10)
  }

  for (const p of viewedProducts) {
    addWeight(subcategoryWeights, p.subcategory, 20)
    addWeight(departmentWeights, p.department, 10)
    addWeight(brandWeights, p.brand, 5)
  }

  // Check if any signals exist
  const hasAuthSignals = purchasedProducts.length > 0 || wishlistProducts.length > 0
  const hasViewSignals = viewedProducts.length > 0
  const hasAnySignals = hasAuthSignals || hasViewSignals

  // Initialize response structure
  let recommended = []
  let becauseYouViewed = []
  let yourStyle = null

  if (hasAnySignals) {
    // -------------------------------------------------------------------------
    // SECTION A: "Recommended For You"
    // Find candidate products matching highest subcategories/departments
    // -------------------------------------------------------------------------
    const targetSubcategories = Array.from(subcategoryWeights.keys())
    const targetDepartments = Array.from(departmentWeights.keys())

    const candidateFilter = {
      isActive: true,
      stock: { $gt: 0 },
      _id: { $nin: Array.from(seedIds) }, // Exclude items already viewed/wishlisted/purchased
    }

    if (targetSubcategories.length > 0 && targetDepartments.length > 0) {
      candidateFilter.$or = [
        { subcategory: { $in: targetSubcategories } },
        { department: { $in: targetDepartments } },
      ]
    } else if (targetSubcategories.length > 0) {
      candidateFilter.subcategory = { $in: targetSubcategories }
    } else if (targetDepartments.length > 0) {
      candidateFilter.department = { $in: targetDepartments }
    }

    const candidatePool = await Product.find(candidateFilter)
      .limit(50)
      .lean()

    // Score candidates deterministically
    const scoredCandidates = candidatePool.map((p) => {
      let score = 0
      if (p.subcategory && subcategoryWeights.has(p.subcategory)) {
        score += subcategoryWeights.get(p.subcategory)
      }
      if (p.department && departmentWeights.has(p.department)) {
        score += departmentWeights.get(p.department)
      }
      if (p.brand && brandWeights.has(p.brand)) {
        score += brandWeights.get(p.brand)
      }
      return { product: p, score }
    })

    // Sort by score DESC, then createdAt DESC as deterministic tie-breaker
    scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.product.createdAt) - new Date(a.product.createdAt)
    })

    const rawRecommended = scoredCandidates.slice(0, limit).map((c) => c.product)
    const saleMapRec = await getBatchEffectivePrices(rawRecommended)
    recommended = rawRecommended.map((p) => enrichProductWithPricing(p, saleMapRec))

    // -------------------------------------------------------------------------
    // SECTION B: "Because You Viewed" (Derived from the most recently viewed item's subcategory/department)
    // -------------------------------------------------------------------------
    if (viewedProducts.length > 0) {
      const mostRecent = viewedProducts[0]
      const excludeIds = new Set([
        ...Array.from(seedIds),
        ...recommended.map((p) => p._id.toString()),
      ])

      const byViewedFilter = {
        isActive: true,
        stock: { $gt: 0 },
        _id: { $nin: Array.from(excludeIds) },
      }

      if (mostRecent.subcategory && mostRecent.department) {
        byViewedFilter.$or = [
          { subcategory: mostRecent.subcategory, department: mostRecent.department },
          { subcategory: mostRecent.subcategory },
        ]
      } else if (mostRecent.department) {
        byViewedFilter.department = mostRecent.department
      }

      const rawByViewed = await Product.find(byViewedFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()

      const saleMapByViewed = await getBatchEffectivePrices(rawByViewed)
      becauseYouViewed = rawByViewed.map((p) => enrichProductWithPricing(p, saleMapByViewed))
    }

    // -------------------------------------------------------------------------
    // SECTION C: "Picked For Your Style"
    // Focuses on the user's single strongest department (e.g. Men, Women, Footwear)
    // -------------------------------------------------------------------------
    if (departmentWeights.size > 0) {
      let topDept = null
      let maxWeight = 0
      for (const [dept, weight] of departmentWeights.entries()) {
        if (weight > maxWeight) {
          maxWeight = weight
          topDept = dept
        }
      }

      if (topDept) {
        const usedIds = new Set([
          ...Array.from(seedIds),
          ...recommended.map((p) => p._id.toString()),
          ...becauseYouViewed.map((p) => p._id.toString()),
        ])

        const styleFilter = {
          isActive: true,
          stock: { $gt: 0 },
          department: topDept,
          _id: { $nin: Array.from(usedIds) },
        }

        const rawStyle = await Product.find(styleFilter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean()

        if (rawStyle.length > 0) {
          const saleMapStyle = await getBatchEffectivePrices(rawStyle)
          yourStyle = {
            department: topDept,
            products: rawStyle.map((p) => enrichProductWithPricing(p, saleMapStyle)),
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION D: "Continue Shopping" / Recently Viewed Actual Items
  // Enrich actual viewed products with live flash-sale pricing
  // ---------------------------------------------------------------------------
  let continueShopping = []
  if (viewedProducts.length > 0) {
    const saleMapViewed = await getBatchEffectivePrices(viewedProducts)
    continueShopping = viewedProducts.map((p) => enrichProductWithPricing(p, saleMapViewed))
  }

  return {
    hasPersonalization: hasAnySignals && (recommended.length > 0 || becauseYouViewed.length > 0 || continueShopping.length > 0),
    recommended,
    becauseYouViewed,
    yourStyle,
    continueShopping,
    meta: {
      hasAuthSignals,
      hasViewSignals,
    },
  }
}

module.exports = {
  getPersonalizedFeed,
  sanitizeProductIds,
  getUserSignals,
}
