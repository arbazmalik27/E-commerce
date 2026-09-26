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
 * Universal product image resolver for TrendVolt.
 * Checks PRODUCT_IMAGE_MAP first by stable ID, then falls back to backend product images.
 *
 * @param {Object|string} productOrItem - Backend product data, order/cart item, or string ID
 * @returns {string|null} Resolved image source (local asset URL or backend URL)
 */
export function getProductImage(productOrItem) {
  if (!productOrItem) return null

  // 1. If passed a string ID directly
  if (typeof productOrItem === 'string') {
    return PRODUCT_IMAGE_MAP[productOrItem] || null
  }

  // 2. Extract product ID from product or item wrapper
  const id =
    productOrItem._id ||
    productOrItem.id ||
    (typeof productOrItem.product === 'string'
      ? productOrItem.product
      : productOrItem.product?._id) ||
    productOrItem.productId

  if (id && PRODUCT_IMAGE_MAP[id]) {
    return PRODUCT_IMAGE_MAP[id]
  }

  // 3. Fallback to images array on product or item
  const images =
    productOrItem.images ||
    (productOrItem.product && productOrItem.product.images)

  if (
    Array.isArray(images) &&
    images.length > 0 &&
    typeof images[0] === 'string' &&
    images[0].trim().length > 0
  ) {
    return images[0]
  }

  return null
}

/**
 * Backward compatible alias for homepage sections.
 */
export const getHomepageProductImage = getProductImage

