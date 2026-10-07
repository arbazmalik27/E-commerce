/**
 * TrendVolt Phase 8 — Outfit Recommendation Engine
 *
 * Deterministic recommendation utility that suggests compatible real TrendVolt
 * products for missing outfit slots based on product taxonomy and color harmony.
 * Pure, lightweight, and independent of external AI/ML services.
 */

import {
  WARDROBE_SLOTS,
  determineProductWardrobeSlot,
} from '../constants/wardrobeConstants.js'
import {
  extractProductColor,
  evaluateColorPair,
} from './outfitColorMatcher.js'

/**
 * Checks if a product is active, non-deleted, and in stock.
 *
 * @param {Object} product
 * @returns {boolean}
 */
export function isProductAvailable(product) {
  if (!product || typeof product !== 'object') return false
  if (product.isActive === false) return false
  if (product.isDeleted === true) return false
  if (product.status === 'inactive') return false
  if (product.stock !== undefined && product.stock !== null && product.stock <= 0) return false
  return true
}

/**
 * Checks if a product is currently selected in any slot of the outfit.
 *
 * @param {Object} product
 * @param {Object} outfit
 * @returns {boolean}
 */
export function isProductSelected(product, outfit) {
  if (!product || !outfit) return false
  const id = product._id || product.id
  if (!id) return false

  if (outfit.top && (outfit.top._id === id || outfit.top.id === id)) return true
  if (outfit.bottom && (outfit.bottom._id === id || outfit.bottom.id === id)) return true
  if (outfit.shoes && (outfit.shoes._id === id || outfit.shoes.id === id)) return true
  if (Array.isArray(outfit.accessories) && outfit.accessories.some((a) => (a._id === id || a.id === id))) {
    return true
  }

  return false
}

/**
 * Determines which missing wardrobe slots to recommend products for based on current outfit.
 *
 * @param {Object} outfit - Canonical outfit state { top, bottom, shoes, accessories }
 * @returns {Array<'top'|'bottom'|'shoes'|'accessories'>} Ordered list of target slots
 */
export function identifyTargetRecommendationSlots(outfit) {
  if (!outfit) return []

  const hasTop = Boolean(outfit.top)
  const hasBottom = Boolean(outfit.bottom)
  const hasShoes = Boolean(outfit.shoes)
  const hasAccessories = Array.isArray(outfit.accessories) && outfit.accessories.length > 0

  const total = (hasTop ? 1 : 0) + (hasBottom ? 1 : 0) + (hasShoes ? 1 : 0) + (hasAccessories ? 1 : 0)
  if (total === 0) return []

  const targets = []

  // Case 1: Has Top only -> Recommend Bottoms (primary), Shoes (secondary)
  if (hasTop && !hasBottom) {
    targets.push(WARDROBE_SLOTS.BOTTOM)
    if (!hasShoes) targets.push(WARDROBE_SLOTS.SHOES)
    return targets
  }

  // Case 2: Has Bottom only -> Recommend Tops (primary), Shoes (secondary)
  if (hasBottom && !hasTop) {
    targets.push(WARDROBE_SLOTS.TOP)
    if (!hasShoes) targets.push(WARDROBE_SLOTS.SHOES)
    return targets
  }

  // Case 3: Has Top + Bottom -> Recommend Shoes, Accessories
  if (hasTop && hasBottom) {
    if (!hasShoes) targets.push(WARDROBE_SLOTS.SHOES)
    targets.push(WARDROBE_SLOTS.ACCESSORIES)
    return targets
  }

  // Case 4: Only Shoes or Accessories selected -> Recommend Top, Bottom
  if (!hasTop && !hasBottom && (hasShoes || hasAccessories)) {
    targets.push(WARDROBE_SLOTS.TOP)
    targets.push(WARDROBE_SLOTS.BOTTOM)
    return targets
  }

  return targets
}

/**
 * Evaluates the compatibility of a candidate product for a specific slot against current outfit.
 *
 * Ranking Tiers:
 * 1: Strong / Excellent color compatibility (score >= 75)
 * 2: Good color compatibility (score >= 60)
 * 3: Unknown color metadata (taxonomy relevance only, no fake score)
 * 4: Low contrast / clash (score < 60)
 *
 * @param {Object} candidate - Candidate Product object
 * @param {'top'|'bottom'|'shoes'|'accessories'} slot - Target wardrobe slot
 * @param {Object} outfit - Current canonical outfit
 * @returns {{ compatible: boolean, tier: number, score: number, colorStatus: string }}
 */
