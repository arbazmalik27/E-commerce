/**
 * TrendVolt Phase 3B — Client-Side Photo-Assisted Personalization Engine
 *
 * PRIVACY RULES & BOUNDARIES:
 * - 100% Client-Side browser memory processing.
 * - ZERO upload to backend or external APIs.
 * - ZERO persistence to disk or persistent browser caches.
 * - ZERO raw facial landmark or embedding generation/storage.
 * - Manual tape measurements remain authoritative for apparel sizing.
 * - Photo analysis only suggests approximate visual styling and proportions.
 * - Stylized suggestions are reviewable and editable before user application.
 */

import {
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  clampWeight,
} from '../constants/avatarStudioConstants.js'

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MIN_IMAGE_DIMENSION = 100 // 100 px
export const MAX_IMAGE_DIMENSION = 4096 // 4096 px

/**
 * Validates photo file MIME type and size.
 * @param {File} file
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validatePhotoFile(file) {
  if (!file) {
    return { isValid: false, error: 'No image file was provided.' }
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Unsupported file format. Please upload a JPEG, PNG, or WebP photo.',
    }
  }

  if (file.size <= 0) {
    return {
      isValid: false,
      error: 'The selected file is empty. Please select a valid photo.',
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'File size exceeds the 10 MB limit. Please select a smaller photo.',
    }
  }

  return { isValid: true }
}

/**
 * Validates image pixel dimensions.
 * @param {number} width
 * @param {number} height
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validatePhotoDimensions(width, height) {
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
    return {
      isValid: false,
      error: 'Unable to determine image dimensions.',
    }
  }

  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    return {
      isValid: false,
      error: `Image resolution is too low (${width}×${height}px). Minimum required is ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px for approximate visual guidance.`,
    }
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    return {
      isValid: false,
      error: `Image resolution exceeds maximum supported dimensions (${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}px).`,
    }
  }

  return { isValid: true }
}

/**
 * Convert hex color string (#RRGGBB) to { r, g, b } object.
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return { r: 128, g: 128, b: 128 }
  const cleanHex = hex.replace('#', '')
  if (cleanHex.length !== 6) return { r: 128, g: 128, b: 128 }
  return {
    r: Number.parseInt(cleanHex.substring(0, 2), 16) || 0,
    g: Number.parseInt(cleanHex.substring(2, 4), 16) || 0,
    b: Number.parseInt(cleanHex.substring(4, 6), 16) || 0,
  }
}

/**
 * Euclidean distance in RGB color space.
 */
export function colorDistance(rgb1, rgb2) {
  const dr = rgb1.r - rgb2.r
  const dg = rgb1.g - rgb2.g
  const db = rgb1.b - rgb2.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * Find the closest color item in a curated palette.
 * @param {{ r: number, g: number, b: number }} targetRgb
 * @param {Array<{ id: string, hex: string, label?: string }>} palette
 */
export function findClosestPaletteColor(targetRgb, palette) {
  if (!palette || palette.length === 0) return null

  let closestItem = palette[0]
  let minDistance = Number.POSITIVE_INFINITY

  for (const item of palette) {
    const itemRgb = hexToRgb(item.hex)
    const dist = colorDistance(targetRgb, itemRgb)
    if (dist < minDistance) {
      minDistance = dist
      closestItem = item
    }
  }

  return closestItem
}

/**
 * Analyzes pixel regions from an in-memory 2D canvas context.
 * Strictly temporary in-browser calculation.
 */
export function sampleImageRegions(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  const getRegionAverage = (startXRatio, endXRatio, startYRatio, endYRatio, filterFn) => {
    let rSum = 0
    let gSum = 0
    let bSum = 0
    let count = 0

    const x0 = Math.floor(width * startXRatio)
    const x1 = Math.floor(width * endXRatio)
    const y0 = Math.floor(height * startYRatio)
    const y1 = Math.floor(height * endYRatio)

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const a = data[idx + 3]

        if (a > 200) {
          if (!filterFn || filterFn(r, g, b)) {
            rSum += r
            gSum += g
            bSum += b
            count++
          }
        }
      }
    }

    if (count === 0) return { r: 180, g: 150, b: 130 }
    return {
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count),
    }
  }

  // 1. Skin Sampling: Center of image (approx face area)
  // Filters out extreme highlights and deep shadows
  const skinRgb = getRegionAverage(0.35, 0.65, 0.35, 0.62, (r, g, b) => {
    const total = r + g + b
    return total > 90 && total < 720
  })

  // 2. Hair Sampling: Upper crown region
  const hairRgb = getRegionAverage(0.25, 0.75, 0.06, 0.26, (r, g, b) => {
    const total = r + g + b
    return total > 50 && total < 700
  })

  // 3. Eye Sampling: Mid-upper facial band
  const eyeRgb = getRegionAverage(0.32, 0.68, 0.33, 0.44, (r, g, b) => {
    const total = r + g + b
    return total > 40 && total < 680
  })

  // Compute contrast & luminance cues for approximate proportional variance
  const skinLuminance = (skinRgb.r * 0.299 + skinRgb.g * 0.587 + skinRgb.b * 0.114) / 255
  const hairLuminance = (hairRgb.r * 0.299 + hairRgb.g * 0.587 + hairRgb.b * 0.114) / 255
  const contrastRatio = Math.abs(skinLuminance - hairLuminance)

  return {
    skinRgb,
    hairRgb,
    eyeRgb,
    contrastRatio,
    aspectRatio: width / height,
  }
}

