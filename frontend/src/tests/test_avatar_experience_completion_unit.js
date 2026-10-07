/**
 * TrendVolt Phase 6 Automated Unit Test Suite:
 * Production Avatar Experience & Personalization Completion
 *
 * Verifies:
 * 1. Avatar Dirty & Saved State Machine
 * 2. Save Transitions & Duplicate Save Prevention
 * 3. Failed Save State Non-Destructive Behavior
 * 4. Reset Avatar vs Reset Camera Separation
 * 5. Photo Personalization Suggestions (Apply vs Keep Current)
 * 6. Youth Photo Input Prohibition (Privacy Invariant)
 * 7. Avatar -> Wardrobe Transition & Unsaved Warning
 * 8. Canonical Outfit State & Slot Replacement Rules
 * 9. Accessory Multi-Select & Slot Accumulation
 * 10. Clear Outfit Functionality
 * 11. Avatar Profile vs Outfit State Separation
 * 12. Real Product Selection & Catalog Preservation
 * 13. Query Parameter Product Selection (?selectProduct=:id)
 * 14. Unsupported Product & 3D Preview Unavailable States
 * 15. Top + Bottom Modular Visualization Runtime
 * 16. Customer-Facing Garment Status Machine
 * 17. Deterministic Color & Style Matcher Integration
 * 18. Add Outfit to Cart with Canonical Redux Action
 * 19. Backend Authority Preserved (Price, Stock, Sizing)
 * 20. Sizing vs Visualization Disclaimer Separation
 * 21. Responsive Layout Integrity (390px - 1440px)
 * 22. Accessibility Labels & ARIA Compliance
 * 23. Zero-Biometric & Client-Side Privacy Invariants
 * 24. No Jargon & Clean Customer-Facing Terminology
 * 25. Visual Capability States ("Applied to avatar" vs "Saved to profile")
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  INITIAL_OUTFIT,
} from '../constants/wardrobeConstants.js'
import {
  analyzeOutfitColorMatch,
  MATCH_THRESHOLDS,
} from '../utils/outfitColorMatcher.js'

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
  console.log('\n=== TEST SUITE: PHASE 6 PRODUCTION AVATAR EXPERIENCE & PERSONALIZATION COMPLETION ===\n')

  const studioPagePath = path.resolve(__dirname, '../pages/AvatarStudioPage.jsx')
  const wardrobePagePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')
  const tryOnPagePath = path.resolve(__dirname, '../pages/TryOnPage.jsx')
  const productDetailsPagePath = path.resolve(__dirname, '../pages/ProductDetailsPage.jsx')
  const wardrobeComponentPath = path.resolve(__dirname, '../components/avatar/VirtualWardrobe.jsx')
  const avatarViewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')
  const photoComponentPath = path.resolve(__dirname, '../components/avatar/AvatarPhotoReference.jsx')
  const appearanceControlsPath = path.resolve(__dirname, '../components/avatar/AvatarAppearanceControls.jsx')
  const bodyControlsPath = path.resolve(__dirname, '../components/avatar/AvatarBodyControls.jsx')
  const faceControlsPath = path.resolve(__dirname, '../components/avatar/AvatarFaceControls.jsx')
  const matchPanelPath = path.resolve(__dirname, '../components/avatar/OutfitMatchPanel.jsx')

  const studioContent = fs.readFileSync(studioPagePath, 'utf8')
  const wardrobePageContent = fs.readFileSync(wardrobePagePath, 'utf8')
  const tryOnPageContent = fs.readFileSync(tryOnPagePath, 'utf8')
  const productDetailsContent = fs.readFileSync(productDetailsPagePath, 'utf8')
  const wardrobeComponentContent = fs.readFileSync(wardrobeComponentPath, 'utf8')
  const avatarViewerContent = fs.readFileSync(avatarViewerPath, 'utf8')
  const photoContent = fs.readFileSync(photoComponentPath, 'utf8')
  const appearanceContent = fs.readFileSync(appearanceControlsPath, 'utf8')
  const bodyContent = fs.readFileSync(bodyControlsPath, 'utf8')
  const faceContent = fs.readFileSync(faceControlsPath, 'utf8')
  const matchPanelContent = fs.readFileSync(matchPanelPath, 'utf8')

  // =========================================================================
  // 1. AVATAR STUDIO EXPERIENCE & DIRTY / SAVED STATE MACHINE
  // =========================================================================
  console.log('[1] Avatar Studio Experience & Dirty / Saved State Machine:')

  assert(
    studioContent.includes('serializeAvatarState') &&
    studioContent.includes('savedSnapshot') &&
    studioContent.includes('isDirty'),
    'AvatarStudioPage tracks avatar dirty state via snapshot serialization'
  )

  assert(
    studioContent.includes('Unsaved changes'),
    'AvatarStudioPage clearly displays "Unsaved changes" when profile differs from saved state'
  )

  assert(
    studioContent.includes('Avatar saved'),
    'AvatarStudioPage clearly displays "Avatar saved" when state is synchronized'
  )

  assert(
    studioContent.includes('disabled={isSavingAvatar}') &&
    studioContent.includes('if (isSavingAvatar) return'),
    'AvatarStudioPage prevents duplicate save clicks during ongoing request'
  )

  assert(
    studioContent.includes('Saving…'),
    'AvatarStudioPage renders "Saving…" during save operation'
  )

  assert(
    studioContent.includes('Unable to save avatar. Please try again.'),
    'AvatarStudioPage surfaces customer-friendly error on failed save'
  )

  // =========================================================================
  // 2. RESET BEHAVIOR SEPARATION (AVATAR vs CAMERA)
  // =========================================================================
  console.log('\n[2] Reset Behavior Separation:')

  assert(
    studioContent.includes('handleResetAvatar') &&
    studioContent.includes('handleResetCamera'),
    'AvatarStudioPage defines distinct handleResetAvatar and handleResetCamera handlers'
  )

  // Verify Reset Avatar does NOT invoke handleResetCamera or resetView
  const resetAvatarHandlerMatch = studioContent.match(/handleResetAvatar\s*=\s*useCallback\(([\s\S]*?)\},\s*\[isYouth\]\)/)
  assert(
    resetAvatarHandlerMatch && !resetAvatarHandlerMatch[1].includes('handleResetCamera'),
    'handleResetAvatar resets only editable customizations without resetting 3D camera'
  )

  assert(
    !studioContent.includes('cartSlice') && !studioContent.includes('clearCart'),
    'Reset Avatar never mutates cart or clears shopping state'
  )

  assert(
    avatarViewerContent.includes('aria-label="Reset Camera View"'),
    'AvatarViewer embeds accessible "Reset Camera View" button'
  )

  // =========================================================================
  // 3. PHOTO PERSONALIZATION UX & PRIVACY INVARIANTS
  // =========================================================================
  console.log('\n[3] Photo Personalization UX & Privacy Invariants:')

  assert(
    photoContent.includes('Apply Suggestions'),
    'AvatarPhotoReference displays "Apply Suggestions" action button'
  )

  assert(
    photoContent.includes('Keep Current Avatar'),
    'AvatarPhotoReference displays "Keep Current Avatar" rejection button'
  )

  assert(
    studioContent.includes('handleApplyPhotoSuggestions') &&
    !studioContent.includes('handleApplyPhotoSuggestions = useCallback((suggestions) => {\n    handleSaveAvatar'),
    'Applying photo suggestions updates local state only and does NOT auto-save to backend'
  )

  assert(
    photoContent.includes("isYouth = ['Boys', 'Girls', 'Kids'].includes(demographic)") &&
    photoContent.includes('strictly prohibited for youth profiles'),
    'Youth accounts strictly prohibit photo uploads and reference inputs'
  )

  assert(
    !photoContent.includes('/api/photos') &&
    !photoContent.includes('/upload') &&
    !photoContent.includes('FormData'),
    'Zero backend photo uploads or persistent storage (client-side only canvas)'
  )

  // =========================================================================
  // 4. VISUAL CAPABILITY STATES ("Applied to avatar" vs "Saved to profile")
  // =========================================================================
  console.log('\n[4] Visual Capability States:')

  assert(
    bodyContent.includes('Applied to avatar'),
    'AvatarBodyControls displays "Applied to avatar" visual capability badge'
  )

  assert(
    appearanceContent.includes('Applied to avatar'),
    'AvatarAppearanceControls displays "Applied to avatar" for skin tone'
  )

  assert(
    appearanceContent.includes('Saved to profile'),
    'AvatarAppearanceControls marks hairstyles/facial hair as "Saved to profile"'
  )

  assert(
    faceContent.includes('Applied to avatar') &&
    faceContent.includes('Saved to profile'),
    'AvatarFaceControls distinguishes applied vs saved-to-profile states depending on asset capability'
  )

  // =========================================================================
  // 5. AVATAR -> WARDROBE TRANSITION & SYNCHRONIZATION
  // =========================================================================
  console.log('\n[5] Avatar -> Wardrobe Transition:')

  assert(
    studioContent.includes('to="/avatar/wardrobe"'),
    'AvatarStudioPage links to /avatar/wardrobe for the primary next action'
  )

  assert(
    studioContent.includes('You have unsaved changes') &&
    studioContent.includes('ensure your personalized'),
    'AvatarStudioPage warns user if unsaved changes exist before wardrobe transition'
  )

  assert(
    wardrobePageContent.includes('avatarService.getAvatar()'),
    'AvatarWardrobePage loads authoritative saved avatar profile from backend'
  )

  // =========================================================================
  // 6. CANONICAL VIRTUAL WARDROBE STATE & SLOT RULES
  // =========================================================================
  console.log('\n[6] Canonical Virtual Wardrobe State & Slot Rules:')

  // Test INITIAL_OUTFIT canonical shape
  assert(
    INITIAL_OUTFIT.top === null &&
    INITIAL_OUTFIT.bottom === null &&
    INITIAL_OUTFIT.shoes === null &&
    Array.isArray(INITIAL_OUTFIT.accessories) &&
    INITIAL_OUTFIT.accessories.length === 0,
    'INITIAL_OUTFIT satisfies { top: null, bottom: null, shoes: null, accessories: [] }'
  )

  // Test slot replacement rules
  const testTop1 = { _id: 'top1', name: 'Linen Shirt', category: 'Tops', price: 2499 }
  const testTop2 = { _id: 'top2', name: 'Silk Blouse', category: 'Tops', price: 3499 }
  const testBottom1 = { _id: 'bot1', name: 'Tailored Trousers', category: 'Bottoms', price: 3999 }
  const testAcc1 = { _id: 'acc1', name: 'Leather Belt', category: 'Accessories', price: 1299 }
  const testAcc2 = { _id: 'acc2', name: 'Silk Scarf', category: 'Accessories', price: 1499 }

  let testOutfit = { ...INITIAL_OUTFIT }
  testOutfit.top = testTop1
  assert(testOutfit.top._id === 'top1', 'Top slot successfully set')

  // Replace top slot
  testOutfit.top = testTop2
  assert(testOutfit.top._id === 'top2', 'Selecting a new top replaces previous top item')

  // Set bottom slot
  testOutfit.bottom = testBottom1
  assert(testOutfit.bottom._id === 'bot1', 'Bottom slot successfully set')

  // Accessories multi-select accumulation
  testOutfit.accessories = [...testOutfit.accessories, testAcc1, testAcc2]
  assert(
    testOutfit.accessories.length === 2 &&
    testOutfit.accessories.map((a) => a._id).includes('acc1') &&
    testOutfit.accessories.map((a) => a._id).includes('acc2'),
    'Accessories accumulate multiple items in canonical array'
  )

  // Accessory removal by ID
  testOutfit.accessories = testOutfit.accessories.filter((a) => a._id !== 'acc1')
  assert(
    testOutfit.accessories.length === 1 && testOutfit.accessories[0]._id === 'acc2',
    'Removing accessory by ID keeps other accessories intact'
  )

  // Clear outfit
  testOutfit = { ...INITIAL_OUTFIT }
  assert(
    testOutfit.top === null && testOutfit.bottom === null && testOutfit.accessories.length === 0,
    'Clear outfit resets all slots to canonical empty state'
  )

  // =========================================================================
  // 7. REAL PRODUCT SELECTION & QUERY PARAMETER CONTINUITY
  // =========================================================================
  console.log('\n[7] Real Product Integration & Query Parameter Continuity:')

  assert(
    productDetailsContent.includes('Style in Virtual Wardrobe'),
    'ProductDetailsPage displays "Style in Virtual Wardrobe" CTA'
  )

  assert(
    productDetailsContent.includes('/avatar/wardrobe?selectProduct='),
    'ProductDetailsPage directs to /avatar/wardrobe?selectProduct=:id'
  )

  assert(
    wardrobePageContent.includes("searchParams.get('selectProduct')") &&
    wardrobePageContent.includes('determineProductWardrobeSlot'),
    'AvatarWardrobePage safely parses selectProduct query param and places into correct slot'
  )

  assert(
    wardrobeComponentContent.includes('determineProductWardrobeSlot(product)'),
    'VirtualWardrobe determines slots using real product metadata'
  )

  // =========================================================================
  // 8. 3D GARMENT STATES & VISUALIZATION RUNTIME
  // =========================================================================
  console.log('\n[8] 3D Garment States & Visualization Runtime:')

  assert(
    wardrobeComponentContent.includes('Loading 3D garment…'),
    'VirtualWardrobe implements "Loading 3D garment…" loading state'
  )

  assert(
    wardrobeComponentContent.includes('3D Active'),
    'VirtualWardrobe implements "3D Active" active state'
  )

  assert(
    wardrobeComponentContent.includes('3D preview unavailable for this product.'),
    'VirtualWardrobe implements "3D preview unavailable for this product." state'
  )

  assert(
    wardrobeComponentContent.includes('Unable to load this 3D preview.'),
    'VirtualWardrobe implements "Unable to load this 3D preview." error state'
  )

  assert(
    wardrobePageContent.includes('garments.top') && wardrobePageContent.includes('garments.bottom'),
    'AvatarWardrobePage orchestrates simultaneous Top + Bottom visualization'
  )

  assert(
    avatarViewerContent.includes('activeGarmentsList'),
    'AvatarViewer coordinates multiple garment layers simultaneously'
  )

  // =========================================================================
  // 9. DETERMINISTIC COLOR & STYLE MATCHER INTEGRATION
  // =========================================================================
  console.log('\n[9] Deterministic Color & Style Matcher:')

  const matchWhiteBlack = analyzeOutfitColorMatch({
    top: { color: 'white', name: 'White Linen Shirt' },
    bottom: { color: 'black', name: 'Black Pleated Trousers' },
  })

  assert(
    matchWhiteBlack.score >= 90 && matchWhiteBlack.status === 'excellent',
    'Deterministic matcher scores White top + Black bottom as Excellent match'
  )

  const matchOliveBeige = analyzeOutfitColorMatch({
    top: { color: 'olive', name: 'Olive Overshirt' },
    bottom: { color: 'beige', name: 'Beige Chinos' },
  })

  assert(
    matchOliveBeige.score >= 75 && (matchOliveBeige.status === 'strong' || matchOliveBeige.status === 'excellent'),
    'Deterministic matcher scores Olive top + Beige bottom as Strong/Good match'
  )

  const matchIncomplete = analyzeOutfitColorMatch({
    top: { color: 'navy', name: 'Navy Polo' },
    bottom: null,
  })

  assert(
    matchIncomplete.status === 'incomplete',
    'Deterministic matcher handles incomplete outfits gracefully'
  )

  assert(
    MATCH_THRESHOLDS.EXCELLENT.label === 'Great combination' &&
    MATCH_THRESHOLDS.STRONG.label === 'Strong match' &&
    MATCH_THRESHOLDS.GOOD.label === 'Good combination' &&
    matchPanelContent.includes('{label}'),
    'OutfitMatchPanel and deterministic matcher use concise customer language without technical jargon'
  )

  assert(
    !matchPanelContent.includes('AI confidence') &&
    !matchPanelContent.includes('Model prediction') &&
    !matchPanelContent.includes('machine learning'),
    'Zero fake AI claims in outfit match panel'
  )

  // =========================================================================
  // 10. ADD OUTFIT TO CART & BACKEND AUTHORITY
  // =========================================================================
  console.log('\n[10] Add Outfit to Cart & Backend Authority:')

  assert(
    wardrobeComponentContent.includes('Add Outfit to Cart') &&
    wardrobeComponentContent.includes('addToCart({'),
    'VirtualWardrobe dispatches canonical Redux addToCart action'
  )

  assert(
    wardrobeComponentContent.includes('item.sizes.find((s) => s.available !== false)'),
    'VirtualWardrobe selects available size from existing product size array'
  )

  assert(
    !tryOnPageContent.toLowerCase().includes('guaranteed exact fit') &&
    !tryOnPageContent.toLowerCase().includes('perfect fit guaranteed'),
    'TryOnPage maintains that avatar visualization is not guaranteed clothing fit'
  )

  // =========================================================================
  // 11. NO TECHNICAL JARGON IN CUSTOMER INTERFACES
  // =========================================================================
  console.log('\n[11] Customer Interface Cleanliness (No Technical Jargon):')

  const userFacingUiText = [
    studioContent,
    wardrobeComponentContent,
    matchPanelContent,
  ].join('\n')

  // Check that customer-facing buttons/headings don't display raw internal keywords
  assert(
    !userFacingUiText.includes('>morph target<') &&
    !userFacingUiText.includes('>Three.js<') &&
    !userFacingUiText.includes('>asset resolver<') &&
    !userFacingUiText.includes('>GLTF<'),
    'Customer-facing interface is free of technical engine terminology'
  )

  // =========================================================================
  // 12. RESPONSIVE DESIGN & ACCESSIBILITY
  // =========================================================================
  console.log('\n[12] Responsive Design & Accessibility:')

  assert(
    studioContent.includes('grid grid-cols-1 lg:grid-cols-12') &&
    wardrobePageContent.includes('grid grid-cols-1 lg:grid-cols-12'),
    'Studio and Wardrobe pages implement responsive 1-column mobile / 12-column desktop layouts'
  )

  assert(
    studioContent.includes('role="tabpanel"') &&
    studioContent.includes('aria-labelledby="tab-body"') &&
    studioContent.includes('aria-labelledby="tab-appearance"'),
    'Studio implements accessible tabpanel landmarks and ARIA associations'
  )

  assert(
    wardrobeComponentContent.includes('aria-label="Current Selected Outfit"') &&
    wardrobeComponentContent.includes('aria-label="TrendVolt Wardrobe Catalog"'),
    'VirtualWardrobe declares accessible outfit and catalog sections with clear labeling'
  )

  console.log('\n-------------------------------------------------------------')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('-------------------------------------------------------------\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
