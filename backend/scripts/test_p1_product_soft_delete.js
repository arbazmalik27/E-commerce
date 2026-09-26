/**
 * test_p1_product_soft_delete.js
 * Comprehensive QA Test Suite for TrendVolt P1 Product Soft Delete & Data Integrity.
 * 
 * Verifies scenarios A through T:
 * A. Admin can deactivate active product (API succeeds, isActive === false)
 * B. Physical deletion does NOT occur (same product ID still exists in MongoDB)
 * C. Customer catalog excludes inactive product (/api/products)
 * D. Customer search excludes inactive product
 * E. Customer taxonomy filters exclude inactive product
 * F. Customer price filters exclude inactive product
 * G. Customer pagination counts exclude inactive product
 * H. Customer product detail does not expose inactive product as active (404)
 * I. Customer cannot add inactive product to cart (400)
 * J. Order creation cannot purchase inactive product (400)
 * K. Existing historical orders remain intact
 * L. Existing order snapshots remain readable
 * M. Wishlist does not crash because product becomes inactive
 * N. Customer cannot modify isActive (403)
 * O. Non-admin cannot deactivate product (401/403)
 * P. Admin can still view inactive product (admin /api/products?all=true and /api/products/:id)
 * Q. Admin can reactivate product via PUT /api/products/:id with isActive: true
 * R. Reactivated product becomes visible again to customers
 * S. Repeated deactivation does not physically delete product (idempotent soft delete)
 * T. Existing active cart references do not cause product deletion
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const http = require('http')
const mongoose = require('mongoose')

const BASE_URL = 'http://localhost:5000'
let passed = 0
let failed = 0
const failures = []

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message} ${details ? `(${details})` : ''}`)
    failed++
    failures.push(message)
  }
}

function request(method, reqPath, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL)
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
  return setCookie.map((c) => c.split(';')[0]).join('; ')
}

async function run() {
  console.log('====================================================')
  console.log('  TRENDVOLT P1 PRODUCT SOFT DELETE / DATA INTEGRITY')
  console.log('====================================================\n')

  // Connect to MongoDB directly to verify DB documents
  let dbConnected = false
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI)
      dbConnected = true
      console.log('Connected to MongoDB directly for physical document verification.\n')
    } catch (err) {
      console.warn('Could not connect to MongoDB directly; skipping raw DB checks:', err.message)
    }
  }

  const ts = Date.now()

  // 1. Authenticate Admin
  console.log('--- Step 1: Admin Authentication ---')
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@trendvolt.com',
    password: 'AdminPass123!',
  })
  assert(adminLogin.status === 200, 'Admin login succeeds')
  const adminCookie = getCookie(adminLogin)
  assert(Boolean(adminCookie), 'Admin cookie received')

  // 2. Register a Test Customer
  console.log('\n--- Step 2: Customer Registration ---')
  const customerEmail = `soft_delete_cust_${ts}@example.com`
  const customerReg = await request('POST', '/api/auth/register', {
    name: 'Soft Delete Customer',
    email: customerEmail,
    password: 'Password123!',
  })
  assert(customerReg.status === 201 || customerReg.status === 200, 'Customer registered')
  const customerCookie = getCookie(customerReg)
  assert(Boolean(customerCookie), 'Customer cookie received')

  // 3. Create a Test Product as Admin
  console.log('\n--- Step 3: Create Test Product ---')
  const testProductPayload = {
    name: `SoftDelete Test Coat ${ts}`,
    description: 'A premium wool overcoat for testing soft delete integrity.',
    price: 3499,
    category: 'fashion',
    department: 'men',
    subcategory: 'jackets-coats',
    brand: 'TrendVolt Luxe',
    stock: 20,
    images: ['https://images.unsplash.com/photo-1544441893-675973e31985?w=800'],
    isActive: true,
  }
  const createRes = await request('POST', '/api/products', testProductPayload, adminCookie)
  assert(createRes.status === 201 && createRes.data?.success, 'Test product created by admin')
  const testProduct = createRes.data?.product
  const testProductId = testProduct?._id
  assert(Boolean(testProductId), `Product created with ID: ${testProductId}`)
  assert(testProduct?.isActive === true, 'Product defaults to isActive = true')

  // A. Admin can deactivate active product
  console.log('\n--- Scenario A: Admin Deactivates Product ---')
  const deleteRes = await request('DELETE', `/api/products/${testProductId}`, null, adminCookie)
  assert(deleteRes.status === 200, 'Admin DELETE returns 200 OK')
  assert(deleteRes.data?.success === true, 'Admin DELETE returns success: true')
  assert(deleteRes.data?.product?.isActive === false, 'DELETE response reflects isActive = false')

  // B. Physical deletion does NOT occur (same product ID still exists in MongoDB)
  console.log('\n--- Scenario B: Physical Deletion Does NOT Occur ---')
  if (dbConnected) {
    const rawDoc = await mongoose.connection.collection('products').findOne({ _id: new mongoose.Types.ObjectId(testProductId) })
    assert(rawDoc !== null, 'MongoDB document still exists with same _id (NOT deleted)')
    assert(rawDoc?.isActive === false, 'MongoDB document has isActive === false')
  } else {
    // Check via admin detail query
    const adminCheck = await request('GET', `/api/products/${testProductId}`, null, adminCookie)
    assert(adminCheck.status === 200, 'Product still exists and is accessible to admin')
    assert(adminCheck.data?.product?.isActive === false, 'Product in DB has isActive === false')
  }

  // C. Customer catalog excludes inactive product
  console.log('\n--- Scenario C: Customer Catalog Excludes Inactive Product ---')
  const catalogRes = await request('GET', '/api/products')
  assert(catalogRes.status === 200, 'Customer /api/products returns 200')
  const catalogProducts = catalogRes.data?.products || []
  const foundInCatalog = catalogProducts.some((p) => p._id === testProductId)
  assert(!foundInCatalog, 'Inactive product is NOT returned in customer catalog')

  // D. Customer search excludes inactive product
  console.log('\n--- Scenario D: Customer Search Excludes Inactive Product ---')
  const searchRes = await request('GET', `/api/products?search=${encodeURIComponent(`SoftDelete Test Coat ${ts}`)}`)
  assert(searchRes.status === 200, 'Search endpoint returns 200')
  const searchProducts = searchRes.data?.products || []
  const foundInSearch = searchProducts.some((p) => p._id === testProductId)
  assert(!foundInSearch, 'Inactive product is excluded from customer search results')

  // E. Customer taxonomy filters exclude inactive product
  console.log('\n--- Scenario E: Taxonomy Filters Exclude Inactive Product ---')
  const taxRes = await request('GET', `/api/products?category=fashion&department=men&subcategory=jackets-coats`)
  assert(taxRes.status === 200, 'Taxonomy query returns 200')
  const taxProducts = taxRes.data?.products || []
  const foundInTax = taxProducts.some((p) => p._id === testProductId)
  assert(!foundInTax, 'Inactive product is excluded from customer taxonomy filters')

  // F. Customer price filters exclude inactive product
  console.log('\n--- Scenario F: Price Filters Exclude Inactive Product ---')
  const priceRes = await request('GET', `/api/products?minPrice=3000&maxPrice=4000`)
  assert(priceRes.status === 200, 'Price filter query returns 200')
  const priceProducts = priceRes.data?.products || []
  const foundInPrice = priceProducts.some((p) => p._id === testProductId)
  assert(!foundInPrice, 'Inactive product is excluded from customer price filters')

  // G. Customer pagination counts exclude inactive product
  console.log('\n--- Scenario G: Pagination Counts Exclude Inactive Product ---')
  const pagRes = await request('GET', `/api/products?search=${encodeURIComponent(`SoftDelete Test Coat ${ts}`)}`)
  assert(pagRes.data?.pagination?.totalProducts === 0, 'Pagination total count excludes inactive product (count is 0)')

  // H. Customer product detail does not expose inactive product as active (404)
  console.log('\n--- Scenario H: Customer Product Detail Returns 404 for Inactive ---')
  const detailRes = await request('GET', `/api/products/${testProductId}`, null, customerCookie)
  assert(detailRes.status === 404, 'Customer product detail for inactive product returns 404', `Got status ${detailRes.status}`)

  // I. Customer cannot add inactive product to cart
  console.log('\n--- Scenario I: Customer Cannot Add Inactive Product to Cart ---')
  const addToCartRes = await request('POST', '/api/cart/items', {
    productId: testProductId,
    quantity: 1,
  }, customerCookie)
  assert(addToCartRes.status === 400 || addToCartRes.status === 404, 'Adding inactive product to cart is rejected with 400/404', `Status: ${addToCartRes.status}`)

  // J. Order creation cannot purchase inactive product
  console.log('\n--- Scenario J: Order Creation Rejects Inactive Product in Cart ---')
  // Customer creates a separate active product, adds to cart, product is deactivated, order fails
  const cartDeactPayload = {
    name: `Checkout Block Inactive Product ${ts}`,
    description: 'Product deactivated while in cart to test checkout rejection.',
    price: 2199,
    category: 'fashion',
    department: 'men',
    subcategory: 'shirts',
    brand: 'TrendVolt Formal',
    stock: 15,
    images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800'],
    isActive: true,
  }
  const createCartDeact = await request('POST', '/api/products', cartDeactPayload, adminCookie)
  const cartDeactId = createCartDeact.data?.product?._id
  // Add to cart while active
  const addActiveToCart = await request('POST', '/api/cart/items', { productId: cartDeactId, quantity: 1 }, customerCookie)
  assert(addActiveToCart.status === 200, 'Product added to cart while active')
  // Admin deactivates product
  await request('DELETE', `/api/products/${cartDeactId}`, null, adminCookie)
  // Checkout attempted by customer
  const blockedOrderRes = await request('POST', '/api/orders', {
    shippingAddress: {
      fullName: 'Soft Delete User',
      phone: '9876543210',
      addressLine: '123 Soft Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    },
  }, customerCookie)
  assert(blockedOrderRes.status === 400, 'Order creation for cart containing inactive product is rejected with 400', `Status: ${blockedOrderRes.status}`)
  assert(blockedOrderRes.data?.message?.includes('no longer active'), 'Error message states product is no longer active')

  // Clear cart before next step
  await request('DELETE', '/api/cart', null, customerCookie)

  // K & L: Historical orders remain intact & readable
  console.log('\n--- Scenario K & L: Historical Orders Intact and Readable ---')
  // 1. Create a dedicated product for order test
  const orderProdPayload = {
    name: `Order History Test Product ${ts}`,
    description: 'Product to be bought then deactivated to verify order snapshot permanence.',
    price: 1899,
    category: 'fashion',
    department: 'women',
    subcategory: 'dresses',
    brand: 'TrendVolt Elegance',
    stock: 50,
    images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800'],
    isActive: true,
  }
  const createOrderProd = await request('POST', '/api/products', orderProdPayload, adminCookie)
  assert(createOrderProd.status === 201, 'Order test product created')
  const orderProdId = createOrderProd.data?.product?._id

  // 2. Customer adds to cart
  const cartAddRes = await request('POST', '/api/cart/items', { productId: orderProdId, quantity: 1 }, customerCookie)
  assert(cartAddRes.status === 200, 'Order product added to cart')

  // 3. Customer places order
  const placeOrderRes = await request('POST', '/api/orders', {
    shippingAddress: {
      fullName: 'Order Keeper',
      phone: '9988776655',
      addressLine: '456 History Lane',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
    },
  }, customerCookie)
  assert(placeOrderRes.status === 201, 'Order placed successfully while product was active')
  const placedOrder = placeOrderRes.data?.order
  const placedOrderId = placedOrder?._id

  // 4. Admin deactivates the purchased product
  const deactOrderProd = await request('DELETE', `/api/products/${orderProdId}`, null, adminCookie)
  assert(deactOrderProd.status === 200, 'Purchased product deactivated after order placement')

  // 5. Customer fetches past order details
  const getOrderRes = await request('GET', `/api/orders/${placedOrderId}`, null, customerCookie)
  assert(getOrderRes.status === 200, 'Past order fetched successfully after product deactivation')
  const orderData = getOrderRes.data?.order || getOrderRes.data
  const orderItem = orderData?.items?.find((it) => String(it.product?._id || it.product) === String(orderProdId) || it.name === orderProdPayload.name)
  assert(Boolean(orderItem), 'Past order item exists in fetched order')
  assert(orderItem?.price === 1899, 'Past order item snapshot maintains correct price (1899)')
  assert(orderItem?.name === orderProdPayload.name, 'Past order item snapshot maintains correct product name')

  // M. Wishlist does not crash because product becomes inactive
  console.log('\n--- Scenario M: Wishlist Safety with Inactive Product ---')
  // 1. Create a product for wishlist
  const wishProdPayload = {
    name: `Wishlist Test Product ${ts}`,
    description: 'Testing wishlist resilience when product is deactivated.',
    price: 999,
    category: 'fashion',
    department: 'kids',
    subcategory: 'boys',
    ageRange: '8-10 years',
    brand: 'TrendVolt Kids',
    stock: 10,
    images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800'],
    isActive: true,
  }
  const createWishProd = await request('POST', '/api/products', wishProdPayload, adminCookie)
  assert(createWishProd.status === 201, 'Wishlist product created')
  const wishProdId = createWishProd.data?.product?._id

  // 2. Customer adds to wishlist
  const addWishRes = await request('POST', `/api/users/wishlist/${wishProdId}`, null, customerCookie)
  assert(addWishRes.status === 200, 'Product added to customer wishlist')

  // 3. Admin deactivates product
  const deactWishProd = await request('DELETE', `/api/products/${wishProdId}`, null, adminCookie)
  assert(deactWishProd.status === 200, 'Wishlist product deactivated by admin')

  // 4. Customer fetches wishlist
  const getWishRes = await request('GET', '/api/users/wishlist', null, customerCookie)
  assert(getWishRes.status === 200, 'Customer wishlist GET returns 200 without crashing on deactivated item')

  // N. Customer cannot modify isActive
  console.log('\n--- Scenario N: Customer Cannot Modify isActive ---')
  const custPutRes = await request('PUT', `/api/products/${testProductId}`, { isActive: true }, customerCookie)
  assert(custPutRes.status === 403, 'Customer PUT /api/products/:id is rejected with 403 Forbidden')

  // O. Non-admin cannot deactivate product
  console.log('\n--- Scenario O: Non-Admin / Unauthenticated Cannot Deactivate ---')
  const unauthDel = await request('DELETE', `/api/products/${testProductId}`)
  assert(unauthDel.status === 401, 'Unauthenticated DELETE returns 401 Unauthorized')
  const custDel = await request('DELETE', `/api/products/${testProductId}`, null, customerCookie)
  assert(custDel.status === 403, 'Customer DELETE returns 403 Forbidden')

  // P. Admin can still view inactive product
  console.log('\n--- Scenario P: Admin Can View Inactive Product ---')
  const adminList = await request('GET', '/api/products?all=true', null, adminCookie)
  assert(adminList.status === 200, 'Admin /api/products?all=true returns 200')
  const adminProducts = adminList.data?.products || []
  const foundByAdmin = adminProducts.some((p) => String(p._id) === String(testProductId) && p.isActive === false)
  assert(foundByAdmin, 'Admin product list with all=true includes inactive product')

  const adminDetail = await request('GET', `/api/products/${testProductId}`, null, adminCookie)
  assert(adminDetail.status === 200, 'Admin GET /api/products/:id returns 200 for inactive product')
  assert(adminDetail.data?.product?.isActive === false, 'Admin receives product with isActive: false')

  // Q. Admin can reactivate product
  console.log('\n--- Scenario Q: Admin Reactivates Product ---')
  const reactivateRes = await request('PUT', `/api/products/${testProductId}`, { isActive: true }, adminCookie)
  assert(reactivateRes.status === 200 && reactivateRes.data?.success, 'Admin PUT /api/products/:id with isActive: true returns 200')
  assert(reactivateRes.data?.product?.isActive === true, 'Reactivated product has isActive = true')

  // R. Reactivated product becomes visible again to customers
  console.log('\n--- Scenario R: Reactivated Product Becomes Visible to Customers ---')
  const custDetailAfter = await request('GET', `/api/products/${testProductId}`, null, customerCookie)
  assert(custDetailAfter.status === 200, 'Customer can now access product details with 200')
  const catalogAfter = await request('GET', `/api/products`)
  const foundAfterReactivation = (catalogAfter.data?.products || []).some((p) => String(p._id) === String(testProductId))
  assert(foundAfterReactivation, 'Reactivated product is now visible in customer catalog')

  // S. Repeated deactivation does not physically delete product
  console.log('\n--- Scenario S: Repeated Deactivation Does Not Delete Document ---')
  const deact1 = await request('DELETE', `/api/products/${testProductId}`, null, adminCookie)
  assert(deact1.status === 200, 'First deactivation returns 200')
  const deact2 = await request('DELETE', `/api/products/${testProductId}`, null, adminCookie)
  assert(deact2.status === 200, 'Repeated deactivation returns 200 (idempotent)')
  if (dbConnected) {
    const rawCheckAgain = await mongoose.connection.collection('products').findOne({ _id: new mongoose.Types.ObjectId(testProductId) })
    assert(rawCheckAgain !== null, 'MongoDB document still exists after repeated deactivation')
    assert(rawCheckAgain?.isActive === false, 'Document isActive remains false')
  }

  // T. Existing active cart references do not cause product deletion
  console.log('\n--- Scenario T: Active Cart References Do Not Cause Product Deletion ---')
  // 1. Create a product for cart reference safety
  const cartRefProdPayload = {
    name: `Cart Ref Safety Product ${ts}`,
    description: 'Product in active user cart during admin deactivation.',
    price: 1499,
    category: 'fashion',
    department: 'men',
    subcategory: 'jeans',
    brand: 'TrendVolt Denim',
    stock: 15,
    images: ['https://images.unsplash.com/photo-1542272604-780c96856592?w=800'],
    isActive: true,
  }
  const createCartRef = await request('POST', '/api/products', cartRefProdPayload, adminCookie)
  assert(createCartRef.status === 201, 'Cart reference product created')
  const cartRefId = createCartRef.data?.product?._id

  // 2. Customer adds to cart
  const addCartRes = await request('POST', '/api/cart/items', { productId: cartRefId, quantity: 1 }, customerCookie)
  assert(addCartRes.status === 200, 'Product added to customer cart while active')

  // 3. Admin deactivates the product
  const deactCartRef = await request('DELETE', `/api/products/${cartRefId}`, null, adminCookie)
  assert(deactCartRef.status === 200, 'Product deactivated while in active customer cart')

  // 4. Verify MongoDB document still exists
  if (dbConnected) {
    const cartRefDoc = await mongoose.connection.collection('products').findOne({ _id: new mongoose.Types.ObjectId(cartRefId) })
    assert(cartRefDoc !== null, 'Product document still exists in MongoDB despite active cart reference')
    assert(cartRefDoc?.isActive === false, 'Product document has isActive === false')
  }

  // 5. Customer fetches cart - should not crash
  const getCartRes = await request('GET', '/api/cart', null, customerCookie)
  assert(getCartRes.status === 200, 'Customer cart GET returns 200 without crashing')

  // Summary
  console.log('\n====================================================')
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')
  if (failures.length > 0) {
    console.error('Failed checks:')
    failures.forEach((f) => console.error(`  - ${f}`))
  }

  if (dbConnected) {
    await mongoose.disconnect()
  }

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
