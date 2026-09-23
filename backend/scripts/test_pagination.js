const axios = require('axios')
const assert = require('assert')

const BASE_URL = 'http://localhost:5000/api'

async function run() {
  console.log('=== TEST SUITE: BACKEND PAGINATION ===\n')

  // 1. Default pagination
  console.log('Test 1: Default GET /api/products...')
  const r1 = await axios.get(`${BASE_URL}/products`)
  assert(r1.status === 200, 'Status 200')
  assert(r1.data.success === true, 'Success true')
  assert(Array.isArray(r1.data.products), 'Products is array')
  assert(r1.data.pagination, 'Pagination object present')
  assert(r1.data.pagination.page === 1, 'Default page is 1')
  assert(r1.data.pagination.limit === 12, 'Default limit is 12')
  assert(typeof r1.data.pagination.totalProducts === 'number', 'totalProducts is number')
  assert(typeof r1.data.pagination.totalPages === 'number', 'totalPages is number')
  console.log(`  ✓ PASS: Default pagination returned ${r1.data.products.length} products (total: ${r1.data.pagination.totalProducts}, pages: ${r1.data.pagination.totalPages})`)

  // 2. Custom page and limit
  console.log('\nTest 2: Page 1 with limit 4...')
  const r2 = await axios.get(`${BASE_URL}/products?page=1&limit=4`)
  assert(r2.data.products.length === 4, 'Returns 4 products')
  assert(r2.data.pagination.page === 1, 'Page is 1')
  assert(r2.data.pagination.limit === 4, 'Limit is 4')
  assert(r2.data.pagination.hasNextPage === true, 'Has next page')
  assert(r2.data.pagination.hasPreviousPage === false, 'No previous page on page 1')
  const page1First = r2.data.products[0]._id
  console.log(`  ✓ PASS: Page 1 returned 4 items, hasNextPage: true, hasPrevPage: false`)

  console.log('\nTest 3: Page 2 with limit 4...')
  const r3 = await axios.get(`${BASE_URL}/products?page=2&limit=4`)
  assert(r3.data.products.length === 4, 'Returns 4 products')
  assert(r3.data.pagination.page === 2, 'Page is 2')
  assert(r3.data.pagination.hasPreviousPage === true, 'Has previous page on page 2')
  const page2First = r3.data.products[0]._id
  assert(page1First !== page2First, 'Page 1 and Page 2 products are distinct')
  console.log(`  ✓ PASS: Page 2 returned distinct items, hasPrevPage: true`)

  // 3. Fallback for invalid page and limit
  console.log('\nTest 4: Invalid parameters fallback...')
  const r4 = await axios.get(`${BASE_URL}/products?page=-3&limit=abc`)
  assert(r4.data.pagination.page === 1, 'Invalid page falls back to 1')
  assert(r4.data.pagination.limit === 12, 'Invalid limit falls back to 12')
  console.log('  ✓ PASS: Invalid page/limit sanitized to page=1, limit=12')

  // 4. Limit capping
  console.log('\nTest 5: Limit capping...')
  const r5 = await axios.get(`${BASE_URL}/products?limit=500`)
  assert(r5.data.pagination.limit === 100, 'Limit capped at 100')
  console.log('  ✓ PASS: Limit 500 capped at 100')

  // 5. Search + pagination
  console.log('\nTest 6: Search + pagination...')
  const r6 = await axios.get(`${BASE_URL}/products?search=hoodie&page=1&limit=5`)
  assert(r6.data.products.length === 1, 'Search finds matching product')
  assert(r6.data.products[0].name.toLowerCase().includes('hoodie'), 'Contains hoodie')
  assert(r6.data.pagination.totalProducts === 1, 'totalProducts is 1')
  assert(r6.data.pagination.totalPages === 1, 'totalPages is 1')
  console.log('  ✓ PASS: Search + pagination returned correct metadata')

  // 6. Sort + pagination
  console.log('\nTest 7: Sort price-asc + pagination...')
  const r7 = await axios.get(`${BASE_URL}/products?sort=price-asc&page=1&limit=3`)
  assert(r7.data.products.length === 3, 'Returns 3 items')
  assert(r7.data.products[0].price <= r7.data.products[1].price, 'Sorted by price ascending')
  assert(r7.data.products[1].price <= r7.data.products[2].price, 'Sorted by price ascending')
  console.log(`  ✓ PASS: Server-side sort applied correctly (prices: ${r7.data.products.map(p => p.price).join(', ')})`)

  console.log('\n=== ALL PAGINATION TESTS PASSED ===')
}

run().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
