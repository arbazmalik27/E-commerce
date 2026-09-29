const http = require('http')
const assert = require('assert')
const mongoose = require('mongoose')
require('dotenv').config()
const app = require('../src/app')
const Product = require('../src/models/Product')

let server
let baseUrl
let passed = 0
let failed = 0

function testAssert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

function request(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) })
        } catch {
          resolve({ status: res.statusCode, data: body })
        }
      })
    }).on('error', reject)
  })
}

async function runTests() {
  console.log('=== TEST SUITE: ADVANCED SEARCH & FILTERS ===\n')

  await mongoose.connect(process.env.MONGODB_URI)
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://localhost:${port}/api`
      console.log(`Ephemeral test server running at ${baseUrl}\n`)
      resolve()
    })
  })

  // Baseline check
  const baselineRes = await request('/products?limit=100')
  testAssert(baselineRes.status === 200, 'Baseline status is 200')
  testAssert(baselineRes.data.success === true, 'Baseline success is true')
  const totalInDb = baselineRes.data.pagination.totalProducts
  testAssert(totalInDb > 0, `DB has ${totalInDb} active products`)
  testAssert(Array.isArray(baselineRes.data.brands) && baselineRes.data.brands.length > 0, 'Brands metadata returned in response')

  // 1. EXACT SEARCH
  console.log('\n[1] Exact Search:')
  const exactRes = await request('/products?search=Premium%20Men%27s%20Oversized%20T-Shirt')
  testAssert(exactRes.status === 200, 'Exact search status 200')
  testAssert(exactRes.data.products.some((p) => p.name === "Premium Men's Oversized T-Shirt"), 'Exact match found by full name')

  // 2. PARTIAL SEARCH
  console.log('\n[2] Partial Search:')
  const partialRes = await request('/products?search=Oversized')
  testAssert(partialRes.status === 200, 'Partial search status 200')
  testAssert(partialRes.data.products.length >= 1, 'Partial search returned matching items')
  testAssert(partialRes.data.products.some((p) => p.name.includes('Oversized')), 'Item contains partial query')

  // 3. CASE-INSENSITIVE SEARCH
  console.log('\n[3] Case-Insensitive Search:')
  const lowerRes = await request('/products?search=zara')
  const upperRes = await request('/products?search=ZARA')
  testAssert(lowerRes.status === 200 && upperRes.status === 200, 'Case-insensitive search returns 200')
  testAssert(lowerRes.data.pagination.totalProducts === upperRes.data.pagination.totalProducts, 'Lowercase and uppercase return identical count')
  testAssert(lowerRes.data.pagination.totalProducts >= 1, 'Found ZARA products')

  // 4. SEARCH ACROSS BRAND, SUBCATEGORY, DEPARTMENT, DESCRIPTION
  console.log('\n[4] Search Across Diverse Fashion Fields:')
  const brandSearch = await request('/products?search=Northline')
  testAssert(brandSearch.data.products.length >= 1 && brandSearch.data.products.every(p => p.brand === 'Northline' || p.name.includes('Northline')), 'Search by brand works')

  const subcatSearch = await request('/products?search=hoodies-sweatshirts')
  testAssert(subcatSearch.data.products.length >= 1, 'Search by subcategory slug works')

  const deptSearch = await request('/products?search=footwear')
  testAssert(deptSearch.data.products.length >= 1 && deptSearch.data.products.every(p => p.department === 'footwear' || p.name.toLowerCase().includes('footwear')), 'Search by department works')

  // 5. NO-RESULT SEARCH
  console.log('\n[5] No-Result Search:')
  const noResultRes = await request('/products?search=supercalifragilistic123')
  testAssert(noResultRes.status === 200, 'No-result search status 200')
  testAssert(noResultRes.data.products.length === 0, 'No products returned')
  testAssert(noResultRes.data.pagination.totalProducts === 0, 'totalProducts is 0')

  // 6. CATEGORY FILTER
  console.log('\n[6] Category Filter:')
  const catFashion = await request('/products?category=fashion')
  testAssert(catFashion.status === 200, 'Fashion category status 200')
  testAssert(catFashion.data.pagination.totalProducts === totalInDb, 'All items are fashion')
  const catInvalid = await request('/products?category=electronics')
  testAssert(catInvalid.status === 200, 'Invalid category status 200')
  testAssert(catInvalid.data.pagination.totalProducts === 0, 'Invalid category returns 0 products safely')

  // 7. DEPARTMENT FILTER
  console.log('\n[7] Department Filter:')
  const menDept = await request('/products?department=men')
  testAssert(menDept.status === 200, 'Department men status 200')
  testAssert(menDept.data.products.length >= 1, 'Found men products')
  testAssert(menDept.data.products.every(p => p.department === 'men'), 'All returned products have department men')

  // 8. ALIAS NORMALIZATION (mens -> men)
  console.log('\n[8] Alias Normalization:')
  const mensAlias = await request('/products?department=mens')
  testAssert(mensAlias.status === 200, 'mens alias returns 200')
  testAssert(mensAlias.data.pagination.totalProducts === menDept.data.pagination.totalProducts, 'mens normalized to men correctly')

  // 9. SUBCATEGORY FILTER
  console.log('\n[9] Subcategory Filter:')
  const shirtsSub = await request('/products?department=men&subcategory=shirts')
  testAssert(shirtsSub.status === 200, 'Subcategory shirts status 200')
  testAssert(shirtsSub.data.products.length >= 1, 'Found men shirts')
  testAssert(shirtsSub.data.products.every(p => p.department === 'men' && p.subcategory === 'shirts'), 'All items are men shirts')

  // 10. INCOMPATIBLE CHILD FILTER RESET / INVALIDATION
  console.log('\n[10] Incompatible Taxonomy Combinations:')
  const incompatibleRes = await request('/products?department=men&subcategory=girls')
  testAssert(incompatibleRes.status === 200, 'Incompatible taxonomy status 200')
  testAssert(incompatibleRes.data.products.length === 0, 'Incompatible taxonomy safely returns 0 products')

  // 11. PRICE RANGE FILTER
  console.log('\n[11] Price Range Filter:')
  const priceRangeRes = await request('/products?minPrice=1000&maxPrice=3000')
  testAssert(priceRangeRes.status === 200, 'Price range status 200')
  testAssert(priceRangeRes.data.products.length >= 1, 'Products found in range 1000-3000')
  testAssert(priceRangeRes.data.products.every(p => p.price >= 1000 && p.price <= 3000), 'All products within 1000-3000')

  // 12. STOCK / AVAILABILITY FILTER
  console.log('\n[12] Stock / Availability Filter:')
  const inStockRes = await request('/products?availability=in-stock')
  testAssert(inStockRes.status === 200, 'in-stock filter status 200')
  testAssert(inStockRes.data.products.every(p => p.stock > 0), 'All returned items have stock > 0')

  const inStockAlias = await request('/products?inStock=true')
  testAssert(inStockAlias.data.pagination.totalProducts === inStockRes.data.pagination.totalProducts, 'inStock=true behaves identically to availability=in-stock')

  // 13. BRAND FILTER
  console.log('\n[13] Brand Filter:')
  const brandRes = await request('/products?brand=Levi%27s')
  testAssert(brandRes.status === 200, 'Brand Levi\'s status 200')
  testAssert(brandRes.data.products.length >= 1, 'Found Levi\'s items')
  testAssert(brandRes.data.products.every(p => p.brand === "Levi's"), 'All items are Levi\'s')

  const multiBrandRes = await request('/products?brand=Levi%27s,RedTape')
  testAssert(multiBrandRes.status === 200, 'Multi-brand status 200')
  testAssert(multiBrandRes.data.products.every(p => p.brand === "Levi's" || p.brand === 'RedTape'), 'Multi-brand matches both')

  // 14. SORTING
  console.log('\n[14] Server-Side Sorting:')
  const ascRes = await request('/products?sort=price-asc&limit=50')
  for (let i = 0; i < ascRes.data.products.length - 1; i++) {
    testAssert(ascRes.data.products[i].price <= ascRes.data.products[i + 1].price, `Price asc: ${ascRes.data.products[i].price} <= ${ascRes.data.products[i + 1].price}`)
  }

  const descRes = await request('/products?sort=price-desc&limit=50')
  for (let i = 0; i < descRes.data.products.length - 1; i++) {
    testAssert(descRes.data.products[i].price >= descRes.data.products[i + 1].price, `Price desc: ${descRes.data.products[i].price} >= ${descRes.data.products[i + 1].price}`)
  }

  // 15. COMBINATIONS
  console.log('\n[15] Complex Combinations:')
  const comboRes = await request('/products?search=shirt&department=men&minPrice=500&maxPrice=3000&sort=price-asc&page=1&limit=5')
  testAssert(comboRes.status === 200, 'Combo query status 200')
  testAssert(comboRes.data.products.length <= 5, 'Respects limit 5')
  testAssert(comboRes.data.products.every(p => p.department === 'men'), 'All items in combo are men department')
  testAssert(comboRes.data.products.every(p => p.price >= 500 && p.price <= 3000), 'All items in combo within price bounds')

  // 16. SANITIZATION OF MALFORMED INPUTS
  console.log('\n[16] Sanitization of Malformed Inputs:')
  const malformedRes = await request('/products?page=-5&limit=999999&minPrice=abc&maxPrice=-100&sort=INVALID_INJECTION')
  testAssert(malformedRes.status === 200, 'Malformed input handled safely without server crash')
  testAssert(malformedRes.data.pagination.page === 1, 'Negative page defaulted to 1')
  testAssert(malformedRes.data.pagination.limit <= 100, 'Extreme limit capped at 100')

  // 17. BATCH ID RESOLUTION (RECENTLY VIEWED SUPPORT)
  console.log('\n[17] Batch ID Resolution:')
  const sampleProducts = baselineRes.data.products.slice(0, 3)
  const sampleIds = sampleProducts.map((p) => p._id)
  const idsRes = await request(`/products?ids=${sampleIds.join(',')}`)
  testAssert(idsRes.status === 200, 'Batch IDs status 200')
  testAssert(idsRes.data.products.length === sampleIds.length, `Resolved all ${sampleIds.length} requested IDs`)
  testAssert(idsRes.data.products.every((p) => sampleIds.includes(p._id)), 'Returned products match requested IDs')
}

runTests()
  .then(() => {
    console.log(`\n========================================`)
    console.log(`TEST RESULTS: ${passed} passed, ${failed} failed.`)
    console.log(`========================================\n`)
    server.close()
    mongoose.disconnect()
    process.exit(failed > 0 ? 1 : 0)
  })
  .catch((err) => {
    console.error('Fatal test error:', err)
    if (server) server.close()
    mongoose.disconnect()
    process.exit(1)
  })
