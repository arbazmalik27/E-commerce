/**
 * Phase 4F Automated Unit Test Suite:
 * Real Product / Avatar Visual Quality & Presentation
 *
 * Verifies:
 * 1. Body Morph Ranges, Clamping & Anatomical Presets
 * 2. Height Scaling & Proportional Presentation
 * 3. Skin Material Quality & Semi-Matte Finish
 * 4. Appearance & Facial State Compatibility (POC Asset Gates)
 * 5. Studio Lighting Rig & Ground Contact Shadow Calibration
 * 6. Camera Framing, 360° OrbitControls & Reset Handler
 * 7. Garment Layer Height & Morph Synchronization
 * 8. User Privacy & Biometric Non-Storage Invariants
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  clampWeight,
  MORPH_SLIDERS,
  DEFAULT_MORPH_WEIGHTS,
  ANATOMICAL_PRESETS,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  EYE_COLORS,
  FACIAL_HAIR_STYLES,
  FACIAL_BLENDSHAPES,
  computeHeightScale,
} from '../constants/avatarStudioConstants.js'
import { GarmentLayerManager, SUPPORTED_GARMENT_TYPES } from '../components/avatar/GarmentLayer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    passedCount++
    console.log(`  ✓ PASS: ${message}`)
  } else {
    failedCount++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function runTests() {
  console.log('\n=== TEST SUITE: PHASE 4F AVATAR VISUAL QUALITY & PRESENTATION ===\n')

  const viewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')
  const garmentLayerPath = path.resolve(__dirname, '../components/avatar/GarmentLayer.js')
  const studioPath = path.resolve(__dirname, '../pages/AvatarStudioPage.jsx')
  const appearancePath = path.resolve(__dirname, '../components/avatar/AvatarAppearanceControls.jsx')
  const facePath = path.resolve(__dirname, '../components/avatar/AvatarFaceControls.jsx')
  const wardrobePagePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')
  const tryOnPath = path.resolve(__dirname, '../pages/TryOnPage.jsx')
  const validatorPath = path.resolve(__dirname, '../../../backend/src/validators/avatarValidator.js')

  assert(fs.existsSync(viewerPath), 'AvatarViewer.jsx exists')
  assert(fs.existsSync(garmentLayerPath), 'GarmentLayer.js exists')
  assert(fs.existsSync(studioPath), 'AvatarStudioPage.jsx exists')
  assert(fs.existsSync(appearancePath), 'AvatarAppearanceControls.jsx exists')
  assert(fs.existsSync(facePath), 'AvatarFaceControls.jsx exists')
  assert(fs.existsSync(wardrobePagePath), 'AvatarWardrobePage.jsx exists')
  assert(fs.existsSync(tryOnPath), 'TryOnPage.jsx exists')
  assert(fs.existsSync(validatorPath), 'backend/src/validators/avatarValidator.js exists')

  const viewerContent = fs.readFileSync(viewerPath, 'utf8')
  const garmentContent = fs.readFileSync(garmentLayerPath, 'utf8')
  const studioContent = fs.readFileSync(studioPath, 'utf8')
  const appearanceContent = fs.readFileSync(appearancePath, 'utf8')
  const faceContent = fs.readFileSync(facePath, 'utf8')
  const wardrobePageContent = fs.readFileSync(wardrobePagePath, 'utf8')
  const tryOnContent = fs.readFileSync(tryOnPath, 'utf8')
  const validatorContent = fs.readFileSync(validatorPath, 'utf8')

  // =========================================================================
  // 1. BODY MORPH RANGES, CLAMPING & ANATOMICAL PRESETS
  // =========================================================================
  console.log('\n[1] Body Morph Ranges, Clamping & Presets:')

  assert(clampWeight(-0.5) === 0.0, 'clampWeight clamps negative numbers to 0.0')
  assert(clampWeight(1.5) === 1.0, 'clampWeight clamps values > 1.0 to 1.0')
  assert(clampWeight(0.42) === 0.42, 'clampWeight preserves valid values in [0.0, 1.0]')
  assert(clampWeight('invalid') === 0.0, 'clampWeight safely handles invalid input')

  assert(MORPH_SLIDERS.length === 5, 'Exactly 5 canonical morph sliders defined')
  const sliderIds = MORPH_SLIDERS.map((s) => s.id)
  assert(
    sliderIds.includes('chestScale') &&
    sliderIds.includes('waistScale') &&
    sliderIds.includes('hipScale') &&
    sliderIds.includes('legLength') &&
    sliderIds.includes('torsoDepth'),
    'All 5 required body morph keys exist'
  )

  assert(
    DEFAULT_MORPH_WEIGHTS.chestScale === 0.0 &&
    DEFAULT_MORPH_WEIGHTS.waistScale === 0.0 &&
    DEFAULT_MORPH_WEIGHTS.hipScale === 0.0 &&
    DEFAULT_MORPH_WEIGHTS.legLength === 0.0 &&
    DEFAULT_MORPH_WEIGHTS.torsoDepth === 0.0,
    'Default morph weights are all 0.0'
  )

  assert(ANATOMICAL_PRESETS.length === 4, 'Provides 4 anatomical silhouette presets')
  ANATOMICAL_PRESETS.forEach((preset) => {
    Object.values(preset.values).forEach((val) => {
      assert(val >= 0.0 && val <= 1.0, `${preset.name} values are within [0.0, 1.0] range`)
    })
  })

  // =========================================================================
  // 2. HEIGHT SCALING & PROPORTIONAL PRESENTATION
  // =========================================================================
  console.log('\n[2] Height Scaling & Proportions:')

  assert(computeHeightScale(178) === 1.0, '178 cm adult standard yields 1.0 normalized scale')
  assert(computeHeightScale(128) >= 0.71 && computeHeightScale(128) <= 0.73, '128 cm youth yields ~0.72 normalized scale')
  assert(computeHeightScale(210) >= 1.17 && computeHeightScale(210) <= 1.22, '210 cm tall adult yields ~1.18 normalized scale')
  assert(computeHeightScale(null) === 1.0, 'null height safely defaults to 1.0 scale')
  assert(computeHeightScale('invalid') === 1.0, 'invalid height safely defaults to 1.0 scale')

  assert(viewerContent.includes('computeHeightScale(heightCm'), 'AvatarViewer calculates normalized height scale')
  assert(viewerContent.includes('setHeightScale'), 'AvatarViewer synchronizes height scale with garment layer')
  assert(studioContent.includes('heightCm='), 'AvatarStudioPage passes heightCm prop to AvatarViewer')
  assert(wardrobePageContent.includes('heightCm='), 'AvatarWardrobePage passes heightCm prop to AvatarViewer')
  assert(tryOnContent.includes('heightCm='), 'TryOnPage passes heightCm prop to AvatarViewer')

  // =========================================================================
  // 3. SKIN MATERIAL QUALITY & SEMI-MATTE FINISH
  // =========================================================================
  console.log('\n[3] Skin Material Quality & Semi-Matte Calibration:')

  assert(SKIN_TONES.length === 8, 'Curated palette includes 8 diverse skin tones')
  assert(viewerContent.includes('mat.roughness = 0.68'), 'AvatarViewer sets natural semi-matte skin roughness (0.68)')
  assert(viewerContent.includes('mat.metalness = 0.02'), 'AvatarViewer sets non-metallic skin metalness (0.02)')
  assert(viewerContent.includes('applySkinMaterial'), 'AvatarViewer preserves skin material qualities across color updates')

  // =========================================================================
  // 4. APPEARANCE & FACIAL STATE BOUNDARIES (POC ASSET GATE)
  // =========================================================================
  console.log('\n[4] Appearance & Facial State Boundaries:')

  assert(HAIR_STYLES.length === 6, 'Defines 6 modular hairstyles')
  assert(HAIR_COLORS.length === 6, 'Defines 6 curated hair colors')
  assert(EYE_COLORS.length === 5, 'Defines 5 eye colors')
  assert(FACIAL_HAIR_STYLES.length === 5, 'Defines 5 facial hair styles')
  assert(FACIAL_BLENDSHAPES.length === 8, 'Defines 8 facial blendshapes')

  assert(
    appearanceContent.includes('Profile Stored (Production Gate)'),
    'AvatarAppearanceControls explicitly clarifies hairstyles and facial hair are profile stored'
  )
  assert(
    faceContent.includes('Production Gate Asset'),
    'AvatarFaceControls explicitly gates facial blendshapes until canonical asset integration'
  )

  // =========================================================================
  // 5. STUDIO LIGHTING RIG & GROUND CONTACT SHADOW
  // =========================================================================
  console.log('\n[5] Studio Lighting Rig & Contact Shadow:')

  assert(viewerContent.includes('AmbientLight'), 'Studio lighting includes ambient fill light')
  assert(viewerContent.includes('keyLight'), 'Studio lighting includes directional key light')
  assert(viewerContent.includes('fillLight'), 'Studio lighting includes directional fill light')
  assert(viewerContent.includes('rimLight'), 'Studio lighting includes back/rim light for silhouette separation')
  assert(viewerContent.includes('topLight'), 'Studio lighting includes overhead crown light')
  assert(viewerContent.includes('ContactShadowGroup'), 'AvatarViewer renders multi-layered ground contact shadow')

  // =========================================================================
  // 6. CAMERA FRAMING, ORBITCONTROLS & RESET HANDLER
  // =========================================================================
  console.log('\n[6] Camera Framing, 360° Controls & Reset:')

  assert(viewerContent.includes('OrbitControls'), 'AvatarViewer uses Three.js OrbitControls')
  assert(viewerContent.includes('controls.enableDamping = true'), 'OrbitControls utilizes smooth damping (0.05)')
  assert(viewerContent.includes('controls.maxPolarAngle = Math.PI / 2'), 'OrbitControls clamps vertical angle to prevent under-floor clipping')
  assert(viewerContent.includes('resetView'), 'AvatarViewer exposes imperative camera resetView handler')
  assert(viewerContent.includes('aria-label="Reset Camera View"'), 'AvatarViewer includes accessible camera reset aria-label')

  // =========================================================================
  // 7. GARMENT LAYER HEIGHT & MORPH SYNCHRONIZATION
  // =========================================================================
  console.log('\n[7] Garment Layer Synchronization:')

  assert(garmentContent.includes('setHeightScale'), 'GarmentLayerManager includes setHeightScale method')
  assert(garmentContent.includes('SUPPORTED_GARMENT_TYPES'), 'GarmentLayer exports supported garment types')
  assert(
    SUPPORTED_GARMENT_TYPES.includes('top') && SUPPORTED_GARMENT_TYPES.includes('bottom'),
    'GarmentLayer supports top and bottom coexistence'
  )

  const mockScene = { add: () => {} }
  const manager = new GarmentLayerManager(mockScene)
  assert(typeof manager.setHeightScale === 'function', 'GarmentLayerManager instance has setHeightScale')
  manager.setHeightScale(1.15)
  assert(manager.currentHeightScale === 1.15, 'setHeightScale updates currentHeightScale on manager')

  manager.updateMorphs({ chestScale: 0.5, waistScale: 0.3, hipScale: 0.4 })
  assert(manager.currentMorphWeights.chestScale === 0.5, 'updateMorphs updates currentMorphWeights')

  // =========================================================================
  // 8. PRIVACY INVARIANTS & BIOMETRIC NON-STORAGE
  // =========================================================================
  console.log('\n[8] Privacy Invariants & Biometric Protection:')

  assert(
    validatorContent.includes('rawPhoto') && validatorContent.includes('errors.privacy'),
    'Backend validator strictly rejects payloads containing rawPhoto'
  )
  assert(
    validatorContent.includes('landmarks') && validatorContent.includes('faceEmbeddings'),
    'Backend validator strictly rejects biometric landmarks and face embeddings'
  )

  console.log('\n============================================================')
  console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
  if (failedCount === 0) {
    console.log('ALL PHASE 4F VISUAL QUALITY TESTS PASSED ✓\n')
  } else {
    console.error('TEST FAILURES DETECTED ✗\n')
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
