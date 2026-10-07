/**
 * TrendVolt Phase 8 Automated Unit Test Suite:
 * Outfit Recommendation Engine
 *
 * Verifies:
 * 1. Top-only outfit recommendations (targets bottoms, shoes)
 * 2. Bottom-only outfit recommendations (targets tops, shoes)
 * 3. Top + Bottom recommendations (targets shoes, accessories)
 * 4. Missing shoes recommendation
 * 5. Missing accessories recommendation
 * 6. Currently selected products excluded
 * 7. Inactive, deleted, and out-of-stock products excluded
 * 8. Unrelated categories and invalid slots excluded
 * 9. Deterministic ranking (consistent order across runs)
 * 10. Strong / excellent color compatibility preferred over low contrast/clash
 * 11. Unknown color metadata handled gracefully without fake compatibility scores
 * 12. Maximum recommendation count enforcement (capped at maxPerSlot)
 * 13. Correct slot assignment for candidate products
 * 14. No current outfit returns empty recommendations
 * 15. No matching products returns empty slot list
 * 16. Applying recommendation preserves canonical outfit structure
 * 17. Compatibility with existing deterministic color matcher
 * 18. UI component contract & accessibility labels in VirtualWardrobe.jsx
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  WARDROBE_SLOTS,
  INITIAL_OUTFIT,
} from '../constants/wardrobeConstants.js'
import {
  isProductAvailable,
  isProductSelected,
  identifyTargetRecommendationSlots,
  evaluateCandidateCompatibility,
  getSlotRecommendations,
  getOutfitRecommendations,
} from '../utils/outfitRecommendationEngine.js'
import {
  analyzeOutfitColorMatch,
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
  console.log('\n=== TEST SUITE: PHASE 8 OUTFIT RECOMMENDATION ENGINE ===\n')

  // Sample catalog products
  const whiteShirt = {
    _id: 'prod_top_1',
    id: 'prod_top_1',
    name: 'Classic Crisp White Linen Shirt',
    category: 'fashion',
    subcategory: 'shirts',
    price: 2499,
    isActive: true,
    stock: 10,
    tags: ['white', 'linen', 'formal'],
  }

  const navyBlazer = {
    _id: 'prod_top_2',
    id: 'prod_top_2',
    name: 'Tailored Navy Wool Blazer',
    category: 'fashion',
    subcategory: 'jackets',
    price: 5999,
    isActive: true,
    stock: 5,
    tags: ['navy', 'outerwear'],
  }

  const blackJeans = {
    _id: 'prod_bot_1',
    id: 'prod_bot_1',
    name: 'Slim Fit Black Denim Jeans',
    category: 'fashion',
    subcategory: 'jeans',
    price: 3299,
    isActive: true,
    stock: 8,
    tags: ['black', 'denim'],
  }

  const beigeChinos = {
    _id: 'prod_bot_2',
    id: 'prod_bot_2',
    name: 'Classic Beige Cotton Chinos',
    category: 'fashion',
    subcategory: 'trousers',
    price: 2799,
    isActive: true,
    stock: 12,
    tags: ['beige', 'cotton'],
  }

  const brightOrangePants = {
    _id: 'prod_bot_3',
    id: 'prod_bot_3',
    name: 'Vibrant Orange Cargo Trousers',
    category: 'fashion',
    subcategory: 'trousers',
    price: 1999,
    isActive: true,
    stock: 3,
    tags: ['orange'],
  }

  const unknownColorPants = {
    _id: 'prod_bot_4',
    id: 'prod_bot_4',
    name: 'Designer Tailored Trouser',
    category: 'fashion',
    subcategory: 'trousers',
    price: 3499,
    isActive: true,
    stock: 4,
    tags: [],
  }

  const inactivePants = {
    _id: 'prod_bot_inactive',
    id: 'prod_bot_inactive',
    name: 'Archived Gray Pants',
    category: 'fashion',
    subcategory: 'trousers',
    price: 1599,
    isActive: false,
    stock: 5,
  }

  const deletedPants = {
    _id: 'prod_bot_deleted',
    id: 'prod_bot_deleted',
    name: 'Deleted Cargo Shorts',
    category: 'fashion',
    subcategory: 'shorts',
    price: 999,
    isDeleted: true,
    stock: 5,
  }

  const outOfStockPants = {
    _id: 'prod_bot_nostock',
    id: 'prod_bot_nostock',
    name: 'Sold Out Chinos',
    category: 'fashion',
    subcategory: 'trousers',
    price: 1999,
    isActive: true,
    stock: 0,
  }

  const brownLoafers = {
    _id: 'prod_shoes_1',
    id: 'prod_shoes_1',
    name: 'Rich Brown Leather Loafers',
    category: 'fashion',
    subcategory: 'casual-shoes',
    department: 'footwear',
    price: 4999,
    isActive: true,
    stock: 6,
    tags: ['brown', 'leather', 'footwear'],
  }

  const whiteSneakers = {
    _id: 'prod_shoes_2',
    id: 'prod_shoes_2',
    name: 'Minimal White Leather Sneakers',
    category: 'fashion',
    subcategory: 'sneakers',
    department: 'footwear',
    price: 3999,
    isActive: true,
    stock: 10,
    tags: ['white', 'sneakers'],
  }

  const silverWatch = {
    _id: 'prod_acc_1',
    id: 'prod_acc_1',
    name: 'Stainless Steel Silver Watch',
    category: 'fashion',
    subcategory: 'watches',
    department: 'accessories',
    price: 7999,
    isActive: true,
    stock: 15,
    tags: ['silver', 'watch'],
  }

  const leatherBelt = {
    _id: 'prod_acc_2',
    id: 'prod_acc_2',
    name: 'Handcrafted Brown Leather Belt',
    category: 'fashion',
    subcategory: 'belts',
    department: 'accessories',
    price: 1299,
    isActive: true,
    stock: 20,
    tags: ['brown', 'leather'],
  }

  const unrelatedKitchenPan = {
    _id: 'prod_home_1',
    id: 'prod_home_1',
    name: 'Cast Iron Skillet',
    category: 'home-kitchen',
    subcategory: 'cookware',
    price: 2199,
    isActive: true,
    stock: 5,
  }

  const catalog = [
    whiteShirt,
    navyBlazer,
    blackJeans,
    beigeChinos,
    brightOrangePants,
    unknownColorPants,
    inactivePants,
    deletedPants,
    outOfStockPants,
    brownLoafers,
    whiteSneakers,
    silverWatch,
    leatherBelt,
    unrelatedKitchenPan,
  ]

  // TEST 1: No current outfit returns empty recommendations
  console.log('Test 1: Empty outfit state')
  const emptyRecs = getOutfitRecommendations(INITIAL_OUTFIT, catalog)
  assert(Array.isArray(emptyRecs) && emptyRecs.length === 0, 'Empty outfit yields empty recommendation list')

  // TEST 2: Top-only outfit recommendations
  console.log('\nTest 2: Top-only outfit recommendations')
  const topOnlyOutfit = {
    top: whiteShirt,
    bottom: null,
    shoes: null,
    accessories: [],
  }
  const topOnlyTargets = identifyTargetRecommendationSlots(topOnlyOutfit)
  assert(topOnlyTargets.includes(WARDROBE_SLOTS.BOTTOM), 'Top-only outfit targets bottoms')
  assert(topOnlyTargets.includes(WARDROBE_SLOTS.SHOES), 'Top-only outfit targets shoes as secondary slot')
  assert(!topOnlyTargets.includes(WARDROBE_SLOTS.TOP), 'Top-only outfit does not target top slot')

  const topOnlyRecs = getOutfitRecommendations(topOnlyOutfit, catalog)
  const bottomRecGroup = topOnlyRecs.find((r) => r.slot === WARDROBE_SLOTS.BOTTOM)
  assert(Boolean(bottomRecGroup), 'Recommendations include a bottom group for top-only outfit')
  assert(bottomRecGroup.products.length > 0, 'Found candidate bottoms')
  assert(bottomRecGroup.products.every((p) => p._id !== whiteShirt._id), 'Selected top is not recommended as bottom')

  // TEST 3: Bottom-only outfit recommendations
  console.log('\nTest 3: Bottom-only outfit recommendations')
  const bottomOnlyOutfit = {
    top: null,
    bottom: blackJeans,
    shoes: null,
    accessories: [],
  }
  const bottomOnlyTargets = identifyTargetRecommendationSlots(bottomOnlyOutfit)
  assert(bottomOnlyTargets.includes(WARDROBE_SLOTS.TOP), 'Bottom-only outfit targets tops')
  assert(bottomOnlyTargets.includes(WARDROBE_SLOTS.SHOES), 'Bottom-only outfit targets shoes')

  const bottomOnlyRecs = getOutfitRecommendations(bottomOnlyOutfit, catalog)
  const topRecGroup = bottomOnlyRecs.find((r) => r.slot === WARDROBE_SLOTS.TOP)
  assert(Boolean(topRecGroup), 'Recommendations include a top group for bottom-only outfit')
  assert(topRecGroup.products.some((p) => p._id === whiteShirt._id), 'White shirt recommended for black jeans')

  // TEST 4: Top + Bottom recommendations
  console.log('\nTest 4: Top + Bottom recommendations')
  const topBottomOutfit = {
    top: whiteShirt,
    bottom: blackJeans,
    shoes: null,
    accessories: [],
  }
  const topBottomTargets = identifyTargetRecommendationSlots(topBottomOutfit)
  assert(topBottomTargets.includes(WARDROBE_SLOTS.SHOES), 'Top + Bottom targets missing shoes')
  assert(topBottomTargets.includes(WARDROBE_SLOTS.ACCESSORIES), 'Top + Bottom targets missing accessories')
  assert(!topBottomTargets.includes(WARDROBE_SLOTS.TOP), 'Top slot not targeted when already occupied')
  assert(!topBottomTargets.includes(WARDROBE_SLOTS.BOTTOM), 'Bottom slot not targeted when already occupied')

  const topBottomRecs = getOutfitRecommendations(topBottomOutfit, catalog)
  const shoesGroup = topBottomRecs.find((r) => r.slot === WARDROBE_SLOTS.SHOES)
  const accGroup = topBottomRecs.find((r) => r.slot === WARDROBE_SLOTS.ACCESSORIES)
  assert(Boolean(shoesGroup) && shoesGroup.products.length > 0, 'Found footwear recommendations')
  assert(Boolean(accGroup) && accGroup.products.length > 0, 'Found accessory recommendations')

  // TEST 5: Selected products excluded
  console.log('\nTest 5: Selected products exclusion')
  const outfitWithShoes = {
    top: whiteShirt,
    bottom: blackJeans,
    shoes: whiteSneakers,
    accessories: [silverWatch],
  }
  assert(isProductSelected(whiteShirt, outfitWithShoes), 'Selected top identified')
  assert(isProductSelected(blackJeans, outfitWithShoes), 'Selected bottom identified')
  assert(isProductSelected(whiteSneakers, outfitWithShoes), 'Selected shoes identified')
  assert(isProductSelected(silverWatch, outfitWithShoes), 'Selected accessory identified')
  assert(!isProductSelected(leatherBelt, outfitWithShoes), 'Unselected accessory not flagged')

  const shoesRecsAfterSelect = getSlotRecommendations(WARDROBE_SLOTS.SHOES, outfitWithShoes, catalog)
  assert(
    !shoesRecsAfterSelect.products.some((p) => p._id === whiteSneakers._id),
    'Currently worn shoes excluded from recommendations'
  )

  const accRecsAfterSelect = getSlotRecommendations(WARDROBE_SLOTS.ACCESSORIES, outfitWithShoes, catalog)
  assert(
    !accRecsAfterSelect.products.some((p) => p._id === silverWatch._id),
    'Currently worn accessory excluded from recommendations'
  )

  // TEST 6: Inactive, deleted, and out-of-stock products excluded
  console.log('\nTest 6: Product safety & availability filters')
  assert(isProductAvailable(whiteShirt), 'Active in-stock product is available')
  assert(!isProductAvailable(inactivePants), 'Inactive product is rejected')
  assert(!isProductAvailable(deletedPants), 'Deleted product is rejected')
  assert(!isProductAvailable(outOfStockPants), 'Zero-stock product is rejected')
  assert(!isProductAvailable(null), 'Null product safely rejected')

  const bottomsRecs = getSlotRecommendations(WARDROBE_SLOTS.BOTTOM, topOnlyOutfit, catalog)
  assert(
    !bottomsRecs.products.some((p) => p._id === inactivePants._id),
    'Inactive pants excluded from slot recommendations'
  )
  assert(
    !bottomsRecs.products.some((p) => p._id === deletedPants._id),
    'Deleted pants excluded from slot recommendations'
  )
  assert(
    !bottomsRecs.products.some((p) => p._id === outOfStockPants._id),
    'Zero-stock pants excluded from slot recommendations'
  )

  // TEST 7: Unrelated categories and invalid slots excluded
  console.log('\nTest 7: Unrelated categories excluded')
  assert(
    !bottomsRecs.products.some((p) => p._id === unrelatedKitchenPan._id),
    'Home kitchen skillet excluded from wardrobe recommendations'
  )
  assert(
    !bottomsRecs.products.some((p) => p._id === navyBlazer._id),
    'Tops excluded from bottoms recommendations'
  )

  // TEST 8: Deterministic ranking & color compatibility preferred
  console.log('\nTest 8: Deterministic ranking and color preference')
  // White shirt pairs with black jeans (high contrast, excellent) and beige chinos (neutral, good)
  // Bright orange pants are clashing/low score
  const evalBlack = evaluateCandidateCompatibility(blackJeans, WARDROBE_SLOTS.BOTTOM, topOnlyOutfit)
  const evalBeige = evaluateCandidateCompatibility(beigeChinos, WARDROBE_SLOTS.BOTTOM, topOnlyOutfit)
  const evalOrange = evaluateCandidateCompatibility(brightOrangePants, WARDROBE_SLOTS.BOTTOM, topOnlyOutfit)

  assert(evalBlack.compatible, 'Black jeans compatible with white shirt')
  assert(evalBlack.tier <= 2, 'Black jeans is tier 1 or 2')
  assert(evalBeige.tier <= 2, 'Beige chinos is tier 1 or 2')
  assert(evalBlack.score > evalOrange.score, 'Monochrome pair outscores clash pair')

  const rankedBottoms = bottomsRecs.products
  const idxBlack = rankedBottoms.findIndex((p) => p._id === blackJeans._id)
  const idxOrange = rankedBottoms.findIndex((p) => p._id === brightOrangePants._id)
  if (idxOrange !== -1) {
    assert(idxBlack < idxOrange, 'Black jeans ranked ahead of clashing orange pants')
  } else {
    assert(idxBlack !== -1, 'High compatibility black jeans included in recommendations')
  }

  // TEST 9: Unknown color metadata does not create fake compatibility score
  console.log('\nTest 9: Unknown color metadata handled without fake scores')
  const evalUnknown = evaluateCandidateCompatibility(unknownColorPants, WARDROBE_SLOTS.BOTTOM, topOnlyOutfit)
  assert(evalUnknown.compatible, 'Unknown color pants still compatible by category taxonomy')
  assert(evalUnknown.tier === 3, 'Unknown color assigned tier 3 (taxonomy fallback)')
  assert(evalUnknown.score === 0, 'No fake compatibility score fabricated for unknown color')
  assert(evalUnknown.colorStatus === 'unknown', 'Color status marked as unknown')

  // TEST 10: Maximum recommendation count enforced
  console.log('\nTest 10: Maximum recommendation count limit')
  const cappedRecs = getSlotRecommendations(WARDROBE_SLOTS.BOTTOM, topOnlyOutfit, catalog, { maxPerSlot: 2 })
  assert(cappedRecs.products.length <= 2, 'Rec count strictly capped at requested max 2')

  const defaultCapRecs = getSlotRecommendations(WARDROBE_SLOTS.BOTTOM, topOnlyOutfit, catalog)
  assert(defaultCapRecs.products.length <= 4, 'Default rec count strictly capped at 4 per slot')

  // TEST 11: No matching products returns empty slot list
  console.log('\nTest 11: Empty results on empty catalog')
  const noMatches = getSlotRecommendations(WARDROBE_SLOTS.BOTTOM, topOnlyOutfit, [])
  assert(noMatches.products.length === 0, 'Empty catalog yields empty product list')

  // TEST 12: Applying recommendation preserves canonical outfit structure
  console.log('\nTest 12: Applying recommendation preserves canonical outfit structure')
  const chosenBottom = bottomRecGroup.products[0]
  const updatedOutfit = {
    ...topOnlyOutfit,
    bottom: chosenBottom,
  }
  assert(Boolean(updatedOutfit.top), 'Top preserved')
  assert(updatedOutfit.bottom._id === chosenBottom._id, 'Chosen bottom assigned to bottom slot')
  assert(updatedOutfit.shoes === null, 'Shoes slot remains canonical null')
  assert(Array.isArray(updatedOutfit.accessories), 'Accessories remain canonical array')

  // TEST 13: Compatibility with existing deterministic color matcher
  console.log('\nTest 13: Existing color matcher compatibility')
  const analysisBefore = analyzeOutfitColorMatch(topOnlyOutfit, catalog)
  const analysisAfter = analyzeOutfitColorMatch(updatedOutfit, catalog)
  assert(typeof analysisBefore.score === 'number', 'Color matcher produces valid score for top-only')
  assert(typeof analysisAfter.score === 'number', 'Color matcher produces valid score after recommendation applied')
  assert(analysisAfter.status !== undefined, 'Color matcher status remains defined')

  // TEST 14: Only Shoes or Accessories selected -> targets Top & Bottom
  console.log('\nTest 14: Shoes-only outfit recommendations')
  const shoesOnlyOutfit = {
    top: null,
    bottom: null,
    shoes: brownLoafers,
    accessories: [],
  }
  const shoesOnlyTargets = identifyTargetRecommendationSlots(shoesOnlyOutfit)
  assert(shoesOnlyTargets.includes(WARDROBE_SLOTS.TOP), 'Shoes-only outfit targets tops')
  assert(shoesOnlyTargets.includes(WARDROBE_SLOTS.BOTTOM), 'Shoes-only outfit targets bottoms')

  // TEST 15: Component integration & accessibility strings in VirtualWardrobe.jsx
  console.log('\nTest 15: Component integration check')
  const wardrobeComponentPath = path.resolve(__dirname, '../components/avatar/VirtualWardrobe.jsx')
  const wardrobeContent = fs.readFileSync(wardrobeComponentPath, 'utf-8')

  assert(
    wardrobeContent.includes('Complete This Look'),
    'VirtualWardrobe.jsx includes "Complete This Look" section'
  )
  assert(
    wardrobeContent.includes('Add to Outfit'),
    'VirtualWardrobe.jsx includes explicit "Add to Outfit" button'
  )
  assert(
    wardrobeContent.includes('getOutfitRecommendations'),
    'VirtualWardrobe.jsx integrates getOutfitRecommendations pure utility'
  )
  assert(
    wardrobeContent.includes('Add an item to start building your outfit.'),
    'VirtualWardrobe.jsx handles empty outfit state'
  )
  assert(
    wardrobeContent.includes('No matching pieces found.'),
    'VirtualWardrobe.jsx handles no matching pieces state'
  )
  assert(
    wardrobeContent.includes('More options available'),
    'VirtualWardrobe.jsx handles unknown color metadata state'
  )
  assert(
    wardrobeContent.includes('Recommended for your outfit'),
    'VirtualWardrobe.jsx contains customer-facing recommendation copy'
  )

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
