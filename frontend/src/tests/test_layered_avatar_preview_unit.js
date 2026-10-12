/**
 * TrendVolt Virtual Avatar — 2D Layered Clothing Preview Fallback Unit Tests
 *
 * Verifies:
 * 1. Canonical 2D Canvas & Anchor Positions Specification
 * 2. Z-Index Layer Stacking Hierarchy (Base < Bottom < Shoes < Top < Accessories)
 * 3. Transparent Overlay Asset Validation (PNG, WebP, SVG accepted; JPEG/JPG rejected)
 * 4. Dedicated 2D Garment Asset Resolver & Slot Identification
 * 5. Deterministic Preview Mode Selection (3D -> 2D Fallback -> Unavailable)
 * 6. Non-fabrication & Rejection of Ordinary Catalog Photos
 * 7. Demographic 2D Base Specifications & Anatomical Proportions
 * 8. Component File Integrity & Surface Integration (TryOnPage, AvatarWardrobePage)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CANONICAL_2D_CANVAS,
  CANONICAL_2D_ANCHORS,
  SUPPORTED_2D_OVERLAY_FORMATS,
  isValid2DOverlayAsset,
  resolve2DGarmentAsset,
  determineGarmentPreviewMode,
  AVATAR_2D_BASES,
} from '../utils/layeredGarmentResolver.js'
import { isProductTryOnActive, resolveGarmentRepresentation } from '../utils/garmentAssetResolver.js'

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
  console.log('\n=== TEST SUITE: 2D LAYERED CLOTHING PREVIEW FALLBACK ===\n')

  // =========================================================================
  // TEST 1: CANONICAL 2D CANVAS SPECIFICATION
  // =========================================================================
  console.log('[1] Canonical 2D Canvas Specification:')

  assert(CANONICAL_2D_CANVAS.width === 600, 'Canvas width is 600px')
  assert(CANONICAL_2D_CANVAS.height === 800, 'Canvas height is 800px')
  assert(CANONICAL_2D_CANVAS.aspectRatio === '3/4', 'Canvas aspect ratio is 3:4 portrait')
  assert(CANONICAL_2D_CANVAS.viewBox === '0 0 600 800', 'Canvas viewBox is 0 0 600 800')

  // =========================================================================
  // TEST 2: ANCHOR POSITIONS & Z-INDEX STACKING HIERARCHY
  // =========================================================================
  console.log('\n[2] Anchor Positions & Stacking Hierarchy:')

  assert('base' in CANONICAL_2D_ANCHORS, 'Defines base anchor')
  assert('bottom' in CANONICAL_2D_ANCHORS, 'Defines bottom slot anchor')
  assert('top' in CANONICAL_2D_ANCHORS, 'Defines top slot anchor')
  assert('shoes' in CANONICAL_2D_ANCHORS, 'Defines shoes slot anchor')
  assert('accessories' in CANONICAL_2D_ANCHORS, 'Defines accessories slot anchor')

  // Z-Index ordering invariant: base < bottom < shoes < top < accessories
  const baseZ = CANONICAL_2D_ANCHORS.base.zIndex
  const bottomZ = CANONICAL_2D_ANCHORS.bottom.zIndex
  const shoesZ = CANONICAL_2D_ANCHORS.shoes.zIndex
  const topZ = CANONICAL_2D_ANCHORS.top.zIndex
  const accZ = CANONICAL_2D_ANCHORS.accessories.zIndex

  assert(baseZ < bottomZ, `Base (z=${baseZ}) is behind Bottom (z=${bottomZ})`)
  assert(bottomZ < topZ, `Bottom (z=${bottomZ}) is behind Top (z=${topZ})`)
  assert(bottomZ <= shoesZ && shoesZ < topZ, `Shoes (z=${shoesZ}) layer above bottom and below top`)
  assert(topZ < accZ, `Top (z=${topZ}) is behind Accessories (z=${accZ})`)

  // Anchor percentages validity
  assert(CANONICAL_2D_ANCHORS.top.top === '16%', 'Top anchor top offset is 16%')
  assert(CANONICAL_2D_ANCHORS.bottom.top === '46%', 'Bottom anchor top offset is 46%')

  // =========================================================================
  // TEST 3: TRANSPARENT OVERLAY ASSET FORMAT VALIDATION
  // =========================================================================
  console.log('\n[3] Transparent Overlay Asset Format Validation:')

  assert(SUPPORTED_2D_OVERLAY_FORMATS.includes('png'), 'Supports PNG format')
  assert(SUPPORTED_2D_OVERLAY_FORMATS.includes('webp'), 'Supports WebP format')
  assert(SUPPORTED_2D_OVERLAY_FORMATS.includes('svg'), 'Supports SVG format')

  // Valid transparent assets
  assert(isValid2DOverlayAsset('/images/garments/linen_shirt.png') === true, 'Accepts .png asset')
  assert(isValid2DOverlayAsset('/images/garments/chino_pants.webp') === true, 'Accepts .webp asset')
  assert(isValid2DOverlayAsset('/images/garments/jacket.svg') === true, 'Accepts .svg asset')
  assert(isValid2DOverlayAsset('https://cdn.example.com/tee.png?v=2') === true, 'Accepts URL with query params')

  // Strictly rejects ordinary catalog photos without alpha transparency
  assert(isValid2DOverlayAsset('/images/products/blue-shirt.jpg') === false, 'Rejects ordinary .jpg product photo')
  assert(isValid2DOverlayAsset('/images/products/denim.jpeg') === false, 'Rejects ordinary .jpeg product photo')
  assert(isValid2DOverlayAsset('https://cdn.example.com/photo.jpg?w=800') === false, 'Rejects .jpg photo with query params')
  assert(isValid2DOverlayAsset(null) === false, 'Rejects null asset URL')
  assert(isValid2DOverlayAsset('') === false, 'Rejects empty asset URL')
  assert(isValid2DOverlayAsset('   ') === false, 'Rejects whitespace asset URL')

  // =========================================================================
  // TEST 4: DEDICATED 2D GARMENT ASSET RESOLVER
  // =========================================================================
  console.log('\n[4] Dedicated 2D Garment Asset Resolver:')

  // Product with valid 2D overlay via tryOn2D
  const productWith2D = {
    _id: '6aae361aa139bd5a38bf90eb',
    name: 'Slim Fit Oxford Shirt',
    department: 'men',
    subcategory: 'shirts',
    tryOn2D: {
      assetUrl: '/images/avatar/garments/oxford_shirt_overlay.png',
      alignment: 'full-bleed',
      slot: 'top',
    },
  }

  const res2D = resolve2DGarmentAsset(productWith2D)
  assert(res2D.isCompatible === true, 'Product with tryOn2D resolves as compatible')
  assert(res2D.hasRealAsset === true, 'Product with tryOn2D hasRealAsset is true')
  assert(res2D.slot === 'top', 'Resolved slot is top')
  assert(res2D.format === 'png', 'Resolved format is png')
  assert(res2D.url === '/images/avatar/garments/oxford_shirt_overlay.png', 'Resolved URL matches input')

  // Product with tryOn.overlay2DUrl
  const productWithAlt2D = {
    _id: '6aae361aa139bd5a38bf90ec',
    name: 'Classic Denim Jeans',
    department: 'men',
    subcategory: 'jeans',
    tryOn: {
      enabled: false,
      overlay2DUrl: '/images/avatar/garments/denim_jeans_overlay.webp',
      garmentType: 'bottom',
    },
  }

  const resAlt = resolve2DGarmentAsset(productWithAlt2D)
  assert(resAlt.isCompatible === true, 'Resolves tryOn.overlay2DUrl')
  assert(resAlt.slot === 'bottom', 'Resolved slot is bottom from tryOn.garmentType')
  assert(resAlt.format === 'webp', 'Resolved format is webp')

  // Product with ordinary catalog JPEG (must be rejected)
  const productWithJpeg = {
    _id: '6aae361aa139bd5a38bf90ea',
    name: 'Oversized T-Shirt',
    department: 'men',
    subcategory: 't-shirts',
    tryOn2D: {
      assetUrl: '/images/products/oversized-tshirt.jpg', // Non-transparent photo
    },
  }

  const resJpeg = resolve2DGarmentAsset(productWithJpeg)
  assert(resJpeg.isCompatible === false, 'Rejects ordinary JPEG product photo as overlay')
  assert(resJpeg.hasRealAsset === false, 'hasRealAsset is false for rejected JPEG')
  assert(typeof resJpeg.reason === 'string', 'Provides informative rejection reason')

  // Product with no 2D overlay registered
  const unconfiguredProduct = {
    _id: 'unconfigured_123',
    name: 'Plain Cotton Tee',
    department: 'men',
    subcategory: 't-shirts',
  }

  const resUnconf = resolve2DGarmentAsset(unconfiguredProduct)
  assert(resUnconf.isCompatible === false, 'Unconfigured product resolves isCompatible: false')
  assert(resUnconf.hasRealAsset === false, 'Unconfigured product hasRealAsset is false')

  // =========================================================================
  // TEST 5: DETERMINISTIC PREVIEW MODE SELECTION (3D -> 2D -> UNAVAILABLE)
  // =========================================================================
  console.log('\n[5] Deterministic Preview Mode Selection:')

  // Case A: Product with active production 3D asset -> selects '3d'
  const active3DProduct = {
    _id: 'prod_3d_active',
    name: 'Production 3D Blazer',
    tryOn: {
      enabled: true,
      garmentType: 'top',
      assetStatus: 'active',
      assetUrl: '/models/garments/blazer.glb',
    },
  }
  const mode3D = determineGarmentPreviewMode(active3DProduct)
  assert(mode3D.mode === '3d', 'Active 3D product selects "3d" mode')
  assert(mode3D.canUse3D === true, 'canUse3D is true')
  assert(mode3D.canUse2D === false, 'canUse2D is false when 2D is unconfigured')

  // Case B: Product lacking usable 3D asset BUT has compatible 2D overlay -> selects '2d' fallback
  const fallback2DProduct = {
    _id: 'prod_2d_fallback',
    name: 'Casual Linen Shirt',
    tryOn: {
      enabled: false, // 3D disabled or pending
      garmentType: 'top',
    },
    tryOn2D: {
      assetUrl: '/images/avatar/garments/linen_shirt.png',
      slot: 'top',
    },
  }
  const mode2D = determineGarmentPreviewMode(fallback2DProduct)
  assert(mode2D.mode === '2d', 'Lacks usable 3D but has 2D overlay -> selects "2d" fallback')
  assert(mode2D.canUse3D === false, 'canUse3D is false')
  assert(mode2D.canUse2D === true, 'canUse2D is true')
  assert(mode2D.asset2D?.url === '/images/avatar/garments/linen_shirt.png', 'asset2D URL is populated')

  // Case C: Product lacking both usable 3D and 2D overlay -> selects 'unavailable'
  const unavailableProduct = {
    _id: 'prod_unavailable',
    name: 'Graphic Tee (No Try-On)',
    images: ['/images/products/tee.jpg'],
  }
  const modeUnavail = determineGarmentPreviewMode(unavailableProduct)
  assert(modeUnavail.mode === 'unavailable', 'Lacks both 3D and 2D -> selects "unavailable"')
  assert(modeUnavail.canUse3D === false, 'canUse3D is false')
  assert(modeUnavail.canUse2D === false, 'canUse2D is false')

  // Case D: Product with BOTH usable 3D and compatible 2D overlay -> defaults to 3D with 2D available
  const dualProduct = {
    _id: 'prod_dual',
    name: 'Versatile Trousers',
    tryOn: {
      enabled: true,
      garmentType: 'bottom',
      assetStatus: 'active',
      assetUrl: '/models/garments/trousers.glb',
    },
    tryOn2D: {
      assetUrl: '/images/avatar/garments/trousers.webp',
      slot: 'bottom',
    },
  }
  const modeDual = determineGarmentPreviewMode(dualProduct)
  assert(modeDual.mode === '3d', 'Dual product defaults to "3d" mode')
  assert(modeDual.canUse3D === true, 'Dual product canUse3D is true')
  assert(modeDual.canUse2D === true, 'Dual product canUse2D is true')

  // =========================================================================
  // TEST 6: REALISTIC HUMAN 2D BASES SPECIFICATION
  // =========================================================================
  console.log('\n[6] Realistic Human 2D Bases Specification:')

  const demos = ['men', 'women', 'boys', 'girls', 'kids']
  demos.forEach((d) => {
    assert(d in AVATAR_2D_BASES, `AVATAR_2D_BASES defines demographic: ${d}`)
    assert(AVATAR_2D_BASES[d].aspectRatio === '3/4', `${d} defines 3:4 aspect ratio`)
    assert(AVATAR_2D_BASES[d].defaultHeightCm > 0, `${d} defines physiological height`)
  })

  // Men has broader shoulders than women; women has wider hip ratio
  assert(
    AVATAR_2D_BASES.men.shoulderRatio > AVATAR_2D_BASES.women.shoulderRatio,
    'Men demographic defines broader shoulder ratio than women'
  )
  assert(
    AVATAR_2D_BASES.women.hipRatio > AVATAR_2D_BASES.men.hipRatio,
    'Women demographic defines wider hip ratio than men'
  )

  // =========================================================================
  // TEST 7: COMPONENT ARCHITECTURE & INTEGRATION INTEGRITY
  // =========================================================================
  console.log('\n[7] Component Architecture & Integration Integrity:')

  const layeredPreviewPath = path.resolve(__dirname, '../components/avatar/LayeredAvatarPreview.jsx')
  const tryOnPagePath = path.resolve(__dirname, '../pages/TryOnPage.jsx')
  const wardrobePagePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')
  const avatarViewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')

  assert(fs.existsSync(layeredPreviewPath), 'LayeredAvatarPreview.jsx exists')
  assert(fs.existsSync(tryOnPagePath), 'TryOnPage.jsx exists')
  assert(fs.existsSync(wardrobePagePath), 'AvatarWardrobePage.jsx exists')
  assert(fs.existsSync(avatarViewerPath), 'AvatarViewer.jsx (Three.js 3D viewer) remains intact')

  const layeredPreviewContent = fs.readFileSync(layeredPreviewPath, 'utf-8')
  const tryOnContent = fs.readFileSync(tryOnPagePath, 'utf-8')
  const wardrobeContent = fs.readFileSync(wardrobePagePath, 'utf-8')

  assert(
    layeredPreviewContent.includes('RealisticAvatarSilhouette'),
    'LayeredAvatarPreview renders realistic anatomical silhouettes'
  )
  assert(
    layeredPreviewContent.includes('data-layer="base"') &&
      layeredPreviewContent.includes('data-layer="top"') &&
      layeredPreviewContent.includes('data-layer="bottom"'),
    'LayeredAvatarPreview contains structured modular layer slots'
  )
  assert(
    tryOnContent.includes('LayeredAvatarPreview'),
    'TryOnPage imports and renders LayeredAvatarPreview'
  )
  assert(
    tryOnContent.includes('determineGarmentPreviewMode'),
    'TryOnPage utilizes determineGarmentPreviewMode'
  )
  assert(
    wardrobeContent.includes('LayeredAvatarPreview'),
    'AvatarWardrobePage imports and renders LayeredAvatarPreview'
  )
  assert(
    wardrobeContent.includes('active2DGarments'),
    'AvatarWardrobePage derives active2DGarments for multi-slot outfits'
  )

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
