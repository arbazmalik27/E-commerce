/**
 * TrendVolt Phase 4C — Deterministic Color & Style Matching Engine
 * 
 * Provides explainable, rule-based fashion color analysis for virtual outfits.
 * Pure, lightweight, deterministic, and independent of external AI/ML services.
 */

// Canonical Color Groups
export const CANONICAL_COLOR_GROUPS = {
  NEUTRALS: ['white', 'off-white', 'cream', 'beige', 'grey', 'charcoal', 'black'],
  BLUES: ['light-blue', 'blue', 'navy', 'denim'],
  GREENS: ['olive', 'sage', 'forest', 'green'],
  REDS: ['red', 'burgundy', 'maroon'],
  BROWNS: ['tan', 'camel', 'brown', 'chocolate'],
  YELLOWS: ['yellow', 'mustard'],
  ORANGES: ['orange', 'rust', 'terracotta'],
  PINKS: ['pink', 'blush'],
  PURPLES: ['purple', 'lavender'],
}

export const EARTH_TONES = [
  'olive',
  'sage',
  'forest',
  'tan',
  'camel',
  'brown',
  'chocolate',
  'rust',
  'terracotta',
  'beige',
  'cream',
]

export const MATCH_THRESHOLDS = {
  EXCELLENT: { min: 90, status: 'excellent', label: 'Great combination' },
  STRONG: { min: 75, status: 'strong', label: 'Strong match' },
  GOOD: { min: 60, status: 'good', label: 'Good combination' },
  CONTRAST: { min: 0, status: 'contrast', label: 'Try adding more contrast' },
}

// Color synonym dictionary for deterministic normalization
const COLOR_SYNONYMS = {
  'off-white': ['off-white', 'offwhite', 'ivory', 'ecru', 'eggshell'],
  'cream': ['cream', 'vanilla'],
  'white': ['white', 'snow'],
  'black': ['black', 'noir', 'jet-black', 'pitch'],
  'charcoal': ['charcoal', 'anthracite', 'dark-grey', 'dark-gray'],
  'grey': ['grey', 'gray', 'heather-grey', 'slate', 'ash'],
  'beige': ['beige', 'khaki', 'sand', 'stone', 'taupe', 'oatmeal'],
  'denim': ['denim', 'indigo', 'jean', 'raw-denim', 'washed-denim'],
  'navy': ['navy', 'midnight', 'dark-blue', 'navy-blue'],
  'light-blue': ['light-blue', 'light blue', 'sky-blue', 'sky blue', 'powder-blue', 'baby-blue'],
  'blue': ['blue', 'royal-blue', 'cobalt', 'azure'],
  'olive': ['olive', 'army-green', 'military-green', 'olive-green'],
  'sage': ['sage', 'sage-green'],
  'forest': ['forest', 'forest-green', 'emerald', 'dark-green', 'pine'],
  'green': ['green'],
  'burgundy': ['burgundy', 'wine', 'bordeaux', 'oxblood'],
  'maroon': ['maroon'],
  'red': ['red', 'crimson', 'scarlet'],
  'tan': ['tan'],
  'camel': ['camel'],
  'chocolate': ['chocolate', 'dark-brown', 'espresso'],
  'brown': ['brown'],
  'mustard': ['mustard', 'ochre'],
  'yellow': ['yellow', 'canary'],
  'rust': ['rust', 'burnt-orange', 'copper'],
  'terracotta': ['terracotta', 'terra-cotta'],
  'orange': ['orange', 'tangerine'],
  'blush': ['blush'],
  'pink': ['pink', 'rose', 'fuchsia'],
  'lavender': ['lavender', 'lilac'],
  'purple': ['purple', 'violet', 'plum'],
}

/**
 * Normalizes a raw color string into a canonical color name.
 * @param {string|null} rawColor
 * @returns {string|null}
 */
export function normalizeColorName(rawColor) {
  if (!rawColor || typeof rawColor !== 'string') return null
  const cleaned = rawColor.toLowerCase().trim().replace(/_/g, '-')

  for (const [canonical, aliases] of Object.entries(COLOR_SYNONYMS)) {
    if (cleaned === canonical || aliases.includes(cleaned)) {
      return canonical
    }
  }

  // Substring match for compound phrases like "navy blue"
  for (const [canonical, aliases] of Object.entries(COLOR_SYNONYMS)) {
    for (const alias of aliases) {
      if (cleaned.includes(alias)) {
        return canonical
      }
    }
  }

  return null
}

/**
 * Deterministically extracts the canonical color from a Product object.
 * Strictly uses explicit metadata or explicit title tokens; never guesses or samples images.
 * @param {Object|null} product
 * @returns {string|null}
 */
