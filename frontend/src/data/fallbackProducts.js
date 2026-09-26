/**
 * TRENDVOLT — Resilient Fallback Product Catalog
 * 
 * Provides high-fidelity curated fallback products for the homepage (Featured & Trending)
 * in the event of backend cold starts, network latency, or offline development.
 * 
 * All IDs, categories, and attributes strictly match the MongoDB database schema
 * and align with `src/utils/productImageMap.js` local assets.
 */

export const FALLBACK_FEATURED_PRODUCTS = [
  {
    _id: '6aae361ba139bd5a38bf90f0',
    name: "Men's Urban Backpack",
    category: 'fashion',
    department: 'accessories',
    subcategory: 'backpacks',
    price: 3499,
    stock: 15,
    description: 'Durable water-resistant backpack engineered for the modern commuter with ergonomic support.',
    images: ['/assets/products/urban-backpack.jpg'],
    isActive: true,
  },
  {
    _id: '6aae361ba139bd5a38bf90ef',
    name: "Men's Minimal Leather Watch",
    category: 'fashion',
    department: 'accessories',
    subcategory: 'watches',
    price: 4999,
    stock: 12,
    description: 'Understated elegance featuring a genuine Italian leather strap and Japanese quartz movement.',
    images: ['/assets/products/minimal-leather-watch.jpg'],
    isActive: true,
  },
  {
    _id: '6aae361ba139bd5a38bf90f4',
    name: 'Swiss Automatic Chronograph Watch',
    category: 'fashion',
    department: 'accessories',
    subcategory: 'watches',
    price: 14999,
    stock: 8,
    description: 'Precision Swiss automatic movement housed in a surgical-grade stainless steel case.',
    images: ['/assets/products/chronograph-watch.jpg'],
    isActive: true,
  },
  {
    _id: '6aae361ba139bd5a38bf90ee',
    name: "Men's Casual Sneakers",
    category: 'fashion',
    department: 'footwear',
    subcategory: 'sneakers',
    price: 2999,
    stock: 20,
    description: 'Everyday cushioned comfort with a sleek contemporary silhouette and reinforced vulcanized sole.',
    images: ['/assets/products/casual-sneakers.jpg'],
    isActive: true,
  },
  {
    _id: '6aae361aa139bd5a38bf90ed',
    name: "Men's Relaxed Fit Hoodie",
    category: 'fashion',
    department: 'men',
    subcategory: 'hoodies-sweatshirts',
    price: 2499,
    stock: 25,
    description: 'Heavyweight 380 GSM brushed organic fleece hoodie tailored for effortless streetwear draping.',
    images: ['/assets/products/relaxed-hoodie.jpg'],
    isActive: true,
  },
]

export const FALLBACK_TRENDING_PRODUCTS = [
  ...FALLBACK_FEATURED_PRODUCTS,
  {
    _id: '6aae361aa139bd5a38bf90ec',
    name: "Men's Classic Denim Jeans",
    category: 'fashion',
    department: 'men',
    subcategory: 'jeans',
    price: 2799,
    stock: 18,
    description: 'Timeless straight-fit denim with classic 5-pocket styling and stretch comfort.',
    images: ['/assets/products/classic-denim-jeans.jpg'],
    isActive: true,
  },
  {
    _id: '6aae361aa139bd5a38bf90eb',
    name: "Men's Slim Fit Oxford Shirt",
    category: 'fashion',
    department: 'men',
    subcategory: 'shirts',
    price: 1999,
    stock: 22,
    description: 'Tailored breathable cotton Oxford shirt perfect for work or smart casual wear.',
    images: ['/assets/products/oxford-shirt.jpg'],
    isActive: true,
  },
  {
    _id: '6aae361aa139bd5a38bf90ea',
    name: "Premium Men's Oversized T-Shirt",
    category: 'fashion',
    department: 'men',
    subcategory: 't-shirts',
    price: 1299,
    stock: 30,
    description: 'Heavy 240 GSM organic combed cotton with dropped shoulders and relaxed modern drape.',
    images: ['/assets/products/oversized-tshirt.jpg'],
    isActive: true,
  },
]
