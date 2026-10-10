/**
 * TrendVolt Phase 9 — Outfit Size Guidance Utility
 *
 * Provides advisory size recommendations for selected wardrobe products by
 * converting the user's AvatarProfile into sizing inputs and delegating directly
 * to the authoritative TrendVolt sizing engine (recommendSize in sizeCharts.js).
 *
 * NO duplicate sizing engine, NO AI/ML, NO measurements inferred from photos.
 * Advisory only — visual avatar is NOT a physical fit guarantee.
 */

import { recommendSize } from '../constants/sizeCharts.js'

const YOUTH_DEMOGRAPHICS = ['boys', 'girls', 'kids']

/**
 * Transforms an AvatarProfile into authoritative inputs compatible with recommendSize().
 * Mirrors the canonical AvatarProfile.toSizingInputs() contract.
 *
 * @param {Object|null} avatarProfile
 * @returns {{ department: string, measurements: Object, unit: string, fitPreference: string }|null}
 */
export function avatarProfileToSizingInputs(avatarProfile) {
  if (!avatarProfile || typeof avatarProfile !== 'object') {
    return null
  }

  const demographic = String(avatarProfile.demographic || '').toLowerCase().trim()
  const isYouth = YOUTH_DEMOGRAPHICS.includes(demographic)

  let department = 'men'
  if (isYouth) {
    department = 'kids'
  } else if (demographic === 'women') {
    department = 'women'
  }

  const est = avatarProfile.estimatedMeasurements || {}

  const measurements = isYouth
    ? {
        age: avatarProfile.age,
        height: avatarProfile.heightCm,
        footLength: est.footLength,
      }
    : {
        chest: est.chest,
        waist: est.waist,
        hip: est.hip,
        height: avatarProfile.heightCm,
        footLength: est.footLength,
      }

  return {
    department,
    measurements,
    unit: est.unit || 'cm',
    fitPreference: avatarProfile.fitPreference || 'regular',
  }
}

/**
 * Evaluates an advisory size recommendation for a single product given an AvatarProfile.
 * Strictly uses the existing recommendSize() function.
 *
 * @param {Object|null} product - Selected TrendVolt Product
 * @param {Object|null} avatarProfile - User's AvatarProfile
 * @returns {{
 *   status: string,
 *   recommendedSize: string|null,
 *   isAvailable: boolean,
 *   message: string,
 *   reason?: string,
 *   stockMessage?: string
 * }}
 */
export function getProductSizeRecommendation(product, avatarProfile) {
  if (!product || typeof product !== 'object') {
    return {
      status: 'no_product',
      recommendedSize: null,
      isAvailable: false,
      message: 'Size recommendation unavailable',
    }
  }

  // If product has no size options, size recommendation is not applicable
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0
  if (!hasSizes) {
    return {
      status: 'no_size_options',
      recommendedSize: null,
      isAvailable: false,
      message: 'Size recommendation unavailable',
    }
  }

  // If no avatar profile exists, cannot compute advisory size
  if (!avatarProfile) {
    return {
      status: 'missing_profile',
      recommendedSize: null,
      isAvailable: false,
      message: 'Size recommendation unavailable',
    }
  }

  const sizingInputs = avatarProfileToSizingInputs(avatarProfile)
  if (!sizingInputs) {
    return {
      status: 'missing_profile',
      recommendedSize: null,
      isAvailable: false,
      message: 'Size recommendation unavailable',
    }
  }

  // Delegate directly to the existing sizing engine in sizeCharts.js
  const result = recommendSize({
    department: product.department || sizingInputs.department || 'men',
    subcategory: product.subcategory || '',
    productSizes: product.sizes,
    measurements: sizingInputs.measurements || {},
    unit: sizingInputs.unit || 'cm',
    fitPreference: sizingInputs.fitPreference || 'regular',
  })

  // Format result into customer-facing advisory strings
  if (result.status === 'recommended' && result.recommendedSize) {
    return {
      status: 'recommended',
      recommendedSize: result.recommendedSize,
      isAvailable: result.isAvailable !== false,
      message: `Recommended size: ${result.recommendedSize}`,
      reason: result.reason,
    }
  }

  if (result.status === 'out_of_stock' || result.status === 'size_unavailable') {
    return {
      status: result.status,
      recommendedSize: result.recommendedSize || null,
      isAvailable: false,
      message: result.recommendedSize
        ? `Recommended size: ${result.recommendedSize}`
        : 'Size recommendation unavailable',
      stockMessage: result.stockMessage,
    }
  }

  return {
    status: result.status || 'unavailable',
    recommendedSize: null,
    isAvailable: false,
    message: 'Size recommendation unavailable',
  }
}

/**
 * Derives the effective size to use for cart addition and UI display.
 * Prioritizes user's explicit manual selection, then available recommendation, then first in-stock size.
 *
 * @param {Object} product
 * @param {string|null} manuallySelectedSize
 * @param {Object|null} sizeRecommendation
 * @returns {string|null}
 */
export function resolveEffectiveSize(product, manuallySelectedSize, sizeRecommendation) {
  if (!product || !Array.isArray(product.sizes) || product.sizes.length === 0) {
    return null
  }

  // 1. Explicit user selection always wins
  if (manuallySelectedSize) {
    const matched = product.sizes.find((s) => s.label === manuallySelectedSize)
    if (matched) return matched.label
  }

  // 2. Otherwise use the valid recommendation
  if (
    sizeRecommendation?.status === 'recommended' &&
    sizeRecommendation.isAvailable &&
    sizeRecommendation.recommendedSize
  ) {
    const isPresent = product.sizes.some(
      (s) => s.label === sizeRecommendation.recommendedSize && s.available !== false
    )
    if (isPresent) return sizeRecommendation.recommendedSize
  }

  // 3. Otherwise return unavailable
  return null
}
