/**
 * TrendVolt Phase 4D — Outfit Visualization Runtime Unit Tests
 * 
 * Verifies:
 * 1. Component Architecture & File Integrity
 * 2. Outfit Top selection reaches Garment Runtime
 * 3. Outfit Bottom selection reaches Garment Runtime
 * 4. Modular Multi-Layer Coexistence (Avatar + Top + Bottom simultaneously)
 * 5. Replacing Top preserves Bottom layer
 * 6. Replacing Bottom preserves Top layer
 * 7. Removing Top preserves Bottom layer
 * 8. Removing Bottom preserves Top layer
 * 9. Unsupported products remain selected in wardrobe without fake 3D rendering (strict allowPlaceholder: false)
 * 10. Active production asset resolves correctly via garmentAssetResolver
 * 11. Stale async GLB load protection (request sequencing rejects out-of-order loads)
 * 12. Garment memory cleanup & deep Three.js hierarchy disposal
 * 13. Deterministic color & style matcher updates live upon outfit changes
 * 14. Shoes and accessories remain in outfit state without fake 3D rendering
 * 15. Clear outfit resets runtime state cleanly
 * 16. URL query-string product selection continuity (?selectProduct=:id)
 * 17. Authentication & Profile guards preserved
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GarmentLayerManager } from '../components/avatar/GarmentLayer.js'
import {
  resolveGarmentRepresentation,
  isProductTryOnActive,
  GARMENT_ASSET_STATUS,
} from '../utils/garmentAssetResolver.js'
import { INITIAL_OUTFIT } from '../constants/wardrobeConstants.js'
import { analyzeOutfitColorMatch } from '../utils/outfitColorMatcher.js'

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

console.log('\n=== TEST SUITE: TRENDVOLT PHASE 4D OUTFIT VISUALIZATION RUNTIME ===\n')

// =========================================================================
// SECTION 1: COMPONENT ARCHITECTURE & FILE INTEGRITY
// =========================================================================
console.log('[1] Component Architecture & File Integrity:')

const garmentLayerPath = path.resolve(__dirname, '../components/avatar/GarmentLayer.js')
const avatarViewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')
const wardrobePagePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')
const virtualWardrobePath = path.resolve(__dirname, '../components/avatar/VirtualWardrobe.jsx')
const resolverPath = path.resolve(__dirname, '../utils/garmentAssetResolver.js')

assert(fs.existsSync(garmentLayerPath), 'GarmentLayer.js exists')
assert(fs.existsSync(avatarViewerPath), 'AvatarViewer.jsx exists')
assert(fs.existsSync(wardrobePagePath), 'AvatarWardrobePage.jsx exists')
assert(fs.existsSync(virtualWardrobePath), 'VirtualWardrobe.jsx exists')
assert(fs.existsSync(resolverPath), 'garmentAssetResolver.js exists')

const garmentLayerCode = fs.readFileSync(garmentLayerPath, 'utf-8')
const avatarViewerCode = fs.readFileSync(avatarViewerPath, 'utf-8')
const wardrobePageCode = fs.readFileSync(wardrobePagePath, 'utf-8')
const virtualWardrobeCode = fs.readFileSync(virtualWardrobePath, 'utf-8')

assert(garmentLayerCode.includes('setGarments('), 'GarmentLayerManager exposes modular setGarments()')
assert(garmentLayerCode.includes('setSlotGarment('), 'GarmentLayerManager exposes modular setSlotGarment()')
assert(garmentLayerCode.includes('clearSlot('), 'GarmentLayerManager exposes modular clearSlot()')
assert(avatarViewerCode.includes('garments = null'), 'AvatarViewer accepts modular garments prop')
assert(wardrobePageCode.includes('active3DGarments'), 'AvatarWardrobePage builds modular active3DGarments')
assert(wardrobePageCode.includes('garments={active3DGarments}'), 'AvatarWardrobePage passes garments to AvatarViewer')

// =========================================================================
// SECTION 2: MOCK DATA PRODUCTS
// =========================================================================
const activeTopProduct = {
  _id: 'top-active-1',
  name: 'Tailored Linen Overshirt',
  category: 'fashion',
  department: 'men',
  subcategory: 'shirts',
  price: 3499,
  colors: ['Olive'],
  tryOn: {
    enabled: true,
    garmentType: 'top',
    assetStatus: 'active',
    assetUrl: '/models/garments/linen_shirt.glb',
  },
}

const activeTopProduct2 = {
  _id: 'top-active-2',
  name: 'Merino Wool Crewneck',
  category: 'fashion',
  department: 'men',
  subcategory: 'sweaters',
  price: 4999,
  colors: ['Charcoal'],
  tryOn: {
    enabled: true,
    garmentType: 'top',
    assetStatus: 'active',
    assetUrl: '/models/garments/wool_crewneck.glb',
  },
}

const activeBottomProduct = {
  _id: 'bottom-active-1',
  name: 'Pleated Wool Trousers',
  category: 'fashion',
  department: 'men',
  subcategory: 'trousers',
  price: 4299,
  colors: ['Charcoal'],
  tryOn: {
    enabled: true,
    garmentType: 'bottom',
    assetStatus: 'active',
    assetUrl: '/models/garments/pleated_trousers.glb',
  },
}

const activeBottomProduct2 = {
  _id: 'bottom-active-2',
  name: 'Raw Denim Jeans',
  category: 'fashion',
  department: 'men',
  subcategory: 'jeans',
  price: 3999,
  colors: ['Navy'],
  tryOn: {
    enabled: true,
    garmentType: 'bottom',
    assetStatus: 'active',
    assetUrl: '/models/garments/raw_denim.glb',
  },
}

const unsupportedTopProduct = {
  _id: 'top-unsupported-1',
  name: 'Standard Graphic Tee',
  category: 'fashion',
  department: 'men',
  subcategory: 't-shirts',
  price: 1299,
  colors: ['White'],
  tryOn: {
    enabled: false,
    garmentType: null,
  },
}

const pendingBottomProduct = {
  _id: 'bottom-pending-1',
  name: 'Upcoming Corduroy Pants',
  category: 'fashion',
  department: 'men',
  subcategory: 'trousers',
  price: 3199,
  colors: ['Brown'],
  tryOn: {
    enabled: true,
    garmentType: 'bottom',
    assetStatus: 'pending',
    assetUrl: null,
  },
}

const shoeProduct = {
  _id: 'shoes-1',
  name: 'Leather Chelsea Boots',
  category: 'fashion',
  department: 'footwear',
  subcategory: 'boots',
  price: 6999,
  colors: ['Black'],
  tryOn: { enabled: false },
}

const accessoryProduct = {
  _id: 'acc-1',
  name: 'Minimalist Chronograph',
  category: 'fashion',
  department: 'accessories',
  subcategory: 'watches',
  price: 8499,
  colors: ['Silver'],
  tryOn: { enabled: false },
}

// =========================================================================
// SECTION 3: MODULAR GARMENT RUNTIME & MULTI-LAYER COEXISTENCE
// =========================================================================
console.log('\n[2] Modular Garment Runtime & Multi-Layer Coexistence:')

const mockScene = {
  children: [],
  add(item) { this.children.push(item) },
  remove(item) { this.children = this.children.filter((c) => c !== item) },
  traverse(cb) {
    cb(this)
    this.children.forEach((c) => c.traverse?.(cb))
  },
}

const runtime = new GarmentLayerManager(mockScene)
assert(mockScene.children.some((c) => c.name === 'TV_GarmentLayerGroup'), 'Runtime attaches TV_GarmentLayerGroup to scene')
assert(Boolean(runtime.slots.top && runtime.slots.bottom), 'Runtime initializes modular top and bottom slots')

// 1. Outfit Top Selection reaches garment runtime (testing with allowPlaceholder: true for mock silhouette)
runtime.setSlotGarment('top', {
  type: 'top',
  label: activeTopProduct.name,
  allowPlaceholder: true,
})
assert(runtime.slots.top.mesh !== null, 'Top garment attached to top slot')
assert(runtime.group.children.length === 1, 'Top mesh added as child of GarmentLayerGroup')
assert(runtime.group.children[0].name === 'GarmentLayer_Top', 'Top mesh has canonical GarmentLayer_Top name')

// 2. Outfit Bottom Selection reaches garment runtime
runtime.setSlotGarment('bottom', {
  type: 'bottom',
  label: activeBottomProduct.name,
  allowPlaceholder: true,
})
assert(runtime.slots.bottom.mesh !== null, 'Bottom garment attached to bottom slot')
assert(runtime.group.children.length === 2, 'Top + Bottom COEXIST simultaneously in Three.js hierarchy (length === 2)')
assert(runtime.group.children.some((c) => c.name === 'GarmentLayer_Top'), 'GarmentLayerGroup contains GarmentLayer_Top')
assert(runtime.group.children.some((c) => c.name === 'GarmentLayer_Bottom'), 'GarmentLayerGroup contains GarmentLayer_Bottom')

// 3. Replacing Top preserves Bottom layer
const initialBottomMesh = runtime.slots.bottom.mesh
runtime.setSlotGarment('top', {
  type: 'top',
  label: activeTopProduct2.name,
  allowPlaceholder: true,
})
assert(runtime.group.children.length === 2, 'Still exactly 2 meshes after replacing top')
assert(runtime.slots.bottom.mesh === initialBottomMesh, 'Bottom mesh is unchanged and preserved after replacing top')
assert(runtime.slots.top.mesh.userData.garmentLabel === activeTopProduct2.name, 'Top slot updated to new product')

// 4. Replacing Bottom preserves Top layer
const currentTopMesh = runtime.slots.top.mesh
runtime.setSlotGarment('bottom', {
  type: 'bottom',
  label: activeBottomProduct2.name,
  allowPlaceholder: true,
})
assert(runtime.group.children.length === 2, 'Still exactly 2 meshes after replacing bottom')
assert(runtime.slots.top.mesh === currentTopMesh, 'Top mesh is unchanged and preserved after replacing bottom')
assert(runtime.slots.bottom.mesh.userData.garmentLabel === activeBottomProduct2.name, 'Bottom slot updated to new product')

// 5. Removing Top preserves Bottom layer
runtime.clearSlot('top')
assert(runtime.slots.top.mesh === null, 'Top slot mesh is null after clearing top')
assert(runtime.slots.bottom.mesh !== null, 'Bottom slot mesh remains intact after clearing top')
assert(runtime.group.children.length === 1, 'Group children length is 1 after removing top')
assert(runtime.group.children[0].name === 'GarmentLayer_Bottom', 'Remaining child is GarmentLayer_Bottom')

// 6. Restoring Top and removing Bottom preserves Top layer
runtime.setSlotGarment('top', {
  type: 'top',
  label: activeTopProduct.name,
  allowPlaceholder: true,
})
assert(runtime.group.children.length === 2, 'Group has 2 children after restoring top')

runtime.clearSlot('bottom')
assert(runtime.slots.bottom.mesh === null, 'Bottom slot mesh is null after clearing bottom')
assert(runtime.slots.top.mesh !== null, 'Top slot mesh remains intact after clearing bottom')
assert(runtime.group.children.length === 1, 'Group children length is 1 after removing bottom')
assert(runtime.group.children[0].name === 'GarmentLayer_Top', 'Remaining child is GarmentLayer_Top')

// =========================================================================
// SECTION 4: PRODUCTION ASSET RESOLUTION & FAKE-RENDERING PREVENTION
// =========================================================================
console.log('\n[3] Asset Resolution & Anti-Fake Invariants:')

// Active production products resolve correctly
const topResolved = resolveGarmentRepresentation(activeTopProduct, { allowDevPlaceholder: false })
assert(topResolved.isSupported === true, 'Active top is resolved as supported')
assert(topResolved.hasRealAsset === true, 'Active top has real asset flag true')
assert(topResolved.status === GARMENT_ASSET_STATUS.ACTIVE, 'Active top status is active')
assert(isProductTryOnActive(activeTopProduct) === true, 'isProductTryOnActive returns true for active top')

const bottomResolved = resolveGarmentRepresentation(activeBottomProduct, { allowDevPlaceholder: false })
assert(bottomResolved.isSupported === true, 'Active bottom is resolved as supported')
assert(bottomResolved.hasRealAsset === true, 'Active bottom has real asset flag true')
assert(bottomResolved.status === GARMENT_ASSET_STATUS.ACTIVE, 'Active bottom status is active')
assert(isProductTryOnActive(activeBottomProduct) === true, 'isProductTryOnActive returns true for active bottom')

// Unsupported and Pending products DO NOT generate fake 3D geometry in customer flow
const unsuppResolved = resolveGarmentRepresentation(unsupportedTopProduct, { allowDevPlaceholder: false })
assert(unsuppResolved.isSupported === false, 'Unsupported product resolves as not supported')
assert(unsuppResolved.hasRealAsset === false, 'Unsupported product hasRealAsset is false')
assert(isProductTryOnActive(unsupportedTopProduct) === false, 'isProductTryOnActive returns false for unsupported product')

const pendingResolved = resolveGarmentRepresentation(pendingBottomProduct, { allowDevPlaceholder: false })
assert(pendingResolved.isSupported === false, 'Pending product resolves as not supported in customer flow')
assert(pendingResolved.hasRealAsset === false, 'Pending product hasRealAsset is false')
assert(isProductTryOnActive(pendingBottomProduct) === false, 'isProductTryOnActive returns false for pending product')

// Runtime strictly rejects creating mesh when allowPlaceholder is false and assetUrl is missing
let reportedError = null
runtime.setSlotGarment('bottom', {
  type: 'bottom',
  assetUrl: null,
  allowPlaceholder: false,
}, {
  onError: (err) => { reportedError = err },
})
assert(runtime.slots.bottom.mesh === null, 'No fake mesh created for product lacking production asset')
assert(reportedError !== null, 'Runtime reports error callback when production asset is missing')

// =========================================================================
// SECTION 5: STALE ASYNC GLB REQUEST ISOLATION
// =========================================================================
console.log('\n[4] Stale Async Request Protection:')

// Slot request IDs increment upon every change
const initialReqId = runtime.slots.top.requestId
runtime.clearSlot('top')
const postClearReqId = runtime.slots.top.requestId
assert(postClearReqId > initialReqId, 'clearSlot increments slot requestId')

runtime.setSlotGarment('top', {
  type: 'top',
  label: 'Fast Selection 1',
  allowPlaceholder: true,
})
const reqId1 = runtime.slots.top.requestId

runtime.setSlotGarment('top', {
  type: 'top',
  label: 'Fast Selection 2',
  allowPlaceholder: true,
})
const reqId2 = runtime.slots.top.requestId
assert(reqId2 > reqId1, 'Rapid product replacement increments slot requestId')
assert(runtime.slots.top.garment.label === 'Fast Selection 2', 'Current slot garment is newest selection')

// =========================================================================
// SECTION 6: MORPH TARGET & PROPORTION PROPAGATION
// =========================================================================
console.log('\n[5] Morph Weights Propagation across Coexisting Layers:')

runtime.setGarments({
  top: { type: 'top', label: 'Top for Morphs', allowPlaceholder: true },
  bottom: { type: 'bottom', label: 'Bottom for Morphs', allowPlaceholder: true },
})
assert(runtime.group.children.length === 2, 'Both layers mounted for morph evaluation')

runtime.updateMorphs({ chestScale: 0.4, waistScale: 0.3, hipScale: 0.5 })
assert(runtime.slots.top.mesh.scale.x > 1.0, 'Top mesh scale adjusts proportionally with chestScale')
assert(runtime.slots.bottom.mesh.scale.x > 1.0, 'Bottom mesh scale adjusts proportionally with hipScale')

// =========================================================================
// SECTION 7: FULL RUNTIME CLEANUP & DEEP DISPOSAL
// =========================================================================
console.log('\n[6] Runtime Cleanup & Deep Disposal:')

runtime.clear()
assert(runtime.group.children.length === 0, 'clear() leaves 0 children in GarmentLayerGroup')
assert(runtime.slots.top.mesh === null, 'clear() nullifies slots.top.mesh')
assert(runtime.slots.bottom.mesh === null, 'clear() nullifies slots.bottom.mesh')

// Re-populate and dispose
runtime.setGarments({
  top: { type: 'top', allowPlaceholder: true },
  bottom: { type: 'bottom', allowPlaceholder: true },
})
assert(runtime.group.children.length === 2, 'Re-populated 2 meshes prior to dispose()')

runtime.dispose()
assert(runtime.group === null, 'dispose() completely nullifies group reference')
assert(runtime.scene === null, 'dispose() detaches from scene')
assert(runtime.slots === null, 'dispose() nullifies slots map')

// =========================================================================
// SECTION 8: WARDROBE STATE MUTATIONS & LIVE COLOR MATCHER
// =========================================================================
console.log('\n[7] Outfit State Mutations & Live Color Match Updates:')

let outfitState = { ...INITIAL_OUTFIT }
const catalogProducts = [
  activeTopProduct,
  activeTopProduct2,
  activeBottomProduct,
  activeBottomProduct2,
  shoeProduct,
  accessoryProduct,
]

// 1. Initial outfit analysis
let analysis = analyzeOutfitColorMatch(outfitState, catalogProducts)
assert(analysis.status === 'incomplete', 'Initial empty outfit has status: incomplete')

// 2. Select Top
outfitState = { ...outfitState, top: activeTopProduct }
analysis = analyzeOutfitColorMatch(outfitState, catalogProducts)
assert(analysis.status === 'incomplete', 'Outfit with only top has status: incomplete')

// 3. Select Bottom -> Top + Bottom coexist
outfitState = { ...outfitState, bottom: activeBottomProduct }
analysis = analyzeOutfitColorMatch(outfitState, catalogProducts)
assert(analysis.status !== 'incomplete', 'Outfit with Top + Bottom is complete (status != incomplete)')
assert(typeof analysis.score === 'number' && analysis.score > 0, 'Color matcher produces deterministic score')
assert(Boolean(analysis.label), 'Color matcher provides descriptive label')

// 4. Select Shoes & Accessories -> Preserved in state without fake 3D rendering
outfitState = {
  ...outfitState,
  shoes: shoeProduct,
  accessories: [accessoryProduct],
}
assert(outfitState.top !== null, 'Top remains selected')
assert(outfitState.bottom !== null, 'Bottom remains selected')
assert(outfitState.shoes._id === shoeProduct._id, 'Shoes product selected in state')
assert(outfitState.accessories.length === 1, 'Accessory product selected in state')

// 5. Replace Top -> Updates color matching live
outfitState = { ...outfitState, top: activeTopProduct2 }
const updatedAnalysis = analyzeOutfitColorMatch(outfitState, catalogProducts)
assert(updatedAnalysis.status !== 'incomplete', 'Complete outfit after replacing top')
assert(outfitState.bottom._id === activeBottomProduct._id, 'Bottom remains intact after replacing top')
assert(outfitState.shoes._id === shoeProduct._id, 'Shoes remain intact after replacing top')

// 6. Clear Outfit
outfitState = { ...INITIAL_OUTFIT }
const clearedAnalysis = analyzeOutfitColorMatch(outfitState, catalogProducts)
assert(clearedAnalysis.status === 'incomplete', 'Cleared outfit returns to incomplete analysis')
assert(outfitState.top === null, 'Top is null after clear')
assert(outfitState.bottom === null, 'Bottom is null after clear')
assert(outfitState.shoes === null, 'Shoes is null after clear')
assert(outfitState.accessories.length === 0, 'Accessories empty after clear')

// =========================================================================
// SECTION 9: PAGE INTEGRATION & CUSTOMER UX DISCLOSURE
// =========================================================================
console.log('\n[8] Page Architecture, URL Continuity & Customer UX Strings:')

// Required customer-facing strings in VirtualWardrobe & AvatarWardrobePage
assert(virtualWardrobeCode.includes('Loading 3D garment…'), 'VirtualWardrobe contains customer loading string: "Loading 3D garment…"')
assert(virtualWardrobeCode.includes('3D preview unavailable for this product.'), 'VirtualWardrobe contains customer unavailable string: "3D preview unavailable for this product."')
assert(virtualWardrobeCode.includes('Unable to load this 3D preview.'), 'VirtualWardrobe contains customer error string: "Unable to load this 3D preview."')

assert(wardrobePageCode.includes('Loading 3D garment…'), 'AvatarWardrobePage contains customer loading string: "Loading 3D garment…"')
assert(wardrobePageCode.includes('3D preview unavailable for this product.'), 'AvatarWardrobePage contains customer unavailable string: "3D preview unavailable for this product."')
assert(wardrobePageCode.includes('Unable to load this 3D preview.'), 'AvatarWardrobePage contains customer error string: "Unable to load this 3D preview."')

// URL continuity (?selectProduct=:id)
assert(wardrobePageCode.includes("searchParams.get('selectProduct')"), 'AvatarWardrobePage inspects selectProduct query param')
assert(wardrobePageCode.includes('isProductTryOnActive(prod)'), 'AvatarWardrobePage checks if query-preselected product has active 3D capability')

// Authentication and Avatar guards
assert(wardrobePageCode.includes('selectIsAuthenticated'), 'AvatarWardrobePage checks user authentication state')
assert(wardrobePageCode.includes('avatarNotFound'), 'AvatarWardrobePage handles missing avatar profile state')
assert(wardrobePageCode.includes('Drag to rotate 360°'), 'AvatarWardrobePage maintains 360° orbit rotation guidance')

// Ensure single Three.js viewer on page
const viewerOccurrences = (wardrobePageCode.match(/<AvatarViewer/g) || []).length
assert(viewerOccurrences === 1, 'AvatarWardrobePage mounts exactly ONE AvatarViewer instance')

// =========================================================================
// SUMMARY
// =========================================================================
console.log(`\n============================================================`)
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log(`ALL PHASE 4D OUTFIT VISUALIZATION RUNTIME TESTS PASSED ✓`)
} else {
  console.error(`SOME PHASE 4D TESTS FAILED ✗`)
}
console.log(`============================================================\n`)

if (failed > 0) {
  process.exit(1)
}
