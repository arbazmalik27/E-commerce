import { useState, useMemo } from 'react'
import { AlertCircle, Layers, Sparkles, Loader2, Info } from 'lucide-react'
import { computeHeightScale } from '../../constants/avatarStudioConstants'
import {
  CANONICAL_2D_CANVAS,
  CANONICAL_2D_ANCHORS,
  AVATAR_2D_BASES,
  isValid2DOverlayAsset,
} from '../../utils/layeredGarmentResolver'

/**
 * Realistic Anatomical Silhouette SVG component for demographics.
 * Renders realistic human body contours (broad shoulders for men, contoured waist/hip for women,
 * proportional youth shapes) with dynamic skin-tone shading.
 */
function RealisticAvatarSilhouette({
  demographic = 'men',
  skinTone = '#DDB088',
  className = '',
}) {
  const normDemo = (demographic || 'men').toLowerCase().trim()
  const isFemale = normDemo === 'women'
  const isYouth = ['boys', 'girls', 'kids'].includes(normDemo)

  // Calibrated skin highlight and shadow tones
  const shadowTone = 'rgba(0, 0, 0, 0.12)'
  const highlightTone = 'rgba(255, 255, 255, 0.14)'

  return (
    <svg
      viewBox={CANONICAL_2D_CANVAS.viewBox}
      className={`w-full h-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label={`Realistic ${demographic} anatomical base`}
    >
      <defs>
        {/* Soft studio floor shadow */}
        <radialGradient id="tv-ground-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#181818" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#181818" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#181818" stopOpacity="0" />
        </radialGradient>

        {/* Anatomical body gradient for realistic three-dimensional depth */}
        <linearGradient id={`tv-skin-grad-${normDemo}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={skinTone} />
          <stop offset="50%" stopColor={skinTone} />
          <stop offset="100%" stopColor={skinTone} />
        </linearGradient>

        <linearGradient id="tv-body-lighting" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.10" />
          <stop offset="35%" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="65%" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      {/* Ground contact shadow */}
      <ellipse cx="300" cy="762" rx="140" ry="22" fill="url(#tv-ground-shadow)" />

      {/* Anatomical Body Silhouette Paths */}
      <g id="avatar-base-anatomy">
        {isFemale ? (
          // ==================== ADULT FEMALE ANATOMY ====================
          <g fill={skinTone}>
            {/* Head & Neck */}
            <path
              d="M300,75 C326,75 342,95 342,126 C342,158 324,180 300,180 C276,180 258,158 258,126 C258,95 274,75 300,75 Z"
            />
            {/* Neck */}
            <path d="M288,176 L312,176 L318,212 L282,212 Z" />

            {/* Torso & Bust */}
            <path
              d="M282,212 
                 C246,216 220,234 214,260 
                 C208,284 212,316 218,348 
                 C226,386 248,396 254,430 
                 C260,460 250,490 240,518 
                 L360,518 
                 C350,490 340,460 346,430 
                 C352,396 374,386 382,348 
                 C388,316 392,284 386,260 
                 C380,234 354,216 318,212 Z"
            />

            {/* Left Arm & Hand */}
            <path
              d="M214,260 
                 C198,288 186,336 182,390 
                 C178,442 174,488 168,528 
                 C165,548 174,554 182,550 
                 C190,544 196,500 200,446 
                 C204,394 212,336 218,300 Z"
            />

            {/* Right Arm & Hand */}
            <path
              d="M386,260 
                 C402,288 414,336 418,390 
                 C422,442 426,488 432,528 
                 C435,548 426,554 418,550 
                 C410,544 404,500 400,446 
                 C396,394 388,336 382,300 Z"
            />

            {/* Legs & Feet */}
            {/* Left Leg */}
            <path
              d="M246,516 
                 C244,560 240,610 244,660 
                 C248,704 250,736 248,754 
                 C248,760 262,762 268,758 
                 C274,752 278,714 278,662 
                 C280,614 286,564 294,518 Z"
            />
            {/* Right Leg */}
            <path
              d="M306,518 
                 C314,564 320,614 322,662 
                 C322,714 326,752 332,758 
                 C338,762 352,760 352,754 
                 C350,736 352,704 356,660 
                 C360,610 356,560 354,516 Z"
            />
          </g>
        ) : isYouth ? (
          // ==================== YOUTH ANATOMY ====================
          <g fill={skinTone}>
            {/* Proportional youth head */}
            <path
              d="M300,90 C328,90 344,112 344,144 C344,178 326,196 300,196 C274,196 256,178 256,144 C256,112 272,90 300,90 Z"
            />
            {/* Neck */}
            <path d="M288,194 L312,194 L316,222 L284,222 Z" />

            {/* Youth Torso */}
            <path
              d="M284,222 
                 C254,226 234,242 228,268 
                 C224,296 226,334 230,370 
                 C234,406 244,434 246,470 
                 L354,470 
                 C356,434 366,406 370,370 
                 C374,334 376,296 372,268 
                 C366,242 346,226 316,222 Z"
            />

            {/* Arms */}
            <path
              d="M228,268 C216,296 206,344 202,398 C198,446 194,484 188,518 C186,532 196,536 202,532 C210,526 216,488 220,442 C224,394 228,340 232,308 Z"
            />
            <path
              d="M372,268 C384,296 394,344 398,398 C402,446 406,484 412,518 C414,532 404,536 398,532 C390,526 384,488 380,442 C376,394 372,340 368,308 Z"
            />

            {/* Legs */}
            <path
              d="M250,468 C248,516 246,572 250,628 C252,674 254,714 252,746 C252,754 266,756 272,752 C276,744 280,706 280,654 C282,604 286,548 294,470 Z"
            />
            <path
              d="M306,470 C314,548 318,604 320,654 C320,706 324,744 328,752 C334,756 348,754 348,746 C346,714 348,674 350,628 C354,572 352,516 350,468 Z"
            />
          </g>
        ) : (
          // ==================== ADULT MALE ANATOMY (Default) ====================
          <g fill={skinTone}>
            {/* Head */}
            <path
              d="M300,72 C328,72 344,92 344,124 C344,158 326,178 300,178 C274,178 256,158 256,124 C256,92 272,72 300,72 Z"
            />
            {/* Neck */}
            <path d="M284,174 L316,174 L322,210 L278,210 Z" />

            {/* Broad Athletic Torso & Shoulders */}
            <path
              d="M278,210 
                 C240,214 206,230 198,256 
                 C192,282 196,316 204,352 
                 C214,394 234,420 240,462 
                 C242,488 238,510 236,524 
                 L364,524 
                 C362,510 358,488 360,462 
                 C366,420 386,394 396,352 
                 C404,316 408,282 402,256 
                 C394,230 360,214 322,210 Z"
            />

            {/* Left Arm & Forearm */}
            <path
              d="M198,256 
                 C184,286 172,336 166,394 
                 C162,448 158,494 152,534 
                 C148,552 158,558 166,554 
                 C174,548 182,504 186,450 
                 C192,396 200,336 206,298 Z"
            />

            {/* Right Arm & Forearm */}
            <path
              d="M402,256 
                 C416,286 428,336 434,394 
                 C438,448 442,494 448,534 
                 C452,552 442,558 434,554 
                 C426,548 418,504 414,450 
                 C408,396 400,336 394,298 Z"
            />

            {/* Legs & Feet */}
            {/* Left Leg */}
            <path
              d="M242,522 
                 C240,568 236,620 240,672 
                 C244,716 246,744 244,756 
                 C244,762 258,764 264,760 
                 C270,754 274,718 274,668 
                 C276,618 284,566 294,524 Z"
            />
            {/* Right Leg */}
            <path
              d="M306,524 
                 C316,566 324,618 326,668 
                 C326,718 330,754 336,760 
                 C342,764 356,762 356,756 
                 C354,744 356,716 360,672 
                 C364,620 360,568 358,522 Z"
            />
          </g>
        )}

        {/* Studio Lighting Overlay across anatomical silhouette */}
        <rect
          x="140"
          y="70"
          width="320"
          height="695"
          fill="url(#tv-body-lighting)"
          style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}
        />
      </g>
    </svg>
  )
}