/**
 * Generates the normalized client-side personalization suggestions object.
 *
 * @param {Object} sampleData
 * @returns {Object} Normalized suggestion structure matching Phase 3B specifications.
 */
export function generatePersonalizationSuggestions(sampleData = {}) {
  const {
    skinRgb = { r: 221, g: 176, b: 136 },
    hairRgb = { r: 43, g: 27, b: 21 },
    eyeRgb = { r: 45, g: 31, b: 23 },
    contrastRatio = 0.3,
    aspectRatio = 0.75,
  } = sampleData

  // Match closest curated tones
  const closestSkin = findClosestPaletteColor(skinRgb, SKIN_TONES) || SKIN_TONES[2]
  const closestHair = findClosestPaletteColor(hairRgb, HAIR_COLORS) || HAIR_COLORS[1]
  const closestEye = findClosestPaletteColor(eyeRgb, EYE_COLORS) || EYE_COLORS[0]

  // Approximate facial blendshapes [0.0, 1.0] derived from visual contrast & proportions
  // These are normalized frontend suggestions only.
  const faceWidth = clampWeight(0.1 + (aspectRatio > 0.8 ? 0.15 : 0.05))
  const jawWidth = clampWeight(0.08 + (contrastRatio > 0.3 ? 0.1 : 0.04))
  const chinLength = clampWeight(0.06 + (aspectRatio < 0.7 ? 0.12 : 0.04))
  const noseWidth = clampWeight(0.08 + (aspectRatio > 0.8 ? 0.08 : 0.02))
  const eyeSpacing = clampWeight(0.05)
  const cheekFullness = clampWeight(0.12 + (contrastRatio < 0.25 ? 0.1 : 0.04))
  const lipFullness = clampWeight(0.1 + (contrastRatio > 0.35 ? 0.08 : 0.02))
  const eyeSize = clampWeight(0.08 + (contrastRatio > 0.4 ? 0.06 : 0.02))

  // Approximate body proportion suggestions [0.0, 1.0]
  // Strictly visual proportions (legLength, torsoDepth).
  // Chest, waist, and hip are NEVER estimated from photo. Manual tape measurements remain authoritative.
  const legLength = clampWeight(aspectRatio < 0.7 ? 0.25 : 0.1)
  const torsoDepth = clampWeight(aspectRatio > 0.8 ? 0.2 : 0.1)

  return {
    appearance: {
      skinTone: closestSkin.hex,
      hairColor: closestHair.hex,
      eyeColor: closestEyeColorHex(closestEye, closestHair),
    },
    facialSuggestions: {
      faceWidth,
      jawWidth,
      chinLength,
      noseWidth,
      eyeSpacing,
      cheekFullness,
      lipFullness,
      eyeSize,
    },
    bodySuggestions: {
      legLength,
      torsoDepth,
    },
    confidence: {
      appearance: 'Medium (dependent on ambient lighting)',
      face: 'Approximate (stylized likeness)',
      body: 'Visual proportion suggestion only',
    },
  }
}

function closestEyeColorHex(closestEye, closestHair) {
  if (closestEye?.hex) return closestEye.hex
  // Natural fallback heuristic
  if (closestHair?.id === 'jet-black' || closestHair?.id === 'dark-mocha') {
    return '#2D1F17' // dark walnut
  }
  return '#5A4526' // warm hazel
}

/**
 * In-browser temporary image analyzer using HTML5 Canvas.
 * Keeps image in temporary memory, never uploads or persists.
 *
 * @param {HTMLImageElement|ImageBitmap} imageSource
 * @returns {Promise<Object>} Personalization suggestions
 */
export async function analyzePhotoReference(imageSource) {
  if (typeof document === 'undefined') {
    // Node.js / non-browser fallback for testing
    return generatePersonalizationSuggestions()
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable in this environment.')
  }

  // Normalize image dimensions for processing
  const TARGET_SIZE = 256
  canvas.width = TARGET_SIZE
  canvas.height = TARGET_SIZE

  ctx.drawImage(imageSource, 0, 0, TARGET_SIZE, TARGET_SIZE)

  const sampleData = sampleImageRegions(ctx, TARGET_SIZE, TARGET_SIZE)
  return generatePersonalizationSuggestions(sampleData)
}

/**
 * Safely creates an Object URL in temporary browser memory.
 * @param {File|Blob} file
 * @returns {string|null}
 */
export function createSafePreviewUrl(file) {
  if (typeof URL !== 'undefined' && URL.createObjectURL && file) {
    return URL.createObjectURL(file)
  }
  return null
}

/**
 * Safely revokes an Object URL to prevent browser memory leaks.
 * @param {string} url
 */
export function revokeSafePreviewUrl(url) {
  if (url && typeof URL !== 'undefined' && URL.revokeObjectURL && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // Ignore if already revoked
    }
  }
}
