/**
 * TrendVolt Phase 3F — Garment Asset Resolver & Internal Capability Mapping
 * 
 * Maps backend product Try-On capability and internal asset metadata to an
 * authoritative garment representation object for AvatarViewer, GarmentLayer,
 * ProductCard, and ProductDetailsPage.
 * 
 * Core Invariants:
 * 1. Backend product remains source of truth.
 * 2. Only ACTIVE production garment representations can be presented to customers as real Try-On.
 * 3. PENDING products (Try-On enabled but asset not yet available) do not show misleading 3D Try-On buttons.
 * 4. PLACEHOLDER geometry is strictly development-only.
 * 5. Does NOT fabricate fake 3D meshes from 2D images.
 */

export const GARMENT_ASSET_STATUS = {
  ACTIVE: 'active', // Valid production 3D mesh asset exists and is active
  PENDING: 'pending', // Try-On intended by admin, but production garment asset is pending
  PLACEHOLDER: 'placeholder', // Development-only architectural representation
  UNSUPPORTED: 'unsupported', // Product does not support Try-On
}

/**
 * Validates that an asset reference points to a supported 3D binary mesh format (.glb or .gltf).
 * @param {string|null} ref
 * @returns {boolean}
 */
export function isValid3DAssetUrl(ref) {
  if (!ref || typeof ref !== 'string') return false
  const clean = ref.trim().toLowerCase()
  if (clean.length < 5) return false
  return (
    clean.endsWith('.glb') ||
    clean.endsWith('.gltf') ||
    clean.includes('.glb?') ||
    clean.includes('.gltf?')
  )
}

/**
 * Checks whether a product has an active production 3D Try-On capability.
 * Customer UI surfaces (ProductCard, ProductDetailsPage) must ONLY present Try-On
 * when this function returns true.
 * @param {Object|null} product
 * @returns {boolean}
 */
export function isProductTryOnActive(product) {
  if (!product || !product.tryOn || !product.tryOn.enabled) {
    return false
  }

  const isValidGarmentType =
    product.tryOn.garmentType === 'top' || product.tryOn.garmentType === 'bottom'
  const hasStatusActive = product.tryOn.assetStatus === GARMENT_ASSET_STATUS.ACTIVE
  const assetRef = product.tryOn.assetUrl || product.tryOn.assetReference
  const hasValidAssetRef = isValid3DAssetUrl(assetRef)

  return Boolean(isValidGarmentType && hasStatusActive && hasValidAssetRef)
}

/**
 * Resolves a product's internal garment representation.
 * @param {Object|null} product
 * @param {Object} [options]
 * @param {boolean} [options.allowDevPlaceholder=false] - Whether dev placeholder is permitted (strictly false for customer prod flow)
 * @returns {Object} Garment representation descriptor
 */
export function resolveGarmentRepresentation(product, { allowDevPlaceholder = false } = {}) {
  if (!product || !product.tryOn || !product.tryOn.enabled) {
    return {
      isSupported: false,
      hasRealAsset: false,
      isDevPlaceholder: false,
      status: GARMENT_ASSET_STATUS.UNSUPPORTED,
      garmentType: null,
      assetUrl: null,
      label: product?.name || '',
      color: null,
      statusLabel: 'Try-On Not Supported',
    }
  }

  const rawType = product.tryOn.garmentType
  const isValidGarmentType = rawType === 'top' || rawType === 'bottom'
  if (!isValidGarmentType) {
    return {
      isSupported: false,
      hasRealAsset: false,
      isDevPlaceholder: false,
      status: GARMENT_ASSET_STATUS.UNSUPPORTED,
      garmentType: null,
      assetUrl: null,
      label: product?.name || '',
      color: null,
      statusLabel: 'Invalid Garment Type',
    }
  }

  const garmentType = rawType
  const rawAssetRef = product.tryOn.assetUrl || product.tryOn.assetReference
  const trimmedUrl = rawAssetRef ? String(rawAssetRef).trim() : null
  const hasValidAssetRef = isValid3DAssetUrl(trimmedUrl)

  // ACTIVE: Valid production garment asset exists and status is active
  if (product.tryOn.assetStatus === GARMENT_ASSET_STATUS.ACTIVE && hasValidAssetRef) {
    return {
      isSupported: true,
      hasRealAsset: true,
      isDevPlaceholder: false,
      status: GARMENT_ASSET_STATUS.ACTIVE,
      garmentType,
      assetUrl: trimmedUrl,
      label: product.name,
      color: garmentType === 'bottom' ? 0x242622 : 0x2e3b2b,
      statusLabel: 'Production 3D Garment Active',
    }
  }

  // If allowDevPlaceholder is explicitly enabled (development/architecture testing)
  if (allowDevPlaceholder) {
    return {
      isSupported: true,
      hasRealAsset: false,
      isDevPlaceholder: true,
      status: GARMENT_ASSET_STATUS.PLACEHOLDER,
      garmentType,
      assetUrl: null,
      label: product.name,
      color: garmentType === 'bottom' ? 0x242622 : 0x2e3b2b,
      statusLabel: 'Development Architecture Preview (Silhouette)',
    }
  }

  // PENDING: Try-On intended by admin, but production garment asset is not yet available
  return {
    isSupported: false,
    hasRealAsset: false,
    isDevPlaceholder: false,
    status: GARMENT_ASSET_STATUS.PENDING,
    garmentType,
    assetUrl: null,
    label: product.name,
    color: null,
    statusLabel: 'Production 3D Garment Pending',
  }
}
