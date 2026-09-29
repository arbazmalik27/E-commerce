const Product = require('../models/Product')
const User = require('../models/User')
const {
  getBatchEffectivePrices,
  enrichProductWithPricing,
} = require('./pricingService')

/**
 * Generates deterministic, explainable fashion recommendations based on the user's saved wishlist.
 *
 * Scoring model:
 * - Same subcategory: +40
 * - Same department: +20
 * - Same brand (case-insensitive): +15
 * - Similar price range (within ±30%): +10
 *
 * Multi-item aggregation:
 * - Scores accumulate across all saved wishlist items, naturally surfacing items compatible
 *   with multiple pieces.
 *
 * Exclusions:
 * - Existing items in the user's wishlist
 * - Inactive products (isActive: false)
 * - Out-of-stock products (stock <= 0)
 *
 * Pricing:
 * - Live effective prices (including active flash sales) resolved via pricingService.
 *
 * @param {string} userId - Authenticated user ObjectId string
 * @param {Object} [options]
 * @param {number} [options.limit=4] - Max recommendations to return (bounded 1-8)
 * @returns {Promise<Object>}
 */
async function getWishlistRecommendations(userId, options = {}) {
  const limit = Math.min(8, Math.max(1, parseInt(options.limit, 10) || 4))

  if (!userId || typeof userId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
    return {
      success: true,
      hasRecommendations: false,
      recommendations: [],
      meta: {
        wishlistCount: 0,
        recommendationCount: 0,
      },
    }
  }

  // 1. Fetch user wishlist product IDs strictly from MongoDB (prevent IDOR)
  const user = await User.findById(userId).select('wishlist').lean()
  if (!user || !Array.isArray(user.wishlist) || user.wishlist.length === 0) {
    return {
      success: true,
      hasRecommendations: false,
      recommendations: [],
      meta: {
        wishlistCount: 0,
        recommendationCount: 0,
      },
    }
  }

  // Sanitize and deduplicate wishlist IDs
  const rawWishlistIds = user.wishlist
    .map((id) => (id ? id.toString() : ''))
    .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
  const wishlistIds = Array.from(new Set(rawWishlistIds))

  if (wishlistIds.length === 0) {
    return {
      success: true,
      hasRecommendations: false,
      recommendations: [],
      meta: {
        wishlistCount: 0,
        recommendationCount: 0,
      },
    }
  }

  // 2. Resolve active wishlist products to extract attributes
  const wishlistProducts = await Product.find({
    _id: { $in: wishlistIds },
    isActive: true,
  })
    .select('_id name category department subcategory brand price stock createdAt')
    .lean()

  if (wishlistProducts.length === 0) {
    return {
      success: true,
      hasRecommendations: false,
      recommendations: [],
      meta: {
        wishlistCount: wishlistIds.length,
        recommendationCount: 0,
      },
    }
  }

  // 3. Extract target taxonomy departments and subcategories
  const targetDepartments = Array.from(
    new Set(wishlistProducts.map((p) => p.department).filter(Boolean))
  )

  // 4. Fetch candidate products matching departments, excluding all wishlist items and unavailable stock
  const candidateFilter = {
    _id: { $nin: wishlistIds },
    isActive: true,
    stock: { $gt: 0 },
  }

  if (targetDepartments.length > 0) {
    candidateFilter.department = { $in: targetDepartments }
  }

  const candidates = await Product.find(candidateFilter)
    .limit(100)
    .lean()

  if (candidates.length === 0) {
    return {
      success: true,
      hasRecommendations: false,
      recommendations: [],
      meta: {
        wishlistCount: wishlistIds.length,
        recommendationCount: 0,
      },
    }
  }

  // 5. Score candidates deterministically across all wishlist products
  const scoredCandidates = []

  for (const candidate of candidates) {
    let score = 0

    for (const item of wishlistProducts) {
      // Subcategory match (+40)
      if (
        candidate.subcategory &&
        item.subcategory &&
        candidate.subcategory.toLowerCase() === item.subcategory.toLowerCase()
      ) {
        score += 40
      }

      // Department match (+20)
      if (
        candidate.department &&
        item.department &&
        candidate.department.toLowerCase() === item.department.toLowerCase()
      ) {
        score += 20
      }

      // Brand match (+15)
      if (
        candidate.brand &&
        item.brand &&
        candidate.brand.trim().toLowerCase() === item.brand.trim().toLowerCase()
      ) {
        score += 15
      }

      // Price proximity (+10 if within ±30%)
      if (
        typeof candidate.price === 'number' &&
        typeof item.price === 'number' &&
        item.price > 0
      ) {
        const ratio = candidate.price / item.price
        if (ratio >= 0.7 && ratio <= 1.3) {
          score += 10
        }
      }
    }

    if (score > 0) {
      scoredCandidates.push({ product: candidate, score })
    }
  }

  if (scoredCandidates.length === 0) {
    return {
      success: true,
      hasRecommendations: false,
      recommendations: [],
      meta: {
        wishlistCount: wishlistIds.length,
        recommendationCount: 0,
      },
    }
  }

  // 6. Sort deterministically: score DESC, createdAt DESC, _id DESC
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    const timeA = new Date(a.product.createdAt || 0).getTime()
    const timeB = new Date(b.product.createdAt || 0).getTime()
    if (timeB !== timeA) {
      return timeB - timeA
    }
    return b.product._id.toString().localeCompare(a.product._id.toString())
  })

  // Select top N candidates (score is omitted from final client output)
  const topProducts = scoredCandidates.slice(0, limit).map((c) => c.product)

  // 7. Batch enrich with active flash-sale pricing without modifying Product.price in DB
  const saleMap = await getBatchEffectivePrices(topProducts)
  const recommendations = topProducts.map((p) => enrichProductWithPricing(p, saleMap))

  return {
    success: true,
    hasRecommendations: recommendations.length > 0,
    recommendations,
    meta: {
      wishlistCount: wishlistIds.length,
      recommendationCount: recommendations.length,
    },
  }
}

module.exports = {
  getWishlistRecommendations,
}
