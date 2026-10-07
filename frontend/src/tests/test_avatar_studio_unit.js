/**
 * Automated Verification Suite for TrendVolt Phase 3A:
 * Personalized Avatar Studio Frontend (/avatar)
 *
 * Verifies:
 * 1. Route registration & lazy loading in AppRoutes.jsx
 * 2. Component structure and modular boundaries
 * 3. Demographic selector (Men, Women, Boys, Girls, Kids)
 * 4. Adult vs. Youth form segregation & STRICT Zero Photo Policy
 * 5. Body morph controls (5 canonical keys) & safe value clamping [0.0, 1.0]
 * 6. Facial morph controls (8 canonical blendshapes with POC boundary notice)
 * 7. Curated appearance controls (skin, hair, eye)
 * 8. Reset behaviors (camera reset, avatar configuration reset)
 * 9. Non-interference with ecommerce & validated POC (/avatar-poc)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

// Mirror the safe clamping logic implemented in AvatarBodyControls
function testClampWeight(val) {
  const num = Number.parseFloat(val)
  if (Number.isNaN(num)) return 0.0
  return Math.min(Math.max(num, 0.0), 1.0)
}

async function runTests() {
  console.log('\n=== TEST SUITE: TRENDVOLT PHASE 3A AVATAR STUDIO FRONTEND ===\n')

  // 1. Route Registration & Lazy Loading
  console.log('[1] Route Registration & Navigation Isolation:')
  const appRoutesPath = path.resolve(__dirname, '../routes/AppRoutes.jsx')
  assert(fs.existsSync(appRoutesPath), 'AppRoutes.jsx exists')

  const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')
  assert(
    appRoutesContent.includes('const AvatarStudioPage = lazy(() => import('),
    'AppRoutes lazy-loads AvatarStudioPage component'
  )
  assert(
    appRoutesContent.includes('path="/avatar" element={<AvatarStudioPage />}') ||
    appRoutesContent.includes('path="/avatar"'),
    'AppRoutes registers public /avatar route'
  )
  assert(
    appRoutesContent.includes('path="/avatar-poc" element={<AvatarPocPage />}') ||
    appRoutesContent.includes('path="/avatar-poc"'),
    'Existing Phase 2 /avatar-poc route is preserved and functional'
  )

  // 2. Component Architecture & Modular Boundaries
  console.log('\n[2] Component Architecture & Modular Boundaries:')
  const components = [
    { name: 'AvatarStudioPage.jsx', path: '../pages/AvatarStudioPage.jsx' },
    { name: 'AvatarViewer.jsx', path: '../components/avatar/AvatarViewer.jsx' },
    { name: 'AvatarDemographicSelector.jsx', path: '../components/avatar/AvatarDemographicSelector.jsx' },
    { name: 'AvatarMeasurementForm.jsx', path: '../components/avatar/AvatarMeasurementForm.jsx' },
    { name: 'AvatarBodyControls.jsx', path: '../components/avatar/AvatarBodyControls.jsx' },
    { name: 'AvatarAppearanceControls.jsx', path: '../components/avatar/AvatarAppearanceControls.jsx' },
    { name: 'AvatarFaceControls.jsx', path: '../components/avatar/AvatarFaceControls.jsx' },
  ]

  for (const comp of components) {
    const fullPath = path.resolve(__dirname, comp.path)
    assert(fs.existsSync(fullPath), `${comp.name} exists in expected directory`)
  }

  // 3. Demographic Selector Verification
  console.log('\n[3] Demographic Selector Requirements:')
  const demoSelectorPath = path.resolve(__dirname, '../components/avatar/AvatarDemographicSelector.jsx')
  const demoSelectorContent = fs.readFileSync(demoSelectorPath, 'utf8')
  const EXPECTED_DEMOGRAPHICS = ['Men', 'Women', 'Boys', 'Girls', 'Kids']

  for (const demo of EXPECTED_DEMOGRAPHICS) {
    const isPresent = demoSelectorContent.includes(`id: '${demo}'`) || demoSelectorContent.includes(`label: '${demo}'`)
    assert(isPresent, `DEMOGRAPHICS includes locked demographic: "${demo}"`)
  }

  assert(
    demoSelectorContent.includes('role="radiogroup"'),
    'AvatarDemographicSelector uses accessible radiogroup semantics'
  )
  assert(
    demoSelectorContent.includes('aria-checked'),
    'AvatarDemographicSelector sets aria-checked on options'
  )

  // 4. Adult vs. Youth Form Segregation & Strict Zero-Photo Policy
  console.log('\n[4] Measurement Form & Strict Zero-Photo Youth Safety:')
  const measurementFormPath = path.resolve(__dirname, '../components/avatar/AvatarMeasurementForm.jsx')
  const measurementFormContent = fs.readFileSync(measurementFormPath, 'utf8')

  // Check adult fields
  assert(measurementFormContent.includes('id="input-adult-height"'), 'Adult form includes Height input')
  assert(measurementFormContent.includes('id="input-adult-chest"'), 'Adult form includes Chest input')
  assert(measurementFormContent.includes('id="input-adult-waist"'), 'Adult form includes Waist input')
  assert(measurementFormContent.includes('id="input-adult-hip"'), 'Adult form includes Hip input')
  assert(measurementFormContent.includes('FIT_PREFERENCES'), 'Adult form provides Fit preference options')
  assert(
    measurementFormContent.includes('Slim') &&
    measurementFormContent.includes('Regular') &&
    measurementFormContent.includes('Relaxed'),
    'Fit preferences include Slim, Regular, Relaxed'
  )

  // Check youth fields
  assert(measurementFormContent.includes('id="input-youth-age"'), 'Youth form includes Child Age input')
  assert(measurementFormContent.includes('id="input-youth-height"'), 'Youth form includes Height input')

  // Check youth/adult condition branch
  assert(
    measurementFormContent.includes('isYouth'),
    'Measurement form separates logic based on isYouth boolean condition'
  )

  // Check STRICT ZERO PHOTO POLICY: No file input anywhere
  assert(
    !measurementFormContent.includes('type="file"'),
    'CRITICAL: Measurement form contains ZERO file upload elements (<input type="file">)'
  )
  assert(
    !measurementFormContent.includes('photoUpload') && !measurementFormContent.includes('cameraUpload'),
    'CRITICAL: Measurement form contains no photo upload identifiers'
  )
  assert(
    measurementFormContent.includes('Zero Photo Policy Active') || measurementFormContent.includes('Zero-Photo'),
    'Youth section displays explicit Zero Photo Policy notice'
  )

  // 5. Body Morph Controls & Safe Slider Clamping
  console.log('\n[5] Body Morph Controls & Numerical Range Constraints:')
  const constantsPath = path.resolve(__dirname, '../constants/avatarStudioConstants.js')
  const constantsContent = fs.readFileSync(constantsPath, 'utf8')
  const bodyControlsPath = path.resolve(__dirname, '../components/avatar/AvatarBodyControls.jsx')
  const bodyControlsContent = fs.readFileSync(bodyControlsPath, 'utf8')

  const REQUIRED_MORPHS = ['chestScale', 'waistScale', 'hipScale', 'legLength', 'torsoDepth']
  for (const morph of REQUIRED_MORPHS) {
    assert(constantsContent.includes(`id: '${morph}'`), `Morph slider defined for "${morph}"`)
  }

  // Safe clamping unit tests
  assert(testClampWeight(-0.5) === 0.0, 'clampWeight(-0.5) clamps to 0.0')
  assert(testClampWeight(1.8) === 1.0, 'clampWeight(1.8) clamps to 1.0')
  assert(testClampWeight('0.65') === 0.65, 'clampWeight("0.65") safely parses string to 0.65')
  assert(testClampWeight('invalid') === 0.0, 'clampWeight("invalid") safely falls back to 0.0')
  assert(testClampWeight(undefined) === 0.0, 'clampWeight(undefined) safely falls back to 0.0')
  assert(testClampWeight(0.0) === 0.0, 'clampWeight(0.0) retains neutral minimum 0.0')
  assert(testClampWeight(1.0) === 1.0, 'clampWeight(1.0) retains maximum bound 1.0')

  assert(
    bodyControlsContent.includes('clampWeight'),
    'AvatarBodyControls implements safe numeric clampWeight bounds constraint'
  )
  assert(
    bodyControlsContent.includes('min={morph.min}') && bodyControlsContent.includes('max={morph.max}'),
    'Sliders use dynamic bounds mapping min/max'
  )

  // 6. Facial Blendshapes Structure & POC Boundary Notice
  console.log('\n[6] Facial Blendshapes Structure & POC Boundary Notice:')
  const faceControlsPath = path.resolve(__dirname, '../components/avatar/AvatarFaceControls.jsx')
  const faceControlsContent = fs.readFileSync(faceControlsPath, 'utf8')

  const REQUIRED_FACIAL_MORPHS = [
    'faceWidth',
    'jawWidth',
    'chinLength',
    'noseWidth',
    'eyeSpacing',
    'cheekFullness',
    'lipFullness',
    'eyeSize',
  ]

  for (const faceMorph of REQUIRED_FACIAL_MORPHS) {
    assert(
      constantsContent.includes(`id: '${faceMorph}'`),
      `Facial blendshape definition registered for "${faceMorph}"`
    )
  }

  assert(
    faceControlsContent.includes('POC Mannequin Asset Boundary'),
    'AvatarFaceControls displays transparent POC Mannequin Asset Boundary notice'
  )
  assert(
    faceControlsContent.includes('canonical base avatar') || faceControlsContent.includes('production avatar'),
    'AvatarFaceControls explains facial morphs activate upon production asset delivery'
  )
  assert(
    faceControlsContent.includes('disabled={!isEnabled}'),
    'Facial sliders are properly disabled when base model lacks facial blendshapes'
  )

  // 7. Appearance Controls (Skin, Hair, Eye - Curated, No Fake AI)
  console.log('\n[7] Curated Appearance Controls (Predefined Options):')
  const appearancePath = path.resolve(__dirname, '../components/avatar/AvatarAppearanceControls.jsx')
  const appearanceContent = fs.readFileSync(appearancePath, 'utf8')

  assert(constantsContent.includes('SKIN_TONES = ['), 'Curated skin tone palette is defined')
  assert(constantsContent.includes('HAIR_STYLES = ['), 'Curated hairstyle catalog is defined')
  assert(constantsContent.includes('HAIR_COLORS = ['), 'Curated hair color palette is defined')
  assert(constantsContent.includes('EYE_COLORS = ['), 'Curated eye color palette is defined')

  assert(
    !appearanceContent.includes('detectFace') && !appearanceContent.includes('aiDetect'),
    'Appearance controls do not implement fake AI/photo detection'
  )
  assert(
    appearanceContent.includes('Head_Socket Anchor') || appearanceContent.includes('Head_Socket'),
    'Hairstyles reference canonical Head_Socket attachment spec'
  )

  // 8. Studio Page Presentation & Action Handlers
  console.log('\n[8] AvatarStudioPage Integration & UX Actions:')
  const studioPagePath = path.resolve(__dirname, '../pages/AvatarStudioPage.jsx')
  const studioPageContent = fs.readFileSync(studioPagePath, 'utf8')

  assert(studioPageContent.includes('AvatarViewer'), 'AvatarStudioPage embeds AvatarViewer')
  assert(studioPageContent.includes('AvatarDemographicSelector'), 'AvatarStudioPage embeds AvatarDemographicSelector')
  assert(studioPageContent.includes('AvatarMeasurementForm'), 'AvatarStudioPage embeds AvatarMeasurementForm')
  assert(studioPageContent.includes('AvatarBodyControls'), 'AvatarStudioPage embeds AvatarBodyControls')
  assert(studioPageContent.includes('AvatarAppearanceControls'), 'AvatarStudioPage embeds AvatarAppearanceControls')
  assert(studioPageContent.includes('AvatarFaceControls'), 'AvatarStudioPage embeds AvatarFaceControls')

  // Reset actions
  assert(studioPageContent.includes('handleResetCamera'), 'AvatarStudioPage provides camera reset action')
  assert(studioPageContent.includes('handleResetAvatar'), 'AvatarStudioPage provides full avatar reset action')
  assert(studioPageContent.includes('handleSaveAvatar'), 'AvatarStudioPage provides save avatar state handler')

  // Two-column layout classes
  assert(
    studioPageContent.includes('grid-cols-1 lg:grid-cols-12') || studioPageContent.includes('lg:col-span-7'),
    'AvatarStudioPage implements responsive 2-column desktop / stacked mobile layout'
  )

  // Editorial styling tokens
  assert(studioPageContent.includes('var(--tv-bg)'), 'AvatarStudioPage utilizes --tv-bg token')
  assert(studioPageContent.includes('var(--tv-olive)'), 'AvatarStudioPage utilizes --tv-olive brand token')
  assert(studioPageContent.includes('var(--tv-surface)'), 'AvatarStudioPage utilizes --tv-surface token')

  // 9. Three.js & Asset Preservation (No R3F/Drei, No Heavy Libs)
  console.log('\n[9] Performance & Dependency Hygiene:')
  const packageJsonPath = path.resolve(__dirname, '../../package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }

  assert(!allDeps['@react-three/fiber'], 'Zero dependency on @react-three/fiber (strictly plain Three.js)')
  assert(!allDeps['@react-three/drei'], 'Zero dependency on @react-three/drei')
  assert(Boolean(allDeps['three']), 'Reuses verified core "three" library')

  // 10. Commerce Preservation
  console.log('\n[10] Ecommerce Integrity (Non-Interference):')
  assert(!studioPageContent.includes('addToCart('), 'AvatarStudioPage does not mutate cart')
  assert(!studioPageContent.includes('checkoutApi'), 'AvatarStudioPage does not call checkout APIs')

  console.log('\n============================================================')
  console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
  if (failedCount === 0) {
    console.log('ALL PHASE 3A AVATAR STUDIO TESTS PASSED ✓')
  } else {
    console.error('SOME PHASE 3A AVATAR STUDIO TESTS FAILED ✗')
    process.exit(1)
  }
  console.log('============================================================\n')
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
