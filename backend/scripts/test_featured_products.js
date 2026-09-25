const axios = require('axios')
const assert = require('assert')

const BASE_URL = 'http://localhost:5000/api'

async function run() {
  console.log('=== TEST SUITE: FEATURED PRODUCTS API CONTRACT & CURATION ===\n')

  // 1. Health Check
  console.log('Test 1: Backend Health Check...')
  const healthRes = await axios.get(`${BASE_URL}/health`)
  assert.strictEqual(healthRes.status, 200, 'Health endpoint must return 200')
  assert.strictEqual(healthRes.data.status, 'ok', 'Health status must be "ok"')
  console.log('  ✓ PASS: Backend health endpoint is active and healthy\n')

  // 2. Featured Products Request: GET /api/products?category=fashion
  console.log('Test 2: Featured Products API Request: GET /api/products?category=fashion...')
  const res = await axios.get(`${BASE_URL}/products`, { params: { category: 'fashion' } })
  assert.strictEqual(res.status, 200, 'HTTP status must be 200')
  assert.strictEqual(res.data.success, true, 'Response must have success: true')
  assert(Array.isArray(res.data.products), 'Response must have products array')
  assert(res.data.pagination, 'Response must have pagination object')
  assert(typeof res.data.pagination.totalProducts === 'number', 'pagination.totalProducts must be a number')
  console.log(`  ✓ PASS: API returned ${res.data.products.length} fashion products (total: ${res.data.pagination.totalProducts})\n`)

  // 3. Product Data Shape & Integrity
  console.log('Test 3: Fashion Product Data Integrity for Showcase Rendering...')
  const activeProducts = res.data.products.filter((p) => p.isActive !== false)
  assert(activeProducts.length > 0, 'Must have at least 1 active fashion product')

  for (const product of activeProducts) {
    assert(product._id, `Product ${product.name} must have _id`)
    assert.strictEqual(product.category, 'fashion', `Product ${product.name} must belong to category: fashion`)
    assert(typeof product.name === 'string' && product.name.trim().length > 0, 'Product must have valid name')
    assert(typeof product.price === 'number' && product.price >= 0, 'Product must have non-negative price')
    assert(Array.isArray(product.images) && product.images.length > 0, 'Product must have non-empty images array')
    assert(typeof product.images[0] === 'string' && product.images[0].length > 0, 'Product images[0] must be non-empty string')
  }
  console.log(`  ✓ PASS: All ${activeProducts.length} active products have required fields (_id, name, price, images)\n`)

  // 4. FeaturedProducts Frontend Curation Logic Simulation
  console.log('Test 4: Frontend Curation Logic Simulation (5-Card Fan Stage)...')
  const accessory =
    activeProducts.find((p) => /watch|sunglass|wallet|belt/i.test(p.name)) ||
    activeProducts.find((p) => p.department === 'accessories')

  const footwear =
    activeProducts.find((p) => /sneaker|shoe|boot|heel/i.test(p.name)) ||
    activeProducts.find((p) => p.department === 'footwear' && p._id !== accessory?._id)

  const apparel =
    activeProducts.find((p) => /shirt|top|hoodie|jacket/i.test(p.name)) ||
    activeProducts[0]

  const editorial =
    activeProducts.find((p) => /dress|kurti|saree|skirt|blazer/i.test(p.name)) ||
    activeProducts.find((p) => (p.department === 'women' || p.department === 'kids') && p._id !== apparel?._id)

  const bag =
    activeProducts.find((p) => /backpack|bag|coat/i.test(p.name)) ||
    activeProducts.find((p) => p.department === 'accessories' && p._id !== accessory?._id)

  const rawCandidates = [accessory, footwear, apparel, editorial, bag]
  const selectedIds = new Set()
  const result = []

  for (const item of rawCandidates) {
    if (item && !selectedIds.has(item._id)) {
      selectedIds.add(item._id)
      result.push(item)
    }
  }

  if (result.length < 5) {
    for (const p of activeProducts) {
      if (result.length >= 5) break
      if (!selectedIds.has(p._id)) {
        selectedIds.add(p._id)
        result.push(p)
      }
    }
  }

  assert.strictEqual(result.length, 5, 'Curated showcase must assemble exactly 5 distinct items')
  assert.strictEqual(selectedIds.size, 5, 'All 5 curated showcase items must have unique IDs')
  console.log(`  ✓ PASS: Curation algorithm assembled 5 distinct flagship items:`)
  result.forEach((item, idx) => console.log(`     [${idx + 1}] ${item.name} (${item.department || 'apparel'}) - ₹${item.price}`))

  console.log('\n=== ALL FEATURED PRODUCTS TESTS PASSED ===')
}

run().catch((err) => {
  console.error('Test execution failed:', err.message)
  process.exit(1)
})
