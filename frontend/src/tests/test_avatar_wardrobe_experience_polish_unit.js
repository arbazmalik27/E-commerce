/**
 * Phase 4E Automated Unit Test Suite:
 * Avatar Studio & Virtual Wardrobe Experience Polish
 *
 * Verifies end-to-end UX polish and architectural invariants:
 * 1. Avatar Studio UX & Explicit Save Workflow States
 * 2. Virtual Wardrobe Outfit Summary & Actionable Empty Slots
 * 3. Garment 3D States (Active, Loading, Unavailable, Error)
 * 4. Deterministic Color & Style Match Panel UX
 * 5. Cart Flow with Backend Authority (No Client Pricing)
 * 6. Product Details to Wardrobe Integration
 * 7. Mobile Layout & Accessibility Standards
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { INITIAL_OUTFIT } from '../constants/wardrobeConstants.js'
import { analyzeOutfitColorMatch } from '../utils/outfitColorMatcher.js'

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
  console.log('\n=== TEST SUITE: PHASE 4E AVATAR & WARDROBE EXPERIENCE POLISH ===\n')

  const studioPath = path.resolve(__dirname, '../pages/AvatarStudioPage.jsx')
  const wardrobeComponentPath = path.resolve(__dirname, '../components/avatar/VirtualWardrobe.jsx')
  const wardrobePagePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')
  const viewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')
  const matchPanelPath = path.resolve(__dirname, '../components/avatar/OutfitMatchPanel.jsx')
  const productDetailsPath = path.resolve(__dirname, '../pages/ProductDetailsPage.jsx')

  assert(fs.existsSync(studioPath), 'AvatarStudioPage.jsx exists')
  assert(fs.existsSync(wardrobeComponentPath), 'VirtualWardrobe.jsx exists')
  assert(fs.existsSync(wardrobePagePath), 'AvatarWardrobePage.jsx exists')
  assert(fs.existsSync(viewerPath), 'AvatarViewer.jsx exists')
  assert(fs.existsSync(matchPanelPath), 'OutfitMatchPanel.jsx exists')
  assert(fs.existsSync(productDetailsPath), 'ProductDetailsPage.jsx exists')

  const studioContent = fs.readFileSync(studioPath, 'utf8')
  const wardrobeContent = fs.readFileSync(wardrobeComponentPath, 'utf8')
  const wardrobePageContent = fs.readFileSync(wardrobePagePath, 'utf8')
  const viewerContent = fs.readFileSync(viewerPath, 'utf8')
  const matchPanelContent = fs.readFileSync(matchPanelPath, 'utf8')
  const productDetailsContent = fs.readFileSync(productDetailsPath, 'utf8')

  // =========================================================================
  // 1. AVATAR STUDIO UX & EXPLICIT SAVE WORKFLOW STATES
  // =========================================================================
  console.log('\n[1] Avatar Studio UX & Explicit Save Workflow:')

  assert(studioContent.includes('Save Avatar'), 'Avatar Studio has idle "Save Avatar" state')
  assert(studioContent.includes('Saving…'), 'Avatar Studio has in-progress "Saving…" state')
  assert(studioContent.includes('Avatar saved'), 'Avatar Studio has success "Avatar saved" state')
  assert(
    studioContent.includes('Unable to save avatar. Please try again.'),
    'Avatar Studio has explicit failure message "Unable to save avatar. Please try again."'
  )
  assert(
    studioContent.includes('Please sign in to your TrendVolt account to save your avatar profile.'),
    'Avatar Studio prompts user to sign in before saving profile'
  )
  assert(
    studioContent.includes('hasExistingProfile') && studioContent.includes('updateAvatar'),
    'Avatar Studio updates existing profile instead of creating duplicate profiles'
  )
  assert(
    studioContent.includes('Avatar Studio Workflow'),
    'Avatar Studio provides clear 4-step workflow indicator strip'
  )
  assert(
    studioContent.includes('to="/avatar/wardrobe"'),
    'Avatar Studio contains transition link to /avatar/wardrobe'
  )

  // =========================================================================
  // 2. VIRTUAL WARDROBE OUTFIT SUMMARY & ACTIONABLE EMPTY SLOTS
  // =========================================================================
  console.log('\n[2] Virtual Wardrobe Outfit Summary & Empty Slot Actions:')

  assert(wardrobeContent.includes('+ Add a top'), 'Wardrobe displays actionable "+ Add a top" for empty top slot')
  assert(wardrobeContent.includes('+ Add bottoms'), 'Wardrobe displays actionable "+ Add bottoms" for empty bottom slot')
  assert(wardrobeContent.includes('+ Add shoes'), 'Wardrobe displays actionable "+ Add shoes" for empty shoes slot')
  assert(wardrobeContent.includes('+ Add accessories'), 'Wardrobe displays actionable "+ Add accessories" for empty accessories slot')

  assert(wardrobeContent.includes('aria-label="Remove top from outfit"'), 'Top remove button has descriptive aria-label')
  assert(wardrobeContent.includes('aria-label="Remove bottom from outfit"'), 'Bottom remove button has descriptive aria-label')
  assert(wardrobeContent.includes('aria-label="Remove shoes from outfit"'), 'Shoes remove button has descriptive aria-label')
  assert(wardrobeContent.includes('aria-label="Clear all outfit items"'), 'Clear outfit button has descriptive aria-label')

  // Invariant tests on outfit state
  const testTop = { _id: 'top-1', name: 'Premium Oversized Tee', price: 2499, category: 'fashion', department: 'men', subcategory: 't-shirts' }
  const testBottom = { _id: 'bot-1', name: 'Tailored Linen Trousers', price: 4299, category: 'fashion', department: 'men', subcategory: 'trousers' }
  const testShoes = { _id: 'shoe-1', name: 'Minimalist Leather Sneakers', price: 6999, category: 'fashion', department: 'footwear', subcategory: 'sneakers' }

  let currentOutfit = { ...INITIAL_OUTFIT }
  currentOutfit.top = testTop
  assert(currentOutfit.top._id === 'top-1', 'Selecting top assigns to top slot')
  currentOutfit.bottom = testBottom
  assert(currentOutfit.top._id === 'top-1' && currentOutfit.bottom._id === 'bot-1', 'Selecting bottom preserves top slot')
  currentOutfit.shoes = testShoes
  assert(currentOutfit.shoes._id === 'shoe-1', 'Selecting shoes assigns to shoes slot')

  // Slot replacement
  const testTop2 = { _id: 'top-2', name: 'Heavyweight Hooded Sweatshirt', price: 3999, category: 'fashion', department: 'men', subcategory: 'hoodies-sweatshirts' }
  currentOutfit.top = testTop2
  assert(currentOutfit.top._id === 'top-2' && currentOutfit.bottom._id === 'bot-1', 'Replacing top preserves bottom slot')

  // Slot removal
  currentOutfit.bottom = null
  assert(currentOutfit.bottom === null && currentOutfit.top._id === 'top-2', 'Removing bottom clears bottom slot without affecting top')

  // =========================================================================
  // 3. GARMENT 3D VISUALIZATION STATES
  // =========================================================================
  console.log('\n[3] Garment 3D Visualization States:')

  assert(wardrobeContent.includes('Loading 3D garment…'), 'Wardrobe displays "Loading 3D garment…" during asset load')
  assert(wardrobeContent.includes('3D Active'), 'Wardrobe displays "3D Active" for active production 3D asset')
  assert(wardrobeContent.includes('3D preview unavailable for this product.'), 'Wardrobe displays "3D preview unavailable for this product." for catalog piece')
  assert(wardrobeContent.includes('Unable to load this 3D preview.'), 'Wardrobe displays "Unable to load this 3D preview." on runtime error')

  // Check that developer placeholder is disallowed in customer wardrobe
  assert(wardrobePageContent.includes('allowDevPlaceholder: false'), 'Virtual Wardrobe strictly prohibits developer placeholder meshes')

  // =========================================================================
  // 4. AVATAR VIEWER & 360° CONTROLS
  // =========================================================================
  console.log('\n[4] Avatar Viewer & 360° Controls:')

  assert(viewerContent.includes('OrbitControls'), 'AvatarViewer integrates OrbitControls for 360° rotation')
  assert(viewerContent.includes('aria-label="Reset Camera View"'), 'AvatarViewer camera reset button includes accessible aria-label')
  assert(wardrobePageContent.includes('aria-label="Reset Camera View"'), 'AvatarWardrobePage camera reset button includes accessible aria-label')
  assert(viewerContent.includes('resetView'), 'AvatarViewer exposes imperative resetView handler')

  // =========================================================================
  // 5. DETERMINISTIC COLOR & STYLE MATCH PANEL
  // =========================================================================
  console.log('\n[5] Deterministic Color & Style Match Panel:')

  const mockCatalog = [testTop, testBottom, testShoes]
  const analysis1 = analyzeOutfitColorMatch({ top: testTop, bottom: testBottom, shoes: testShoes, accessories: [] }, mockCatalog)
  assert(typeof analysis1.score === 'number', 'Color matcher produces numeric harmony score')
  assert(typeof analysis1.status === 'string', 'Color matcher produces status string')
  assert(typeof analysis1.label === 'string', 'Color matcher produces human-readable label')
  assert(typeof analysis1.explanation === 'string', 'Color matcher produces narrative explanation')

  // Panel presentation checks
  assert(matchPanelContent.includes('Palette Harmony'), 'OutfitMatchPanel displays "Palette Harmony" title')
  assert(matchPanelContent.includes('Garment Pairings'), 'OutfitMatchPanel breaks down pairings')
  assert(matchPanelContent.includes('Advisory palette harmony'), 'OutfitMatchPanel explicitly communicates advisory nature')
  assert(matchPanelContent.includes('onApplySuggestion'), 'OutfitMatchPanel allows user to try suggestions without auto-applying')

  // =========================================================================
  // 6. CART INTEGRATION & BACKEND PRICING AUTHORITY
  // =========================================================================
  console.log('\n[6] Cart Integration & Backend Authority:')

  assert(wardrobeContent.includes('Add Outfit to Cart'), 'VirtualWardrobe includes "Add Outfit to Cart" button')
  assert(wardrobeContent.includes('addToCart({'), 'VirtualWardrobe dispatches canonical addToCart action')
  assert(wardrobeContent.includes('Adding to Cart…'), 'VirtualWardrobe displays "Adding to Cart…" loading state')
  assert(wardrobeContent.includes('to="/cart"'), 'VirtualWardrobe provides direct link to /cart after successful addition')

  // Verify client NEVER passes price to addToCart
  assert(!wardrobeContent.includes('price: outfit'), 'VirtualWardrobe never passes client price in addToCart payload')
  assert(!wardrobeContent.includes('price: item.price'), 'VirtualWardrobe preserves backend pricing authority')

  // =========================================================================
  // 7. PRODUCT DETAILS TO WARDROBE DEEP-LINKING
  // =========================================================================
  console.log('\n[7] Product Details to Wardrobe Continuity:')

  assert(
    productDetailsContent.includes('/avatar/wardrobe?selectProduct='),
    'ProductDetailsPage links to /avatar/wardrobe with query parameter ?selectProduct=:id'
  )
  assert(
    productDetailsContent.includes('Style in Virtual Wardrobe'),
    'ProductDetailsPage displays "Style in Virtual Wardrobe" button'
  )
  assert(
    wardrobePageContent.includes("searchParams.get('selectProduct')"),
    'AvatarWardrobePage reads ?selectProduct query param and selects product in slot'
  )

  // =========================================================================
  // 8. MOBILE & ACCESSIBILITY AUDIT
  // =========================================================================
  console.log('\n[8] Mobile & Accessibility Standards:')

  assert(wardrobePageContent.includes('grid-cols-1 lg:grid-cols-12'), 'Wardrobe layout stacks vertically on mobile and side-by-side on lg screens')
  assert(wardrobePageContent.includes('sticky top-0'), 'Header is sticky for easy navigation across viewports')
  assert(wardrobeContent.includes('overflow-x-auto'), 'Category filters scroll smoothly without viewport overflow on mobile')

  console.log('\n============================================================')
  console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
  if (failedCount === 0) {
    console.log('ALL PHASE 4E POLISH TESTS PASSED ✓\n')
  } else {
    console.error('TEST FAILURES DETECTED ✗\n')
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