export function extractProductColor(product) {
  if (!product) return null

  // 1. Direct color attribute
  const directColor =
    product.color ||
    product.colour ||
    (Array.isArray(product.colors) && product.colors[0])

  if (typeof directColor === 'string' && directColor.trim().length > 0) {
    const norm = normalizeColorName(directColor)
    if (norm) return norm
  }

  // 2. Custom attributes or metadata
  if (product.attributes?.color) {
    const norm = normalizeColorName(product.attributes.color)
    if (norm) return norm
  }

  // 3. Name or tag token scanning
  const text = `${product.name || ''} ${product.tag || ''}`.toLowerCase()
  for (const [canonical, aliases] of Object.entries(COLOR_SYNONYMS)) {
    for (const alias of aliases) {
      // Word boundary match
      const regex = new RegExp(`\\b${alias.replace('-', '[- ]')}\\b`, 'i')
      if (regex.test(text)) {
        return canonical
      }
    }
  }

  return null
}

/**
 * Checks whether a color belongs to a specific group.
 * @param {string} color
 * @param {string[]} group
 * @returns {boolean}
 */
function isInGroup(color, group) {
  return Boolean(color && group.includes(color))
}

/**
 * Evaluates the deterministic color pairing between two canonical colors.
 * @param {string} colorA
 * @param {string} colorB
 * @returns {{ score: number, status: string, explanation: string }}
 */
export function evaluateColorPair(colorA, colorB) {
  if (!colorA || !colorB) {
    return {
      score: 0,
      status: 'incomplete',
      explanation: "Color information isn't available for this item yet.",
    }
  }

  const isNeutralA = isInGroup(colorA, CANONICAL_COLOR_GROUPS.NEUTRALS)
  const isNeutralB = isInGroup(colorB, CANONICAL_COLOR_GROUPS.NEUTRALS)
  const isEarthA = isInGroup(colorA, EARTH_TONES)
  const isEarthB = isInGroup(colorB, EARTH_TONES)

  // 1. Identical / Monochromatic
  if (colorA === colorB) {
    if (isNeutralA) {
      return {
        score: 95,
        status: 'excellent',
        explanation: `${capitalize(colorA)} on ${colorB} creates a refined monochromatic look.`,
      }
    }
    return {
      score: 80,
      status: 'strong',
      explanation: `Matching tonal ${colorA} creates a coordinated statement outfit.`,
    }
  }

  // 2. Classic High-Contrast & Dark Pairings (White/Black, White/Navy, Navy/Beige, etc.)
  const pairKey = [colorA, colorB].sort().join('+')

  const CLASSIC_EXCELLENT_PAIRS = [
    'black+white',
    'navy+white',
    'grey+white',
    'charcoal+white',
    'black+cream',
    'beige+brown',
    'cream+navy',
    'denim+white',
  ]
  if (CLASSIC_EXCELLENT_PAIRS.includes(pairKey)) {
    return {
      score: 95,
      status: 'excellent',
      explanation: `${capitalize(colorA)} and ${colorB} form a timeless, high-contrast pairing.`,
    }
  }

  // 3. Neutral + Neutral
  if (isNeutralA && isNeutralB) {
    return {
      score: 90,
      status: 'excellent',
      explanation: `${capitalize(colorA)} and ${colorB} blend cleanly with neutral harmony.`,
    }
  }

  // 4. Earth Tone Combinations
  if (isEarthA && isEarthB) {
    return {
      score: 88,
      status: 'strong',
      explanation: `${capitalize(colorA)} and ${colorB} pair naturally with balanced organic warmth.`,
    }
  }

  // 5. Classic Neutral + Color
  if (isNeutralA || isNeutralB) {
    const accent = isNeutralA ? colorB : colorA
    const neutral = isNeutralA ? colorA : colorB
    return {
      score: 85,
      status: 'strong',
      explanation: `${capitalize(accent)} is grounded effectively by the neutral ${neutral} base.`,
    }
  }

  // 6. Tonal Harmony (Same Color Family: e.g. blue + navy, olive + sage)
  for (const group of Object.values(CANONICAL_COLOR_GROUPS)) {
    if (group.includes(colorA) && group.includes(colorB)) {
      return {
        score: 82,
        status: 'strong',
        explanation: `${capitalize(colorA)} and ${colorB} share the same color family for clean tonal depth.`,
      }
    }
  }

  // 7. Potential Saturated Clashes
  const CLASH_PAIRS = [
    'orange+red',
    'green+yellow',
    'orange+purple',
    'purple+red',
    'orange+pink',
    'mustard+red',
  ]
  if (CLASH_PAIRS.includes(pairKey)) {
    return {
      score: 52,
      status: 'contrast',
      explanation: `${capitalize(colorA)} and ${colorB} feature competing saturated tones that produce high visual friction.`,
    }
  }

  // 8. Balanced Versatile Pairings (e.g. blue + tan, burgundy + olive)
  const BALANCED_STRONG_PAIRS = [
    'blue+tan',
    'brown+navy',
    'denim+tan',
    'burgundy+navy',
    'navy+terracotta',
    'navy+rust',
    'olive+tan',
    'denim+olive',
  ]
  if (BALANCED_STRONG_PAIRS.includes(pairKey)) {
    return {
      score: 84,
      status: 'strong',
      explanation: `${capitalize(colorA)} and ${colorB} create an intentional, rich complementary balance.`,
    }
  }

  // 9. Standard Default Pairing
  return {
    score: 70,
    status: 'good',
    explanation: `${capitalize(colorA)} and ${colorB} provide a wearable everyday combination.`,
  }
}

