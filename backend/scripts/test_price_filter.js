const axios = require('axios')
const assert = require('assert')

const BASE_URL = 'http://localhost:5000/api'

async function run() {
  console.log('=== TEST SUITE: BACKEND PRICE FILTER ===\n')

  // Fetch baseline products to know price range in DB
  const base = await axios.get(`${BASE_URL}/products?limit=100`)
  const allProducts = base.data.products
  console.log(`Baseline: ${allProducts.length} active products in DB.`)
  const prices = allProducts.map((p) => p.price).sort((a, b) => a - b)
  const minCatalogPrice = prices[0]
  const maxCatalogPrice = prices[prices.length - 1]
  console.log(`Price range: ₹${minCatalogPrice} to ₹${maxCatalogPrice}\n`)

  // 1. minPrice only
  console.log('Test 1: minPrice only (minPrice=2000)...')
  const r1 = await axios.get(`${BASE_URL}/products?minPrice=2000`)
  assert(r1.status === 200, 'Status 200')
  assert(r1.data.success === true, 'Success true')
  r1.data.products.forEach((p) => {
    assert(p.price >= 2000, `Product price ${p.price} >= 2000`)
  })
  const expectedMinCount = allProducts.filter((p) => p.price >= 2000).length
  assert(r1.data.pagination.totalProducts === expectedMinCount, `totalProducts matches ${expectedMinCount}`)
  console.log(`  ✓ PASS: Found ${r1.data.products.length} products with price >= 2000 (total: ${r1.data.pagination.totalProducts})`)

  // 2. maxPrice only
  console.log('\nTest 2: maxPrice only (maxPrice=1500)...')
  const r2 = await axios.get(`${BASE_URL}/products?maxPrice=1500`)
  assert(r2.status === 200, 'Status 200')
  r2.data.products.forEach((p) => {
    assert(p.price <= 1500, `Product price ${p.price} <= 1500`)
  })
  const expectedMaxCount = allProducts.filter((p) => p.price <= 1500).length
  assert(r2.data.pagination.totalProducts === expectedMaxCount, `totalProducts matches ${expectedMaxCount}`)
  console.log(`  ✓ PASS: Found ${r2.data.products.length} products with price <= 1500 (total: ${r2.data.pagination.totalProducts})`)

  // 3. minPrice + maxPrice
  console.log('\nTest 3: minPrice + maxPrice (1000 - 2500)...')
  const r3 = await axios.get(`${BASE_URL}/products?minPrice=1000&maxPrice=2500`)
  assert(r3.status === 200, 'Status 200')
  r3.data.products.forEach((p) => {
    assert(p.price >= 1000 && p.price <= 2500, `Product price ${p.price} in [1000, 2500]`)
  })
  const expectedRangeCount = allProducts.filter((p) => p.price >= 1000 && p.price <= 2500).length
  assert(r3.data.pagination.totalProducts === expectedRangeCount, `totalProducts matches ${expectedRangeCount}`)
  console.log(`  ✓ PASS: Found ${r3.data.products.length} products in [1000, 2500] (total: ${r3.data.pagination.totalProducts})`)

  // 4. Invalid minPrice and maxPrice (non-numeric ignored safely)
  console.log('\nTest 4: Non-numeric price inputs ignored safely...')
  const r4 = await axios.get(`${BASE_URL}/products?minPrice=abc&maxPrice=xyz`)
  assert(r4.status === 200, 'Status 200')
  assert(r4.data.pagination.totalProducts === allProducts.length, 'All products returned when inputs invalid')
  console.log(`  ✓ PASS: Non-numeric values ignored safely, returned all ${r4.data.pagination.totalProducts} items`)

  // 5. Negative price input ignored safely
  console.log('\nTest 5: Negative price input ignored safely...')
  const r5 = await axios.get(`${BASE_URL}/products?minPrice=-500`)
  assert(r5.status === 200, 'Status 200')
  assert(r5.data.pagination.totalProducts === allProducts.length, 'Negative minPrice ignored safely')
  console.log('  ✓ PASS: Negative minPrice ignored safely')

  // 6. minPrice > maxPrice cleanly handled (returns 0 products safely)
  console.log('\nTest 6: minPrice > maxPrice (minPrice=5000&maxPrice=1000)...')
  const r6 = await axios.get(`${BASE_URL}/products?minPrice=5000&maxPrice=1000`)
  assert(r6.status === 200, 'Status 200')
  assert(r6.data.products.length === 0, 'Zero products returned')
  assert(r6.data.pagination.totalProducts === 0, 'totalProducts is 0')
  assert(r6.data.pagination.totalPages === 1, 'totalPages is 1')
  console.log('  ✓ PASS: Inverted range cleanly returns 0 products without server error')

  // 7. Price + Search combination
  console.log('\nTest 7: Price + Search (search=hoodie&minPrice=1000&maxPrice=5000)...')
  const r7 = await axios.get(`${BASE_URL}/products?search=hoodie&minPrice=1000&maxPrice=5000`)
  assert(r7.status === 200, 'Status 200')
  assert(r7.data.products.length >= 1, 'Found at least 1 matching product')
  r7.data.products.forEach((p) => {
    assert(p.name.toLowerCase().includes('hoodie') || p.brand.toLowerCase().includes('hoodie'))
    assert(p.price >= 1000 && p.price <= 5000)
  })
  console.log(`  ✓ PASS: Price + Search returned ${r7.data.products.length} matching product(s)`)

  // 8. Price + Department combination
  console.log('\nTest 8: Price + Department (department=men&minPrice=1500)...')
  const r8 = await axios.get(`${BASE_URL}/products?department=men&minPrice=1500`)
  assert(r8.status === 200, 'Status 200')
  r8.data.products.forEach((p) => {
    assert(p.department === 'men')
    assert(p.price >= 1500)
  })
  console.log(`  ✓ PASS: Price + Department returned ${r8.data.products.length} matching items`)

  // 9. Price + Sort combination
  console.log('\nTest 9: Price + Sort (sort=price-desc&minPrice=500&maxPrice=3000)...')
  const r9 = await axios.get(`${BASE_URL}/products?sort=price-desc&minPrice=500&maxPrice=3000`)
  assert(r9.status === 200, 'Status 200')
  for (let i = 0; i < r9.data.products.length - 1; i++) {
    assert(r9.data.products[i].price >= r9.data.products[i + 1].price, 'Sorted descending')
  }
  console.log(`  ✓ PASS: Price + Sort returned items in correct descending order`)

  // 10. Price + Pagination combination
  console.log('\nTest 10: Price + Pagination (minPrice=1000&maxPrice=4000&page=1&limit=3)...')
  const r10 = await axios.get(`${BASE_URL}/products?minPrice=1000&maxPrice=4000&page=1&limit=3`)
  assert(r10.status === 200, 'Status 200')
  assert(r10.data.products.length <= 3, 'Respects limit')
  assert(r10.data.pagination.page === 1, 'Page 1')
  assert(r10.data.pagination.limit === 3, 'Limit 3')
  assert(typeof r10.data.pagination.totalProducts === 'number')
  console.log(`  ✓ PASS: Price + Pagination returned page 1 of ${r10.data.pagination.totalPages} with limit 3`)

  console.log('\n=== ALL PRICE FILTER TESTS PASSED ===')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
