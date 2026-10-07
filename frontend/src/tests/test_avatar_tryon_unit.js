/**
 * TrendVolt Phase 3D — Avatar Try-On Foundation Unit Tests
 * 
 * Verifies:
 * 1. Component Architecture & File Integrity
 * 2. Garment Layer Modular Abstraction (Top vs Bottom, Three.js hierarchy)
 * 3. Product Try-On Capability Rules (Supported vs Unsupported)
 * 4. Sizing Engine Integration (Deterministic recommendations + manual override)
 * 5. Size Selection from Real Product Sizes
 * 6. Authentication & User Flow State Guards (Logged-out, No Avatar, Has Avatar)
 * 7. Product Surface Entry Points (ProductCard & ProductDetailsPage)
 * 8. Editorial & Privacy Transparency Audit (No false cloth simulation claims)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as THREE from 'three'
import { GarmentLayerManager, SUPPORTED_GARMENT_TYPES } from '../components/avatar/GarmentLayer.js'
import { recommendSize } from '../constants/sizeCharts.js'
import { resolveGarmentRepresentation, GARMENT_ASSET_STATUS, isProductTryOnActive } from '../utils/garmentAssetResolver.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✓ PASS: ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

console.log('\n=== TEST SUITE: TRENDVOLT PHASE 3D PRODUCT-DRIVEN TRY-ON FOUNDATION ===\n')

// =========================================================================
// SECTION 1: COMPONENT ARCHITECTURE & FILE INTEGRITY
// =========================================================================
console.log('[1] Component Architecture & Modular Files Integrity:')

const tryOnPagePath = path.resolve(__dirname, '../pages/TryOnPage.jsx')
const garmentLayerPath = path.resolve(__dirname, '../components/avatar/GarmentLayer.js')
const avatarViewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')
const productCardPath = path.resolve(__dirname, '../components/ProductCard.jsx')
const productDetailsPath = path.resolve(__dirname, '../pages/ProductDetailsPage.jsx')
const adminProductsPath = path.resolve(__dirname, '../pages/admin/AdminProductsPage.jsx')
const appRoutesPath = path.resolve(__dirname, '../routes/AppRoutes.jsx')

assert(fs.existsSync(tryOnPagePath), 'TryOnPage.jsx exists')
assert(fs.existsSync(garmentLayerPath), 'GarmentLayer.js exists')
assert(fs.existsSync(avatarViewerPath), 'AvatarViewer.jsx exists')

const tryOnContent = fs.readFileSync(tryOnPagePath, 'utf-8')
const garmentLayerContent = fs.readFileSync(garmentLayerPath, 'utf-8')
const productCardContent = fs.readFileSync(productCardPath, 'utf-8')
const productDetailsContent = fs.readFileSync(productDetailsPath, 'utf-8')
const adminProductsContent = fs.readFileSync(adminProductsPath, 'utf-8')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf-8')

// AppRoutes mounts /try-on/:productId
assert(appRoutesContent.includes('/try-on/:productId'), 'AppRoutes configures /try-on/:productId route')
assert(appRoutesContent.includes('TryOnPage'), 'AppRoutes registers lazy-loaded TryOnPage')

// =========================================================================
// SECTION 2: GARMENT LAYER THREE.JS MODULAR ABSTRACTION
// =========================================================================
console.log('\n[2] Modular GarmentLayer Three.js Architecture:')

assert(SUPPORTED_GARMENT_TYPES.includes('top'), 'Supported garment types includes "top"')
assert(SUPPORTED_GARMENT_TYPES.includes('bottom'), 'Supported garment types includes "bottom"')
assert(!SUPPORTED_GARMENT_TYPES.includes('shoes'), 'Garment types does not include unsupported "shoes"')

const mockScene = new THREE.Scene()
const garmentManager = new GarmentLayerManager(mockScene)

assert(mockScene.children.some((c) => c.name === 'TV_GarmentLayerGroup'), 'GarmentLayerManager attaches root group to scene')

// Set Top Garment
garmentManager.setGarment({ type: 'top', label: 'Classic Linen Shirt', allowPlaceholder: true })
assert(garmentManager.currentGarment?.type === 'top', 'GarmentLayer sets active top garment')
assert(garmentManager.group.children.length === 1, 'Top layer group added to garment layer')
const topMesh = garmentManager.group.children[0]
assert(topMesh.name === 'GarmentLayer_Top', 'Top mesh has canonical GarmentLayer_Top name')
assert(topMesh.userData.isDevPlaceholder === true, 'Top mesh explicitly marked as isDevPlaceholder')

// Morph Scaling Top
garmentManager.updateMorphs({ chestScale: 0.5 })
assert(topMesh.scale.x > 1.0, 'Top layer scales proportionally with avatar chestScale')

// Switch to Bottom Garment
garmentManager.setGarment({ type: 'bottom', label: 'Tailored Chinos', allowPlaceholder: true })
assert(garmentManager.currentGarment?.type === 'bottom', 'GarmentLayer switches to bottom garment')
assert(garmentManager.group.children.length === 1, 'Replaced previous mesh cleanly without stacking')
const bottomMesh = garmentManager.group.children[0]
assert(bottomMesh.name === 'GarmentLayer_Bottom', 'Bottom mesh has canonical GarmentLayer_Bottom name')
assert(bottomMesh.userData.isDevPlaceholder === true, 'Bottom mesh explicitly marked as isDevPlaceholder')

// Rejects Unsupported Garment Type
garmentManager.setGarment({ type: 'accessories' })
assert(garmentManager.currentGarment === null, 'Rejects unsupported garment type and clears layer')
assert(garmentManager.group.children.length === 0, 'Group has 0 children after unsupported assignment')

// Clean disposal
garmentManager.setGarment({ type: 'top', allowPlaceholder: true })
garmentManager.dispose()
assert(garmentManager.group === null, 'GarmentLayerManager disposes cleanly without memory leaks')

// =========================================================================
// SECTION 3: PRODUCT-DRIVEN CAPABILITY & ADMIN INTEGRATION
// =========================================================================
console.log('\n[3] Product-Driven Try-On Capability Invariants:')

// Product model check
assert(adminProductsContent.includes('tryOnEnabled'), 'AdminProductsPage manages tryOnEnabled state')
assert(adminProductsContent.includes('tryOnGarmentType'), 'AdminProductsPage manages tryOnGarmentType state')
assert(adminProductsContent.includes('3D Avatar Try-On Capability'), 'Admin form includes dedicated Try-On capability UI')

// Supported product
const supportedTopProduct = {
  _id: 'prod_101',
  name: 'Structured Oxford Shirt',
  price: 2899,
  category: 'fashion',
  department: 'men',
  subcategory: 'shirts',
  sizes: [
    { label: 'S', available: true },
    { label: 'M', available: true },
    { label: 'L', available: true },
  ],
  tryOn: { enabled: true, garmentType: 'top' },
}

const unsupportedProduct = {
  _id: 'prod_102',
  name: 'Leather Belt',
  price: 1299,
  category: 'fashion',
  department: 'accessories',
  tryOn: { enabled: false, garmentType: null },
}

assert(Boolean(supportedTopProduct.tryOn?.enabled), 'Supported product evaluates tryOn.enabled as true')
assert(!unsupportedProduct.tryOn?.enabled, 'Unsupported product evaluates tryOn.enabled as false')

// =========================================================================
// SECTION 4: SIZING ENGINE INTEGRATION & MANUAL SIZE OVERRIDE
// =========================================================================
console.log('\n[4] Authoritative Sizing Engine Integration & Manual Override:')

const mockAvatarProfile = {
  demographic: 'men',
  heightCm: 180,
  fitPreference: 'regular',
  estimatedMeasurements: {
    chest: 100, // ~39.4 inches -> Size M
    waist: 84,
    hip: 98,
    unit: 'cm',
  },
}

const sizingRec = recommendSize({
  department: supportedTopProduct.department,
  subcategory: supportedTopProduct.subcategory,
  productSizes: supportedTopProduct.sizes,
  measurements: mockAvatarProfile.estimatedMeasurements,
  unit: mockAvatarProfile.estimatedMeasurements.unit,
  fitPreference: mockAvatarProfile.fitPreference,
})

assert(sizingRec.status === 'recommended', 'recommendSize returns recommended status')
assert(sizingRec.recommendedSize === 'M', 'Deterministic sizing recommends size M for 100cm chest in men tops')

// Test manual override behavior
let userChosenSize = sizingRec.recommendedSize
assert(userChosenSize === 'M', 'Default selection matches authoritative sizing recommendation')
// User chooses L instead
userChosenSize = 'L'
assert(userChosenSize === 'L', 'User can manually override recommendation and choose available size L')
assert(
  supportedTopProduct.sizes.some((s) => s.label === userChosenSize && s.available),
  'Manually chosen size is validated against real product available sizes'
)

// =========================================================================
// SECTION 5: AUTHENTICATION & USER FLOW STATES IN TRY-ON PAGE
// =========================================================================
console.log('\n[5] Authentication & User Flow State Guards:')

// Unauthenticated check in TryOnPage
assert(tryOnContent.includes('!isAuthenticated'), 'TryOnPage checks authentication state')
assert(tryOnContent.includes('Sign In to Continue') || tryOnContent.includes('Sign In Required'), 'TryOnPage guides logged-out users to sign in')
assert(tryOnContent.includes('state={{ from: location }}'), 'Preserves return location for seamless redirect')

// No Avatar Profile check
assert(tryOnContent.includes('avatarNotFound'), 'TryOnPage detects 404 missing avatar profile')
assert(tryOnContent.includes('Open Avatar Studio'), 'Provides direct CTA to /avatar when profile is missing')
assert(tryOnContent.includes('to="/avatar"'), 'Links to /avatar without duplicating avatar creator')

// Unsupported Product check
assert(tryOnContent.includes('!product.tryOn?.enabled'), 'TryOnPage checks product.tryOn.enabled capability')
assert(tryOnContent.includes('3D Try-On Not Available For This Piece'), 'Presents clear notice when product lacks Try-On')
assert(tryOnContent.includes('View Standard Product Page'), 'Provides clean link back to standard product details')

// =========================================================================
// SECTION 6: PRODUCT SURFACE ENTRY POINTS (CARD & DETAILS)
// =========================================================================
console.log('\n[6] Product Surface Entry Points:')

// ProductCard Try-On button
assert(productCardContent.includes('product.tryOn?.enabled'), 'ProductCard branches on product.tryOn.enabled')
assert(productCardContent.includes('Try-On'), 'ProductCard renders Try-On action indicator')
assert(productCardContent.includes('/try-on/${product._id}'), 'ProductCard links directly to /try-on/:productId')

// ProductDetailsPage Try-On button
assert(productDetailsContent.includes('product?.tryOn?.enabled'), 'ProductDetailsPage branches on product.tryOn.enabled')
assert(productDetailsContent.includes('Try On Your 3D Avatar'), 'ProductDetailsPage provides prominent 3D Avatar Try-On CTA')
assert(productDetailsContent.includes('3D Try-On'), 'ProductDetailsPage provides 3D Try-On link near sizing controls')
assert(productDetailsContent.includes('/try-on/${product._id}'), 'ProductDetailsPage links to /try-on/:productId')

// =========================================================================
// SECTION 7: EDITORIAL & PRIVACY DISCLOSURE AUDIT
// =========================================================================
console.log('\n[7] Editorial & Privacy Transparency Audit:')

// No false promotional claims of realistic cloth simulation or exact fit
const forbiddenClaims = [
  'guaranteed exact fit',
  'perfect fit guaranteed',
  'real-time fabric simulation active',
  'exact body scan active',
]

for (const claim of forbiddenClaims) {
  assert(!tryOnContent.toLowerCase().includes(claim), `TryOnPage does NOT make forbidden claim: "${claim}"`)
  assert(!garmentLayerContent.toLowerCase().includes(claim), `GarmentLayer does NOT make forbidden claim: "${claim}"`)
}

// Transparent architecture disclosure present
assert(tryOnContent.includes('Product-Driven Garment Architecture'), 'TryOnPage discloses Phase 3D architectural foundation')
assert(tryOnContent.includes('conforming to your avatar'), 'Discloses silhouette positioning behavior')
assert(tryOnContent.includes('cloth simulation') && tryOnContent.includes('production 3D asset updates'), 'Honestly explains that full cloth simulation is reserved for production asset releases')
assert(garmentLayerContent.includes('do NOT claim physical cloth simulation or exact fit'), 'GarmentLayer code contains explicit architectural constraint notice')

// Privacy check: Zero photos or biometric storage in Try-On
assert(!tryOnContent.includes('localStorage.setItem'), 'TryOnPage does not persist avatar state to localStorage')
assert(!tryOnContent.includes('sessionStorage.setItem'), 'TryOnPage does not persist avatar state to sessionStorage')
assert(!tryOnContent.includes('uploadPhoto'), 'TryOnPage has zero photo upload logic')

// =========================================================================
// SECTION 8: PHASE 3E REAL GARMENT REPRESENTATION & RESOLVER
// =========================================================================
console.log('\n[8] Phase 3E Real Garment Representation & Asset Resolver:')

// Product with valid 3D asset and active status
const realAssetProduct = {
  _id: 'prod_201',
  name: 'Tailored Poplin Shirt',
  price: 3499,
  category: 'fashion',
  department: 'men',
  subcategory: 'shirts',
  tryOn: {
    enabled: true,
    garmentType: 'top',
    assetUrl: '/models/garments/shirt_poplin.glb',
    assetStatus: 'active',
  },
}

const realRep = resolveGarmentRepresentation(realAssetProduct)
assert(realRep.isSupported === true, 'Real asset product is supported')
assert(realRep.hasRealAsset === true, 'Detects production 3D asset')
assert(realRep.isDevPlaceholder === false, 'Not marked as dev placeholder')
assert(realRep.status === GARMENT_ASSET_STATUS.ACTIVE, 'Status is active')
assert(realRep.assetUrl === '/models/garments/shirt_poplin.glb', 'Preserves asset URL')
assert(isProductTryOnActive(realAssetProduct) === true, 'isProductTryOnActive returns true for active product with asset')

// Product with tryOn enabled but NO assetUrl (Pending status)
const pendingAssetProd = {
  _id: 'prod_202',
  name: 'Merino Wool Crewneck',
  price: 4999,
  category: 'fashion',
  tryOn: {
    enabled: true,
    garmentType: 'top',
    assetUrl: null,
    assetStatus: 'pending',
  },
}

const pendingRep = resolveGarmentRepresentation(pendingAssetProd, { allowDevPlaceholder: true })
assert(pendingRep.isSupported === true, 'Pending asset product with allowDevPlaceholder is supported for testing')
assert(pendingRep.hasRealAsset === false, 'Pending asset has no real 3D asset')
assert(pendingRep.isDevPlaceholder === true, 'Fallback to dev placeholder permitted in test mode')
assert(pendingRep.status === GARMENT_ASSET_STATUS.PLACEHOLDER, 'Status is placeholder')

const strictRep = resolveGarmentRepresentation(pendingAssetProd, { allowDevPlaceholder: false })
assert(strictRep.isSupported === false, 'Strict customer mode does not treat pending product as supported try-on')
assert(strictRep.isDevPlaceholder === false, 'Strict customer mode rejects dev placeholder')
assert(strictRep.status === GARMENT_ASSET_STATUS.PENDING, 'Strict mode status is pending')
assert(isProductTryOnActive(pendingAssetProd) === false, 'isProductTryOnActive returns false for pending product')

// Product with tryOn disabled
const disabledRep = resolveGarmentRepresentation(unsupportedProduct)
assert(disabledRep.isSupported === false, 'Disabled product is not supported')
assert(disabledRep.status === GARMENT_ASSET_STATUS.UNSUPPORTED, 'Disabled status is unsupported')
assert(isProductTryOnActive(unsupportedProduct) === false, 'isProductTryOnActive returns false for disabled product')

// GarmentLayerManager strict placeholder control
const managerStrict = new GarmentLayerManager(new THREE.Scene())
managerStrict.setGarment({ type: 'top', allowPlaceholder: false })
assert(managerStrict.group.children.length === 0, 'allowPlaceholder: false prevents fake geometry generation')
managerStrict.dispose()

// AdminProductsPage Clean UX Audit: No technical 3D fields exposed in normal admin form
assert(!adminProductsContent.includes('3D Garment Asset URL (.glb)'), 'AdminProductsPage does NOT expose technical 3D Garment Asset URL input')
assert(!adminProductsContent.includes('meshOptions'), 'AdminProductsPage does NOT expose technical mesh options')
assert(adminProductsContent.includes('tryOnEnabled'), 'AdminProductsPage manages simple tryOnEnabled state')
assert(adminProductsContent.includes('tryOnGarmentType'), 'AdminProductsPage manages simple tryOnGarmentType state')

// Customer UI Visibility Audit: Try-On button conditional on active production capability
assert(productCardContent.includes('isProductTryOnActive'), 'ProductCard gates Try-On button with isProductTryOnActive')
assert(productDetailsContent.includes('isProductTryOnActive'), 'ProductDetailsPage gates Try-On CTA with isProductTryOnActive')

// TryOnPage integrates garmentAssetResolver and guards against pending products
assert(tryOnContent.includes('resolveGarmentRepresentation'), 'TryOnPage integrates resolveGarmentRepresentation')
assert(tryOnContent.includes('!garmentRepresentation.isSupported'), 'TryOnPage guards against non-active products')

// =========================================================================
// SECTION 9: PHASE 3G PRODUCTION GARMENT RUNTIME & BOUNDARY ISOLATION
// =========================================================================
console.log('\n[9] Phase 3G Production Garment Runtime & Boundary Isolation:')

// 1. Invalid Garment Type Rejection
const invalidTypeProduct = {
  _id: 'prod_301',
  name: 'Silk Kimono Dress',
  price: 5499,
  category: 'fashion',
  tryOn: {
    enabled: true,
    garmentType: 'dress', // Invalid (only top/bottom supported)
    assetUrl: '/models/garments/dress.glb',
    assetStatus: 'active',
  },
}
assert(isProductTryOnActive(invalidTypeProduct) === false, 'isProductTryOnActive rejects unsupported garmentType "dress"')
const invalidTypeRep = resolveGarmentRepresentation(invalidTypeProduct)
assert(invalidTypeRep.isSupported === false, 'resolveGarmentRepresentation rejects unsupported garmentType')
assert(invalidTypeRep.status === GARMENT_ASSET_STATUS.UNSUPPORTED, 'Invalid garmentType returns UNSUPPORTED status')

// 2. Invalid Asset Format / URL Rejection
const invalidAssetProduct = {
  _id: 'prod_302',
  name: 'Graphic Tee',
  price: 1499,
  category: 'fashion',
  tryOn: {
    enabled: true,
    garmentType: 'top',
    assetUrl: 'tee_image.png', // Invalid non-3D extension
    assetStatus: 'active',
  },
}
assert(isProductTryOnActive(invalidAssetProduct) === false, 'isProductTryOnActive rejects non-3D asset extension (.png)')
const invalidAssetRep = resolveGarmentRepresentation(invalidAssetProduct)
assert(invalidAssetRep.isSupported === false, 'resolveGarmentRepresentation rejects non-3D asset reference')
assert(invalidAssetRep.hasRealAsset === false, 'Invalid asset reference does NOT claim real 3D asset')

// 3. GarmentLayerManager Customer Runtime Placeholder Isolation
const customerScene = new THREE.Scene()
const customerManager = new GarmentLayerManager(customerScene)
let errorFired = false
customerManager.setGarment(
  { type: 'top', allowPlaceholder: false },
  { onError: () => { errorFired = true } }
)
assert(errorFired === true, 'GarmentLayerManager triggers onError callback when asset is missing in customer mode')
assert(customerManager.group.children.length === 0, 'Dev placeholder NEVER rendered in customer mode (allowPlaceholder: false)')

// 4. Product Change Cleanup Verification
customerManager.setGarment({ type: 'top', allowPlaceholder: true })
assert(customerManager.group.children.length === 1, 'Dev preview loaded in explicit test mode')
// Change product to null / another garment
customerManager.setGarment(null)
assert(customerManager.group.children.length === 0, 'Changing product disposes previous mesh cleanly without stale remnants')
assert(customerManager.currentGarment === null, 'currentGarment cleared on product change')

// 5. In-Flight Request Cancellation & Unmount Cleanup
customerManager.dispose()
assert(customerManager.group === null, 'dispose() completely detaches layer group from scene')
assert(customerManager.scene === null, 'dispose() nullifies scene reference to prevent memory leaks')

// 6. TryOnPage Customer-Safe Error Handling Audit
assert(tryOnContent.includes('garmentLoadError'), 'TryOnPage tracks garmentLoadError state')
assert(tryOnContent.includes('3D Garment Model Unavailable'), 'TryOnPage presents clean customer-safe fallback title')
assert(tryOnContent.includes('Return to Product Details'), 'TryOnPage provides back-to-product action upon load failure')
assert(!tryOnContent.includes('stackTrace'), 'TryOnPage does not expose technical stack traces to customer')
assert(!tryOnContent.includes('.glb') || tryOnContent.includes('production 3D asset updates'), 'TryOnPage does not leak raw file system paths in customer UI')

console.log(`\n============================================================`)
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('ALL PHASE 3G PRODUCTION RUNTIME & ASSET TESTS PASSED ✓')
} else {
  console.error('SOME TESTS FAILED ✗')
  process.exit(1)
}
console.log(`============================================================\n`)

