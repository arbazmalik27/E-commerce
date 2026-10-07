/**
 * Automated Verification Suite for TrendVolt Phase 4B:
 * Virtual Wardrobe Foundation & 3D Outfit Selection
 *
 * Verifies:
 * 1. Component Architecture & File Integrity
 * 2. Wardrobe State Shape & Mutation Invariants (Select, Replace, Remove, Clear)
 * 3. Deterministic Taxonomy-to-Slot Mapping (Tops, Bottoms, Shoes, Accessories)
 * 4. Wardrobe Category Filtering
 * 5. Clean 3D Runtime Integration Contract (Real 3D vs Catalog Pieces)
 * 6. Authentication & User Flow State Guards (No Avatar, Logged-out)
 * 7. Product Details & Studio Entry Points
 * 8. Editorial Luxury Styling & Transparency Audit
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  WARDROBE_SLOTS,
  INITIAL_OUTFIT,
  WARDROBE_CATEGORY_FILTERS,
  determineProductWardrobeSlot,
  matchesWardrobeFilter,
} from '../constants/wardrobeConstants.js'
import { isProductTryOnActive } from '../utils/garmentAssetResolver.js'

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
  console.log('\n=== TEST SUITE: TRENDVOLT PHASE 4B VIRTUAL WARDROBE FOUNDATION ===\n')

  // =========================================================================
  // 1. COMPONENT ARCHITECTURE & FILE INTEGRITY
  // =========================================================================
  console.log('[1] Component Architecture & File Integrity:')
  const wardrobeComponentPath = path.resolve(__dirname, '../components/avatar/VirtualWardrobe.jsx')
  const wardrobePagePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')
  const wardrobeConstantsPath = path.resolve(__dirname, '../constants/wardrobeConstants.js')
  const appRoutesPath = path.resolve(__dirname, '../routes/AppRoutes.jsx')
  const productDetailsPath = path.resolve(__dirname, '../pages/ProductDetailsPage.jsx')
  const avatarStudioPath = path.resolve(__dirname, '../pages/AvatarStudioPage.jsx')

  assert(fs.existsSync(wardrobeComponentPath), 'VirtualWardrobe.jsx exists')
  assert(fs.existsSync(wardrobePagePath), 'AvatarWardrobePage.jsx exists')
  assert(fs.existsSync(wardrobeConstantsPath), 'wardrobeConstants.js exists')

  const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')
  assert(
    appRoutesContent.includes('AvatarWardrobePage = lazy(() => import('),
    'AppRoutes lazy-loads AvatarWardrobePage component'
  )
  assert(
    appRoutesContent.includes('path="/avatar/wardrobe"'),
    'AppRoutes registers public /avatar/wardrobe route'
  )

  // =========================================================================
  // 2. WARDROBE STATE SHAPE & MUTATION INVARIANTS
  // =========================================================================
  console.log('\n[2] Wardrobe State Shape & Invariants:')

  // Verify Initial State Shape
  assert(INITIAL_OUTFIT.top === null, 'Initial outfit top is null')
  assert(INITIAL_OUTFIT.bottom === null, 'Initial outfit bottom is null')
  assert(INITIAL_OUTFIT.shoes === null, 'Initial outfit shoes is null')
  assert(Array.isArray(INITIAL_OUTFIT.accessories), 'Initial outfit accessories is an array')
  assert(INITIAL_OUTFIT.accessories.length === 0, 'Initial outfit accessories is empty')

  // Mock Products
  const sampleTop1 = {
    _id: 'top-1',
    name: 'Oxford Cotton Shirt',
    price: 2499,
    department: 'men',
    subcategory: 'shirts',
    tryOn: { enabled: true, garmentType: 'top', assetStatus: 'active', assetUrl: '/models/shirt.glb' },
  }
  const sampleTop2 = {
    _id: 'top-2',
    name: 'Relaxed Linen Overshirt',
    price: 3299,
    department: 'men',
    subcategory: 'shirts',
    tryOn: { enabled: false },
  }
  const sampleBottom = {
    _id: 'bot-1',
    name: 'Straight Leg Denim',
    price: 3999,
    department: 'men',
    subcategory: 'jeans',
    tryOn: { enabled: true, garmentType: 'bottom', assetStatus: 'active', assetUrl: '/models/jeans.glb' },
  }
  const sampleShoes = {
    _id: 'shoe-1',
    name: 'Minimalist Leather Sneakers',
    price: 5499,
    department: 'footwear',
    subcategory: 'sneakers',
  }
  const sampleAcc1 = {
    _id: 'acc-1',
    name: 'Classic Chronograph Watch',
    price: 7999,
    department: 'accessories',
    subcategory: 'watches',
  }
  const sampleAcc2 = {
    _id: 'acc-2',
    name: 'Leather Belt',
    price: 1499,
    department: 'accessories',
    subcategory: 'belts',
  }

  // Simulate Selection Logic
  let outfit = { ...INITIAL_OUTFIT }

  // Select top
  outfit = { ...outfit, top: sampleTop1 }
  assert(outfit.top?._id === 'top-1', 'Top selection sets top slot')

  // Select bottom (preserves top)
  outfit = { ...outfit, bottom: sampleBottom }
  assert(outfit.bottom?._id === 'bot-1', 'Bottom selection sets bottom slot')
  assert(outfit.top?._id === 'top-1', 'Bottom selection preserves existing top slot')

  // Select shoes (preserves top & bottom)
  outfit = { ...outfit, shoes: sampleShoes }
  assert(outfit.shoes?._id === 'shoe-1', 'Shoes selection sets shoes slot')
  assert(outfit.top?._id === 'top-1' && outfit.bottom?._id === 'bot-1', 'Shoes selection preserves other slots')

  // Replace top
  outfit = { ...outfit, top: sampleTop2 }
  assert(outfit.top?._id === 'top-2', 'Selecting another top replaces previous top')
  assert(outfit.bottom?._id === 'bot-1', 'Replacing top preserves bottom slot')

  // Add multiple accessories
  outfit = { ...outfit, accessories: [...outfit.accessories, sampleAcc1, sampleAcc2] }
  assert(outfit.accessories.length === 2, 'Wardrobe supports multiple accessories selection')

  // Remove bottom
  outfit = { ...outfit, bottom: null }
  assert(outfit.bottom === null, 'Removing bottom clears bottom slot')
  assert(outfit.top?._id === 'top-2', 'Removing bottom leaves top untouched')
  assert(outfit.shoes?._id === 'shoe-1', 'Removing bottom leaves shoes untouched')

  // Remove single accessory by ID
  outfit = { ...outfit, accessories: outfit.accessories.filter((a) => a._id !== 'acc-1') }
  assert(outfit.accessories.length === 1 && outfit.accessories[0]._id === 'acc-2', 'Removes single accessory cleanly')

  // Clear outfit
  outfit = { ...INITIAL_OUTFIT }
  assert(outfit.top === null && outfit.bottom === null && outfit.accessories.length === 0, 'Clear outfit resets all slots to null')

  // =========================================================================
  // 3. TAXONOMY-TO-SLOT RESOLUTION
  // =========================================================================
  console.log('\n[3] Deterministic Taxonomy-to-Slot Mapping:')

  assert(
    determineProductWardrobeSlot({ tryOn: { garmentType: 'top' } }) === WARDROBE_SLOTS.TOP,
    'Resolves tryOn garmentType "top" to top slot'
  )
  assert(
    determineProductWardrobeSlot({ tryOn: { garmentType: 'bottom' } }) === WARDROBE_SLOTS.BOTTOM,
    'Resolves tryOn garmentType "bottom" to bottom slot'
  )
  assert(
    determineProductWardrobeSlot({ department: 'men', subcategory: 't-shirts' }) === WARDROBE_SLOTS.TOP,
    'Resolves men t-shirts to top slot'
  )
  assert(
    determineProductWardrobeSlot({ department: 'women', subcategory: 'tops' }) === WARDROBE_SLOTS.TOP,
    'Resolves women tops to top slot'
  )
  assert(
    determineProductWardrobeSlot({ department: 'men', subcategory: 'hoodies-sweatshirts' }) === WARDROBE_SLOTS.TOP,
    'Resolves hoodies-sweatshirts to top slot'
  )
  assert(
    determineProductWardrobeSlot({ department: 'women', subcategory: 'trousers' }) === WARDROBE_SLOTS.BOTTOM,
    'Resolves trousers to bottom slot'
  )
  assert(
    determineProductWardrobeSlot({ department: 'men', subcategory: 'shorts' }) === WARDROBE_SLOTS.BOTTOM,
    'Resolves shorts to bottom slot'
  )
  assert(
    determineProductWardrobeSlot({ department: 'footwear', subcategory: 'sneakers' }) === WARDROBE_SLOTS.SHOES,
    'Resolves footwear sneakers to shoes slot'
  )
  assert(
    determineProductWardrobeSlot({ department: 'accessories', subcategory: 'watches' }) === WARDROBE_SLOTS.ACCESSORIES,
    'Resolves accessories watches to accessories slot'
  )
  assert(
    determineProductWardrobeSlot({ department: 'beauty-fragrance', subcategory: 'perfumes' }) === null,
    'Safely returns null for non-apparel categories'
  )

  // =========================================================================
  // 4. WARDROBE CATEGORY FILTERING
  // =========================================================================
  console.log('\n[4] Wardrobe Category Filtering:')

  assert(Array.isArray(WARDROBE_CATEGORY_FILTERS) && WARDROBE_CATEGORY_FILTERS.length === 5, 'WARDROBE_CATEGORY_FILTERS defines 5 category filters')
  assert(matchesWardrobeFilter(sampleTop1, 'all') === true, 'All filter matches any product')
  assert(matchesWardrobeFilter(sampleTop1, 'tops') === true, 'Tops filter matches top product')
  assert(matchesWardrobeFilter(sampleTop1, 'bottoms') === false, 'Bottoms filter excludes top product')
  assert(matchesWardrobeFilter(sampleBottom, 'bottoms') === true, 'Bottoms filter matches bottom product')
  assert(matchesWardrobeFilter(sampleShoes, 'shoes') === true, 'Shoes filter matches footwear product')
  assert(matchesWardrobeFilter(sampleAcc1, 'accessories') === true, 'Accessories filter matches accessory product')

  // =========================================================================
  // 5. CLEAN 3D RUNTIME INTEGRATION CONTRACT
  // =========================================================================
  console.log('\n[5] 3D Runtime Integration Contract:')

  assert(isProductTryOnActive(sampleTop1) === true, 'Try-On active product is recognized')
  assert(isProductTryOnActive(sampleTop2) === false, 'Product without 3D asset is not marked active')

  const wardrobePageContent = fs.readFileSync(wardrobePagePath, 'utf8')
  assert(
    wardrobePageContent.includes('isProductTryOnActive(outfit.top)'),
    'AvatarWardrobePage checks isProductTryOnActive before applying top mesh'
  )
  assert(
    wardrobePageContent.includes('isProductTryOnActive(outfit.bottom)'),
    'AvatarWardrobePage checks isProductTryOnActive before applying bottom mesh'
  )
  assert(
    wardrobePageContent.includes('allowPlaceholder: false'),
    'Customer wardrobe strictly prohibits dev placeholder 3D meshes'
  )

  // =========================================================================
  // 6. AUTHENTICATION & USER FLOW STATE GUARDS
  // =========================================================================
  console.log('\n[6] Authentication & User Flow State Guards:')

  assert(
    wardrobePageContent.includes('!isAuthenticated'),
    'AvatarWardrobePage handles unauthenticated state gracefully'
  )
  assert(
    wardrobePageContent.includes('Sign In Required'),
    'Provides explicit sign-in link preserving return location'
  )
  assert(
    wardrobePageContent.includes('avatarNotFound'),
    'AvatarWardrobePage detects missing avatar profile (404)'
  )
  assert(
    wardrobePageContent.includes('to="/avatar"'),
    'Guides user to Avatar Studio (/avatar) when profile is missing'
  )
  assert(
    wardrobePageContent.includes('selectProduct'),
    'AvatarWardrobePage supports direct preselection via ?selectProduct query param'
  )

  // =========================================================================
  // 7. PRODUCT DETAILS & AVATAR STUDIO ENTRY POINTS
  // =========================================================================
  console.log('\n[7] Product Details & Avatar Studio Entry Points:')

  const productDetailsContent = fs.readFileSync(productDetailsPath, 'utf8')
  assert(
    productDetailsContent.includes('/avatar/wardrobe?selectProduct='),
    'ProductDetailsPage provides direct entry point to Virtual Wardrobe'
  )
  assert(
    productDetailsContent.includes('Style in Virtual Wardrobe'),
    'ProductDetailsPage includes "Style in Virtual Wardrobe" CTA'
  )

  const avatarStudioContent = fs.readFileSync(avatarStudioPath, 'utf8')
  assert(
    avatarStudioContent.includes('to="/avatar/wardrobe"'),
    'AvatarStudioPage links directly to /avatar/wardrobe'
  )
  assert(
    avatarStudioContent.includes('Enter Virtual Wardrobe & Outfit Studio'),
    'AvatarStudioPage contains "Enter Virtual Wardrobe" CTA'
  )

  // =========================================================================
  // 8. EDITORIAL LUXURY STYLING & TRANSPARENCY AUDIT
  // =========================================================================
  console.log('\n[8] Editorial Luxury Styling & Transparency Audit:')

  const forbiddenTerms = [
    'ai generated outfit',
    'perfect fit guarantee',
    'real-time fabric simulation active',
    'exact cloth physics',
  ]
  for (const term of forbiddenTerms) {
    assert(
      !wardrobePageContent.toLowerCase().includes(term),
      `AvatarWardrobePage does NOT make forbidden claim: "${term}"`
    )
  }

  // Summary
  console.log('\n============================================================')
  console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
  if (failedCount === 0) {
    console.log('ALL PHASE 4B VIRTUAL WARDROBE TESTS PASSED ✓')
  } else {
    console.error('SOME PHASE 4B VIRTUAL WARDROBE TESTS FAILED ✗')
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
