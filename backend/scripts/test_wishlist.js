/**
 * test_wishlist.js
 * Comprehensive backend QA for the Customer Wishlist module.
 * Covers: auth protection, CRUD, duplicates, response shape,
 *         ownership isolation, stale product, multi-product.
 */

const http = require('http')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const mongoose = require('mongoose')

const BASE_URL = 'http://localhost:5000'

let passed = 0
let failed = 0
const failures = []

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
    failures.push(message)
  }
}

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (cookie) options.headers['Cookie'] = cookie

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch { json = data }
        resolve({ status: res.statusCode, headers: res.headers, data: json })
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function getCookie(res) {
  const setCookie = res.headers['set-cookie']
  if (!setCookie || setCookie.length === 0) return ''
  return setCookie[0].split(';')[0]
}

async function run() {
  console.log('=== TEST SUITE: CUSTOMER WISHLIST API QA ===\n')

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI)
    } catch {}
  }

  const ts = Date.now()
  const userAEmail = `wishlist_a_${ts}@example.com`
  const userBEmail = `wishlist_b_${ts}@example.com`
  const password = 'Password123!'

  // ── Fetch real product IDs ─────────────────────────────────────────────────
  console.log('Setup: Fetching real product IDs...')
  const productsRes = await request('GET', '/api/products?limit=5')
  assert(productsRes.status === 200, 'Products endpoint accessible')
  const products = (productsRes.data.products || []).filter(p => p.isActive !== false)
  assert(products.length >= 2, `At least 2 active products available (found ${products.length})`)

  const PRODUCT_A = products[0]?._id
  const PRODUCT_B = products[1]?._id
  console.log(`  Product A: ${PRODUCT_A}`)
  console.log(`  Product B: ${PRODUCT_B}\n`)

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Unauthenticated access is blocked
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Test 1: Unauthenticated access blocked...')
  const unauthGet = await request('GET', '/api/users/wishlist')
  assert(unauthGet.status === 401, 'GET /api/users/wishlist blocked without auth (401)')

  const unauthPost = await request('POST', `/api/users/wishlist/${PRODUCT_A}`)
  assert(unauthPost.status === 401, 'POST /api/users/wishlist/:id blocked without auth (401)')

  const unauthDel = await request('DELETE', `/api/users/wishlist/${PRODUCT_A}`)
  assert(unauthDel.status === 401, 'DELETE /api/users/wishlist/:id blocked without auth (401)')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Register & authenticate User A
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 2: Register & authenticate User A...')
  const regA = await request('POST', '/api/auth/register', { name: 'Wishlist Alice', email: userAEmail, password })
  assert(regA.status === 201, 'User A registered with 201')
  const cookieA = getCookie(regA)
  assert(cookieA.length > 0, 'User A received auth cookie')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Authenticated GET → empty wishlist initially
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 3: Authenticated GET returns empty wishlist...')
  const emptyGet = await request('GET', '/api/users/wishlist', null, cookieA)
  assert(emptyGet.status === 200, 'GET wishlist returns 200')
  assert(emptyGet.data.success === true, 'Response has success: true')
  assert(Array.isArray(emptyGet.data.wishlist), 'Response has wishlist array')
  assert(emptyGet.data.wishlist.length === 0, 'Wishlist is initially empty')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Add valid active product
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 4: Add valid active product to wishlist...')
  const addA = await request('POST', `/api/users/wishlist/${PRODUCT_A}`, null, cookieA)
  assert(addA.status === 200, `POST /api/users/wishlist/${PRODUCT_A} returns 200`)
  assert(addA.data.success === true, 'Add response has success: true')
  assert(Array.isArray(addA.data.wishlist), 'Add response includes populated wishlist array')
  assert(addA.data.wishlist.length === 1, 'Wishlist has 1 item after first add')
  const addedProduct = addA.data.wishlist[0]
  assert(addedProduct._id === PRODUCT_A, 'Correct product ID in wishlist')
  assert(typeof addedProduct.name === 'string', 'Product name is populated')
  assert(typeof addedProduct.price === 'number', 'Product price is populated')
  assert(Array.isArray(addedProduct.images), 'Product images is populated')
  assert(typeof addedProduct.stock === 'number', 'Product stock is populated')
  assert(addedProduct._wishlisted === true, 'Product has _wishlisted flag')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: GET wishlist → product appears exactly once
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 5: GET wishlist → product appears exactly once...')
  const getA = await request('GET', '/api/users/wishlist', null, cookieA)
  assert(getA.status === 200, 'GET wishlist 200')
  assert(getA.data.wishlist.length === 1, 'Wishlist has exactly 1 item')
  assert(getA.data.wishlist[0]._id === PRODUCT_A, 'Correct product in wishlist')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: Add same product twice → no duplicate
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 6: Add same product twice → no duplicate...')
  const addA2 = await request('POST', `/api/users/wishlist/${PRODUCT_A}`, null, cookieA)
  assert(addA2.status === 200, 'Second add of same product returns 200 (not error)')
  // After a duplicate add the response may omit wishlist (early-return path)
  // Verify the GET wishlist still has exactly 1 item
  const getAfterDup = await request('GET', '/api/users/wishlist', null, cookieA)
  assert(getAfterDup.data.wishlist.length === 1, 'No duplicate in wishlist after second add')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: Add a second product
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 7: Add a second product...')
  const addB = await request('POST', `/api/users/wishlist/${PRODUCT_B}`, null, cookieA)
  assert(addB.status === 200, 'Adding Product B returns 200')
  assert(Array.isArray(addB.data.wishlist), 'Response includes populated wishlist')
  assert(addB.data.wishlist.length === 2, 'Wishlist has 2 items')
  const ids = addB.data.wishlist.map(p => p._id)
  assert(ids.includes(PRODUCT_A), 'Product A still in wishlist')
  assert(ids.includes(PRODUCT_B), 'Product B added to wishlist')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8: Remove product A → succeeds
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 8: Remove Product A...')
  const delA = await request('DELETE', `/api/users/wishlist/${PRODUCT_A}`, null, cookieA)
  assert(delA.status === 200, 'DELETE returns 200')
  assert(delA.data.success === true, 'Remove response has success: true')
  assert(Array.isArray(delA.data.wishlist), 'Remove response includes populated wishlist')
  assert(delA.data.wishlist.length === 1, 'Wishlist has 1 item after removal')
  assert(delA.data.wishlist[0]._id === PRODUCT_B, 'Product B remains after Product A removed')
  assert(!delA.data.wishlist.find(p => p._id === PRODUCT_A), 'Product A is gone')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 9: Remove already-removed product → safe (idempotent)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 9: Remove already-removed product (idempotent)...')
  const delA2 = await request('DELETE', `/api/users/wishlist/${PRODUCT_A}`, null, cookieA)
  assert(delA2.status === 200, 'Second DELETE of removed product returns 200 (idempotent)')
  assert(delA2.data.success === true, 'Idempotent delete has success: true')
  const getAfterDel = await request('GET', '/api/users/wishlist', null, cookieA)
  assert(getAfterDel.data.wishlist.length === 1, 'Wishlist still has 1 item after idempotent delete')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 10: Invalid product ID
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 10: Invalid product ID is rejected safely...')
  const invalidAdd = await request('POST', '/api/users/wishlist/not-a-valid-id', null, cookieA)
  assert(invalidAdd.status === 400, 'Invalid product ID → 400')
  assert(invalidAdd.data.success === false, 'Invalid ID response has success: false')

  const invalidDel = await request('DELETE', '/api/users/wishlist/not-a-valid-id', null, cookieA)
  assert(invalidDel.status === 400, 'Invalid product ID DELETE → 400')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 11: Non-existent (valid-format but missing) product ID
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 11: Non-existent product ID rejected safely...')
  const nonExistent = await request('POST', '/api/users/wishlist/507f1f77bcf86cd799439011', null, cookieA)
  assert([400, 404].includes(nonExistent.status), 'Non-existent product → 400 or 404')
  assert(nonExistent.data.success === false, 'Non-existent product response has success: false')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 11b: Inactive product cannot be added & Stale product handling
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 11b: Inactive product rejection & stale product handling...')
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@trendvolt.com',
    password: 'AdminPass123!',
  })
  if (adminLogin.status === 200) {
    const adminCookie = getCookie(adminLogin)
    const createProd = await request('POST', '/api/products', {
      name: 'Temporary Inactive QA Test Product',
      description: 'Product for testing inactive and stale wishlist states',
      price: 1299,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'TestBrand',
      stock: 10,
      isActive: false,
    }, adminCookie)

    if (createProd.status === 201 && createProd.data.product?._id) {
      const inactiveId = createProd.data.product._id

      // 1. Inactive product cannot be added
      const addInactive = await request('POST', `/api/users/wishlist/${inactiveId}`, null, cookieA)
      assert(addInactive.status === 400, 'Inactive product cannot be added (400)')
      assert(addInactive.data.success === false, 'Inactive product add has success: false')

      // 2. Activate product, add to User A's wishlist, then deactivate
      await request('PUT', `/api/products/${inactiveId}`, { isActive: true }, adminCookie)
      const addTemp = await request('POST', `/api/users/wishlist/${inactiveId}`, null, cookieA)
      assert(addTemp.status === 200, 'Adding active temp product returns 200')

      // Deactivate product
      await request('PUT', `/api/products/${inactiveId}`, { isActive: false }, adminCookie)

      // Reload wishlist: returns 200, handles safely without crash, isActive is false
      const getWithInactive = await request('GET', '/api/users/wishlist', null, cookieA)
      assert(getWithInactive.status === 200, 'GET wishlist with deactivated product returns 200 safely')
      const foundInactive = getWithInactive.data.wishlist.find(p => p._id === inactiveId)
      assert(foundInactive && foundInactive.isActive === false, 'Deactivated product appears safely with isActive: false')

      // 3. Delete product from DB (stale reference)
      if (mongoose.connection?.readyState === 1) {
        await mongoose.connection.collection('products').deleteOne({ _id: new mongoose.Types.ObjectId(inactiveId) })
      } else {
        await request('DELETE', `/api/products/${inactiveId}`, null, adminCookie)
      }

      // Reload wishlist: populate returns null for deleted ID, filter(Boolean) safely excludes it
      const getWithDeleted = await request('GET', '/api/users/wishlist', null, cookieA)
      assert(getWithDeleted.status === 200, 'GET wishlist with deleted product returns 200 safely without 500 error')
      const foundDeleted = getWithDeleted.data.wishlist.find(p => p._id === inactiveId)
      assert(!foundDeleted, 'Deleted product is safely excluded from wishlist')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 12: Ownership isolation — User B cannot access User A's wishlist
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 12: Ownership isolation — User B cannot see User A wishlist...')
  const regB = await request('POST', '/api/auth/register', { name: 'Wishlist Bob', email: userBEmail, password })
  assert(regB.status === 201, 'User B registered with 201')
  const cookieB = getCookie(regB)
  assert(cookieB.length > 0, 'User B received auth cookie')

  // User B's wishlist should be empty (not show User A's products)
  const getBWishlist = await request('GET', '/api/users/wishlist', null, cookieB)
  assert(getBWishlist.status === 200, "User B GET wishlist returns 200")
  assert(getBWishlist.data.wishlist.length === 0, "User B's wishlist is empty — does not contain User A's items")

  // User B cannot remove User A's item using their own cookie
  const bTriesRemoveA = await request('DELETE', `/api/users/wishlist/${PRODUCT_B}`, null, cookieB)
  assert(bTriesRemoveA.status === 200, 'User B delete of product returns 200 (idempotent — already not in their wishlist)')

  // User A's wishlist must be unchanged
  const getAAfterBAttack = await request('GET', '/api/users/wishlist', null, cookieA)
  assert(getAAfterBAttack.data.wishlist.length === 1, "User A's wishlist unchanged after User B's delete attempt")

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 13: Wishlist persists across requests (session refresh simulation)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 13: Wishlist persists across requests...')
  const persist1 = await request('GET', '/api/users/wishlist', null, cookieA)
  const persist2 = await request('GET', '/api/users/wishlist', null, cookieA)
  assert(persist1.data.wishlist.length === persist2.data.wishlist.length, 'Wishlist count consistent across two requests')
  assert(persist2.data.wishlist[0]?._id === PRODUCT_B, 'Product B persists in wishlist')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 14: Response shape is consistent between GET and POST/DELETE
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 14: Response shape consistency...')
  const shapeCheck = await request('GET', '/api/users/wishlist', null, cookieA)
  const item = shapeCheck.data.wishlist[0]
  assert(typeof item._id === 'string', 'Populated product has _id string')
  assert(typeof item.name === 'string', 'Populated product has name')
  assert(typeof item.price === 'number', 'Populated product has price number')
  assert(typeof item.stock === 'number', 'Populated product has stock number')
  assert(typeof item.category === 'string', 'Populated product has category')
  assert(Array.isArray(item.images), 'Populated product has images array')
  assert(item._wishlisted === true, 'Populated product has _wishlisted flag')
  assert(item.password === undefined, 'No password field leaked into wishlist items')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 15: Logout clears session (cookie invalidated)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 15: Logout clears session...')
  const logout = await request('POST', '/api/auth/logout', null, cookieA)
  assert([200, 204].includes(logout.status), 'Logout returns 200 or 204')
  const clearedCookie = getCookie(logout)
  assert(logout.headers['set-cookie'] !== undefined, 'Logout response includes set-cookie header')
  const postLogoutGet = await request('GET', '/api/users/wishlist', null, clearedCookie)
  assert(postLogoutGet.status === 401, 'Wishlist inaccessible after logout (401)')

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  if (failures.length > 0) {
    console.log('\nFAILURES:')
    failures.forEach(f => console.log(`  ✗ ${f}`))
  } else {
    console.log('ALL TESTS PASSED ✓')
  }
  console.log('='.repeat(60))
  if (mongoose.connection?.readyState === 1) {
    await mongoose.disconnect()
  }
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('\nFATAL ERROR:', err)
  process.exit(1)
})