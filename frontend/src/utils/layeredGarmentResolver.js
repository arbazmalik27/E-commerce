/**
 * TrendVolt Virtual Avatar — 2D Layered Clothing Preview Asset Contract & Resolver
 *
 * Provides authoritative contracts, anchor positions, format validation, and
 * runtime fallback selection for the 2D layered avatar preview.
 *
 * Core Architectural Invariants:
 * 1. 2D clothing overlays MUST have transparency (PNG, WebP, SVG) and be calibrated
 *    to the standard avatar canvas coordinate frame.
 * 2. Ordinary catalog product photos (model photos, folded garments, flat-lays on white background)
 *    are NEVER treated as avatar clothing layers. They are strictly rejected.
 * 3. 2D fallback is selected ONLY when a product lacks a usable 3D garment asset AND has a
 *    verified compatible 2D overlay asset.
 * 4. Missing assets fail gracefully with explicit user-facing unavailability status.
 * 5. Zero fake/fabricated assets.
 */

import { isProductTryOnActive, resolveGarmentRepresentation } from './garmentAssetResolver.js'

/**
 * Canonical 2D Canvas Specification (3:4 portrait ratio)
 */
export const CANONICAL_2D_CANVAS = {
  width: 600,
  height: 800,
  aspectRatio: '3/4',
  viewBox: '0 0 600 800',
}

/**
 * Documented Anchor Positions & Layer Stacking Order (Z-Index Hierarchy)
 * Expressed as percentages of the canonical 600x800 canvas.
 */
export const CANONICAL_2D_ANCHORS = {
  base: {
    top: '0%',
    left: '0%',
    width: '100%',
    height: '100%',
    zIndex: 10,
    description: 'Realistic human anatomical base silhouette/photo',
  },
  bottom: {
    top: '46%',
    left: '24%',
    width: '52%',
    height: '44%',
    zIndex: 20,
    description: 'Lower-body apparel (trousers, jeans, chinos, skirts)',
  },
  top: {
    top: '16%',
    left: '20%',
    width: '60%',
    height: '38%',
    zIndex: 30,
    description: 'Upper-body apparel (shirts, t-shirts, hoodies, jackets)',
  },
  shoes: {
    top: '85%',
    left: '26%',
    width: '48%',
    height: '13%',
    zIndex: 25,
    description: 'Footwear (sneakers, shoes, boots)',
  },
  accessories: {
    top: '14%',
    left: '22%',
    width: '56%',
    height: '32%',
    zIndex: 35,
    description: 'Accessories (watches, hats, bags, scarves)',
  },
}

/**
 * Supported transparent image formats for 2D clothing overlays.
 * JPEG/JPG is strictly excluded because it lacks an alpha channel.
 */
export const SUPPORTED_2D_OVERLAY_FORMATS = ['png', 'webp', 'svg']

/**
 * Validates whether an asset URL points to a compatible transparent 2D overlay format.
 *
 * @param {string|null} url
 * @returns {boolean}
 */
export function isValid2DOverlayAsset(url) {
  if (!url || typeof url !== 'string') return false
  const clean = url.trim().toLowerCase()
  if (clean.length < 5) return false

  // Reject JPEG / JPG photos: Ordinary product photos lack alpha channel
  if (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.includes('.jpg?') ||
    clean.includes('.jpeg?')
  ) {
    return false
  }

  // Accept valid transparent overlay formats
  return (
    clean.endsWith('.png') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.svg') ||
    clean.includes('.png?') ||
    clean.includes('.webp?') ||
    clean.includes('.svg?')
  )
}

/**
 * Authoritative 2D Garment Overlay Registry
 * Maps verified product IDs or canonical sample SKUs to transparent 2D clothing overlay assets.
 * Products not registered here must provide `tryOn2D` metadata on the product object.
 */
export const AVATAR_2D_GARMENT_REGISTRY = {
  // Production-calibrated 2D overlays can be registered here by product ID or SKU
}

/**
 * Resolves the 2D layered garment asset for a given product and slot.
 *
 * @param {Object|null} product - TrendVolt Product object
 * @param {string} [slotOverride] - Optional slot override ('top' | 'bottom')
 * @returns {Object} Structured 2D garment descriptor
 */
