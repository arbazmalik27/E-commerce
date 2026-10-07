/**
 * TrendVolt Phase 4B — Virtual Wardrobe Constants & Taxonomy Mapping
 * 
 * Defines client-side wardrobe slots, filter tabs, and deterministic taxonomy-to-slot
 * resolution. Respects the authoritative TrendVolt product catalog taxonomy without
 * duplicating the product database.
 */

export const WARDROBE_SLOTS = {
  TOP: 'top',
  BOTTOM: 'bottom',
  SHOES: 'shoes',
  ACCESSORIES: 'accessories',
}

export const INITIAL_OUTFIT = {
  top: null,
  bottom: null,
  shoes: null,
  accessories: [],
}

export const WARDROBE_CATEGORY_FILTERS = [
  { id: 'all', label: 'All Catalog', slot: null },
  { id: 'tops', label: 'Tops', slot: WARDROBE_SLOTS.TOP },
  { id: 'bottoms', label: 'Bottoms', slot: WARDROBE_SLOTS.BOTTOM },
  { id: 'shoes', label: 'Shoes', slot: WARDROBE_SLOTS.SHOES },
  { id: 'accessories', label: 'Accessories', slot: WARDROBE_SLOTS.ACCESSORIES },
]

const TOP_SUBCATS = [
  't-shirts',
  'shirts',
  'tops',
  'hoodies-sweatshirts',
  'jackets-coats',
  'suits-blazers',
  'kurtis',
  'dresses',
]

const BOTTOM_SUBCATS = ['jeans', 'trousers', 'shorts', 'skirts']

const SHOE_SUBCATS = [
  'sneakers',
  'running-shoes',
  'casual-shoes',
  'formal-shoes',
  'boots',
  'sandals',
  'heels',
  'flats',
  'slippers',
  'kids-footwear',
]

const ACCESSORY_SUBCATS = [
  'watches',
  'sunglasses',
  'bags',
  'backpacks',
  'wallets',
  'belts',
  'caps-hats',
  'jewellery',
  'kids-accessories',
]

/**
 * Deterministically resolves which wardrobe slot a TrendVolt product belongs to
 * based on its tryOn configuration and canonical product taxonomy.
 * 
 * @param {Object|null} product - TrendVolt Product object
 * @returns {'top'|'bottom'|'shoes'|'accessories'|null}
 */
export function determineProductWardrobeSlot(product) {
  if (!product) return null

  // 1. Explicit tryOn configuration takes precedence for modular garment layers
  if (product.tryOn?.garmentType === 'top') {
    return WARDROBE_SLOTS.TOP
  }
  if (product.tryOn?.garmentType === 'bottom') {
    return WARDROBE_SLOTS.BOTTOM
  }

  const dept = String(product.department || '').toLowerCase().trim()
  const subcat = String(product.subcategory || '').toLowerCase().trim()

  // 2. Department-level hierarchy
  if (dept === 'footwear') {
    return WARDROBE_SLOTS.SHOES
  }
  if (dept === 'accessories') {
    return WARDROBE_SLOTS.ACCESSORIES
  }

  // 3. Subcategory-level hierarchy
  if (TOP_SUBCATS.includes(subcat)) {
    return WARDROBE_SLOTS.TOP
  }
  if (BOTTOM_SUBCATS.includes(subcat)) {
    return WARDROBE_SLOTS.BOTTOM
  }
  if (SHOE_SUBCATS.includes(subcat)) {
    return WARDROBE_SLOTS.SHOES
  }
  if (ACCESSORY_SUBCATS.includes(subcat)) {
    return WARDROBE_SLOTS.ACCESSORIES
  }

  return null
}

/**
 * Checks whether a product matches a wardrobe category filter tab.
 * 
 * @param {Object} product
 * @param {string} filterId - 'all' | 'tops' | 'bottoms' | 'shoes' | 'accessories'
 * @returns {boolean}
 */
export function matchesWardrobeFilter(product, filterId) {
  if (!product) return false
  if (!filterId || filterId === 'all') return true

  const slot = determineProductWardrobeSlot(product)
  const filter = WARDROBE_CATEGORY_FILTERS.find((f) => f.id === filterId)
  if (!filter || !filter.slot) return true

  return slot === filter.slot
}
