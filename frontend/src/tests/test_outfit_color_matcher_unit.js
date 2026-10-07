/**
 * Automated Verification Suite for TrendVolt Phase 4C:
 * Deterministic Color & Style Matching Engine
 *
 * Verifies:
 * 1. Classic & Neutral Pairings (white + black, white + navy)
 * 2. Earth Tone Combinations (olive + beige, olive + brown)
 * 3. Tonal Harmony (navy + blue, cream + beige)
 * 4. High-Friction Clashing Colors (red + orange, green + yellow)
 * 5. Unknown & Missing Color Safety
 * 6. Incomplete Outfit State Handling (only top, only bottom)
 * 7. Full Outfit Analysis (Top + Bottom + Shoes)
 * 8. Accessories Resilience (Never overrides primary match)
 * 9. Absolute Determinism (Same input → same output)
 * 10. Strict Score Clamping [0, 100]
 * 11. Suggestion Generation using ONLY Available Products
 * 12. Immutability (Zero automatic mutation of outfit state)
 * 13. Component Architecture & UI Integration (OutfitMatchPanel, VirtualWardrobe, AvatarWardrobePage)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  evaluateColorPair,
  analyzeOutfitColorMatch,
  extractProductColor,
  normalizeColorName,
  CANONICAL_COLOR_GROUPS,
  MATCH_THRESHOLDS,
} from '../utils/outfitColorMatcher.js'

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
  console.log('\n=== TEST SUITE: TRENDVOLT PHASE 4C DETERMINISTIC COLOR & STYLE MATCHING ===\n')

  // =========================================================================
  // 0. CANONICAL CONSTANTS & NORMALIZATION
  // =========================================================================
  console.log('[0] Canonical Constants & Normalization:')
  assert(Object.keys(CANONICAL_COLOR_GROUPS).length === 9, 'CANONICAL_COLOR_GROUPS defines 9 color groups')
  assert(MATCH_THRESHOLDS.EXCELLENT.min === 90, 'MATCH_THRESHOLDS defines EXCELLENT threshold at 90')
  assert(MATCH_THRESHOLDS.STRONG.min === 75, 'MATCH_THRESHOLDS defines STRONG threshold at 75')
  assert(MATCH_THRESHOLDS.GOOD.min === 60, 'MATCH_THRESHOLDS defines GOOD threshold at 60')
  assert(normalizeColorName('navy blue') === 'navy', 'normalizeColorName normalizes "navy blue" to "navy"')
  assert(normalizeColorName('offwhite') === 'off-white', 'normalizeColorName normalizes "offwhite" to "off-white"')
  assert(extractProductColor({ color: 'olive' }) === 'olive', 'extractProductColor extracts direct color property')
  assert(extractProductColor({ name: 'Premium Oxford White Shirt' }) === 'white', 'extractProductColor detects color token in name')

  // =========================================================================
  // 1. CLASSIC & NEUTRAL PAIRINGS
  // =========================================================================
  console.log('\n[1] Classic & Neutral Pairings:')

  // white + black -> Excellent Match (>= 90)
  const whiteBlack = evaluateColorPair('white', 'black')
  assert(whiteBlack.status === 'excellent', 'white + black produces status "excellent"')
  assert(whiteBlack.score >= 90, `white + black score is >= 90 (received ${whiteBlack.score})`)
  assert(whiteBlack.explanation.toLowerCase().includes('contrast') || whiteBlack.explanation.toLowerCase().includes('timeless'), 'white + black provides explanatory narrative')

  // white + navy -> Excellent/Strong Match (>= 75)
  const whiteNavy = evaluateColorPair('white', 'navy')
  assert(whiteNavy.status === 'excellent' || whiteNavy.status === 'strong', 'white + navy produces "excellent" or "strong"')
  assert(whiteNavy.score >= 85, `white + navy score is >= 85 (received ${whiteNavy.score})`)

  // =========================================================================
  // 2. EARTH TONE COMBINATIONS
  // =========================================================================
  console.log('\n[2] Earth Tone Combinations:')

  // olive + beige -> Strong Match
  const oliveBeige = evaluateColorPair('olive', 'beige')
  assert(oliveBeige.status === 'strong', 'olive + beige produces status "strong"')
  assert(oliveBeige.score >= 75 && oliveBeige.score < 90, `olive + beige score is in strong tier (received ${oliveBeige.score})`)

  // olive + brown -> Strong Match
  const oliveBrown = evaluateColorPair('olive', 'brown')
  assert(oliveBrown.status === 'strong', 'olive + brown produces status "strong"')
  assert(oliveBrown.score >= 75 && oliveBrown.score < 90, `olive + brown score is in strong tier (received ${oliveBrown.score})`)

  // =========================================================================
  // 3. TONAL HARMONY
  // =========================================================================
  console.log('\n[3] Tonal Harmony:')

  // navy + blue -> Tonal Strong/Good Match
  const navyBlue = evaluateColorPair('navy', 'blue')
  assert(navyBlue.status === 'strong' || navyBlue.status === 'good', 'navy + blue produces tonal "strong" or "good"')
  assert(navyBlue.score >= 60, `navy + blue score is >= 60 (received ${navyBlue.score})`)
  assert(navyBlue.explanation.toLowerCase().includes('tonal') || navyBlue.explanation.toLowerCase().includes('family'), 'navy + blue explains tonal relationship')

  // cream + beige -> Neutral/Tonal Compatibility
  const creamBeige = evaluateColorPair('cream', 'beige')
  assert(creamBeige.status === 'excellent' || creamBeige.status === 'strong', 'cream + beige produces compatible "excellent" or "strong"')
  assert(creamBeige.score >= 75, `cream + beige score is >= 75 (received ${creamBeige.score})`)

  // =========================================================================
  // 4. HIGH-FRICTION CLASHING COMBINATIONS
  // =========================================================================
  console.log('\n[4] High-Friction Saturated Combinations:')

  // bright red + bright orange -> Needs Contrast
  const redOrange = evaluateColorPair('red', 'orange')
  assert(redOrange.status === 'contrast', 'red + orange produces status "contrast"')
  assert(redOrange.score < 60, `red + orange score is < 60 (received ${redOrange.score})`)
  assert(!redOrange.explanation.toLowerCase().includes('bad') && !redOrange.explanation.toLowerCase().includes('ugly'), 'red + orange explanation is constructive, non-judgmental')

  // green + yellow -> Needs Contrast
  const greenYellow = evaluateColorPair('green', 'yellow')
  assert(greenYellow.status === 'contrast', 'green + yellow produces status "contrast"')
  assert(greenYellow.score < 60, `green + yellow score is < 60 (received ${greenYellow.score})`)

  // =========================================================================
  // 5. UNKNOWN & MISSING COLOR SAFETY
  // =========================================================================
  console.log('\n[5] Unknown & Missing Color Safety:')

  const nullColorPair = evaluateColorPair(null, 'white')
  assert(nullColorPair.status === 'incomplete', 'evaluateColorPair with null color produces status "incomplete"')
  assert(nullColorPair.explanation.includes("Color information isn't available"), 'Explains color information is not available')

  const unknownProduct1 = { _id: 'u-1', name: 'Patterned Mystery Shirt' }
  const unknownProduct2 = { _id: 'u-2', name: 'Textured Casual Trousers' }
  const missingColorAnalysis = analyzeOutfitColorMatch({ top: unknownProduct1, bottom: unknownProduct2 })
  assert(missingColorAnalysis.status === 'incomplete', 'analyzeOutfitColorMatch with unknown colors returns "incomplete"')
  assert(
    missingColorAnalysis.label === 'Color Unknown' || missingColorAnalysis.label === 'Not enough color information',
    'Label indicates color information is unavailable'
  )

  // =========================================================================
  // 6. INCOMPLETE OUTFIT STATE HANDLING
  // =========================================================================
  console.log('\n[6] Incomplete Outfit State Handling:')

  const emptyAnalysis = analyzeOutfitColorMatch({})
  assert(emptyAnalysis.status === 'incomplete', 'Empty outfit returns status "incomplete"')
  assert(emptyAnalysis.label === 'Outfit Incomplete', 'Label is "Outfit Incomplete"')

  const topOnlyAnalysis = analyzeOutfitColorMatch({
    top: { _id: 'top-1', name: 'White Oxford Shirt', color: 'white' },
  })
  assert(topOnlyAnalysis.status === 'incomplete', 'Only top selected returns "incomplete"')
  assert(topOnlyAnalysis.label === 'Add a Bottom', 'Only top selected label is "Add a Bottom"')
  assert(topOnlyAnalysis.explanation.includes('Add trousers or jeans') || topOnlyAnalysis.explanation.includes('Add a bottom'), 'Guides user to select a bottom')

  const bottomOnlyAnalysis = analyzeOutfitColorMatch({
    bottom: { _id: 'bot-1', name: 'Navy Chinos', color: 'navy' },
  })
  assert(bottomOnlyAnalysis.status === 'incomplete', 'Only bottom selected returns "incomplete"')
  assert(bottomOnlyAnalysis.label === 'Add a Top', 'Only bottom selected label is "Add a Top"')

  // =========================================================================
  // 7. FULL OUTFIT ANALYSIS (TOP + BOTTOM + SHOES)
  // =========================================================================
  console.log('\n[7] Full Outfit Analysis:')

  const fullOutfit = {
    top: { _id: 't-1', name: 'Crisp White Linen Shirt', color: 'white' },
    bottom: { _id: 'b-1', name: 'Tailored Black Trousers', color: 'black' },
    shoes: { _id: 's-1', name: 'Black Minimalist Leather Sneakers', color: 'black' },
  }

  const fullAnalysis = analyzeOutfitColorMatch(fullOutfit)
  assert(fullAnalysis.status === 'excellent', 'White top + black bottom + black shoes produces "excellent"')
  assert(fullAnalysis.score >= 90, `Full outfit score is >= 90 (received ${fullAnalysis.score})`)
  assert(Array.isArray(fullAnalysis.pairings) && fullAnalysis.pairings.length === 3, 'Pairings array contains top-bottom, top-shoes, and bottom-shoes')

  // =========================================================================
  // 8. ACCESSORIES RESILIENCE
  // =========================================================================
  console.log('\n[8] Accessories Resilience:')

  const outfitWithAccessory = {
    ...fullOutfit,
    accessories: [
      { _id: 'a-1', name: 'Stainless Steel Watch with Black Leather Strap', color: 'black' },
      { _id: 'a-2', name: 'Vibrant Orange Pocket Square', color: 'orange' },
    ],
  }

  const accessoryAnalysis = analyzeOutfitColorMatch(outfitWithAccessory)
  assert(accessoryAnalysis.status === 'excellent', 'Accessories do not downgrade an excellent outfit')
  assert(accessoryAnalysis.score >= 90, 'Score remains in top tier despite accessory')

  // =========================================================================
  // 9. ABSOLUTE DETERMINISM
  // =========================================================================
  console.log('\n[9] Determinism Invariant:')

  const run1 = analyzeOutfitColorMatch(fullOutfit)
  const run2 = analyzeOutfitColorMatch(fullOutfit)
  const run3 = analyzeOutfitColorMatch(fullOutfit)

  assert(run1.score === run2.score && run2.score === run3.score, 'Repeated executions produce identical scores')
  assert(run1.status === run2.status && run2.status === run3.status, 'Repeated executions produce identical statuses')
  assert(run1.explanation === run2.explanation, 'Repeated executions produce identical explanations')

  // =========================================================================
  // 10. STRICT SCORE CLAMPING [0, 100]
  // =========================================================================
  console.log('\n[10] Score Clamping Invariant:')

  const testCases = [
    { top: { color: 'white' }, bottom: { color: 'black' } },
    { top: { color: 'red' }, bottom: { color: 'orange' } },
    { top: { color: 'olive' }, bottom: { color: 'beige' } },
    { top: { color: 'green' }, bottom: { color: 'yellow' } },
  ]

  for (const tc of testCases) {
    const res = analyzeOutfitColorMatch(tc)
    assert(res.score >= 0 && res.score <= 100, `Score for ${tc.top.color}+${tc.bottom.color} is clamped: ${res.score}`)
  }

  // =========================================================================
  // 11. SUGGESTIONS USING ONLY AVAILABLE PRODUCTS
  // =========================================================================
  console.log('\n[11] Suggestion Generation using Available Products:')

  const catalog = [
    { _id: 'cat-b1', name: 'Beige Relaxed Chinos', color: 'beige', department: 'men', subcategory: 'trousers' },
    { _id: 'cat-b2', name: 'Dark Indigo Denim', color: 'denim', department: 'men', subcategory: 'jeans' },
    { _id: 'cat-s1', name: 'White Tennis Sneakers', color: 'white', department: 'footwear', subcategory: 'sneakers' },
  ]

  const clashingOutfit = {
    top: { _id: 't-clash', name: 'Bright Crimson Polo', color: 'red' },
    bottom: { _id: 'b-clash', name: 'Orange Chino Shorts', color: 'orange' },
  }

  const clashingAnalysis = analyzeOutfitColorMatch(clashingOutfit, catalog)
  assert(Array.isArray(clashingAnalysis.suggestions), 'Suggestions array is present')
  assert(clashingAnalysis.suggestions.length > 0, 'Generates suggestions for high-contrast outfit')

  for (const sugg of clashingAnalysis.suggestions) {
    const existsInCatalog = catalog.some((p) => p._id === sugg.productId)
    assert(existsInCatalog, `Suggestion "${sugg.productName}" exists in available catalog`)
  }

  // =========================================================================
  // 12. IMMUTABILITY (ZERO AUTOMATIC MUTATION)
  // =========================================================================
  console.log('\n[12] Immutability of Outfit State:')

  const originalTopId = clashingOutfit.top._id
  const originalBottomId = clashingOutfit.bottom._id
  analyzeOutfitColorMatch(clashingOutfit, catalog)

  assert(clashingOutfit.top._id === originalTopId, 'Top product reference is unchanged after suggestion generation')
  assert(clashingOutfit.bottom._id === originalBottomId, 'Bottom product reference is unchanged after suggestion generation')

  // =========================================================================
  // 13. COMPONENT ARCHITECTURE & UI INTEGRATION
  // =========================================================================
  console.log('\n[13] UI Component Architecture & Integration:')

  const panelPath = path.resolve(__dirname, '../components/avatar/OutfitMatchPanel.jsx')
  const wardrobePath = path.resolve(__dirname, '../components/avatar/VirtualWardrobe.jsx')
  const wardrobePagePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')

  assert(fs.existsSync(panelPath), 'OutfitMatchPanel.jsx component exists')

  const panelContent = fs.readFileSync(panelPath, 'utf8')
  assert(panelContent.includes('analysis'), 'OutfitMatchPanel accepts analysis prop')
  assert(panelContent.includes('onApplySuggestion'), 'OutfitMatchPanel accepts onApplySuggestion callback')
  assert(panelContent.includes('Palette Harmony'), 'OutfitMatchPanel renders Palette Harmony heading')
  assert(panelContent.includes('Suggested Alternates'), 'OutfitMatchPanel renders Suggested Alternates section')

  const wardrobeContent = fs.readFileSync(wardrobePath, 'utf8')
  assert(wardrobeContent.includes('OutfitMatchPanel'), 'VirtualWardrobe imports and renders OutfitMatchPanel')
  assert(wardrobeContent.includes('analyzeOutfitColorMatch'), 'VirtualWardrobe calls analyzeOutfitColorMatch')

  const wardrobePageContent = fs.readFileSync(wardrobePagePath, 'utf8')
  assert(wardrobePageContent.includes('Palette Harmony'), 'AvatarWardrobePage integrates Palette Harmony status')
  assert(wardrobePageContent.includes('onAnalysisChange'), 'AvatarWardrobePage tracks onAnalysisChange from VirtualWardrobe')

  // Summary
  console.log('\n============================================================')
  console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
  if (failedCount === 0) {
    console.log('ALL PHASE 4C COLOR & STYLE MATCHING TESTS PASSED ✓')
  } else {
    console.error('SOME PHASE 4C COLOR & STYLE MATCHING TESTS FAILED ✗')
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
