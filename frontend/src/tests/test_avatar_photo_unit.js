/**
 * Automated Verification Suite for TrendVolt Phase 3B:
 * Photo-Assisted Avatar Personalization Layer
 *
 * Verifies:
 * 1. Adult photo UI integration and modular architecture
 * 2. Youth demographic strict Zero Photo Policy enforcement
 * 3. Client-side image type validation (JPEG, PNG, WebP permitted; others rejected)
 * 4. Image file size constraints (max 10MB, empty rejection)
 * 5. Image pixel dimensions validation (100x100 to 4096x4096)
 * 6. Object URL lifecycle management & memory leak prevention (revokeSafePreviewUrl)
 * 7. Photo removal & reset behaviors
 * 8. Zero storage persistence (no localStorage, sessionStorage, IndexedDB)
 * 9. Zero API upload / zero FormData transmission
 * 10. Suggested personalization object schema & canonical normalization
 * 11. Authoritative measurement preservation (chest/waist/hip untouched)
 * 12. Explicit user review requirement (no silent application)
 * 13. POC facial morph boundary integrity preservation
 * 14. Editorial terminology & luxury copy compliance (no forbidden biometric claims)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  validatePhotoFile,
  validatePhotoDimensions,
  hexToRgb,
  colorDistance,
  findClosestPaletteColor,
  generatePersonalizationSuggestions,
  revokeSafePreviewUrl,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MIN_IMAGE_DIMENSION,
  MAX_IMAGE_DIMENSION,
} from '../utils/avatarPhotoAnalysis.js'
import {
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  FACIAL_BLENDSHAPES,
} from '../constants/avatarStudioConstants.js'

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
  console.log('\n=== TEST SUITE: TRENDVOLT PHASE 3B PHOTO-ASSISTED PERSONALIZATION ===\n')

  // 1. Component Architecture & Files Existence
  console.log('[1] Component Architecture & Modular Files Existence:')
  const photoComponentPath = path.resolve(__dirname, '../components/avatar/AvatarPhotoReference.jsx')
  const photoUtilPath = path.resolve(__dirname, '../utils/avatarPhotoAnalysis.js')
  const studioPagePath = path.resolve(__dirname, '../pages/AvatarStudioPage.jsx')

  assert(fs.existsSync(photoComponentPath), 'AvatarPhotoReference.jsx component exists')
  assert(fs.existsSync(photoUtilPath), 'avatarPhotoAnalysis.js utility exists')
  assert(fs.existsSync(studioPagePath), 'AvatarStudioPage.jsx exists')

  const photoComponentContent = fs.readFileSync(photoComponentPath, 'utf8')
  const photoUtilContent = fs.readFileSync(photoUtilPath, 'utf8')
  const studioPageContent = fs.readFileSync(studioPagePath, 'utf8')

  // 2. Adult Photo UI Integration
  console.log('\n[2] Adult Photo UI Integration in Avatar Studio:')
  assert(
    studioPageContent.includes('AvatarPhotoReference'),
    'AvatarStudioPage imports and embeds AvatarPhotoReference'
  )
  assert(
    studioPageContent.includes("id: 'photo'") || studioPageContent.includes("'photo'"),
    'AvatarStudioPage registers dedicated Photo Guidance tab'
  )
  assert(
    photoComponentContent.includes('avatar-front-photo-input'),
    'AvatarPhotoReference includes accessible front reference photo input'
  )
  assert(
    photoComponentContent.includes('avatar-side-photo-input'),
    'AvatarPhotoReference includes optional side/profile reference photo input'
  )
  assert(
    photoComponentContent.includes('(Primary)') || photoComponentContent.includes('(Recommended)'),
    'Front photo is clearly designated as primary/recommended input'
  )
  assert(
    photoComponentContent.includes('(Optional)'),
    'Side photo is clearly labeled as optional'
  )

  // 3. Youth Demographic Strict Zero Photo Policy Enforcement
  console.log('\n[3] Youth Demographic Strict Zero-Photo Policy Enforcement:')
  assert(
    photoComponentContent.includes('if (isYouth)'),
    'AvatarPhotoReference branches on isYouth condition'
  )
  assert(
    photoComponentContent.includes('data-testid="youth-photo-policy-container"'),
    'Youth demographic triggers dedicated policy view container'
  )
  assert(
    photoComponentContent.includes('Zero Photo Policy Active'),
    'Youth view presents explicit "Zero Photo Policy Active" heading'
  )
  assert(
    photoComponentContent.replace(/\s+/g, ' ').includes('photo upload and facial analysis are strictly prohibited'),
    'Youth view explains prohibition of minor photo upload and facial analysis'
  )

  // Verify that inside the youth return block, there are no file input elements
  const youthBlockMatch = photoComponentContent.match(/if\s*\(isYouth\)\s*\{([\s\S]*?)\n\s*\}/)
  assert(Boolean(youthBlockMatch), 'isYouth early return block is present')
  if (youthBlockMatch) {
    const youthBlock = youthBlockMatch[1]
    assert(
      !youthBlock.includes('type="file"'),
      'CRITICAL: Youth view contains ZERO <input type="file"> elements'
    )
    assert(
      !youthBlock.includes('Upload') && !youthBlock.includes('drag'),
      'CRITICAL: Youth view contains ZERO upload or drag triggers'
    )
  }

  // 4. Image File Type Validation
  console.log('\n[4] Client-Side Image File Type Validation:')
  assert(
    ALLOWED_IMAGE_TYPES.includes('image/jpeg') &&
    ALLOWED_IMAGE_TYPES.includes('image/png') &&
    ALLOWED_IMAGE_TYPES.includes('image/webp'),
    'Allowed types include JPEG, PNG, and WebP'
  )

  const validJpg = validatePhotoFile({ type: 'image/jpeg', size: 1024 * 500 })
  assert(validJpg.isValid === true, 'validatePhotoFile accepts image/jpeg')

  const validPng = validatePhotoFile({ type: 'image/png', size: 1024 * 800 })
  assert(validPng.isValid === true, 'validatePhotoFile accepts image/png')

  const validWebp = validatePhotoFile({ type: 'image/webp', size: 1024 * 300 })
  assert(validWebp.isValid === true, 'validatePhotoFile accepts image/webp')

  const invalidGif = validatePhotoFile({ type: 'image/gif', size: 1024 * 100 })
  assert(invalidGif.isValid === false, 'validatePhotoFile rejects image/gif')
  assert(invalidGif.error.includes('Unsupported file format'), 'Descriptive error for unsupported file format')

  const invalidPdf = validatePhotoFile({ type: 'application/pdf', size: 1024 * 100 })
  assert(invalidPdf.isValid === false, 'validatePhotoFile rejects application/pdf')

  const invalidBmp = validatePhotoFile({ type: 'image/bmp', size: 1024 * 100 })
  assert(invalidBmp.isValid === false, 'validatePhotoFile rejects image/bmp')

  // 5. Image File Size Validation
  console.log('\n[5] Image File Size Validation & Constraints:')
  assert(MAX_FILE_SIZE_BYTES === 10 * 1024 * 1024, 'MAX_FILE_SIZE_BYTES is set to 10 MB')

  const validSize = validatePhotoFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 })
  assert(validSize.isValid === true, 'validatePhotoFile accepts 5 MB file')

  const zeroSize = validatePhotoFile({ type: 'image/jpeg', size: 0 })
  assert(zeroSize.isValid === false, 'validatePhotoFile rejects empty 0-byte file')

  const oversizedFile = validatePhotoFile({ type: 'image/jpeg', size: 12 * 1024 * 1024 })
  assert(oversizedFile.isValid === false, 'validatePhotoFile rejects file over 10 MB limit')
  assert(oversizedFile.error.includes('10 MB limit'), 'Descriptive error for file exceeding 10 MB limit')

  // 6. Image Pixel Dimensions Validation
  console.log('\n[6] Image Pixel Dimensions Validation:')
  assert(MIN_IMAGE_DIMENSION === 100, 'MIN_IMAGE_DIMENSION is 100 px')
  assert(MAX_IMAGE_DIMENSION === 4096, 'MAX_IMAGE_DIMENSION is 4096 px')

  const validDims = validatePhotoDimensions(800, 1000)
  assert(validDims.isValid === true, 'validatePhotoDimensions accepts 800x1000px')

  const tooSmallDims = validatePhotoDimensions(64, 64)
  assert(tooSmallDims.isValid === false, 'validatePhotoDimensions rejects 64x64px')
  assert(tooSmallDims.error.includes('resolution is too low'), 'Descriptive error for low resolution')

  const tooLargeDims = validatePhotoDimensions(5000, 5000)
  assert(tooLargeDims.isValid === false, 'validatePhotoDimensions rejects 5000x5000px')
  assert(tooLargeDims.error.includes('exceeds maximum supported dimensions'), 'Descriptive error for oversized dimensions')

  // 7. Object URL Lifecycle & Memory Cleanup
  console.log('\n[7] Object URL Lifecycle & Memory Cleanup:')
  assert(
    photoUtilContent.includes('revokeSafePreviewUrl'),
    'avatarPhotoAnalysis exposes revokeSafePreviewUrl cleanup function'
  )
  assert(
    photoComponentContent.includes('revokeSafePreviewUrl(frontPreviewUrl)'),
    'AvatarPhotoReference revokes front preview URL upon replace/remove/unmount'
  )
  assert(
    photoComponentContent.includes('revokeSafePreviewUrl(sidePreviewUrl)'),
    'AvatarPhotoReference revokes side preview URL upon replace/remove/unmount'
  )

  let revokedBlob = null
  globalThis.URL = {
    revokeObjectURL: (url) => {
      revokedBlob = url
    },
  }
  revokeSafePreviewUrl('blob:http://localhost/mock-uuid')
  assert(revokedBlob === 'blob:http://localhost/mock-uuid', 'revokeSafePreviewUrl invokes URL.revokeObjectURL')

  // 8. Photo Removal & Reset Behaviors
  console.log('\n[8] Photo Removal and Reset Handlers:')
  assert(
    photoComponentContent.includes('handleRemoveFrontPhoto'),
    'AvatarPhotoReference implements handleRemoveFrontPhoto'
  )
  assert(
    photoComponentContent.includes('handleRemoveSidePhoto'),
    'AvatarPhotoReference implements handleRemoveSidePhoto'
  )
  assert(
    photoComponentContent.includes('handleResetSuggestions'),
    'AvatarPhotoReference implements handleResetSuggestions'
  )
  assert(
    photoComponentContent.includes('handleKeepCurrent'),
    'AvatarPhotoReference implements handleKeepCurrent ("Keep My Current Avatar")'
  )

  // 9. Zero Storage Persistence Audit (Privacy Guarantee)
  console.log('\n[9] Zero Storage Persistence Audit (Client-Side Privacy):')
  assert(
    !photoComponentContent.includes('localStorage.setItem'),
    'CRITICAL: AvatarPhotoReference does NOT write to localStorage'
  )
  assert(
    !photoComponentContent.includes('sessionStorage.setItem'),
    'CRITICAL: AvatarPhotoReference does NOT write to sessionStorage'
  )
  assert(
    !photoComponentContent.includes('indexedDB') && !photoComponentContent.includes('openDatabase'),
    'CRITICAL: AvatarPhotoReference does NOT use IndexedDB or WebSQL'
  )
  assert(
    !photoUtilContent.includes('localStorage.setItem') &&
    !photoUtilContent.includes('sessionStorage.setItem') &&
    !photoUtilContent.includes('indexedDB') &&
    !photoUtilContent.includes('openDatabase'),
    'CRITICAL: avatarPhotoAnalysis does NOT write to any browser storage'
  )

  // 10. Zero API Upload Audit
  console.log('\n[10] Zero API Upload Audit (No Network Transmission):')
  assert(
    !photoComponentContent.includes('fetch(') && !photoComponentContent.includes('axios.'),
    'AvatarPhotoReference makes ZERO fetch/axios calls'
  )
  assert(
    !photoComponentContent.includes('FormData('),
    'AvatarPhotoReference never instantiates FormData for upload'
  )
  assert(
    !photoUtilContent.includes('fetch(') && !photoUtilContent.includes('axios.'),
    'avatarPhotoAnalysis makes ZERO fetch/axios calls'
  )
  assert(
    !photoUtilContent.includes('FormData('),
    'avatarPhotoAnalysis never instantiates FormData'
  )

  // 11. Suggestion Object Structure & Normalization
  console.log('\n[11] Suggested Personalization Object Structure:')
  const mockSuggestions = generatePersonalizationSuggestions({
    skinRgb: { r: 221, g: 176, b: 136 },
    hairRgb: { r: 43, g: 27, b: 21 },
    eyeRgb: { r: 45, g: 31, b: 23 },
    contrastRatio: 0.35,
    aspectRatio: 0.75,
  })

  assert(Boolean(mockSuggestions.appearance), 'Suggestion includes "appearance" namespace')
  assert(typeof mockSuggestions.appearance.skinTone === 'string', 'Appearance includes skinTone string hex')
  assert(typeof mockSuggestions.appearance.hairColor === 'string', 'Appearance includes hairColor string hex')
  assert(typeof mockSuggestions.appearance.eyeColor === 'string', 'Appearance includes eyeColor string hex')

  // Verify skinTone is in curated SKIN_TONES
  const isSkinInPalette = SKIN_TONES.some((t) => t.hex === mockSuggestions.appearance.skinTone)
  assert(isSkinInPalette, 'Suggested skinTone matches a curated TrendVolt palette color')

  // Verify hairColor is in curated HAIR_COLORS
  const isHairInPalette = HAIR_COLORS.some((t) => t.hex === mockSuggestions.appearance.hairColor)
  assert(isHairInPalette, 'Suggested hairColor matches a curated TrendVolt hair color')

  // Verify eyeColor is in curated EYE_COLORS
  const isEyeInPalette = EYE_COLORS.some((t) => t.hex === mockSuggestions.appearance.eyeColor)
  assert(isEyeInPalette, 'Suggested eyeColor matches a curated TrendVolt eye color')

  // Verify color distance and palette matching algorithms
  const parsedRgb = hexToRgb('#DDB088')
  assert(parsedRgb.r === 221 && parsedRgb.g === 176 && parsedRgb.b === 136, 'hexToRgb parses hex to RGB values')
  const dist = colorDistance({ r: 0, g: 0, b: 0 }, { r: 3, g: 4, b: 0 })
  assert(dist === 5, 'colorDistance calculates Euclidean RGB distance')
  const matchedTone = findClosestPaletteColor({ r: 220, g: 175, b: 135 }, SKIN_TONES)
  assert(matchedTone?.id === 'golden-sand', 'findClosestPaletteColor resolves closest palette tone')

  // Verify facialSuggestions namespace
  assert(Boolean(mockSuggestions.facialSuggestions), 'Suggestion includes "facialSuggestions" namespace')
  assert(FACIAL_BLENDSHAPES.length === 8, 'Canonical 8 facial blendshapes present in constants')
  const REQUIRED_FACIAL_KEYS = [
    'faceWidth',
    'jawWidth',
    'chinLength',
    'noseWidth',
    'eyeSpacing',
    'cheekFullness',
    'lipFullness',
    'eyeSize',
  ]
  for (const key of REQUIRED_FACIAL_KEYS) {
    const val = mockSuggestions.facialSuggestions[key]
    assert(
      typeof val === 'number' && val >= 0.0 && val <= 1.0,
      `facialSuggestions.${key} is bounded within normalized [0.0, 1.0] range (value: ${val})`
    )
  }

  // Verify bodySuggestions namespace
  assert(Boolean(mockSuggestions.bodySuggestions), 'Suggestion includes "bodySuggestions" namespace')
  assert(
    typeof mockSuggestions.bodySuggestions.legLength === 'number' &&
    mockSuggestions.bodySuggestions.legLength >= 0.0 &&
    mockSuggestions.bodySuggestions.legLength <= 1.0,
    'bodySuggestions.legLength is bounded in normalized [0.0, 1.0]'
  )
  assert(
    typeof mockSuggestions.bodySuggestions.torsoDepth === 'number' &&
    mockSuggestions.bodySuggestions.torsoDepth >= 0.0 &&
    mockSuggestions.bodySuggestions.torsoDepth <= 1.0,
    'bodySuggestions.torsoDepth is bounded in normalized [0.0, 1.0]'
  )

  // Verify confidence metadata namespace
  assert(Boolean(mockSuggestions.confidence), 'Suggestion includes "confidence" metadata')
  assert(Boolean(mockSuggestions.confidence.appearance), 'Confidence tracks appearance rating')
  assert(Boolean(mockSuggestions.confidence.face), 'Confidence tracks facial rating')
  assert(Boolean(mockSuggestions.confidence.body), 'Confidence tracks body rating')

  // 12. Authoritative Measurement Preservation (Chest/Waist/Hip Unmodified)
  console.log('\n[12] Authoritative Measurement Preservation:')
  assert(
    !mockSuggestions.bodySuggestions.chest &&
    !mockSuggestions.bodySuggestions.waist &&
    !mockSuggestions.bodySuggestions.hip,
    'Photo suggestions do NOT estimate chest, waist, or hip measurements'
  )
  assert(
    studioPageContent.includes('Manual measurements remain authoritative') ||
    studioPageContent.includes('measurements remain authoritative'),
    'AvatarStudioPage asserts manual measurements remain authoritative'
  )
  assert(
    photoComponentContent.includes('Manual Measurements Authoritative') ||
    photoComponentContent.includes('Manual tape measurements remain authoritative'),
    'AvatarPhotoReference displays notice that manual tape measurements remain authoritative'
  )

  // Verify handleApplyPhotoSuggestions does not mutate measurements state
  assert(
    !studioPageContent.includes('setMeasurements(suggestions') &&
    !studioPageContent.includes('setMeasurements(prev => ({ ...prev, chest: suggestions'),
    'AvatarStudioPage handleApplyPhotoSuggestions preserves manual measurements state intact'
  )

  // 13. Explicit Review & Non-Silent Application
  console.log('\n[13] Explicit Review & Non-Silent Application:')
  assert(
    photoComponentContent.includes('Photo-based suggestion — review before applying'),
    'Review UI presents explicit label: "Photo-based suggestion — review before applying"'
  )
  assert(
    photoComponentContent.includes('Apply Suggestions'),
    'Review UI provides explicit "Apply Suggestions" action button'
  )
  assert(
    photoComponentContent.includes('Keep My Current Avatar'),
    'Review UI provides explicit "Keep My Current Avatar" rejection button'
  )
  assert(
    photoComponentContent.includes('Reset Suggestions'),
    'Review UI provides explicit "Reset Suggestions" action button'
  )

  // 14. POC Facial Morph Boundary Preservation
  console.log('\n[14] POC Facial Morph Boundary Preservation:')
  assert(
    photoComponentContent.includes('POC Mannequin Asset Boundary'),
    'AvatarPhotoReference displays POC Mannequin Asset Boundary notice'
  )
  assert(
    photoComponentContent.includes('production base avatar') ||
    photoComponentContent.includes('canonical base avatar'),
    'Explains facial suggestions activate visually upon production mesh integration'
  )

  // 15. Editorial Terminology & Luxury Copy Compliance
  console.log('\n[15] Editorial Terminology & Luxury Copy Compliance:')
  const FORBIDDEN_PHRASES = [
    'exact match',
    'digital twin',
    'accurate body scan',
    'perfect fit',
    'guaranteed measurements',
    'biometric reconstruction',
  ]

  for (const phrase of FORBIDDEN_PHRASES) {
    const hasInComponent = photoComponentContent.toLowerCase().includes(phrase)
    const hasInUtil = photoUtilContent.toLowerCase().includes(phrase)
    assert(
      !hasInComponent && !hasInUtil,
      `Forbidden biometric claim "${phrase}" is strictly absent from implementation`
    )
  }

  const REQUIRED_PERMITTED_TERMS = [
    'personalized',
    'approximate',
    'photo-assisted',
    'suggested',
    'review before applying',
  ]

  for (const term of REQUIRED_PERMITTED_TERMS) {
    const isPresent =
      photoComponentContent.toLowerCase().includes(term) ||
      photoUtilContent.toLowerCase().includes(term) ||
      studioPageContent.toLowerCase().includes(term)
    assert(isPresent, `Required editorial term "${term}" is present in user guidance`)
  }

  console.log('\n============================================================')
  console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
  if (failedCount === 0) {
    console.log('ALL PHASE 3B PHOTO-ASSISTED PERSONALIZATION TESTS PASSED ✓')
  } else {
    console.error('SOME PHASE 3B PHOTO-ASSISTED PERSONALIZATION TESTS FAILED ✗')
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Unhandled test runner error:', err)
  process.exit(1)
})
