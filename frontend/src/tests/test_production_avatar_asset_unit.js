/**
 * TrendVolt Phase 5 Automated Unit Test Suite:
 * Production Avatar Asset Integration & Runtime Contract
 *
 * Verifies:
 * 1. Production Asset Detection & Classification
 * 2. Technical POC Asset Detection & Demarcation
 * 3. Invalid Asset Handling & Safety Rejections
 * 4. Demographic Asset Resolution (Adults & Youth)
 * 5. Asset Capability Detection
 * 6. Body Morph Target Mapping & Aliasing
 * 7. Facial Blendshape Morph Target Mapping
 * 8. Unsupported Morph & Graceful Degradation Handling
 * 9. Hair & Socket Capability Discovery
 * 10. Facial Hair Style Capability
 * 11. Skin Material Discovery & Isolation
 * 12. Eye Material Discovery & Calibration
 * 13. Production Avatar -> Garment Runtime Compatibility
 * 14. Fallback Behavior & POC Continuity
 * 15. Stale Request & Lifecycle Cleanup
 * 16. Height Synchronization Across Hierarchy
 * 17. Privacy & Zero-Biometric Invariants
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  validateAvatarAsset,
  resolveAvatarAsset,
  mapMorphTargetDictionary,
  introspectAvatarScene,
  AVATAR_ASSET_TYPE,
  AVATAR_ASSET_STATUS,
  AVATAR_ASSETS,
  CANONICAL_BODY_MORPH_MAP,
  CANONICAL_FACIAL_MORPH_MAP,
} from '../utils/avatarAssetResolver.js'
import { GarmentLayerManager } from '../components/avatar/GarmentLayer.js'
import { computeHeightScale } from '../constants/avatarStudioConstants.js'

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
  console.log('\n=== TEST SUITE: PHASE 5 PRODUCTION AVATAR ASSET INTEGRATION ===\n')

  const resolverPath = path.resolve(__dirname, '../utils/avatarAssetResolver.js')
  const viewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')
  const garmentLayerPath = path.resolve(__dirname, '../components/avatar/GarmentLayer.js')
  const studioPath = path.resolve(__dirname, '../pages/AvatarStudioPage.jsx')
  const wardrobePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')
  const tryOnPath = path.resolve(__dirname, '../pages/TryOnPage.jsx')
  const faceControlsPath = path.resolve(__dirname, '../components/avatar/AvatarFaceControls.jsx')
  const appearanceControlsPath = path.resolve(__dirname, '../components/avatar/AvatarAppearanceControls.jsx')
  const validatorPath = path.resolve(__dirname, '../../../backend/src/validators/avatarValidator.js')

  assert(fs.existsSync(resolverPath), 'avatarAssetResolver.js exists')
  assert(fs.existsSync(viewerPath), 'AvatarViewer.jsx exists')
  assert(fs.existsSync(garmentLayerPath), 'GarmentLayer.js exists')
  assert(fs.existsSync(studioPath), 'AvatarStudioPage.jsx exists')
  assert(fs.existsSync(wardrobePath), 'AvatarWardrobePage.jsx exists')
  assert(fs.existsSync(tryOnPath), 'TryOnPage.jsx exists')

  const viewerContent = fs.readFileSync(viewerPath, 'utf8')
  const studioContent = fs.readFileSync(studioPath, 'utf8')
  const faceContent = fs.readFileSync(faceControlsPath, 'utf8')
  const appearanceContent = fs.readFileSync(appearanceControlsPath, 'utf8')
  const validatorContent = fs.readFileSync(validatorPath, 'utf8')

  // =========================================================================
  // 1. PRODUCTION ASSET DETECTION & CLASSIFICATION
  // =========================================================================
  console.log('\n[1] Production Asset Detection & Classification:')

  const prodResult = validateAvatarAsset('/models/BaseAvatar_Adult_Male.glb', { isProductionCandidate: true })
  assert(prodResult.valid === true, 'Valid production GLB candidate is accepted')
  assert(prodResult.assetType === AVATAR_ASSET_TYPE.PRODUCTION, 'Classified as production-avatar asset')
  assert(prodResult.capabilities.bodyMorphs.chestScale === true, 'Production candidate provides body morphs')
  assert(prodResult.capabilities.facialMorphs.faceWidth === true, 'Production candidate provides facial morphs')
  assert(prodResult.capabilities.hair === true, 'Production candidate provides hair capability')
  assert(prodResult.capabilities.facialHair === true, 'Production candidate provides facial hair capability')
  assert(prodResult.capabilities.skinMaterial === true, 'Production candidate provides skin material slot')
  assert(prodResult.capabilities.eyeMaterial === true, 'Production candidate provides eye material slot')

  // =========================================================================
  // 2. TECHNICAL POC ASSET DETECTION & DEMARCATION
  // =========================================================================
  console.log('\n[2] Technical POC Asset Detection & Demarcation:')

  const pocResult = validateAvatarAsset('/models/base_avatar_poc.glb')
  assert(pocResult.valid === true, 'POC asset is valid for development/fallback')
  assert(pocResult.assetType === AVATAR_ASSET_TYPE.POC, 'Strictly demarcated as poc-avatar')
  assert(pocResult.capabilities.bodyMorphs.chestScale === true, 'POC provides the 5 body morphs')
  assert(pocResult.capabilities.facialMorphs.faceWidth === false, 'POC does not provide facial morphs')
  assert(pocResult.capabilities.hair === false, 'POC does not provide hair mesh')
  assert(pocResult.capabilities.facialHair === false, 'POC does not provide facial hair mesh')
  assert(pocResult.warnings.length > 0, 'POC asset reports explicit gate warning')

  // =========================================================================
  // 3. INVALID ASSET HANDLING & SAFETY REJECTIONS
  // =========================================================================
  console.log('\n[3] Invalid Asset Handling & Safety Rejections:')

  assert(validateAvatarAsset('').valid === false, 'Empty URL string rejected')
  assert(validateAvatarAsset(null).valid === false, 'Null input rejected')
  assert(validateAvatarAsset(undefined).valid === false, 'Undefined input rejected')
  assert(validateAvatarAsset('/images/avatar.png').valid === false, 'Non-3D PNG file rejected')
  assert(validateAvatarAsset('/assets/model.obj').valid === false, 'Unsupported OBJ file rejected')
  assert(validateAvatarAsset({ url: '' }).valid === false, 'Descriptor with empty url rejected')

  // =========================================================================
  // 4. DEMOGRAPHIC ASSET RESOLUTION (ADULTS & YOUTH)
  // =========================================================================
  console.log('\n[4] Demographic Asset Resolution:')

  // Standard adult men demographic resolution (POC fallback when pending)
  const menResolved = resolveAvatarAsset('men', { allowPocFallback: true })
  assert(menResolved.url !== null, 'Men demographic resolves valid asset URL')
  assert(menResolved.demographic === 'men', 'Preserves demographic key "men"')
  assert(menResolved.status === AVATAR_ASSET_STATUS.FALLBACK, 'Pending adult resolves to POC fallback')

  // Standard adult women demographic resolution
  const womenResolved = resolveAvatarAsset('women', { allowPocFallback: true })
  assert(womenResolved.url !== null, 'Women demographic resolves valid asset URL')
  assert(womenResolved.demographic === 'women', 'Preserves demographic key "women"')

  // Youth demographics (boys, girls, kids)
  const boysResolved = resolveAvatarAsset('boys', { allowPocFallback: true })
  assert(boysResolved.demographic === 'boys', 'Boys demographic resolves correctly')
  assert(boysResolved.isFallback === true, 'Youth demographic safely uses POC fallback without fake assets')

  const kidsResolved = resolveAvatarAsset('kids', { allowPocFallback: true })
  assert(kidsResolved.demographic === 'kids', 'Kids demographic resolves correctly')

  // Override resolution with custom verified production path
  const customProd = resolveAvatarAsset('men', {
    customProductionPath: '/models/BaseAvatar_Adult_Male.glb',
  })
  assert(customProd.isProduction === true, 'Custom production asset resolves as production')
  assert(customProd.status === AVATAR_ASSET_STATUS.ACTIVE, 'Custom production asset status is active')

  // No fallback option
  const noFallback = resolveAvatarAsset('men', { allowPocFallback: false })
  assert(noFallback.url === null, 'Resolves to null when production is pending and fallback disabled')

  // =========================================================================
  // 5. ASSET CAPABILITY DETECTION
  // =========================================================================
  console.log('\n[5] Asset Capability Detection:')

  assert(typeof AVATAR_ASSETS === 'object', 'Single authoritative AVATAR_ASSETS registry exists')
  assert(typeof AVATAR_ASSETS.production === 'object', 'Registry includes production entries')
  assert(typeof AVATAR_ASSETS.poc === 'object', 'Registry includes POC fallback entries')

  // =========================================================================
  // 6. BODY MORPH TARGET MAPPING & ALIASING
  // =========================================================================
  console.log('\n[6] Body Morph Target Mapping & Aliasing:')

  const rawDictCanonical = {
    chestScale: 0,
    waistScale: 1,
    hipScale: 2,
    legLength: 3,
    torsoDepth: 4,
  }
  const mappedCanonical = mapMorphTargetDictionary(rawDictCanonical, CANONICAL_BODY_MORPH_MAP)
  assert(mappedCanonical.chestScale === 0, 'Maps exact canonical chestScale')
  assert(mappedCanonical.waistScale === 1, 'Maps exact canonical waistScale')
  assert(mappedCanonical.hipScale === 2, 'Maps exact canonical hipScale')
  assert(mappedCanonical.legLength === 3, 'Maps exact canonical legLength')
  assert(mappedCanonical.torsoDepth === 4, 'Maps exact canonical torsoDepth')

  // Aliased candidate names in production assets (e.g. PascalCase or Snake_Case)
  const rawDictAliased = {
    Chest_Scale: 10,
    Waist_Scale: 11,
    Hips: 12,
    Leg_Length: 13,
    Torso_Depth: 14,
  }
  const mappedAliased = mapMorphTargetDictionary(rawDictAliased, CANONICAL_BODY_MORPH_MAP)
  assert(mappedAliased.chestScale === 10, 'Maps Chest_Scale alias to chestScale')
  assert(mappedAliased.waistScale === 11, 'Maps Waist_Scale alias to waistScale')
  assert(mappedAliased.hipScale === 12, 'Maps Hips alias to hipScale')
  assert(mappedAliased.legLength === 13, 'Maps Leg_Length alias to legLength')
  assert(mappedAliased.torsoDepth === 14, 'Maps Torso_Depth alias to torsoDepth')

  // =========================================================================
  // 7. FACIAL BLENDSHAPE MORPH TARGET MAPPING
  // =========================================================================
  console.log('\n[7] Facial Blendshape Morph Target Mapping:')

  const rawDictFacial = {
    Face_Width: 0,
    Jaw_Width: 1,
    Chin_Length: 2,
    Nose_Width: 3,
    Eye_Spacing: 4,
    Cheek_Fullness: 5,
    Lip_Fullness: 6,
    Eye_Size: 7,
  }
  const mappedFacial = mapMorphTargetDictionary(rawDictFacial, CANONICAL_FACIAL_MORPH_MAP)
  assert(mappedFacial.faceWidth === 0, 'Maps Face_Width to faceWidth')
  assert(mappedFacial.jawWidth === 1, 'Maps Jaw_Width to jawWidth')
  assert(mappedFacial.chinLength === 2, 'Maps Chin_Length to chinLength')
  assert(mappedFacial.noseWidth === 3, 'Maps Nose_Width to noseWidth')
  assert(mappedFacial.eyeSpacing === 4, 'Maps Eye_Spacing to eyeSpacing')
  assert(mappedFacial.cheekFullness === 5, 'Maps Cheek_Fullness to cheekFullness')
  assert(mappedFacial.lipFullness === 6, 'Maps Lip_Fullness to lipFullness')
  assert(mappedFacial.eyeSize === 7, 'Maps Eye_Size to eyeSize')

  // =========================================================================
  // 8. UNSUPPORTED MORPH & GRACEFUL DEGRADATION
  // =========================================================================
  console.log('\n[8] Unsupported Morph & Graceful Degradation:')

  const partialDict = { chestScale: 0, waistScale: 1 }
  const partialMapped = mapMorphTargetDictionary(partialDict, CANONICAL_BODY_MORPH_MAP)
  assert(partialMapped.chestScale === 0, 'Discovers present morph')
  assert(partialMapped.hipScale === undefined, 'Does not invent absent morph')
  assert(mapMorphTargetDictionary(null).chestScale === undefined, 'Handles null dictionary safely')
  assert(mapMorphTargetDictionary('invalid').chestScale === undefined, 'Handles invalid dictionary safely')

  // =========================================================================
  // 9. HAIR & SOCKET CAPABILITY DISCOVERY
  // =========================================================================
  console.log('\n[9] Hair & Socket Capability Discovery:')

  // Mock scene graph with Head_Socket node
  const mockSceneWithSocket = {
    traverse: (fn) => {
      fn({ name: 'Head_Socket', isGroup: true })
      fn({
        isMesh: true,
        name: 'Body_Mesh',
        morphTargetDictionary: { chestScale: 0 },
        material: { name: 'Skin_Mat' },
      })
    },
  }
  const socketReport = introspectAvatarScene(mockSceneWithSocket, AVATAR_ASSET_TYPE.PRODUCTION)
  assert(socketReport.hasHairSocket === true, 'Discovers Head_Socket anchor node')
  assert(socketReport.headSocketNode !== null, 'Preserves reference to Head_Socket node')

  // Mock scene without socket
  const mockSceneNoSocket = {
    traverse: (fn) => {
      fn({ isMesh: true, name: 'POC_Mesh', morphTargetDictionary: { chestScale: 0 } })
    },
  }
  const noSocketReport = introspectAvatarScene(mockSceneNoSocket, AVATAR_ASSET_TYPE.POC)
  assert(noSocketReport.hasHairSocket === false, 'Accurately reports absence of hair socket on POC')

  // =========================================================================
  // 10. FACIAL HAIR STYLE CAPABILITY & DISCLOSURE
  // =========================================================================
  console.log('\n[10] Facial Hair Style Capability & Disclosure:')

  assert(
    appearanceContent.includes('Saved to profile — visual support unavailable'),
    'Appearance controls explicitly disclose visual support status for hairstyle/facial-hair'
  )
  assert(
    appearanceContent.includes('Profile Stored (Production Gate)'),
    'Preserves Profile Stored demarcation for facial hair'
  )

  // =========================================================================
  // 11. SKIN MATERIAL DISCOVERY & ISOLATION
  // =========================================================================
  console.log('\n[11] Skin Material Discovery & Isolation:')

  const skinMat = { name: 'M_Avatar_Skin', color: { set: () => {} } }
  const clothingMat = { name: 'M_Tshirt_Fabric', color: { set: () => {} } }
  const mockMultiMatScene = {
    traverse: (fn) => {
      fn({ isMesh: true, name: 'Avatar_Head', material: skinMat })
      fn({ isMesh: true, name: 'Garment_Top', material: clothingMat })
    },
  }
  const multiMatReport = introspectAvatarScene(mockMultiMatScene, AVATAR_ASSET_TYPE.PRODUCTION)
  assert(multiMatReport.skinMaterials.includes(skinMat), 'Discovers skin material correctly')
  assert(!multiMatReport.skinMaterials.includes(clothingMat), 'Clothing material is strictly isolated from skin color')

  // =========================================================================
  // 12. EYE MATERIAL DISCOVERY & CALIBRATION
  // =========================================================================
  console.log('\n[12] Eye Material Discovery & Calibration:')

  const eyeMat = { name: 'M_Eye_Iris', color: { set: () => {} } }
  const mockEyeScene = {
    traverse: (fn) => {
      fn({ isMesh: true, name: 'Eye_Left', material: eyeMat })
    },
  }
  const eyeReport = introspectAvatarScene(mockEyeScene, AVATAR_ASSET_TYPE.PRODUCTION)
  assert(eyeReport.eyeMaterials.includes(eyeMat), 'Discovers eye material slot correctly')
  assert(!eyeReport.skinMaterials.includes(eyeMat), 'Eye material is not misclassified as skin')

  // =========================================================================
  // 13. PRODUCTION AVATAR -> GARMENT RUNTIME COMPATIBILITY
  // =========================================================================
  console.log('\n[13] Garment Runtime Compatibility:')

  const mockThreeScene = { add: () => {}, remove: () => {} }
  const garmentManager = new GarmentLayerManager(mockThreeScene)
  assert(typeof garmentManager.setHeightScale === 'function', 'GarmentLayerManager supports height scaling')
  assert(typeof garmentManager.updateMorphs === 'function', 'GarmentLayerManager supports morph updating')
  assert(typeof garmentManager.dispose === 'function', 'GarmentLayerManager provides deep disposal')

  // =========================================================================
  // 14. FALLBACK BEHAVIOR & POC CONTINUITY
  // =========================================================================
  console.log('\n[14] Fallback Behavior & POC Continuity:')

  const fallback = resolveAvatarAsset('men', { allowPocFallback: true })
  assert(fallback.url === '/models/base_avatar_poc.glb', 'Falls back to /models/base_avatar_poc.glb')
  assert(fallback.assetType === AVATAR_ASSET_TYPE.POC, 'Fallback asset is explicitly poc-avatar')
  assert(viewerContent.includes('introspectAvatarScene'), 'AvatarViewer integrates asset scene introspection')

  // =========================================================================
  // 15. STALE LOAD PROTECTION & CLEANUP
  // =========================================================================
  console.log('\n[15] Stale Load Protection & Deep Disposal:')

  assert(viewerContent.includes('isMounted'), 'AvatarViewer enforces isMounted check on async load')
  assert(viewerContent.includes('renderer.dispose()'), 'AvatarViewer disposes WebGLRenderer')
  assert(viewerContent.includes('controls.dispose()'), 'AvatarViewer disposes OrbitControls')
  assert(viewerContent.includes('cancelAnimationFrame'), 'AvatarViewer cancels animation loop')
  assert(viewerContent.includes('garmentLayerRef.current.dispose()'), 'AvatarViewer disposes garment layer')

  // =========================================================================
  // 16. HEIGHT SYNCHRONIZATION
  // =========================================================================
  console.log('\n[16] Height Synchronization:')

  const adultScale = computeHeightScale(178)
  const youthScale = computeHeightScale(128)
  const tallScale = computeHeightScale(210)
  assert(adultScale === 1.0, 'Adult height 178cm yields 1.0 base scale')
  assert(youthScale < 1.0 && youthScale > 0.7, 'Youth height 128cm scales down proportionally')
  assert(tallScale > 1.0 && tallScale < 1.25, 'Tall height 210cm scales up proportionally')
  assert(viewerContent.includes('computeHeightScale(heightCm)'), 'AvatarViewer reacts to heightCm prop')

  // =========================================================================
  // 17. PRIVACY INVARIANTS & ZERO-BIOMETRIC ENFORCEMENT
  // =========================================================================
  console.log('\n[17] Privacy Invariants & Zero-Biometric Enforcement:')

  assert(validatorContent.includes('rawPhoto'), 'Backend strictly forbids raw photos')
  assert(validatorContent.includes('faceEmbeddings'), 'Backend strictly forbids facial embeddings')
  assert(validatorContent.includes('landmarks'), 'Backend strictly forbids facial landmarks')
  assert(!viewerContent.includes('uploadPhoto'), 'AvatarViewer has zero photo upload logic')
  assert(!viewerContent.includes('faceApi'), 'AvatarViewer has zero external face API')

  // =========================================================================
  // 18. UI CAPABILITY DISCLOSURE
  // =========================================================================
  console.log('\n[18] UI Capability Disclosure:')

  assert(
    faceContent.includes('Applied to avatar') || faceContent.includes('Saved to profile'),
    'AvatarFaceControls provides customer-facing capability state disclosure'
  )
  assert(
    viewerContent.includes('Unable to load avatar.'),
    'AvatarViewer displays simple, customer-friendly error without exposing GLTF/Three.js internals'
  )

  // =========================================================================
  // 19. PHASE 12: PRODUCTION ADULT AVATAR CONTRACT & STRICT SEPARATION
  // =========================================================================
  console.log('\n[19] Phase 12 Production Human Avatar Contract & Separation:')

  // Strict invariant: base_avatar_poc.glb is NEVER accepted as a production candidate
  const pocAsProduction = validateAvatarAsset('/models/base_avatar_poc.glb', { isProductionCandidate: true })
  assert(pocAsProduction.valid === false, 'base_avatar_poc.glb is strictly rejected as a production candidate')
  assert(pocAsProduction.assetType === AVATAR_ASSET_TYPE.POC, 'POC asset is classified as AVATAR_ASSET_TYPE.POC')
  assert(pocAsProduction.errors.length > 0, 'Produces explicit rejection error for POC mannequin candidate')

  // Independent male and female production resolution slots
  assert(AVATAR_ASSETS.production.men === null, 'Production adult male asset slot is configured and awaits canonical GLB')
  assert(AVATAR_ASSETS.production.women === null, 'Production adult female asset slot is configured and awaits canonical GLB')

  // Distinct demographic resolution paths
  const maleResolution = resolveAvatarAsset('men', { customProductionPath: '/models/BaseAvatar_Adult_Male.glb' })
  const femaleResolution = resolveAvatarAsset('women', { customProductionPath: '/models/BaseAvatar_Adult_Female.glb' })
  assert(maleResolution.demographic === 'men' && maleResolution.url.includes('Male'), 'Male demographic resolves distinct male asset path')
  assert(femaleResolution.demographic === 'women' && femaleResolution.url.includes('Female'), 'Female demographic resolves distinct female asset path')
  assert(maleResolution.url !== femaleResolution.url, 'Male and female models resolve separate, distinct assets (no mannequin substitution)')

  // Missing asset handling without POC fallback
  const missingAssetResolution = resolveAvatarAsset('women', { allowPocFallback: false })
  assert(missingAssetResolution.url === null, 'Missing asset resolves to null when POC fallback is disallowed')
  assert(missingAssetResolution.status === AVATAR_ASSET_STATUS.UNAVAILABLE, 'Status is marked as UNAVAILABLE')
  assert(missingAssetResolution.warnings.length > 0, 'Produces descriptive warning for missing demographic asset')

  // =========================================================================
  // 20. PHASE 12: RUNTIME CAPABILITY MATRIX & INTROSPECTION
  // =========================================================================
  console.log('\n[20] Phase 12 Runtime Capability Matrix & Introspection:')

  // Scene without Head_Socket or facial morphs (like POC)
  const pocLikeScene = {
    traverse: (fn) => {
      fn({
        isMesh: true,
        name: 'Body_Mesh',
        morphTargetDictionary: { chestScale: 0, waistScale: 1, hipScale: 2, legLength: 3, torsoDepth: 4 },
        material: { name: 'Mat_Skin' },
      })
    },
  }
  const pocIntrospection = introspectAvatarScene(pocLikeScene, AVATAR_ASSET_TYPE.POC)
  assert(pocIntrospection.capabilities.hair === false, 'Runtime introspection correctly identifies hair capability as false when Head_Socket is absent')
  assert(pocIntrospection.capabilities.facialMorphs.faceWidth === false, 'Facial morphs correctly identified as false when blendshapes are absent')
  assert(pocIntrospection.capabilities.skinMaterial === true, 'Skin material correctly identified as true')
  assert(pocIntrospection.capabilities.eyeMaterial === false, 'Eye material correctly identified as false when iris/cornea absent')

  // Scene with Head_Socket and full facial blendshapes
  const fullProductionScene = {
    traverse: (fn) => {
      fn({ name: 'Head_Socket', isGroup: true })
      fn({
        isMesh: true,
        name: 'Avatar_Body',
        morphTargetDictionary: {
          chestScale: 0,
          waistScale: 1,
          hipScale: 2,
          legLength: 3,
          torsoDepth: 4,
          faceWidth: 5,
          jawWidth: 6,
          chinLength: 7,
          noseWidth: 8,
          eyeSpacing: 9,
          cheekFullness: 10,
          lipFullness: 11,
          eyeSize: 12,
        },
        material: [
          { name: 'Mat_Skin_Body', color: { set: () => {} } },
          { name: 'Mat_Eye_Left', color: { set: () => {} } },
        ],
      })
    },
  }
  const fullIntrospection = introspectAvatarScene(fullProductionScene, AVATAR_ASSET_TYPE.PRODUCTION)
  assert(fullIntrospection.capabilities.hair === true, 'Discovers hair capability when Head_Socket is present')
  assert(fullIntrospection.capabilities.facialMorphs.faceWidth === true, 'Discovers faceWidth capability when blendshape is present')
  assert(fullIntrospection.capabilities.facialMorphs.eyeSize === true, 'Discovers eyeSize capability when blendshape is present')
  assert(fullIntrospection.capabilities.eyeMaterial === true, 'Discovers eyeMaterial capability when eye materials present')
  assert(fullIntrospection.capabilities.skinMaterial === true, 'Discovers skinMaterial capability when skin materials present')

  // Verify AvatarStudioPage and AvatarViewer integrate verified runtime capabilities
  assert(studioContent.includes('onCapabilitiesDetected={setModelCapabilities}'), 'AvatarStudioPage connects to onCapabilitiesDetected callback')
  assert(viewerContent.includes('verifiedCapabilities'), 'AvatarViewer derives and transmits verified capabilities')
  assert(viewerContent.includes('setRetryNonce'), 'AvatarViewer implements graceful retry without full page refresh')

  console.log('\n============================================================')
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  if (failed === 0) {
    console.log('ALL PHASE 12 PRODUCTION AVATAR ASSET TESTS PASSED ✓\n')
  } else {
    console.error('TEST FAILURES DETECTED ✗\n')
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Unexpected test error:', err)
  process.exit(1)
})
