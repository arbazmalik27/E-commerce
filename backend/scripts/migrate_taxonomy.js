const mongoose = require('mongoose')
require('dotenv').config()
const Product = require('../src/models/Product')
const { isValidSubcategory } = require('../src/constants/taxonomy')

// Explicit, deterministic mapping based on current database records
const KNOWN_CLASSIFICATIONS = [
  {
    nameMatch: "Premium Men's Oversized T-Shirt",
    category: 'fashion',
    department: 'men',
    subcategory: 't-shirts',
  },
  {
    nameMatch: "Men's Slim Fit Oxford Shirt",
    category: 'fashion',
    department: 'men',
    subcategory: 'shirts',
  },
  {
    nameMatch: "Men's Classic Denim Jeans",
    category: 'fashion',
    department: 'men',
    subcategory: 'jeans',
  },
  {
    nameMatch: "Men's Relaxed Fit Hoodie",
    category: 'fashion',
    department: 'men',
    subcategory: 'hoodies-sweatshirts',
  },
  {
    nameMatch: "Men's Casual Sneakers",
    category: 'fashion',
    department: 'footwear',
    subcategory: 'sneakers',
  },
  {
    nameMatch: "Men's Minimal Leather Watch",
    category: 'fashion',
    department: 'accessories',
    subcategory: 'watches',
  },
  {
    nameMatch: "Men's Urban Backpack",
    category: 'fashion',
    department: 'accessories',
    subcategory: 'backpacks',
  },
  {
    nameMatch: "Wireless Noise-Cancelling Earbuds",
    category: 'electronics',
    department: 'audio',
    subcategory: 'earbuds',
  },
  {
    nameMatch: "Premium Over-Ear Wireless Headphones",
    category: 'electronics',
    department: 'audio',
    subcategory: 'headphones',
  },
  {
    nameMatch: "Swiss Automatic Chronograph Watch",
    category: 'fashion',
    department: 'accessories',
    subcategory: 'watches',
  },
  {
    nameMatch: "Portable Bluetooth Speaker",
    category: 'electronics',
    department: 'audio',
    subcategory: 'bluetooth-speakers',
  },
  {
    nameMatch: "Mechanical RGB Keyboard",
    category: 'electronics',
    department: 'computers',
    subcategory: 'keyboards',
  },
  {
    nameMatch: "Wireless Ergonomic Mouse",
    category: 'electronics',
    department: 'computers',
    subcategory: 'mice',
  },
  {
    nameMatch: "Gaming Headset",
    category: 'electronics',
    department: 'gaming',
    subcategory: 'gaming-headsets',
  },
  {
    nameMatch: "Fast-Charging Power Bank",
    category: 'electronics',
    department: 'mobiles-tablets',
    subcategory: 'power-banks',
  },
]

async function migrateTaxonomy() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment.')
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB. Starting taxonomy migration...')

  const allProducts = await Product.find({})
  console.log(`Found ${allProducts.length} total products in database.`)

  let updatedCount = 0
  let unclassifiedCount = 0

  for (const product of allProducts) {
    const matched = KNOWN_CLASSIFICATIONS.find((c) => c.nameMatch === product.name)

    if (matched) {
      // Validate with taxonomy config before applying
      if (!isValidSubcategory(matched.category, matched.department, matched.subcategory)) {
        console.error(`Invalid taxonomy configuration for: ${product.name}`)
        continue
      }

      product.category = matched.category
      product.department = matched.department
      product.subcategory = matched.subcategory
      await product.save()
      console.log(`[CLASSIFIED] "${product.name}" -> ${matched.category} / ${matched.department} / ${matched.subcategory}`)
      updatedCount++
    } else {
      // Handle as unclassified legacy record safely
      product.department = null
      product.subcategory = null
      await product.save()
      console.log(`[UNCLASSIFIED LEGACY] "${product.name}" (${product._id}) -> department: null, subcategory: null`)
      unclassifiedCount++
    }
  }

  console.log('\n--- Migration Complete ---')
  console.log(`Classified: ${updatedCount}`)
  console.log(`Unclassified / Legacy: ${unclassifiedCount}`)

  await mongoose.disconnect()
}

migrateTaxonomy().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
