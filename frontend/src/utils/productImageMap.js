/**
 * TRENDVOLT — Local Product Image Mapping Architecture
 *
 * This mapping links stable, real MongoDB product IDs to local assets in `src/assets/products/`.
 * Only presentation image sources on homepage sections are mapped.
 * Real backend product data (_id, name, price, stock, category, etc.) is fully preserved.
 *
 * Fallback Behavior:
 * If a real product does not yet have a local image mapping, `getHomepageProductImage(product)`
 * preserves the existing backend image (product.images[0]) as a safe temporary fallback,
 * ensuring no broken cards.
 */

import urbanBackpack from '../assets/products/urban-backpack.jpg'
import minimalLeatherWatch from '../assets/products/minimal-leather-watch.jpg'
import chronographWatch from '../assets/products/chronograph-watch.jpg'
import casualSneakers from '../assets/products/casual-sneakers.jpg'
import relaxedHoodie from '../assets/products/relaxed-hoodie.jpg'
import classicDenimJeans from '../assets/products/classic-denim-jeans.jpg'
import oxfordShirt from '../assets/products/oxford-shirt.jpg'
import blueShirt from '../assets/products/blue-shirt.jpg'
import blueLinenShirt from '../assets/products/blue-linen-shirt.jpg'
import oversizedTshirt from '../assets/products/oversized-tshirt.jpg'

/**
 * Stable Product ID -> Local Asset mapping
 * Keys are the real MongoDB ObjectId strings from the database.
 */
export const PRODUCT_IMAGE_MAP = {
  '6aae361ba139bd5a38bf90f0': urbanBackpack,        // Men's Urban Backpack
  '6aae361ba139bd5a38bf90ef': minimalLeatherWatch,   // Men's Minimal Leather Watch
  '6aae361ba139bd5a38bf90f4': chronographWatch,      // Swiss Automatic Chronograph Watch
  '6aae361ba139bd5a38bf90ee': casualSneakers,        // Men's Casual Sneakers
  '6aae361aa139bd5a38bf90ed': relaxedHoodie,         // Men's Relaxed Fit Hoodie
  '6aae361aa139bd5a38bf90ec': classicDenimJeans,     // Men's Classic Denim Jeans
  '6aae361aa139bd5a38bf90eb': oxfordShirt,           // Men's Slim Fit Oxford Shirt
  '6aafa6db9b243f56cdad3b66': blueShirt,             // A blue shirt hanging on a white wall
  '6aafa9ab9b243f56cdad3b6a': blueLinenShirt,        // Blue-linen
  '6aae361aa139bd5a38bf90ea': oversizedTshirt,       // Premium Men's Oversized T-Shirt
}

/**
 * Resolves the presentation image for a product on homepage sections.
 * 1. Checks explicit ID mapping in PRODUCT_IMAGE_MAP
 * 2. Falls back gracefully to backend product image (product.images[0])
 *
 * @param {Object} product - Backend product data
 * @returns {string|null} Resolved image source (local asset URL or backend URL)
 */
export function getHomepageProductImage(product) {
  if (!product || !product._id) return null

  // 1. Direct map lookup by stable product ID
  if (PRODUCT_IMAGE_MAP[product._id]) {
    return PRODUCT_IMAGE_MAP[product._id]
  }

  // 2. Fallback to existing backend image if available
  if (
    Array.isArray(product.images) &&
    product.images.length > 0 &&
    typeof product.images[0] === 'string' &&
    product.images[0].trim().length > 0
  ) {
    return product.images[0]
  }

  return null
}