/**
 * Computes deterministic suggestions to elevate an outfit using available products.
 * @param {Object} outfit - { top, bottom, shoes, accessories }
 * @param {Array} availableProducts - Real products loaded in the catalog
 * @param {Object} primaryEvaluation - Outcome of top + bottom analysis
 * @returns {Array<{ slot: string, productId: string, productName: string, reason: string }>}
 */
function generateOutfitSuggestions(outfit, availableProducts, primaryEvaluation) {
  if (!Array.isArray(availableProducts) || availableProducts.length === 0) {
    return []
  }

  const suggestions = []
  const topColor = extractProductColor(outfit.top)
  const bottomColor = extractProductColor(outfit.bottom)

  // 1. If outfit has high friction ('contrast'), suggest a grounding bottom
  if (primaryEvaluation.status === 'contrast' && outfit.top) {
    const candidateBottom = availableProducts.find((p) => {
      if (p._id === outfit.bottom?._id) return false
      const pColor = extractProductColor(p)
      if (!pColor) return false
      const pair = evaluateColorPair(topColor, pColor)
      return pair.score >= 85
    })

    if (candidateBottom) {
      const candidateColor = extractProductColor(candidateBottom)
      suggestions.push({
        slot: 'bottom',
        productId: candidateBottom._id,
        productName: candidateBottom.name,
        reason: `Swap with ${candidateColor} to ground the vibrant top with a versatile neutral base.`,
      })
    }
  }

  // 2. If Earth Tone outfit, suggest complementary footwear if missing or contrast
  if (topColor && bottomColor && primaryEvaluation.score >= 75) {
    if (!outfit.shoes) {
      const candidateShoes = availableProducts.find((p) => {
        const slot = p.department === 'footwear' || p.subcategory?.includes('shoes') || p.subcategory?.includes('sneakers')
        if (!slot) return false
        const pColor = extractProductColor(p)
        if (!pColor) return false
        const pairTop = evaluateColorPair(topColor, pColor)
        const pairBottom = evaluateColorPair(bottomColor, pColor)
        return pairTop.score >= 75 && pairBottom.score >= 75
      })

      if (candidateShoes) {
        const shoeColor = extractProductColor(candidateShoes)
        suggestions.push({
          slot: 'shoes',
          productId: candidateShoes._id,
          productName: candidateShoes.name,
          reason: `Add ${shoeColor} footwear to anchor the outfit palette with effortless balance.`,
        })
      }
    }
  }

  // 3. Alternative bottom recommendation for tonal variety
  if (primaryEvaluation.status === 'good' && outfit.top && suggestions.length === 0) {
    const candidateBottom = availableProducts.find((p) => {
      if (p._id === outfit.bottom?._id) return false
      const pColor = extractProductColor(p)
      if (!pColor) return false
      const pair = evaluateColorPair(topColor, pColor)
      return pair.score >= 90
    })

    if (candidateBottom) {
      const bColor = extractProductColor(candidateBottom)
      suggestions.push({
        slot: 'bottom',
        productId: candidateBottom._id,
        productName: candidateBottom.name,
        reason: `Try ${bColor} trousers for a higher-contrast, sharper silhouette.`,
      })
    }
  }

  return suggestions.slice(0, 2)
}

/**
 * Analyzes a full virtual outfit deterministically.
 * 
 * @param {Object} outfit - { top: Product|null, bottom: Product|null, shoes: Product|null, accessories: Product[] }
 * @param {Array} [availableProducts=[]] - Real products in catalog for contextual suggestions
 * @returns {Object} Comprehensive match analysis contract
 */
