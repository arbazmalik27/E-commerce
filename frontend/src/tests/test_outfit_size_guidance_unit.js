/**
 * TrendVolt Phase 9 Automated Unit Test Suite:
 * Outfit Size Guidance Feature
 *
 * Verifies:
 * 1. Adult top recommendation (men chest-based sizing)
 * 2. Adult bottom recommendation (men waist-based sizing)
 * 3. Women top & bottom recommendation (women bust/waist sizing)
 * 4. Youth sizing (age-based sizing for kids apparel)
 * 5. Footwear sizing (foot length based sizing)
 * 6. Unsupported product category (accessories, watches, beauty)
 * 7. Missing avatar sizing data (incomplete measurements or null profile)
 * 8. Product without size options (empty sizes array)
 * 9. Recommended size unavailable / out of stock
 * 10. Manual size override (user selection takes precedence)
 * 11. Selected size preserved when adding to cart (no silent override)
 * 12. No duplicate sizing logic (delegates directly to sizeCharts.js recommendSize)
 * 13. Products without 3D assets still receive size guidance independently
 * 14. Visual avatar remains advisory only (disclaimer verified)
 * 15. VirtualWardrobe component integration & accessibility
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  avatarProfileToSizingInputs,
  getProductSizeRecommendation,
  resolveEffectiveSize,
} from '../utils/outfitSizeGuidance.js'

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
  console.log('\n=== TEST SUITE: PHASE 9 OUTFIT SIZE GUIDANCE ===\n')

  // Sample Avatar Profiles
  const adultMenProfile = {
    demographic: 'men',
    heightCm: 178,
    fitPreference: 'regular',
    estimatedMeasurements: {
      chest: 98, // ~38.6 in -> Size M (38-40)
      waist: 82, // ~32.3 in -> Size 32 (31-33)
      hip: 98,
      footLength: 26.5, // ~26.5 cm -> Size 8 UK/IN (25.9-26.6 cm)
      unit: 'cm',
    },
  }

  const adultWomenProfile = {
    demographic: 'women',
    heightCm: 165,
    fitPreference: 'regular',
    estimatedMeasurements: {
      chest: 88, // ~34.6 in -> Size S (33-35)
      waist: 70, // ~27.6 in -> Size S (26-28)
      hip: 94,
      unit: 'cm',
    },
  }

  const youthProfile = {
    demographic: 'boys',
    age: 7,
    heightCm: 122,
    fitPreference: 'regular',
    estimatedMeasurements: {
      unit: 'cm',
    },
  }

  const incompleteProfile = {
    demographic: 'men',
    heightCm: 175,
    fitPreference: 'regular',
    estimatedMeasurements: {
      chest: null,
      waist: null,
      unit: 'cm',
    },
  }

  // Sample Products
  const menShirt = {
    _id: 'prod_m_shirt',
    name: 'Oxford Cotton Shirt',
    department: 'men',
    subcategory: 'shirts',
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: true },
      { label: 'XL', available: false },
    ],
  }

  const menJeans = {
    _id: 'prod_m_jeans',
    name: 'Classic Slim Denim',
    department: 'men',
    subcategory: 'jeans',
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: true },
    ],
  }

  const womenTop = {
    _id: 'prod_w_top',
    name: 'Silk Blend Blouse',
    department: 'women',
    subcategory: 'tops',
    sizes: [
      { label: 'XS', available: true },
      { label: 'S', available: true },
      { label: 'M', available: true },
    ],
  }

  const womenJeans = {
    _id: 'prod_w_jeans',
    name: 'High Rise Flared Jeans',
    department: 'women',
    subcategory: 'jeans',
    sizes: [
      { label: 'XS', available: true },
      { label: 'S', available: true },
      { label: 'M', available: true },
    ],
  }

  const kidsTee = {
    _id: 'prod_k_tee',
    name: 'Graphic Cotton T-Shirt',
    department: 'kids',
    subcategory: 't-shirts',
    sizes: [
      { label: '2-3Y', available: true },
      { label: '4-5Y', available: true },
      { label: '6-7Y', available: true },
      { label: '8-9Y', available: true },
    ],
  }

  const sneakers = {
    _id: 'prod_shoes',
    name: 'Court Leather Sneakers',
    department: 'footwear',
    subcategory: 'sneakers',
    sizes: [
      { label: '7', available: true },
      { label: '8', available: true },
      { label: '9', available: true },
      { label: '10', available: true },
    ],
  }

  const watch = {
    _id: 'prod_watch',
    name: 'Minimal Chronograph',
    department: 'accessories',
    subcategory: 'watches',
    sizes: [],
  }

  const productWithoutSizes = {
    _id: 'prod_no_sizes',
    name: 'Unsized Scarf',
    department: 'accessories',
    subcategory: 'scarves',
    sizes: [],
  }

  const productOutOfStockSize = {
    _id: 'prod_out_of_stock',
    name: 'Tailored Blazer',
    department: 'men',
    subcategory: 'suits-blazers',
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: false }, // User M is out of stock
      { label: 'L', available: true },
    ],
  }

  const non3DProduct = {
    _id: 'prod_no_3d',
    name: 'Catalog-Only Linen Shirt',
    department: 'men',
    subcategory: 'shirts',
    tryOn: null, // No 3D asset
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: true },
    ],
  }

  // TEST 1: Adult top recommendation (chest-based)
  console.log('Test 1: Adult top recommendation')
  const menTopRec = getProductSizeRecommendation(menShirt, adultMenProfile)
  assert(menTopRec.status === 'recommended', 'Adult top returns status "recommended"')
  assert(menTopRec.recommendedSize === 'M', 'Adult top recommends size "M" for 98cm chest')
  assert(menTopRec.message === 'Recommended size: M', 'Advisory message matches exact customer copy')
  assert(menTopRec.isAvailable === true, 'Recommended size is available in product sizes')

  // TEST 2: Adult bottom recommendation (waist-based)
  console.log('\nTest 2: Adult bottom recommendation')
  const menBottomRec = getProductSizeRecommendation(menJeans, adultMenProfile)
  assert(menBottomRec.status === 'recommended', 'Adult bottom returns status "recommended"')
  assert(menBottomRec.recommendedSize === 'M', 'Adult bottom recommends size "M" for 82cm waist')
  assert(menBottomRec.message === 'Recommended size: M', 'Advisory message matches exact customer copy')

  // TEST 3: Women top & bottom recommendation
  console.log('\nTest 3: Women top and bottom recommendation')
  const womenTopRec = getProductSizeRecommendation(womenTop, adultWomenProfile)
  assert(womenTopRec.status === 'recommended', 'Women top returns status "recommended"')
  assert(womenTopRec.recommendedSize === 'S', 'Women top recommends size "S" for 88cm bust')

  const womenBottomRec = getProductSizeRecommendation(womenJeans, adultWomenProfile)
  assert(womenBottomRec.status === 'recommended', 'Women bottom returns status "recommended"')
  assert(womenBottomRec.recommendedSize === 'S', 'Women bottom recommends size "S" for 70cm waist')

  // TEST 4: Youth sizing (age-based)
  console.log('\nTest 4: Youth clothing sizing')
  const youthRec = getProductSizeRecommendation(kidsTee, youthProfile)
  assert(youthRec.status === 'recommended', 'Youth apparel returns status "recommended"')
  assert(youthRec.recommendedSize === '6-7Y', 'Youth apparel recommends size "6-7Y" for age 7')
  assert(youthRec.message === 'Recommended size: 6-7Y', 'Youth advisory message matches standard format')

  // TEST 5: Footwear sizing (foot length based)
  console.log('\nTest 5: Footwear sizing')
  const shoesRec = getProductSizeRecommendation(sneakers, adultMenProfile)
  assert(shoesRec.status === 'recommended', 'Footwear returns status "recommended"')
  assert(shoesRec.recommendedSize === '8', 'Footwear recommends UK/IN size 8 for 26.5cm foot')

  // TEST 6: Unsupported product category
  console.log('\nTest 6: Unsupported product category')
  const watchRec = getProductSizeRecommendation(watch, adultMenProfile)
  assert(watchRec.recommendedSize === null, 'Unsupported category has null recommended size')
  assert(watchRec.message === 'Size recommendation unavailable', 'Unsupported category shows standard unavailable message')

  // TEST 7: Missing avatar sizing data & null profile
  console.log('\nTest 7: Missing avatar sizing data')
  const incompleteRec = getProductSizeRecommendation(menShirt, incompleteProfile)
  assert(incompleteRec.recommendedSize === null, 'Incomplete profile yields null recommended size')
  assert(incompleteRec.message === 'Size recommendation unavailable', 'Incomplete profile shows standard unavailable message')

  const nullProfileRec = getProductSizeRecommendation(menShirt, null)
  assert(nullProfileRec.recommendedSize === null, 'Null profile yields null recommended size')
  assert(nullProfileRec.message === 'Size recommendation unavailable', 'Null profile shows standard unavailable message')

  // TEST 8: Product without size options
  console.log('\nTest 8: Product without size options')
  const noSizesRec = getProductSizeRecommendation(productWithoutSizes, adultMenProfile)
  assert(noSizesRec.recommendedSize === null, 'Product without sizes yields null size')
  assert(noSizesRec.message === 'Size recommendation unavailable', 'Product without sizes displays standard unavailable copy')

  // TEST 9: Recommended size unavailable / out of stock
  console.log('\nTest 9: Recommended size out of stock')
  const oosRec = getProductSizeRecommendation(productOutOfStockSize, adultMenProfile)
  assert(oosRec.isAvailable === false, 'Out of stock recommended size has isAvailable: false')
  assert(oosRec.recommendedSize === 'M', 'Correct size is still identified as closest match')
  assert(oosRec.message.includes('M'), 'Message identifies recommended size M')

  // TEST 10: Manual size override
  console.log('\nTest 10: Manual size override')
  // Default without manual selection picks available recommended size M
  const effectiveDefault = resolveEffectiveSize(menShirt, null, menTopRec)
  assert(effectiveDefault === 'M', 'Default effective size is recommended size M')

  // When user manually selects L:
  const effectiveManual = resolveEffectiveSize(menShirt, 'L', menTopRec)
  assert(effectiveManual === 'L', 'Manual size override to "L" takes precedence over recommended "M"')

  // When user manually selects S:
  const effectiveManualS = resolveEffectiveSize(menShirt, 'S', menTopRec)
  assert(effectiveManualS === 'S', 'Manual size override to "S" takes precedence over recommended "M"')

  // TEST 11: Selected size preserved when adding to cart
  console.log('\nTest 11: Selected size preservation in cart flow')
  const inputs = avatarProfileToSizingInputs(adultMenProfile)
  assert(inputs.department === 'men' && inputs.measurements.chest === 98, 'avatarProfileToSizingInputs extracts department and measurements')
  const chosenCartSize = resolveEffectiveSize(menShirt, 'XL', menTopRec)
  assert(chosenCartSize === 'XL', 'resolveEffectiveSize selects explicit XL')
  // If user selected an available size 'L':
  const cartSizeL = resolveEffectiveSize(menShirt, 'L', menTopRec)
  assert(cartSizeL === 'L', 'Cart flow uses user-selected size "L" without silent override')

  // If recommendation is out of stock and no manual selection, resolveEffectiveSize returns null (unavailable)
  const effectiveOosDefault = resolveEffectiveSize(productOutOfStockSize, null, oosRec)
  assert(effectiveOosDefault === null, 'Returns null (unavailable) when recommendation is unavailable and no manual selection is made')

  // TEST 12: No duplicate sizing logic verification
  console.log('\nTest 12: Architecture & no duplicate sizing engine')
  const guidanceUtilPath = path.resolve(__dirname, '../utils/outfitSizeGuidance.js')
  const guidanceCode = fs.readFileSync(guidanceUtilPath, 'utf-8')
  assert(guidanceCode.includes("import { recommendSize } from '../constants/sizeCharts.js'"), 'Delegates directly to sizeCharts.js recommendSize')
  assert(!guidanceCode.includes('chestMin'), 'Does not re-declare size chart boundaries')
  assert(!guidanceCode.includes('waistMin'), 'Does not re-declare waist chart boundaries')

  // TEST 13: Products without 3D assets still receive size guidance
  console.log('\nTest 13: Non-3D products receive size guidance')
  const non3DRec = getProductSizeRecommendation(non3DProduct, adultMenProfile)
  assert(non3DRec.status === 'recommended', 'Non-3D product receives recommendation status')
  assert(non3DRec.recommendedSize === 'M', 'Non-3D product recommends size M independently of 3D asset')

  // TEST 14: Visual avatar remains advisory only
  console.log('\nTest 14: Advisory disclaimers')
  const wardrobeComponentPath = path.resolve(__dirname, '../components/avatar/VirtualWardrobe.jsx')
  const wardrobeCode = fs.readFileSync(wardrobeComponentPath, 'utf-8')
  assert(
    wardrobeCode.includes('Advisory size guidance only — visual avatar is not a physical fit guarantee.'),
    'VirtualWardrobe includes explicit fit disclaimer'
  )
  assert(!wardrobeCode.includes('guaranteed fit'), 'No false fit guarantee claims')

  // TEST 15: Component integration & UI copy in VirtualWardrobe.jsx
  console.log('\nTest 15: Component integration & UI copy')
  assert(wardrobeCode.includes('getProductSizeRecommendation'), 'VirtualWardrobe imports getProductSizeRecommendation')
  assert(wardrobeCode.includes('resolveEffectiveSize'), 'VirtualWardrobe imports resolveEffectiveSize')
  assert(wardrobeCode.includes('handleSelectSize'), 'VirtualWardrobe provides manual size selection handler')
  assert(guidanceCode.includes('Recommended size:'), 'outfitSizeGuidance formats "Recommended size:" advisory label')
  assert(guidanceCode.includes('Size recommendation unavailable'), 'outfitSizeGuidance handles unavailable size state gracefully')
  assert(wardrobeCode.includes('Selected:'), 'VirtualWardrobe displays "Selected:" label for manual override')
  assert(wardrobeCode.includes('Recommended size'), 'VirtualWardrobe provides accessible recommended size cues')

  console.log(`\n========================================`)
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
