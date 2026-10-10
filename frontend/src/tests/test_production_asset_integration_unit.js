/**
 * TrendVolt Phase 11 Automated Unit Test Suite:
 * Production 3D Asset Integration & Catalog Expansion
 *
 * Verifies:
 * 1. Production Avatar Resolver Contract & Slots
 * 2. Production Avatar Morph Compatibility (Canonical 5 Body Morphs)
 * 3. Facial Blendshape Compatibility (Canonical 8 Facial Blendshapes)
 * 4. Material Discovery (Skin vs Eye Materials)
 * 5. Head_Socket Discovery & Hair Attachment
 * 6. Production Garment Resolver Contract & 3D Format Validation
 * 7. Garment Type Validation (Top vs Bottom, unsupported rejected)
 * 8. Asset Status Validation (Active, Pending, Placeholder)
 * 9. Missing Asset Graceful Behavior
 * 10. Technical POC Asset Demarcation (Never labeled production)
 * 11. Garment Replacement Lifecycle & Stale Request Cancellation
 * 12. Complete Disposal of Geometries, Materials, and Textures
 * 13. Simultaneous Top + Bottom Coexistence
 * 14. Avatar Morph -> Garment Synchronization
 * 15. Real Catalog Asset Enablement & Gating
 * 16. Catalog Products Without 3D Assets (Full non-3D functionality)
 * 17. Graceful WebGL and Asset Fallback
 * 18. Architectural Invariant: Zero Fabricated Assets & Clean Fallbacks
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import {
  AVATAR_ASSETS,
  AVATAR_ASSET_TYPE,
  AVATAR_ASSET_STATUS,
  CANONICAL_BODY_MORPH_MAP,
  CANONICAL_FACIAL_MORPH_MAP,
  validateAvatarAsset,
  resolveAvatarAsset,
  mapMorphTargetDictionary,
  introspectAvatarScene,
} from '../utils/avatarAssetResolver.js'
import {
  isProductTryOnActive,
  resolveGarmentRepresentation,
  isValid3DAssetUrl,
  GARMENT_ASSET_STATUS,
} from '../utils/garmentAssetResolver.js'
import {
  GarmentLayerManager,
  SUPPORTED_GARMENT_TYPES,
} from '../components/avatar/GarmentLayer.js'
import {
  WARDROBE_SLOTS,
  determineProductWardrobeSlot,
} from '../constants/wardrobeConstants.js'

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

async function runTests() {
  console.log('\n=== TEST SUITE: PHASE 11 PRODUCTION 3D ASSET INTEGRATION ===\n')

  // =========================================================================
  // TEST 1: PRODUCTION AVATAR RESOLVER CONTRACT & SLOTS
  // =========================================================================
  console.log('[1] Production Avatar Resolver Contract & Slots:')

  assert('production' in AVATAR_ASSETS, 'AVATAR_ASSETS defines production slot configuration')
  assert('men' in AVATAR_ASSETS.production, 'AVATAR_ASSETS.production defines adult "men" slot')
  assert('women' in AVATAR_ASSETS.production, 'AVATAR_ASSETS.production defines adult "women" slot')
  assert(
    AVATAR_ASSETS.production.men === null && AVATAR_ASSETS.production.women === null,
    'Production avatar asset slots remain null pending delivery of commissioned GLB files'
  )

  const defaultMenResolution = resolveAvatarAsset('men', { allowPocFallback: true })
  assert(
    defaultMenResolution.status === AVATAR_ASSET_STATUS.FALLBACK,
    'Unset production men asset resolves to fallback status'
  )
  assert(
    defaultMenResolution.assetType === AVATAR_ASSET_TYPE.POC,
    'Fallback asset is strictly classified as AVATAR_ASSET_TYPE.POC'
  )
  assert(
    defaultMenResolution.isProduction === false,
    'Fallback asset is explicitly marked as isProduction: false'
  )

  const defaultWomenResolution = resolveAvatarAsset('women', { allowPocFallback: true })
  assert(
    defaultWomenResolution.status === AVATAR_ASSET_STATUS.FALLBACK && defaultWomenResolution.isFallback === true,
    'Unset production women asset resolves to fallback status'
  )

  // =========================================================================
  // TEST 2: PRODUCTION AVATAR MORPH COMPATIBILITY (BODY MORPHS)
  // =========================================================================
  console.log('\n[2] Production Avatar Morph Target Mapping & Aliasing:')

  const mockMeshMorphDict = {
    Chest_Scale: 0,
    Waist_Scale: 1,
    hipScale: 2,
    Leg_Length: 3,
    torso_depth: 4,
    unrelated_morph: 5,
  }

  const mappedBodyMorphs = mapMorphTargetDictionary(mockMeshMorphDict, CANONICAL_BODY_MORPH_MAP)
  assert(mappedBodyMorphs.chestScale === 0, 'Aliases "Chest_Scale" to canonical chestScale')
  assert(mappedBodyMorphs.waistScale === 1, 'Aliases "Waist_Scale" to canonical waistScale')
  assert(mappedBodyMorphs.hipScale === 2, 'Matches canonical "hipScale" directly')
  assert(mappedBodyMorphs.legLength === 3, 'Aliases "Leg_Length" to canonical legLength')
  assert(mappedBodyMorphs.torsoDepth === 4, 'Aliases "torso_depth" to canonical torsoDepth')
  assert(!('unrelated_morph' in mappedBodyMorphs), 'Excludes non-canonical morph targets')

  // =========================================================================
  // TEST 3: FACIAL BLENDSHAPE COMPATIBILITY (8 BLENDSHAPES)
  // =========================================================================
  console.log('\n[3] Facial Blendshape Morph Target Mapping:')

  const mockFacialDict = {
    Face_Width: 0,
    JawWidth: 1,
    Chin_Length: 2,
    nose_width: 3,
    Eye_Spacing: 4,
    CheekFullness: 5,
    lip_fullness: 6,
    Eye_Size: 7,
  }

  const mappedFacialMorphs = mapMorphTargetDictionary(mockFacialDict, CANONICAL_FACIAL_MORPH_MAP)
  assert(mappedFacialMorphs.faceWidth === 0, 'Maps Face_Width to faceWidth')
  assert(mappedFacialMorphs.jawWidth === 1, 'Maps JawWidth to jawWidth')
  assert(mappedFacialMorphs.chinLength === 2, 'Maps Chin_Length to chinLength')
  assert(mappedFacialMorphs.noseWidth === 3, 'Maps nose_width to noseWidth')
  assert(mappedFacialMorphs.eyeSpacing === 4, 'Maps Eye_Spacing to eyeSpacing')
  assert(mappedFacialMorphs.cheekFullness === 5, 'Maps CheekFullness to cheekFullness')
  assert(mappedFacialMorphs.lipFullness === 6, 'Maps lip_fullness to lipFullness')
  assert(mappedFacialMorphs.eyeSize === 7, 'Maps Eye_Size to eyeSize')

  // =========================================================================
  // TEST 4: MATERIAL DISCOVERY (SKIN VS EYE MATERIALS)
  // =========================================================================
  console.log('\n[4] Material Discovery & Scene Introspection:')

  const testScene = new THREE.Scene()
  const avatarMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    [
      new THREE.MeshStandardMaterial({ name: 'Mat_Skin_Body' }),
      new THREE.MeshStandardMaterial({ name: 'Mat_Eye_Left' }),
      new THREE.MeshStandardMaterial({ name: 'Mat_Eye_Right' }),
    ]
  )
  avatarMesh.name = 'Avatar_Body'
  avatarMesh.morphTargetDictionary = { ...mockMeshMorphDict, ...mockFacialDict }
  avatarMesh.morphTargetInfluences = new Array(16).fill(0)
  testScene.add(avatarMesh)

  const socketNode = new THREE.Group()
  socketNode.name = 'Head_Socket'
  testScene.add(socketNode)

  const introspection = introspectAvatarScene(testScene, AVATAR_ASSET_TYPE.PRODUCTION)
  assert(introspection.primaryMorphMesh === avatarMesh, 'Discovers primary morph mesh')
  assert(introspection.skinMaterials.length === 1, 'Identifies skin material accurately')
  assert(introspection.eyeMaterials.length === 2, 'Identifies eye materials accurately')
  assert(introspection.hasFacialSupport === true, 'Flags facial support as true when blendshapes exist')

  // =========================================================================
  // TEST 5: HEAD_SOCKET DISCOVERY & ATTACHMENT
  // =========================================================================
  console.log('\n[5] Head_Socket Discovery:')

  assert(introspection.headSocketNode === socketNode, 'Discovers Head_Socket attachment point')
  assert(introspection.hasHairSocket === true, 'Reports hasHairSocket as true')

  // =========================================================================
  // TEST 6: PRODUCTION GARMENT RESOLVER CONTRACT & 3D FORMAT VALIDATION
  // =========================================================================
  console.log('\n[6] Production Garment Asset Resolver Contract & Validation:')

  assert(isValid3DAssetUrl('/models/garments/shirt.glb') === true, 'Accepts valid .glb path')
  assert(isValid3DAssetUrl('/models/garments/shirt.gltf') === true, 'Accepts valid .gltf path')
  assert(isValid3DAssetUrl('https://cdn.trendvolt.com/garment.glb?v=1') === true, 'Accepts CDN GLB with query string')
  assert(isValid3DAssetUrl('/images/shirt.png') === false, 'Rejects 2D image (.png)')
  assert(isValid3DAssetUrl('/images/shirt.jpg') === false, 'Rejects 2D image (.jpg)')
  assert(isValid3DAssetUrl('https://cdn.example.com/item.jpeg') === false, 'Rejects JPEG URL')
  assert(isValid3DAssetUrl('') === false, 'Rejects empty string')
  assert(isValid3DAssetUrl(null) === false, 'Rejects null reference')

  // =========================================================================
  // TEST 7: GARMENT TYPE VALIDATION
  // =========================================================================
  console.log('\n[7] Garment Type Validation:')

  const validTopProduct = {
    _id: 'p_top',
    name: 'Production Blazer',
    tryOn: {
      enabled: true,
      garmentType: 'top',
      assetStatus: GARMENT_ASSET_STATUS.ACTIVE,
      assetUrl: '/models/garments/blazer.glb',
    },
  }

  const validBottomProduct = {
    _id: 'p_bottom',
    name: 'Production Trousers',
    tryOn: {
      enabled: true,
      garmentType: 'bottom',
      assetStatus: GARMENT_ASSET_STATUS.ACTIVE,
      assetUrl: '/models/garments/trousers.glb',
    },
  }

  const invalidTypeProduct = {
    _id: 'p_shoes',
    name: 'Shoes Product',
    tryOn: {
      enabled: true,
      garmentType: 'shoes',
      assetStatus: GARMENT_ASSET_STATUS.ACTIVE,
      assetUrl: '/models/garments/shoes.glb',
    },
  }

  assert(isProductTryOnActive(validTopProduct) === true, 'Top product with active GLB is valid for Try-On')
  assert(isProductTryOnActive(validBottomProduct) === true, 'Bottom product with active GLB is valid for Try-On')
  assert(isProductTryOnActive(invalidTypeProduct) === false, 'Non-top/bottom garment type is rejected for 3D Try-On')

  // =========================================================================
  // TEST 8: ASSET STATUS VALIDATION (ACTIVE, PENDING, PLACEHOLDER)
  // =========================================================================
  console.log('\n[8] Asset Status Validation:')

  const pendingGarment = {
    _id: 'p_pending',
    name: 'Pending Garment',
    tryOn: {
      enabled: true,
      garmentType: 'top',
      assetStatus: GARMENT_ASSET_STATUS.PENDING,
      assetUrl: '/models/garments/pending.glb',
    },
  }

  const placeholderGarment = {
    _id: 'p_placeholder',
    name: 'Placeholder Garment',
    tryOn: {
      enabled: true,
      garmentType: 'top',
      assetStatus: GARMENT_ASSET_STATUS.PLACEHOLDER,
      assetUrl: '/models/garments/placeholder.glb',
    },
  }

  assert(isProductTryOnActive(pendingGarment) === false, 'Pending asset status is NOT active for customer Try-On')
  assert(isProductTryOnActive(placeholderGarment) === false, 'Placeholder asset status is NOT active for customer Try-On')

  // =========================================================================
  // TEST 9: MISSING ASSET BEHAVIOR
  // =========================================================================
  console.log('\n[9] Missing Asset Graceful Behavior:')

  const missingAssetProduct = {
    _id: 'p_missing',
    name: 'Missing Asset Product',
    tryOn: {
      enabled: true,
      garmentType: 'top',
      assetStatus: GARMENT_ASSET_STATUS.ACTIVE,
      assetUrl: null,
    },
  }

  assert(isProductTryOnActive(missingAssetProduct) === false, 'Missing assetUrl prevents active Try-On')
  const missingRep = resolveGarmentRepresentation(missingAssetProduct, { allowDevPlaceholder: false })
  assert(missingRep.isSupported === false && missingRep.hasRealAsset === false, 'Missing asset returns hasRealAsset: false')

  // =========================================================================
  // TEST 10: POC ASSET EXCLUSION & DEMARCATION
  // =========================================================================
  console.log('\n[10] POC Asset Exclusion & Demarcation:')

  const pocValidation = validateAvatarAsset('/models/base_avatar_poc.glb', { isProductionCandidate: false })
  assert(pocValidation.assetType === AVATAR_ASSET_TYPE.POC, 'POC asset is classified as AVATAR_ASSET_TYPE.POC')
  assert(pocValidation.assetType !== AVATAR_ASSET_TYPE.PRODUCTION, 'POC asset is NEVER classified as PRODUCTION')

  // =========================================================================
  // TEST 11: GARMENT REPLACEMENT LIFECYCLE & STALE REQUEST CANCELLATION
  // =========================================================================
  console.log('\n[11] Garment Replacement Lifecycle & Stale Request Cancellation:')

  const managerScene = new THREE.Scene()
  const garmentManager = new GarmentLayerManager(managerScene)

  // Initial slot requestId
  const initialTopReq = garmentManager.slots.top.requestId

  // Set slot garment
  garmentManager.setSlotGarment('top', { type: 'top', label: 'Shirt V1', allowPlaceholder: true })
  const secondTopReq = garmentManager.slots.top.requestId
  assert(secondTopReq > initialTopReq, 'Replacing garment increments slot requestId')

  // Rapidly replace with another top
  garmentManager.setSlotGarment('top', { type: 'top', label: 'Shirt V2', allowPlaceholder: true })
  const thirdTopReq = garmentManager.slots.top.requestId
  assert(thirdTopReq > secondTopReq, 'Subsequent rapid change increments slot requestId again')

  // Clear slot invalidates in-flight requests by incrementing requestId
  garmentManager.clearSlot('top')
  const fourthTopReq = garmentManager.slots.top.requestId
  assert(fourthTopReq > thirdTopReq, 'Clearing slot increments slot requestId to cancel any in-flight operations')

  // =========================================================================
  // TEST 12: DISPOSAL OF GEOMETRIES, MATERIALS, AND TEXTURES
  // =========================================================================
  console.log('\n[12] Deep Disposal Hierarchy:')

  let geometryDisposed = false
  let materialDisposed = false
  let textureDisposed = false

  const testTexture = new THREE.Texture()
  testTexture.dispose = () => { textureDisposed = true }

  const testMat = new THREE.MeshBasicMaterial()
  testMat.map = testTexture
  testMat.dispose = () => { materialDisposed = true }

  const testGeo = new THREE.BoxGeometry(1, 1, 1)
  testGeo.dispose = () => { geometryDisposed = true }

  const disposableMesh = new THREE.Mesh(testGeo, testMat)
  garmentManager._disposeHierarchy(disposableMesh)

  assert(geometryDisposed === true, 'Disposes mesh geometry cleanly')
  assert(materialDisposed === true, 'Disposes mesh material cleanly')
  assert(textureDisposed === true, 'Disposes attached textures cleanly')

  // =========================================================================
  // TEST 13: SIMULTANEOUS TOP + BOTTOM COEXISTENCE
  // =========================================================================
  console.log('\n[13] Simultaneous Top + Bottom Coexistence:')

  assert(SUPPORTED_GARMENT_TYPES.includes('top') && SUPPORTED_GARMENT_TYPES.includes('bottom'), 'Supports top and bottom slots simultaneously')
  assert(garmentManager.slots.top !== null && garmentManager.slots.bottom !== null, 'Maintains independent top and bottom slot records')

  // Set top placeholder
  garmentManager.setSlotGarment('top', { type: 'top', label: 'Linen Top', allowPlaceholder: true })
  assert(garmentManager.slots.top.mesh !== null, 'Attaches top slot mesh')

  // Set bottom placeholder
  garmentManager.setSlotGarment('bottom', { type: 'bottom', label: 'Denim Jeans', allowPlaceholder: true })
  assert(garmentManager.slots.bottom.mesh !== null, 'Attaches bottom slot mesh')

  // Both coexist in the root group
  assert(garmentManager.group.children.length === 2, 'Top and Bottom meshes coexist simultaneously in group')

  // Clearing top leaves bottom intact
  garmentManager.clearSlot('top')
  assert(garmentManager.slots.top.mesh === null, 'Top slot cleared')
  assert(garmentManager.slots.bottom.mesh !== null, 'Bottom slot remains active without disruption')
  assert(garmentManager.group.children.length === 1, 'Only bottom remains in group')

  // =========================================================================
  // TEST 14: AVATAR MORPH -> GARMENT SYNCHRONIZATION
  // =========================================================================
  console.log('\n[14] Avatar Morph to Garment Synchronization:')

  const currentBottomMesh = garmentManager.slots.bottom.mesh
  const initialBottomScaleX = currentBottomMesh.scale.x

  garmentManager.updateMorphs({ waistScale: 0.8, hipScale: 0.6 })
  assert(currentBottomMesh.scale.x > initialBottomScaleX, 'Bottom garment scales outward proportionally when waist/hip morphs increase')

  // Synchronize height
  garmentManager.setHeightScale(1.05)
  assert(garmentManager.group.scale.y === 1.05, 'Garment group scales synchronously with avatar heightScale')

  // =========================================================================
  // TEST 15: REAL CATALOG ASSET ENABLEMENT & GATING
  // =========================================================================
  console.log('\n[15] Catalog Asset Enablement & Gating:')

  const catalogProductWithAsset = {
    _id: 'prod_real_1',
    name: 'Verified 3D Oxford Shirt',
    category: 'fashion',
    department: 'men',
    subcategory: 'shirts',
    tryOn: {
      enabled: true,
      garmentType: 'top',
      assetStatus: 'active',
      assetUrl: '/models/garments/oxford_shirt.glb',
    },
  }

  const catalogProductWithoutAsset = {
    _id: 'prod_standard_1',
    name: 'Standard Oxford Shirt',
    category: 'fashion',
    department: 'men',
    subcategory: 'shirts',
    tryOn: {
      enabled: false,
    },
  }

  assert(isProductTryOnActive(catalogProductWithAsset) === true, 'Catalog product with valid active GLB enables 3D Try-On')
  assert(isProductTryOnActive(catalogProductWithoutAsset) === false, 'Standard product without asset disables 3D Try-On')

  // =========================================================================
  // TEST 16: CATALOG PRODUCTS WITHOUT 3D ASSETS
  // =========================================================================
  console.log('\n[16] Non-3D Catalog Products Usability:')

  assert(
    determineProductWardrobeSlot(catalogProductWithoutAsset) === WARDROBE_SLOTS.TOP,
    'Standard product without 3D asset remains valid for Virtual Wardrobe top slot'
  )
  const repWithoutAsset = resolveGarmentRepresentation(catalogProductWithoutAsset)
  assert(repWithoutAsset.hasRealAsset === false, 'No fake 3D mesh claimed for standard catalog piece')
  assert(repWithoutAsset.isDevPlaceholder === false, 'No placeholder mesh shown in production flow')

  // =========================================================================
  // TEST 17: GRACEFUL WEBGL AND ASSET FALLBACK
  // =========================================================================
  console.log('\n[17] Graceful Fallbacks:')

  const viewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')
  const viewerCode = fs.readFileSync(viewerPath, 'utf-8')

  assert(viewerCode.includes('3D Acceleration Not Available'), 'AvatarViewer contains graceful WebGL fallback UI')
  assert(viewerCode.includes('Unable to load avatar.'), 'AvatarViewer handles model load error gracefully')
  assert(viewerCode.includes('activeModelUrl'), 'AvatarViewer delegates model URL resolution dynamically')

  // =========================================================================
  // TEST 18: ARCHITECTURAL INVARIANT: ZERO FABRICATED ASSETS
  // =========================================================================
  console.log('\n[18] Architectural Invariants:')

  const modelsDir = path.resolve(__dirname, '../../public/models')
  const modelFiles = fs.readdirSync(modelsDir)

  assert(modelFiles.includes('base_avatar_poc.glb'), 'Original base_avatar_poc.glb is preserved')
  assert(!modelFiles.includes('BaseAvatar_Adult_Male.glb'), 'No fake BaseAvatar_Adult_Male.glb was fabricated')
  assert(!modelFiles.includes('BaseAvatar_Adult_Female.glb'), 'No fake BaseAvatar_Adult_Female.glb was fabricated')
  assert(!modelFiles.some((f) => f.includes('fake') || f.includes('mock')), 'No mock/fake 3D asset files exist in public/models/')

  // Cleanup
  garmentManager.dispose()

  console.log('\n========================================')
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`)
  console.log('========================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Unhandled test failure:', err)
  process.exit(1)
})