/**
 * LayeredAvatarPreview
 *
 * Lightweight, accessible, 2D composite layered clothing preview component.
 * Stacks realistic avatar bases with transparent PNG/WebP/SVG clothing overlays.
 */
export default function LayeredAvatarPreview({
  demographic = 'men',
  skinTone = '#DDB088',
  heightCm = 178,
  garment = null,
  garments = null,
  baseImageUrl = null,
  onLayerLoaded = null,
  onLayerError = null,
  className = '',
}) {
  const [layerLoading, setLayerLoading] = useState({})
  const [layerErrors, setLayerErrors] = useState({})

  // Compute height scale relative to canonical 178 cm standard baseline
  const heightScale = useMemo(() => computeHeightScale(heightCm), [heightCm])

  // Resolve consolidated layers map (combines single garment or multi-slot garments)
  const activeLayers = useMemo(() => {
    const map = {
      bottom: null,
      top: null,
      shoes: null,
      accessories: null,
    }

    if (garments && typeof garments === 'object') {
      if (garments.bottom) map.bottom = garments.bottom
      if (garments.top) map.top = garments.top
      if (garments.shoes) map.shoes = garments.shoes
      if (garments.accessories) map.accessories = garments.accessories
    } else if (garment && garment.slot) {
      map[garment.slot] = garment
    }

    return map
  }, [garments, garment])

  // Derived list of present garment layers for badges
  const presentGarmentsList = useMemo(() => {
    const list = []
    Object.entries(activeLayers).forEach(([slot, g]) => {
      if (g && (g.url || g.assetUrl)) {
        list.push({
          slot,
          label: g.label || g.name || `${slot.toUpperCase()} Layer`,
          url: g.url || g.assetUrl,
          alignment: g.alignment || 'full-bleed',
        })
      }
    })
    return list
  }, [activeLayers])

  const handleImageLoad = (slot) => {
    setLayerLoading((prev) => ({ ...prev, [slot]: false }))
    setLayerErrors((prev) => ({ ...prev, [slot]: false }))
    if (onLayerLoaded) onLayerLoaded(slot)
  }

  const handleImageError = (slot, err) => {
    setLayerLoading((prev) => ({ ...prev, [slot]: false }))
    setLayerErrors((prev) => ({ ...prev, [slot]: true }))
    if (onLayerError) onLayerError(slot, err)
  }

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#FAF7F0] to-[#EAE3D6] dark:from-[#1E201B] dark:to-[#141512] border border-[var(--tv-border)] select-none flex items-center justify-center ${className}`}
      data-testid="layered-avatar-preview-root"
    >
      {/* Viewport Frame with 3:4 Aspect Ratio Container */}
      <div
        className="relative w-full h-full max-w-[600px] max-h-[800px] flex items-center justify-center transition-transform duration-300"
        style={{
          transform: `scale(${heightScale})`,
          transformOrigin: 'bottom center',
        }}
      >
        {/* =========================================================================
            LAYER 1: REALISTIC HUMAN BASE AVATAR (Z-10)
           ========================================================================= */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
          data-layer="base"
        >
          {baseImageUrl ? (
            <img
              src={baseImageUrl}
              alt={`Base Avatar (${demographic})`}
              className="w-full h-full object-contain pointer-events-none"
              onError={() => console.warn(`Failed to load base avatar image: ${baseImageUrl}`)}
            />
          ) : (
            <RealisticAvatarSilhouette
              demographic={demographic}
              skinTone={skinTone}
              className="w-full h-full pointer-events-none"
            />
          )}
        </div>

        {/* =========================================================================
            LAYER 2: BOTTOM GARMENT (Trousers / Jeans / Chinos) (Z-20)
           ========================================================================= */}
        {activeLayers.bottom && (activeLayers.bottom.url || activeLayers.bottom.assetUrl) && (
          <div
            className="absolute z-20 pointer-events-none"
            data-layer="bottom"
            style={
              activeLayers.bottom.alignment === 'anchored'
                ? {
                    top: CANONICAL_2D_ANCHORS.bottom.top,
                    left: CANONICAL_2D_ANCHORS.bottom.left,
                    width: CANONICAL_2D_ANCHORS.bottom.width,
                    height: CANONICAL_2D_ANCHORS.bottom.height,
                  }
                : { top: 0, left: 0, width: '100%', height: '100%' }
            }
          >
            <img
              src={activeLayers.bottom.url || activeLayers.bottom.assetUrl}
              alt={activeLayers.bottom.label || 'Bottom garment layer'}
              className="w-full h-full object-contain pointer-events-none"
              onLoad={() => handleImageLoad('bottom')}
              onError={(e) => handleImageError('bottom', e)}
            />
          </div>
        )}

        {/* =========================================================================
            LAYER 3: SHOES / FOOTWEAR (Z-25)
           ========================================================================= */}
        {activeLayers.shoes && (activeLayers.shoes.url || activeLayers.shoes.assetUrl) && (
          <div
            className="absolute z-25 pointer-events-none"
            data-layer="shoes"
            style={
              activeLayers.shoes.alignment === 'anchored'
                ? {
                    top: CANONICAL_2D_ANCHORS.shoes.top,
                    left: CANONICAL_2D_ANCHORS.shoes.left,
                    width: CANONICAL_2D_ANCHORS.shoes.width,
                    height: CANONICAL_2D_ANCHORS.shoes.height,
                  }
                : { top: 0, left: 0, width: '100%', height: '100%' }
            }
          >
            <img
              src={activeLayers.shoes.url || activeLayers.shoes.assetUrl}
              alt={activeLayers.shoes.label || 'Footwear layer'}
              className="w-full h-full object-contain pointer-events-none"
              onLoad={() => handleImageLoad('shoes')}
              onError={(e) => handleImageError('shoes', e)}
            />
          </div>
        )}

        {/* =========================================================================
            LAYER 4: TOP GARMENT (Shirt / T-Shirt / Hoodie / Jacket) (Z-30)
           ========================================================================= */}
        {activeLayers.top && (activeLayers.top.url || activeLayers.top.assetUrl) && (
          <div
            className="absolute z-30 pointer-events-none"
            data-layer="top"
            style={
              activeLayers.top.alignment === 'anchored'
                ? {
                    top: CANONICAL_2D_ANCHORS.top.top,
                    left: CANONICAL_2D_ANCHORS.top.left,
                    width: CANONICAL_2D_ANCHORS.top.width,
                    height: CANONICAL_2D_ANCHORS.top.height,
                  }
                : { top: 0, left: 0, width: '100%', height: '100%' }
            }
          >
            <img
              src={activeLayers.top.url || activeLayers.top.assetUrl}
              alt={activeLayers.top.label || 'Top garment layer'}
              className="w-full h-full object-contain pointer-events-none"
              onLoad={() => handleImageLoad('top')}
              onError={(e) => handleImageError('top', e)}
            />
          </div>
        )}

        {/* =========================================================================
            LAYER 5: ACCESSORIES (Z-35)
           ========================================================================= */}
        {activeLayers.accessories && (activeLayers.accessories.url || activeLayers.accessories.assetUrl) && (
          <div
            className="absolute z-35 pointer-events-none"
            data-layer="accessories"
            style={
              activeLayers.accessories.alignment === 'anchored'
                ? {
                    top: CANONICAL_2D_ANCHORS.accessories.top,
                    left: CANONICAL_2D_ANCHORS.accessories.left,
                    width: CANONICAL_2D_ANCHORS.accessories.width,
                    height: CANONICAL_2D_ANCHORS.accessories.height,
                  }
                : { top: 0, left: 0, width: '100%', height: '100%' }
            }
          >
            <img
              src={activeLayers.accessories.url || activeLayers.accessories.assetUrl}
              alt={activeLayers.accessories.label || 'Accessories layer'}
              className="w-full h-full object-contain pointer-events-none"
              onLoad={() => handleImageLoad('accessories')}
              onError={(e) => handleImageError('accessories', e)}
            />
          </div>
        )}
      </div>

      {/* =========================================================================
          VIEWPORT BADGES & STATUS OVERLAYS
         ========================================================================= */}
      {/* Top-Left: Mode & Active Garment Badges */}
      <div className="absolute top-3 left-3 z-40 flex flex-col gap-1.5 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--tv-surface)]/90 backdrop-blur-xs text-[10px] font-mono uppercase tracking-wider font-bold text-[#34452F] border border-[var(--tv-border)] shadow-xs">
          <Layers className="w-3 h-3 text-[#34452F]" />
          <span>2D Layered Preview</span>
        </span>

        {presentGarmentsList.map((g) => (
          <div key={g.slot} className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--tv-surface)]/80 text-[9px] font-mono uppercase tracking-wider text-[var(--tv-text-secondary)] border border-[var(--tv-border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34452F]" />
              {g.slot}: {g.label}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom-Left: Demographic & Height Indicator */}
      <div className="absolute bottom-3 left-3 z-40 pointer-events-none">
        <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--tv-surface)]/80 backdrop-blur-xs text-[var(--tv-text-muted)] border border-[var(--tv-border)]">
          {demographic} • {heightCm} cm
        </span>
      </div>

      {/* Layer Error Notifications */}
      {Object.entries(layerErrors).some(([, hasErr]) => hasErr) && (
        <div className="absolute bottom-3 right-3 z-40 p-2.5 rounded-xl border border-amber-300/60 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-[11px]">Layer asset could not be loaded</span>
        </div>
      )}
    </div>
  )
}