export function evaluateCandidateCompatibility(candidate, slot, outfit) {
  const candidateSlot = determineProductWardrobeSlot(candidate)
  if (candidateSlot !== slot) {
    return { compatible: false, tier: 5, score: 0, colorStatus: 'incompatible_category' }
  }

  const candidateColor = extractProductColor(candidate)

  // 1. Evaluating Bottom against active Top
  if (slot === WARDROBE_SLOTS.BOTTOM && outfit?.top) {
    const topColor = extractProductColor(outfit.top)
    if (topColor && candidateColor) {
      const evaluation = evaluateColorPair(topColor, candidateColor)
      const tier = evaluation.score >= 75 ? 1 : evaluation.score >= 60 ? 2 : 4
      return { compatible: true, tier, score: evaluation.score, colorStatus: evaluation.status }
    }
    return { compatible: true, tier: 3, score: 0, colorStatus: 'unknown' }
  }

  // 2. Evaluating Top against active Bottom
  if (slot === WARDROBE_SLOTS.TOP && outfit?.bottom) {
    const bottomColor = extractProductColor(outfit.bottom)
    if (bottomColor && candidateColor) {
      const evaluation = evaluateColorPair(candidateColor, bottomColor)
      const tier = evaluation.score >= 75 ? 1 : evaluation.score >= 60 ? 2 : 4
      return { compatible: true, tier, score: evaluation.score, colorStatus: evaluation.status }
    }
    return { compatible: true, tier: 3, score: 0, colorStatus: 'unknown' }
  }

  // 3. Evaluating Shoes against Top / Bottom
  if (slot === WARDROBE_SLOTS.SHOES) {
    const topColor = extractProductColor(outfit?.top)
    const bottomColor = extractProductColor(outfit?.bottom)

    if (candidateColor && (topColor || bottomColor)) {
      let combinedScore = 0
      if (topColor && bottomColor) {
        const topPair = evaluateColorPair(topColor, candidateColor)
        const bottomPair = evaluateColorPair(bottomColor, candidateColor)
        combinedScore = Math.round(0.5 * topPair.score + 0.5 * bottomPair.score)
      } else if (bottomColor) {
        combinedScore = evaluateColorPair(bottomColor, candidateColor).score
      } else {
        combinedScore = evaluateColorPair(topColor, candidateColor).score
      }
      const tier = combinedScore >= 75 ? 1 : combinedScore >= 60 ? 2 : 4
      return { compatible: true, tier, score: combinedScore, colorStatus: tier <= 2 ? 'matched' : 'contrast' }
    }
    return { compatible: true, tier: 3, score: 0, colorStatus: 'unknown' }
  }

  // 4. Evaluating Accessories against active outfit pieces
  if (slot === WARDROBE_SLOTS.ACCESSORIES) {
    const topColor = extractProductColor(outfit?.top)
    const bottomColor = extractProductColor(outfit?.bottom)

    if (candidateColor && (topColor || bottomColor)) {
      const refColor = topColor || bottomColor
      const pair = evaluateColorPair(refColor, candidateColor)
      const tier = pair.score >= 75 ? 1 : pair.score >= 60 ? 2 : 4
      return { compatible: true, tier, score: pair.score, colorStatus: pair.status }
    }
    return { compatible: true, tier: 3, score: 0, colorStatus: 'unknown' }
  }

  // Default fallback for any other slot configuration
  return { compatible: true, tier: 3, score: 0, colorStatus: 'unknown' }
}

/**
 * Gets ranked recommendations for a single slot.
 *
 * @param {'top'|'bottom'|'shoes'|'accessories'} slot
 * @param {Object} outfit
 * @param {Array} catalogProducts
 * @param {Object} options
 * @returns {{ slot: string, label: string, products: Array, hasColorMatch: boolean }}
 */
export function getSlotRecommendations(slot, outfit, catalogProducts = [], options = {}) {
  const max = Math.max(1, Math.min(options.maxPerSlot || 4, 12))

  if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) {
    return { slot, label: getSlotLabel(slot), products: [], hasColorMatch: false }
  }

  // Filter candidates: available, belonging to slot, not currently selected
  const candidates = catalogProducts.filter((product) => {
    if (!isProductAvailable(product)) return false
    if (isProductSelected(product, outfit)) return false
    const prodSlot = determineProductWardrobeSlot(product)
    return prodSlot === slot
  })

  // Evaluate and rank candidates
  const scored = candidates.map((product) => {
    const evalResult = evaluateCandidateCompatibility(product, slot, outfit)
    return {
      product,
      ...evalResult,
    }
  })

  // Filter out completely incompatible category mismatches
  const validCandidates = scored.filter((item) => item.compatible)

  // Deterministic sorting: Tier ascending, then score descending, then stable ID tie-breaker
  validCandidates.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    if (b.score !== a.score) return b.score - a.score
    const idA = String(a.product._id || a.product.id || a.product.name || '')
    const idB = String(b.product._id || b.product.id || b.product.name || '')
    return idA.localeCompare(idB)
  })

  const topProducts = validCandidates.slice(0, max).map((item) => item.product)
  const hasColorMatch = validCandidates.slice(0, max).some((item) => item.tier <= 2)

  return {
    slot,
    label: getSlotLabel(slot),
    products: topProducts,
    hasColorMatch,
  }
}

/**
 * Generates ranked product recommendations to complete the look for the current outfit.
 *
 * @param {Object} outfit - Canonical outfit state { top, bottom, shoes, accessories }
 * @param {Array} catalogProducts - Loaded TrendVolt catalog products
 * @param {Object} options - { maxPerSlot: 4 }
 * @returns {Array<{ slot: string, label: string, products: Array, hasColorMatch: boolean }>}
 */
export function getOutfitRecommendations(outfit, catalogProducts = [], options = {}) {
  const targetSlots = identifyTargetRecommendationSlots(outfit)
  if (targetSlots.length === 0) return []

  const results = []
  for (const slot of targetSlots) {
    const slotRec = getSlotRecommendations(slot, outfit, catalogProducts, options)
    if (slotRec.products.length > 0) {
      results.push(slotRec)
    }
  }

  return results
}

function getSlotLabel(slot) {
  switch (slot) {
    case WARDROBE_SLOTS.TOP:
      return 'Recommended Tops'
    case WARDROBE_SLOTS.BOTTOM:
      return 'Complementary Bottoms'
    case WARDROBE_SLOTS.SHOES:
      return 'Footwear Pairings'
    case WARDROBE_SLOTS.ACCESSORIES:
      return 'Matching Accessories'
    default:
      return 'Recommended Pieces'
  }
}
