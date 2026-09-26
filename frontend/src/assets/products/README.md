# TrendVolt Local Product Assets

Place your manually selected, optimized product images in this folder (preferably in modern WebP format).

### Recommended Naming Convention
- `men-backpack-01.webp`
- `men-watch-01.webp`
- `chronograph-watch-01.webp`
- `sneakers-01.webp`
- `hoodie-01.webp`
- `denim-jeans-01.webp`
- `oxford-shirt-01.webp`
- `blue-shirt-01.webp`
- `blue-linen-01.webp`
- `oversized-tshirt-01.webp`

Or directly by product ID:
- `<PRODUCT_ID>.webp` (e.g. `6aae361ba139bd5a38bf90f0.webp`)

### How to map an image to a product
Open `frontend/src/utils/productImageMap.js` and add/uncomment the mapping for the stable product ID:
```javascript
import sneakers01 from '../assets/products/sneakers-01.webp'

export const PRODUCT_IMAGE_MAP = {
  '6aae361ba139bd5a38bf90ee': sneakers01,
}
```
Unmapped products will automatically and gracefully fall back to their backend product images.
