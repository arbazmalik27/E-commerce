/**
 * Shared Product Taxonomy Configuration (Frontend)
 * 
 * Defines the 3-tier product hierarchy:
 * Category -> Department -> Subcategory
 */

export const TAXONOMY = {
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

export const isValidCategory = (category) => {
  if (!category || typeof category !== 'string') return false
  return Boolean(TAXONOMY[category.toLowerCase()])
}

export const isValidDepartment = (category, department) => {
  if (!isValidCategory(category) || !department || typeof department !== 'string') return false
  const catObj = TAXONOMY[category.toLowerCase()]
  const deptKey = department.toLowerCase()
  const normalizedDept = deptKey === 'mens' ? 'men' : deptKey === 'womens' ? 'women' : deptKey
  return Boolean(catObj?.departments?.[normalizedDept])
}

export const isValidSubcategory = (category, department, subcategory) => {
  if (!isValidDepartment(category, department) || !subcategory || typeof subcategory !== 'string') return false
  const catObj = TAXONOMY[category.toLowerCase()]
  const deptKey = department.toLowerCase()
  const normalizedDept = deptKey === 'mens' ? 'men' : deptKey === 'womens' ? 'women' : deptKey
  const deptObj = catObj?.departments?.[normalizedDept]
  return Boolean(deptObj?.subcategories?.[subcategory.toLowerCase()])
}

export const getCategoryLabel = (category) => {
  if (!category || typeof category !== 'string') return ''
  return TAXONOMY[category.toLowerCase()]?.name || category
}

export const getDepartmentLabel = (category, department) => {
  if (!category || !department) return department || ''
  if (typeof department !== 'string') return ''
  const deptKey = department.toLowerCase()
  const normalizedDept = deptKey === 'mens' ? 'men' : deptKey === 'womens' ? 'women' : deptKey
  return (
    TAXONOMY[category.toLowerCase()]?.departments?.[normalizedDept]?.name ||
    TAXONOMY[category.toLowerCase()]?.departments?.[deptKey]?.name ||
    department
  )
}

export const getSubcategoryLabel = (category, department, subcategory) => {
  if (!category || !department || !subcategory) return subcategory || ''
  if (typeof department !== 'string' || typeof subcategory !== 'string') return subcategory || ''
  const deptKey = department.toLowerCase()
  const normalizedDept = deptKey === 'mens' ? 'men' : deptKey === 'womens' ? 'women' : deptKey
  const subcatKey = subcategory.toLowerCase()

  return (
    TAXONOMY[category.toLowerCase()]?.departments?.[normalizedDept]?.subcategories?.[subcatKey] ||
    TAXONOMY[category.toLowerCase()]?.departments?.[deptKey]?.subcategories?.[subcatKey] ||
    subcategory
  )
}
