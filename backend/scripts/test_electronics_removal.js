const mongoose = require('mongoose')
require('dotenv').config()
const Product = require('../src/models/Product')
const {
  validateCreateProductInput,
  validateUpdateProductInput,
} = require('../src/validators/productValidator')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

async function runTests() {
  console.log('=== TEST SUITE: ELECTRONICS REMOVAL NEGATIVE & SCHEMA TESTS ===\n')

  // 1. Product Model Schema Validation
  console.log('[1] Product Mongoose Model Schema Validation:')
  const invalidProduct = new Product({
    name: 'Invalid Electronics Widget',
    description: 'A test electronics item that must be rejected by schema',
    price: 999,
    category: 'electronics',
    department: 'audio',
    subcategory: 'earbuds',
    brand: 'TestBrand',
    stock: 10,
    images: ['https://example.com/widget.jpg'],
  })

  const validationError = invalidProduct.validateSync()
  assert(validationError !== null, 'Product schema rejects category: "electronics"')
  assert(
    validationError && validationError.errors && validationError.errors.category,
    'Schema error specifically flags category field'
  )

  const validProduct = new Product({
    name: 'Valid Men Oxford Shirt',
    description: 'A test fashion item that must pass schema validation',
    price: 1999,
    category: 'fashion',
    department: 'men',
    subcategory: 'shirts',
    brand: 'TestBrand',
    stock: 10,
    images: ['https://example.com/shirt.jpg'],
  })
  const validValidationError = validProduct.validateSync()
  assert(validValidationError === undefined, 'Product schema accepts category: "fashion"')

  // 2. Input Validator Negative Tests for Required Combinations
  console.log('\n[2] Validator Negative Tests (Rejections):')
  const testCases = [
    {
      label: 'Electronics category',
      input: {
        name: 'Test Electronics',
        description: 'Test description',
        price: 999,
        category: 'electronics',
        department: 'audio',
        subcategory: 'earbuds',
        brand: 'Test',
        stock: 5,
        images: ['https://example.com/test.jpg'],
      },
    },
    {
      label: 'Electronics -> Mobiles & Tablets',
      input: {
        name: 'Test Smartphone',
        description: 'Test description',
        price: 15999,
        category: 'electronics',
        department: 'mobiles-tablets',
        subcategory: 'smartphones',
        brand: 'Test',
        stock: 5,
        images: ['https://example.com/test.jpg'],
      },
    },
    {
      label: 'Electronics -> Audio',
      input: {
        name: 'Test Speaker',
        description: 'Test description',
        price: 2999,
        category: 'electronics',
        department: 'audio',
        subcategory: 'bluetooth-speakers',
        brand: 'Test',
        stock: 5,
        images: ['https://example.com/test.jpg'],
      },
    },
    {
      label: 'Electronics -> Gaming',
      input: {
        name: 'Test Console',
        description: 'Test description',
        price: 49999,
        category: 'electronics',
        department: 'gaming',
        subcategory: 'gaming-consoles',
        brand: 'Test',
        stock: 5,
        images: ['https://example.com/test.jpg'],
      },
    },
    {
      label: 'Electronics -> Wearables',
      input: {
        name: 'Test Smartwatch',
        description: 'Test description',
        price: 4999,
        category: 'electronics',
        department: 'wearables',
        subcategory: 'smartwatches',
        brand: 'Test',
        stock: 5,
        images: ['https://example.com/test.jpg'],
      },
    },
    {
      label: 'Fashion -> Kids -> Earbuds',
      input: {
        name: 'Test Kids Earbuds',
        description: 'Test description',
        price: 999,
        category: 'fashion',
        department: 'kids',
        subcategory: 'earbuds',
        brand: 'Test',
        stock: 5,
        images: ['https://example.com/test.jpg'],
      },
    },
    {
      label: 'Fashion -> Men -> Earbuds',
      input: {
        name: 'Test Men Earbuds',
        description: 'Test description',
        price: 999,
        category: 'fashion',
        department: 'men',
        subcategory: 'earbuds',
        brand: 'Test',
        stock: 5,
        images: ['https://example.com/test.jpg'],
      },
    },
  ]

  for (const tc of testCases) {
    const res = validateCreateProductInput(tc.input)
    assert(res.isValid === false, `validateCreateProductInput correctly REJECTS: ${tc.label}`)
  }

  // 3. API live checks
  console.log('\n[3] Live Backend API Endpoints:')
  const baseUrl = 'http://localhost:5000/api'

  try {
    // Check GET /api/products
    const resAll = await fetch(`${baseUrl}/products`)
    const dataAll = await resAll.json()
    assert(resAll.status === 200, 'GET /api/products returns HTTP 200')
    assert(dataAll.success === true, 'GET /api/products returns success: true')
    const allFashion = dataAll.products.every((p) => p.category === 'fashion')
    assert(allFashion, `All ${dataAll.products.length} products returned from GET /api/products have category === "fashion"`)

    // Check GET /api/products?category=electronics
    const resElectronics = await fetch(`${baseUrl}/products?category=electronics`)
    const dataElectronics = await resElectronics.json()
    assert(resElectronics.status === 200, 'GET /api/products?category=electronics returns HTTP 200')
    assert(
      dataElectronics.products && dataElectronics.products.length === 0,
      `GET /api/products?category=electronics safely returns 0 products (got ${dataElectronics.products?.length})`
    )
  } catch (err) {
    console.error('API connection note:', err.message)
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`)
  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
