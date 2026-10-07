/**
 * TrendVolt Phase 3A — Personalized Avatar Studio Constants & Presets
 * Shared definitions for canonical morph targets, facial blendshapes, appearance palettes, and constraints.
 */

// Safe clamping utility for morph target weights [0.0, 1.0]
export function clampWeight(val) {
  const num = Number.parseFloat(val)
  if (Number.isNaN(num)) return 0.0
  return Math.min(Math.max(num, 0.0), 1.0)
}

// Visual height scaling factor relative to 178 cm standard baseline (clamped safely between 0.72 and 1.22)
export function computeHeightScale(heightCm) {
  const h = Number(heightCm)
  if (!h || Number.isNaN(h) || h <= 0) return 1.0
  const normalized = h / 178.0
  return Math.min(Math.max(normalized, 0.72), 1.22)
}

// 5 Canonical Body Morph Target Definitions
export const MORPH_SLIDERS = [
  {
    id: 'chestScale',
    label: 'Chest Scale / Circumference',
    description: 'Thoracic & pectoral width scaling',
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },
  {
    id: 'waistScale',
    label: 'Waist Definition',
    description: 'Mid-torso natural waist circumference',
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },
  {
    id: 'hipScale',
    label: 'Hip & Pelvic Width',
    description: 'Bilateral pelvic and gluteal volume',
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },
  {
    id: 'legLength',
    label: 'Leg & Inseam Proportion',
    description: 'Vertical lower-limb length (grounded at Y=0)',
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },
  {
    id: 'torsoDepth',
    label: 'Torso Depth',
    description: 'Anterior-posterior rib cage thickness',
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },
]

export const PRESETS = {
  default: { chestScale: 0.0, waistScale: 0.0, hipScale: 0.0, legLength: 0.0, torsoDepth: 0.0 },
  athletic: { chestScale: 0.55, waistScale: 0.1, hipScale: 0.2, legLength: 0.35, torsoDepth: 0.4 },
  tall_lean: { chestScale: 0.1, waistScale: 0.1, hipScale: 0.1, legLength: 0.6, torsoDepth: 0.1 },
  relaxed: { chestScale: 0.5, waistScale: 0.5, hipScale: 0.5, legLength: 0.1, torsoDepth: 0.5 },
}

export const DEFAULT_MORPH_WEIGHTS = {
  chestScale: 0.0,
  waistScale: 0.0,
  hipScale: 0.0,
  legLength: 0.0,
  torsoDepth: 0.0,
}

export const ANATOMICAL_PRESETS = [
  {
    name: 'Neutral Base',
    values: PRESETS.default,
  },
  {
    name: 'Athletic V-Taper',
    values: PRESETS.athletic,
  },
  {
    name: 'Tall & Lean',
    values: PRESETS.tall_lean,
  },
  {
    name: 'Relaxed Full',
    values: PRESETS.relaxed,
  },
]

// 8 Canonical Stylized Facial Blendshapes
export const FACIAL_BLENDSHAPES = [
  { id: 'faceWidth', label: 'Face Width', desc: 'Lateral cranial contour' },
  { id: 'jawWidth', label: 'Jaw Width', desc: 'Mandibular angle breadth' },
  { id: 'chinLength', label: 'Chin Length', desc: 'Vertical mental protuberance' },
  { id: 'noseWidth', label: 'Nose Width', desc: 'Nasal alar flare' },
  { id: 'eyeSpacing', label: 'Eye Spacing', desc: 'Interpupillary distance' },
  { id: 'cheekFullness', label: 'Cheek Fullness', desc: 'Malar & zygomatic volume' },
  { id: 'lipFullness', label: 'Lip Fullness', desc: 'Vermilion thickness' },
  { id: 'eyeSize', label: 'Eye Size', desc: 'Stylized orbital aperture' },
]

// Curated Appearance Palettes (Predefined Options)
export const SKIN_TONES = [
  { id: 'ivory', label: 'Porcelain Ivory', hex: '#F7EBE1' },
  { id: 'fair-warm', label: 'Fair Warm', hex: '#E8CCA7' },
  { id: 'golden-sand', label: 'Golden Sand', hex: '#DDB088' },
  { id: 'honey-almond', label: 'Honey Almond', hex: '#C68B59' },
  { id: 'olive-tan', label: 'Olive Tan', hex: '#A26B43' },
  { id: 'chestnut', label: 'Rich Chestnut', hex: '#7D4E30' },
  { id: 'deep-umber', label: 'Deep Umber', hex: '#58331E' },
  { id: 'espresso', label: 'Deep Espresso', hex: '#392015' },
]

export const HAIR_STYLES = [
  { id: 'style-buzz', name: 'Textured Crop', desc: 'Short tight tapered silhouette' },
  { id: 'style-waves', name: 'Layered Waves', desc: 'Shoulder-length loose flow' },
  { id: 'style-part', name: 'Side Part Elegance', desc: 'Clean parted business look' },
  { id: 'style-curls', name: 'Coily Volume Afro', desc: 'Natural rounded crown volume' },
  { id: 'style-bob', name: 'Classic Bob', desc: 'Blunt chin-length fringe' },
  { id: 'style-pony', name: 'Sleek Ponytail', desc: 'High gathered athletic tail' },
]

export const HAIR_COLORS = [
  { id: 'jet-black', label: 'Jet Black', hex: '#141414' },
  { id: 'dark-mocha', label: 'Dark Mocha', hex: '#2B1B15' },
  { id: 'warm-chestnut', label: 'Warm Chestnut', hex: '#563321' },
  { id: 'honey-blonde', label: 'Honey Blonde', hex: '#C49E65' },
  { id: 'nordic-platinum', label: 'Nordic Platinum', hex: '#DDD7CD' },
  { id: 'auburn-amber', label: 'Auburn Amber', hex: '#8C381E' },
]

export const EYE_COLORS = [
  { id: 'dark-walnut', label: 'Dark Walnut', hex: '#2D1F17' },
  { id: 'warm-hazel', label: 'Warm Hazel', hex: '#5A4526' },
  { id: 'forest-olive', label: 'Forest Olive', hex: '#334D35' },
  { id: 'baltic-blue', label: 'Baltic Blue', hex: '#2D465A' },
  { id: 'slate-gray', label: 'Charcoal Slate', hex: '#4B4D52' },
]

export const FACIAL_HAIR_STYLES = [
  { id: 'clean', name: 'Clean Shaven', desc: 'Smooth defined jawline' },
  { id: 'stubble', name: 'Designer Stubble', desc: 'Subtle 5 o’clock shadow' },
  { id: 'short-beard', name: 'Short Trimmed Beard', desc: 'Neat contoured facial hair' },
  { id: 'full-beard', name: 'Full Classic Beard', desc: 'Dense classic masculine beard' },
  { id: 'mustache', name: 'Classic Mustache', desc: 'Defined upper lip styling' },
]
