/**
 * Shared Product Taxonomy Configuration (Backend)
 * 
 * Defines the 3-tier product hierarchy:
 * Category -> Department -> Subcategory
 */

const TAXONOMY = {
  fashion: {
    id: 'fashion',
    name: 'Fashion',
    departments: {
      men: {
        id: 'men',
        name: 'Men',
        subcategories: {
          't-shirts': 'T-Shirts',
          'shirts': 'Shirts',
          'jeans': 'Jeans',
          'trousers': 'Trousers',
          'hoodies-sweatshirts': 'Hoodies & Sweatshirts',
          'jackets-coats': 'Jackets & Coats',
          'shorts': 'Shorts',
          'ethnic-wear': 'Ethnic Wear',
          'suits-blazers': 'Suits & Blazers',
        },
      },
      women: {
        id: 'women',
        name: 'Women',
        subcategories: {
          'tops': 'Tops',
          'dresses': 'Dresses',
          'jeans': 'Jeans',
          'trousers': 'Trousers',
          'skirts': 'Skirts',
          'kurtis': 'Kurtis',
          'sarees': 'Sarees',
          'ethnic-wear': 'Ethnic Wear',
          'jackets-coats': 'Jackets & Coats',
        },
      },
      kids: {
        id: 'kids',
        name: 'Kids',
        subcategories: {
          'boys': 'Boys',
          'girls': 'Girls',
          'kids-clothing': 'Kids Clothing',
          'kids-footwear': 'Kids Footwear',
          'kids-accessories': 'Kids Accessories',
        },
      },
      footwear: {
        id: 'footwear',
        name: 'Footwear',
        subcategories: {
          'sneakers': 'Sneakers',
          'running-shoes': 'Running Shoes',
          'casual-shoes': 'Casual Shoes',
          'formal-shoes': 'Formal Shoes',
          'boots': 'Boots',
          'sandals': 'Sandals',
          'heels': 'Heels',
          'flats': 'Flats',
          'slippers': 'Slippers',
        },
      },
      accessories: {
        id: 'accessories',
        name: 'Accessories',
        subcategories: {
          'watches': 'Watches',
          'sunglasses': 'Sunglasses',
          'bags': 'Bags',
          'backpacks': 'Backpacks',
          'wallets': 'Wallets',
          'belts': 'Belts',
          'caps-hats': 'Caps & Hats',
          'jewellery': 'Jewellery',
        },
      },
      'beauty-fragrance': {
        id: 'beauty-fragrance',
        name: 'Beauty & Fragrance',
        subcategories: {
          'perfumes': 'Perfumes',
          'deodorants': 'Deodorants',
          'skincare': 'Skincare',
          'grooming': 'Grooming',
          'makeup': 'Makeup',
        },
      },
    },
  },
}

const isValidCategory = (category) => {
  if (!category || typeof category !== 'string') return false
  return Boolean(TAXONOMY[category.toLowerCase()])
}

const isValidDepartment = (category, department) => {
  if (!isValidCategory(category) || !department || typeof department !== 'string') return false
  const catObj = TAXONOMY[category.toLowerCase()]
  return Boolean(catObj.departments[department.toLowerCase()])
}

const isValidSubcategory = (category, department, subcategory) => {
  if (!isValidDepartment(category, department) || !subcategory || typeof subcategory !== 'string') return false
  const catObj = TAXONOMY[category.toLowerCase()]
  const deptObj = catObj.departments[department.toLowerCase()]
  return Boolean(deptObj.subcategories[subcategory.toLowerCase()])
}

module.exports = {
  TAXONOMY,
  isValidCategory,
  isValidDepartment,
  isValidSubcategory,
}