export function analyzeOutfitColorMatch(outfit = {}, availableProducts = []) {
  const { top = null, bottom = null, shoes = null, accessories = [] } = outfit

  // 1. Incomplete state handling
  if (!top && !bottom) {
    return {
      status: 'incomplete',
      score: 0,
      label: 'Outfit Incomplete',
      explanation: 'Select pieces from your wardrobe to evaluate palette harmony.',
      pairings: [],
      suggestions: [],
    }
  }

  if (top && !bottom) {
    const topColor = extractProductColor(top)
    return {
      status: 'incomplete',
      score: 0,
      label: 'Add a Bottom',
      explanation: topColor
        ? `You have selected a ${topColor} top. Add trousers or jeans to evaluate the main outfit combination.`
        : 'Add a bottom to check the main outfit combination.',
      pairings: [],
      suggestions: [],
    }
  }

  if (!top && bottom) {
    const bottomColor = extractProductColor(bottom)
    return {
      status: 'incomplete',
      score: 0,
      label: 'Add a Top',
      explanation: bottomColor
        ? `You have selected ${bottomColor} bottoms. Add a top piece to check the main outfit combination.`
        : 'Add a top to check the main outfit combination.',
      pairings: [],
      suggestions: [],
    }
  }

  // 2. Both Top & Bottom present
  const topColor = extractProductColor(top)
  const bottomColor = extractProductColor(bottom)

  // Missing color metadata check
  if (!topColor || !bottomColor) {
    const missingItems = []
    if (!topColor) missingItems.push(top.name)
    if (!bottomColor) missingItems.push(bottom.name)

    return {
      status: 'incomplete',
      score: 0,
      label: 'Not enough color information',
      explanation: `Color metadata is not yet cataloged for ${missingItems.join(' & ')}. You can still style them freely.`,
      pairings: [
        {
          firstSlot: 'top',
          secondSlot: 'bottom',
          status: 'incomplete',
          explanation: "Color information isn't available for this item yet.",
        },
      ],
      suggestions: [],
    }
  }

  // Evaluate Primary Pair: Top ↔ Bottom
  const primaryPair = evaluateColorPair(topColor, bottomColor)
  const pairings = [
    {
      firstSlot: 'top',
      secondSlot: 'bottom',
      status: primaryPair.status,
      explanation: primaryPair.explanation,
    },
  ]

  let totalScore = primaryPair.score

  // 3. Secondary Pairings: Shoes
  const shoesColor = extractProductColor(shoes)
  if (shoes && shoesColor) {
    const topShoes = evaluateColorPair(topColor, shoesColor)
    const bottomShoes = evaluateColorPair(bottomColor, shoesColor)

    pairings.push({
      firstSlot: 'top',
      secondSlot: 'shoes',
      status: topShoes.status,
      explanation: topShoes.explanation,
    })
    pairings.push({
      firstSlot: 'bottom',
      secondSlot: 'shoes',
      status: bottomShoes.status,
      explanation: bottomShoes.explanation,
    })

    // Weighted blend: 60% Top+Bottom, 20% Top+Shoes, 20% Bottom+Shoes
    totalScore = primaryPair.score * 0.6 + topShoes.score * 0.2 + bottomShoes.score * 0.2
  }

  // 4. Supporting Elements: Accessories (Small contextual nudge, never destroys outfit)
  if (Array.isArray(accessories) && accessories.length > 0) {
    let accessoryModifier = 0
    accessories.forEach((acc) => {
      const accColor = extractProductColor(acc)
      if (accColor) {
        const matchWithTop = evaluateColorPair(topColor, accColor)
        if (matchWithTop.score >= 85) accessoryModifier += 2
        else if (matchWithTop.status === 'contrast') accessoryModifier -= 2
      }
    })
    totalScore += Math.max(-4, Math.min(4, accessoryModifier))
  }

  // 5. Final Deterministic Clamping
  const finalScore = Math.max(0, Math.min(100, Math.round(totalScore)))

  // Classify score against strict constants thresholds
  let classification = MATCH_THRESHOLDS.CONTRAST
  if (finalScore >= MATCH_THRESHOLDS.EXCELLENT.min) {
    classification = MATCH_THRESHOLDS.EXCELLENT
  } else if (finalScore >= MATCH_THRESHOLDS.STRONG.min) {
    classification = MATCH_THRESHOLDS.STRONG
  } else if (finalScore >= MATCH_THRESHOLDS.GOOD.min) {
    classification = MATCH_THRESHOLDS.GOOD
  }

  // Contextual suggestions generated from real products
  const suggestions = generateOutfitSuggestions(outfit, availableProducts, primaryPair)

  return {
    status: classification.status,
    score: finalScore,
    label: classification.label,
    explanation: primaryPair.explanation,
    pairings,
    suggestions,
  }
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