export function resolve2DGarmentAsset(product, slotOverride = null) {
  if (!product) {
    return {
      isCompatible: false,
      hasRealAsset: false,
      url: null,
      slot: null,
      format: null,
      label: '',
      alignment: 'full-bleed',
      reason: 'No product provided',
    }
  }

  const productId = String(product._id || product.id || '')
  const label = product.name || 'Garment'

  // Determine slot
  let slot = slotOverride
  if (!slot) {
    if (product.tryOn?.garmentType) {
      slot = product.tryOn.garmentType
    } else if (product.tryOn2D?.slot) {
      slot = product.tryOn2D.slot
    } else {
      const dept = String(product.department || '').toLowerCase()
      const subcat = String(product.subcategory || '').toLowerCase()
      if (['shirts', 't-shirts', 'tops', 'hoodies-sweatshirts', 'jackets-coats'].includes(subcat)) {
        slot = 'top'
      } else if (['jeans', 'trousers', 'shorts', 'skirts'].includes(subcat)) {
        slot = 'bottom'
      } else if (dept === 'footwear') {
        slot = 'shoes'
      } else if (dept === 'accessories') {
        slot = 'accessories'
      }
    }
  }

  // Look for dedicated 2D overlay candidate
  // 1. Explicit tryOn2D metadata on product
  // 2. tryOn.overlay2DUrl or tryOn.asset2DUrl
  // 3. Registered entry in AVATAR_2D_GARMENT_REGISTRY
  let candidateUrl = null
  let alignment = 'full-bleed'

  if (product.tryOn2D?.assetUrl && typeof product.tryOn2D.assetUrl === 'string') {
    candidateUrl = product.tryOn2D.assetUrl.trim()
    alignment = product.tryOn2D.alignment || 'full-bleed'
  } else if (product.tryOn?.overlay2DUrl && typeof product.tryOn.overlay2DUrl === 'string') {
    candidateUrl = product.tryOn.overlay2DUrl.trim()
  } else if (product.tryOn?.asset2DUrl && typeof product.tryOn.asset2DUrl === 'string') {
    candidateUrl = product.tryOn.asset2DUrl.trim()
  } else if (productId && AVATAR_2D_GARMENT_REGISTRY[productId]) {
    const reg = AVATAR_2D_GARMENT_REGISTRY[productId]
    candidateUrl = typeof reg === 'string' ? reg : reg.assetUrl
    alignment = reg.alignment || 'full-bleed'
  }

  // Validate candidate
  if (!candidateUrl) {
    return {
      isCompatible: false,
      hasRealAsset: false,
      url: null,
      slot,
      format: null,
      label,
      alignment: 'full-bleed',
      reason: 'No dedicated 2D overlay asset registered for this product',
    }
  }

  if (!isValid2DOverlayAsset(candidateUrl)) {
    return {
      isCompatible: false,
      hasRealAsset: false,
      url: candidateUrl,
      slot,
      format: null,
      label,
      alignment: 'full-bleed',
      reason: 'Asset is not a transparent overlay (PNG, WebP, SVG required). Ordinary photos cannot be projected.',
    }
  }

  const ext = candidateUrl.split('.').pop().split('?')[0].toLowerCase()

  return {
    isCompatible: true,
    hasRealAsset: true,
    url: candidateUrl,
    slot,
    format: ext,
    label,
    alignment,
    anchor: CANONICAL_2D_ANCHORS[slot] || CANONICAL_2D_ANCHORS.base,
    reason: null,
  }
}

/**
 * Deterministically determines preview mode for a product:
 * - '3d': Usable 3D asset exists and is active.
 * - '2d': 3D asset is not usable/active, but compatible 2D overlay is available.
 * - 'unavailable': Neither 3D nor 2D overlay is available.
 *
 * @param {Object|null} product
 * @param {Object} [options]
 * @returns {{
 *   mode: '3d'|'2d'|'unavailable',
 *   canUse3D: boolean,
 *   canUse2D: boolean,
 *   asset3D: Object|null,
 *   asset2D: Object|null,
 *   statusLabel: string
 * }}
 */
export function determineGarmentPreviewMode(product) {
  if (!product) {
    return {
      mode: 'unavailable',
      canUse3D: false,
      canUse2D: false,
      asset3D: null,
      asset2D: null,
      statusLabel: 'No product selected',
    }
  }

  const canUse3D = isProductTryOnActive(product)
  const rep3D = canUse3D ? resolveGarmentRepresentation(product, { allowDevPlaceholder: false }) : null

  const asset2D = resolve2DGarmentAsset(product)
  const canUse2D = asset2D.isCompatible && asset2D.hasRealAsset

  if (canUse3D && rep3D?.hasRealAsset) {
    return {
      mode: '3d',
      canUse3D: true,
      canUse2D,
      asset3D: rep3D,
      asset2D: canUse2D ? asset2D : null,
      statusLabel: 'Production 3D Garment Active',
    }
  }

  if (canUse2D) {
    return {
      mode: '2d',
      canUse3D: false,
      canUse2D: true,
      asset3D: null,
      asset2D,
      statusLabel: '2D Layered Clothing Preview Active',
    }
  }

  return {
    mode: 'unavailable',
    canUse3D: false,
    canUse2D: false,
    asset3D: null,
    asset2D: null,
    statusLabel: 'Try-On Preview Asset Unavailable',
  }
}

/**
 * 2D Demographic Base Specifications
 * Defines anatomical proportions for realistic human silhouettes per demographic.
 */
export const AVATAR_2D_BASES = {
  men: {
    id: 'men',
    label: 'Adult Male Silhouette',
    aspectRatio: '3/4',
    shoulderRatio: 0.48,
    waistRatio: 0.32,
    hipRatio: 0.36,
    defaultHeightCm: 178,
  },
  women: {
    id: 'women',
    label: 'Adult Female Silhouette',
    aspectRatio: '3/4',
    shoulderRatio: 0.42,
    waistRatio: 0.28,
    hipRatio: 0.40,
    defaultHeightCm: 168,
  },
  boys: {
    id: 'boys',
    label: 'Youth Boy Silhouette',
    aspectRatio: '3/4',
    shoulderRatio: 0.38,
    waistRatio: 0.30,
    hipRatio: 0.32,
    defaultHeightCm: 130,
  },
  girls: {
    id: 'girls',
    label: 'Youth Girl Silhouette',
    aspectRatio: '3/4',
    shoulderRatio: 0.36,
    waistRatio: 0.28,
    hipRatio: 0.32,
    defaultHeightCm: 128,
  },
  kids: {
    id: 'kids',
    label: 'Youth Silhouette',
    aspectRatio: '3/4',
    shoulderRatio: 0.36,
    waistRatio: 0.30,
    hipRatio: 0.32,
    defaultHeightCm: 125,
  },
}
