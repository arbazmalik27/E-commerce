/**
 * TrendVolt — Sales & Product Insights Integration Test Suite
 *
 * Verifies:
 * 1. Authentication (401 for unauthenticated)
 * 2. Authorization / RBAC (403 for customer, 200 for admin)
 * 3. Input validation (invalid range, malformed dates, end < start, >366 days)
 * 4. Authoritative sales calculations:
 *    - Paid, non-cancelled orders only
 *    - Unpaid / pending orders excluded
 *    - Cancelled orders excluded
 *    - Historical Order.items pricing preserved
 *    - Units, revenue, order count aggregation
 *    - Average Selling Price (ASP)
 *    - Sales contribution percentage
 *    - Category and brand level aggregation
 *    - Zero-filled daily trend series (IST +05:30)
 *    - Zero-sales active products detection
 *    - Stock vs sales velocity classification
 * 5. Read-only enforcement & security (non-GET rejected, spoofed client metrics ignored)
 * 6. Database teardown & hygiene
 */

const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const app = require('../src/app')
const User = require('../src/models/User')
const Product = require('../src/models/Product')
const Order = require('../src/models/Order')

const TEST_SECRET = process.env.JWT_SECRET || 'trendvolt_dev_secret_jwt_key_2026'

let server
let port
let adminToken
let customerToken
let adminUser
let customerUser

// Fixture IDs
let prod1Id
let prod2Id
let prodZeroId
let order1Id
let order2Id
let orderCancelledId
let orderUnpaidId

function httpRequest({ path, method = 'GET', token = null, query = '' }) {
  return new Promise((resolve, reject) => {
    const fullPath = query ? `${path}?${query}` : path
    const headers = {}
    if (token) {
      headers['Cookie'] = `token=${token}`
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: fullPath,
        method,
        headers,
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          try {
            const data = body ? JSON.parse(body) : {}
            resolve({ status: res.statusCode, headers: res.headers, data })
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw: body })
          }
        })
      }
    )

    req.on('error', reject)
    req.end()
  })
}

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

async function runTestSuite() {
  console.log('========================================================')
  console.log('STARTING SALES & PRODUCT INSIGHTS BACKEND TEST SUITE')
  console.log('========================================================\n')

  await mongoose.connect(
    process.env.MONGODB_URI ||
      'mongodb+srv://malikarbaz084_db_user:Arbaz%40010703@e-commercecluster0.alu2e4z.mongodb.net/?appName=E-commerceCluster0'
  )

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port
      resolve()
    })
  })

  try {
    // ── Setup Test Fixtures ───────────────────────────────────────────────
    const pwdHash = await bcrypt.hash('TestPass123!', 10)

    // Admin user
    adminUser = await User.create({
      name: 'Insight Test Admin',
      email: `insight_admin_${Date.now()}@trendvolt.test`,
      password: pwdHash,
      role: 'admin',
      isActive: true,
    })
    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, TEST_SECRET, {
      expiresIn: '1h',
    })

    // Customer user
    customerUser = await User.create({
      name: 'Insight Test Customer',
      email: `insight_cust_${Date.now()}@trendvolt.test`,
      password: pwdHash,
      role: 'customer',
      isActive: true,
    })
    customerToken = jwt.sign({ id: customerUser._id, role: 'customer' }, TEST_SECRET, {
      expiresIn: '1h',
    })

    // Test Products
    // Product 1: Men Shirts, Brand: TrendVolt
    const p1 = await Product.create({
      name: 'Premium Oxford Shirt',
      description: 'Test Oxford shirt',
      price: 1200, // note: current price 1200, but order snapshot is 1000
      stock: 25,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'TrendVolt',
      isActive: true,
      images: ['https://example.com/shirt.jpg'],
    })
    prod1Id = p1._id

    // Product 2: Women Jeans, Brand: ZARA
    const p2 = await Product.create({
      name: 'High-Rise Denim Jeans',
      description: 'Test Denim jeans',
      price: 1800, // note: current price 1800, order snapshot is 1500
      stock: 10,
      category: 'fashion',
      department: 'women',
      subcategory: 'jeans',
      brand: 'ZARA',
      isActive: true,
      images: ['https://example.com/jeans.jpg'],
    })
    prod2Id = p2._id

    // Product 3: Kids Tops, Brand: H&M (Active, stock 30, ZERO sales)
    const p3 = await Product.create({
      name: 'Kids Graphic Tee',
      description: 'Test Graphic Tee',
      price: 600,
      stock: 30,
      category: 'fashion',
      department: 'kids',
      subcategory: 'tops',
      brand: 'H&M',
      isActive: true,
      images: ['https://example.com/tee.jpg'],
    })
    prodZeroId = p3._id

    // Test Orders in controlled date window (e.g. 2026-08-01 to 2026-08-10)
    const orderDate1 = new Date('2026-08-03T10:00:00.000Z')
    const orderDate2 = new Date('2026-08-05T14:30:00.000Z')
    const orderDateCancelled = new Date('2026-08-04T12:00:00.000Z')
    const orderDateUnpaid = new Date('2026-08-06T16:00:00.000Z')

    // Order 1: Paid, confirmed, Product 1 (2 units @ 1000 = 2000), Product 2 (1 unit @ 1500 = 1500) -> total = 3500
    const o1 = await Order.create({
      user: customerUser._id,
      orderNumber: `ORD-INSIGHT-1-${Date.now()}`,
      items: [
        {
          product: prod1Id,
          name: 'Premium Oxford Shirt (Snap)',
          price: 1000,
          quantity: 2,
          subtotal: 2000,
          images: ['https://example.com/shirt.jpg'],
        },
        {
          product: prod2Id,
          name: 'High-Rise Denim Jeans (Snap)',
          price: 1500,
          quantity: 1,
          subtotal: 1500,
          images: ['https://example.com/jeans.jpg'],
        },
      ],
      shippingAddress: {
        fullName: 'Test User',
        phone: '9876543210',
        addressLine: '123 Fashion Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      paymentMethod: 'card',
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      subtotal: 3500,
      totalAmount: 3500,
      createdAt: orderDate1,
      updatedAt: orderDate1,
    })
    order1Id = o1._id

    // Order 2: Paid, delivered, Product 1 (3 units @ 1000 = 3000) -> total = 3000
    const o2 = await Order.create({
      user: customerUser._id,
      orderNumber: `ORD-INSIGHT-2-${Date.now()}`,
      items: [
        {
          product: prod1Id,
          name: 'Premium Oxford Shirt (Snap)',
          price: 1000,
          quantity: 3,
          subtotal: 3000,
          images: ['https://example.com/shirt.jpg'],
        },
      ],
      shippingAddress: {
        fullName: 'Test User',
        phone: '9876543210',
        addressLine: '123 Fashion Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      paymentMethod: 'upi',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      subtotal: 3000,
      totalAmount: 3000,
      createdAt: orderDate2,
      updatedAt: orderDate2,
    })
    order2Id = o2._id

    // Order 3: Cancelled (Paid but Cancelled) -> MUST BE EXCLUDED!
    const o3 = await Order.create({
      user: customerUser._id,
      orderNumber: `ORD-INSIGHT-3-${Date.now()}`,
      items: [
        {
          product: prod2Id,
          name: 'High-Rise Denim Jeans (Snap)',
          price: 1500,
          quantity: 4,
          subtotal: 6000,
          images: ['https://example.com/jeans.jpg'],
        },
      ],
      shippingAddress: {
        fullName: 'Test User',
        phone: '9876543210',
        addressLine: '123 Fashion Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      paymentMethod: 'card',
      paymentStatus: 'paid',
      orderStatus: 'cancelled',
      subtotal: 6000,
      totalAmount: 6000,
      createdAt: orderDateCancelled,
      updatedAt: orderDateCancelled,
    })
    orderCancelledId = o3._id

    // Order 4: Unpaid (Pending paymentStatus) -> MUST BE EXCLUDED!
    const o4 = await Order.create({
      user: customerUser._id,
      orderNumber: `ORD-INSIGHT-4-${Date.now()}`,
      items: [
        {
          product: prod1Id,
          name: 'Premium Oxford Shirt (Snap)',
          price: 1000,
          quantity: 5,
          subtotal: 5000,
          images: ['https://example.com/shirt.jpg'],
        },
      ],
      shippingAddress: {
        fullName: 'Test User',
        phone: '9876543210',
        addressLine: '123 Fashion Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      paymentMethod: 'card',
      paymentStatus: 'pending',
      orderStatus: 'pending',
      subtotal: 5000,
      totalAmount: 5000,
      createdAt: orderDateUnpaid,
      updatedAt: orderDateUnpaid,
    })
    orderUnpaidId = o4._id

    const testQuery = 'range=custom&startDate=2026-08-01&endDate=2026-08-10'

    // ── 1. Authentication Tests ───────────────────────────────────────────
    console.log('\n--- 1. AUTHENTICATION TESTS ---')
    const authEndpoints = [
      '/api/sales-insights/products',
      '/api/sales-insights/categories',
      '/api/sales-insights/brands',
      '/api/sales-insights/trends',
      '/api/sales-insights/zero-sales',
      '/api/sales-insights/stock-sales',
    ]

    for (const ep of authEndpoints) {
      const res = await httpRequest({ path: ep })
      testAssert(res.status === 401, `Unauthenticated request to ${ep} returns 401`)
    }

    // ── 2. Authorization / RBAC Tests ─────────────────────────────────────
    console.log('\n--- 2. AUTHORIZATION TESTS ---')
    for (const ep of authEndpoints) {
      const res = await httpRequest({ path: ep, token: customerToken })
      testAssert(res.status === 403, `Customer role accessing ${ep} returns 403 Forbidden`)
    }

    const adminCheck = await httpRequest({
      path: '/api/sales-insights/products',
      token: adminToken,
      query: testQuery,
    })
    testAssert(adminCheck.status === 200, 'Admin role accessing /products returns 200 OK')
    testAssert(adminCheck.data?.success === true, 'Response contains success: true')

    // ── 3. Input Validation Tests ─────────────────────────────────────────
    console.log('\n--- 3. INPUT VALIDATION TESTS ---')
    const badRange = await httpRequest({
      path: '/api/sales-insights/products',
      token: adminToken,
      query: 'range=invalidPeriod',
    })
    testAssert(badRange.status === 400, 'Invalid range parameter returns 400')

    const missingDates = await httpRequest({
      path: '/api/sales-insights/products',
      token: adminToken,
      query: 'range=custom',
    })
    testAssert(missingDates.status === 400, 'Missing custom dates returns 400')

    const invertedDates = await httpRequest({
      path: '/api/sales-insights/products',
      token: adminToken,
      query: 'range=custom&startDate=2026-08-10&endDate=2026-08-01',
    })
    testAssert(invertedDates.status === 400, 'End date before start date returns 400')

    const wideRange = await httpRequest({
      path: '/api/sales-insights/products',
      token: adminToken,
      query: 'range=custom&startDate=2024-01-01&endDate=2026-01-01',
    })
    testAssert(wideRange.status === 400, 'Range exceeding 366 days returns 400')

    // ── 4. Product Sales Performance Correctness ──────────────────────────
    console.log('\n--- 4. PRODUCT SALES PERFORMANCE TESTS ---')
    const prodRes = await httpRequest({
      path: '/api/sales-insights/products',
      token: adminToken,
      query: testQuery,
    })
    testAssert(prodRes.status === 200, 'GET /products returns 200')
    testAssert(
      prodRes.data?.summary?.totalRevenue === 6500,
      `Total product revenue matches expected ₹6,500 (got ${prodRes.data?.summary?.totalRevenue})`
    )
    testAssert(
      prodRes.data?.summary?.totalUnits === 6,
      `Total product units matches expected 6 (got ${prodRes.data?.summary?.totalUnits})`
    )
    testAssert(
      prodRes.data?.summary?.totalOrders === 2,
      `Total qualifying orders matches expected 2 (got ${prodRes.data?.summary?.totalOrders})`
    )

    const p1Item = prodRes.data?.products?.find((p) => p.productId === String(prod1Id))
    const p2Item = prodRes.data?.products?.find((p) => p.productId === String(prod2Id))

    testAssert(!!p1Item, 'Product 1 found in sales results')
    testAssert(p1Item?.unitsSold === 5, `Product 1 units sold = 5 (got ${p1Item?.unitsSold})`)
    testAssert(p1Item?.orderCount === 2, `Product 1 order count = 2 (got ${p1Item?.orderCount})`)
    testAssert(
      p1Item?.revenue === 5000,
      `Product 1 revenue = 5000 (got ${p1Item?.revenue}; ignores current catalog price 1200)`
    )
    testAssert(
      p1Item?.averageSellingPrice === 1000,
      `Product 1 average selling price = 1000 (got ${p1Item?.averageSellingPrice})`
    )
    testAssert(
      p1Item?.salesContributionPercentage === 76.92,
      `Product 1 contribution % = 76.92% (got ${p1Item?.salesContributionPercentage}%)`
    )
    testAssert(
      p1Item?.brand === 'TrendVolt',
      `Product 1 brand enriched from catalog: ${p1Item?.brand}`
    )
    testAssert(
      p1Item?.department === 'men',
      `Product 1 department enriched from catalog: ${p1Item?.department}`
    )

    testAssert(!!p2Item, 'Product 2 found in sales results')
    testAssert(p2Item?.unitsSold === 1, `Product 2 units sold = 1 (got ${p2Item?.unitsSold})`)
    testAssert(p2Item?.orderCount === 1, `Product 2 order count = 1 (got ${p2Item?.orderCount})`)
    testAssert(
      p2Item?.revenue === 1500,
      `Product 2 revenue = 1500 (got ${p2Item?.revenue}; excludes 6000 from cancelled order)`
    )
    testAssert(
      p2Item?.averageSellingPrice === 1500,
      `Product 2 ASP = 1500 (got ${p2Item?.averageSellingPrice})`
    )
    testAssert(
      p2Item?.salesContributionPercentage === 23.08,
      `Product 2 contribution % = 23.08% (got ${p2Item?.salesContributionPercentage}%)`
    )

    // Verify Product 3 (zero sales) is NOT in the sold products list
    const p3InSold = prodRes.data?.products?.find((p) => p.productId === String(prodZeroId))
    testAssert(!p3InSold, 'Product 3 with zero sales is excluded from sold products table')

    // ── 5. Category Performance Correctness ───────────────────────────────
    console.log('\n--- 5. CATEGORY & SUBCATEGORY PERFORMANCE TESTS ---')
    const catRes = await httpRequest({
      path: '/api/sales-insights/categories',
      token: adminToken,
      query: testQuery,
    })
    testAssert(catRes.status === 200, 'GET /categories returns 200')
    testAssert(
      catRes.data?.summary?.totalRevenue === 6500,
      `Category total revenue = 6500 (got ${catRes.data?.summary?.totalRevenue})`
    )

    const menShirts = catRes.data?.categories?.find(
      (c) => c.department === 'men' && c.subcategory === 'shirts'
    )
    const womenJeans = catRes.data?.categories?.find(
      (c) => c.department === 'women' && c.subcategory === 'jeans'
    )

    testAssert(!!menShirts, 'Category breakdown contains men/shirts')
    testAssert(menShirts?.unitsSold === 5, `Men shirts units = 5 (got ${menShirts?.unitsSold})`)
    testAssert(menShirts?.revenue === 5000, `Men shirts revenue = 5000 (got ${menShirts?.revenue})`)
    testAssert(
      menShirts?.salesContributionPercentage === 76.92,
      `Men shirts contribution = 76.92% (got ${menShirts?.salesContributionPercentage}%)`
    )

    testAssert(!!womenJeans, 'Category breakdown contains women/jeans')
    testAssert(womenJeans?.unitsSold === 1, `Women jeans units = 1 (got ${womenJeans?.unitsSold})`)
    testAssert(womenJeans?.revenue === 1500, `Women jeans revenue = 1500 (got ${womenJeans?.revenue})`)

    // ── 6. Brand Performance Correctness ──────────────────────────────────
    console.log('\n--- 6. BRAND PERFORMANCE TESTS ---')
    const brandRes = await httpRequest({
      path: '/api/sales-insights/brands',
      token: adminToken,
      query: testQuery,
    })
    testAssert(brandRes.status === 200, 'GET /brands returns 200')

    const trendvoltBrand = brandRes.data?.brands?.find((b) => b.brand === 'TrendVolt')
    const zaraBrand = brandRes.data?.brands?.find((b) => b.brand === 'ZARA')

    testAssert(!!trendvoltBrand, 'Brand results contain TrendVolt')
    testAssert(
      trendvoltBrand?.unitsSold === 5,
      `TrendVolt units sold = 5 (got ${trendvoltBrand?.unitsSold})`
    )
    testAssert(
      trendvoltBrand?.revenue === 5000,
      `TrendVolt revenue = 5000 (got ${trendvoltBrand?.revenue})`
    )
    testAssert(
      trendvoltBrand?.salesContributionPercentage === 76.92,
      `TrendVolt brand contribution = 76.92% (got ${trendvoltBrand?.salesContributionPercentage}%)`
    )

    testAssert(!!zaraBrand, 'Brand results contain ZARA')
    testAssert(zaraBrand?.unitsSold === 1, `ZARA units sold = 1 (got ${zaraBrand?.unitsSold})`)
    testAssert(zaraBrand?.revenue === 1500, `ZARA revenue = 1500 (got ${zaraBrand?.revenue})`)

    // ── 7. Sales Trends Correctness (Continuous IST Series) ────────────────
    console.log('\n--- 7. SALES TRENDS TESTS ---')
    const trendRes = await httpRequest({
      path: '/api/sales-insights/trends',
      token: adminToken,
      query: testQuery,
    })
    testAssert(trendRes.status === 200, 'GET /trends returns 200')
    testAssert(
      trendRes.data?.summary?.totalRevenue === 6500,
      `Trend total revenue = 6500 (got ${trendRes.data?.summary?.totalRevenue})`
    )
    testAssert(
      trendRes.data?.summary?.totalUnits === 6,
      `Trend total units = 6 (got ${trendRes.data?.summary?.totalUnits})`
    )
    testAssert(
      trendRes.data?.trends?.length === 10,
      `Trend contains complete 10-day series for 2026-08-01..10 (got ${trendRes.data?.trends?.length})`
    )

    // Check specific days
    const dayAug3 = trendRes.data?.trends?.find((t) => t.date === '2026-08-03')
    const dayAug4 = trendRes.data?.trends?.find((t) => t.date === '2026-08-04')
    const dayAug5 = trendRes.data?.trends?.find((t) => t.date === '2026-08-05')

    testAssert(
      dayAug3?.revenue === 3500 && dayAug3?.unitsSold === 3 && dayAug3?.orders === 1,
      '2026-08-03 has ₹3,500 revenue, 3 units, 1 order'
    )
    testAssert(
      dayAug4?.revenue === 0 && dayAug4?.unitsSold === 0 && dayAug4?.orders === 0,
      '2026-08-04 (cancelled order day) is cleanly zero-filled (₹0, 0 units, 0 orders)'
    )
    testAssert(
      dayAug5?.revenue === 3000 && dayAug5?.unitsSold === 3 && dayAug5?.orders === 1,
      '2026-08-05 has ₹3,000 revenue, 3 units, 1 order'
    )

    // ── 8. Zero-Sales Products Correctness ─────────────────────────────────
    console.log('\n--- 8. ZERO-SALES PRODUCTS TESTS ---')
    const zeroRes = await httpRequest({
      path: '/api/sales-insights/zero-sales',
      token: adminToken,
      query: testQuery,
    })
    testAssert(zeroRes.status === 200, 'GET /zero-sales returns 200')
    testAssert(
      zeroRes.data?.summary?.zeroSalesCount >= 1,
      `Zero sales count >= 1 (got ${zeroRes.data?.summary?.zeroSalesCount})`
    )

    const p3Zero = zeroRes.data?.products?.find((p) => p.productId === String(prodZeroId))
    testAssert(!!p3Zero, 'Product 3 (Kids Graphic Tee) is detected in zero-sales products list')
    testAssert(p3Zero?.currentStock === 30, `Product 3 stock reported accurately: ${p3Zero?.currentStock}`)
    testAssert(p3Zero?.unitsSold === 0, 'Product 3 unitsSold is 0')
    testAssert(p3Zero?.revenue === 0, 'Product 3 revenue is 0')

    const p1InZero = zeroRes.data?.products?.find((p) => p.productId === String(prod1Id))
    testAssert(!p1InZero, 'Product 1 (sold 5 units) is NOT in zero-sales list')

    // ── 9. Stock vs Sales (Inventory Velocity) ────────────────────────────
    console.log('\n--- 9. STOCK VS SALES TESTS ---')
    const stockRes = await httpRequest({
      path: '/api/sales-insights/stock-sales',
      token: adminToken,
      query: testQuery,
    })
    testAssert(stockRes.status === 200, 'GET /stock-sales returns 200')
    testAssert(
      stockRes.data?.products?.length >= 3,
      `Stock vs sales returns active products (got ${stockRes.data?.products?.length})`
    )

    const stockP3 = stockRes.data?.products?.find((p) => p.productId === String(prodZeroId))
    testAssert(!!stockP3, 'Product 3 present in stock vs sales')
    testAssert(stockP3?.velocity === 'zero', 'Product 3 classified as velocity: zero')
    testAssert(stockP3?.sellThroughRate === 0, 'Product 3 sellThroughRate is 0%')

    const stockP1 = stockRes.data?.products?.find((p) => p.productId === String(prod1Id))
    testAssert(!!stockP1, 'Product 1 present in stock vs sales')
    testAssert(stockP1?.velocity === 'healthy', 'Product 1 (5 units sold) classified as velocity: healthy')
    testAssert(
      stockP1?.sellThroughRate > 0,
      `Product 1 sellThroughRate > 0% (got ${stockP1?.sellThroughRate}%)`
    )

    // ── 10. Security & Read-Only Tests ────────────────────────────────────
    console.log('\n--- 10. SECURITY & READ-ONLY ENFORCEMENT ---')
    const postRes = await httpRequest({
      path: '/api/sales-insights/products',
      method: 'POST',
      token: adminToken,
    })
    testAssert(postRes.status === 404, 'POST to /api/sales-insights/products returns 404 (read-only)')

    // Query parameter tampering: client sends fake metrics
    const spoofRes = await httpRequest({
      path: '/api/sales-insights/products',
      token: adminToken,
      query: `${testQuery}&revenue=9999999&unitsSold=88888&totalRevenue=777777`,
    })
    testAssert(spoofRes.status === 200, 'Query with spoofed metrics accepted but ignored')
    testAssert(
      spoofRes.data?.summary?.totalRevenue === 6500,
      'totalRevenue remains authoritative 6500 regardless of spoofed query parameters'
    )
    testAssert(
      spoofRes.data?.summary?.totalUnits === 6,
      'totalUnits remains authoritative 6 regardless of spoofed query parameters'
    )
  } catch (err) {
    console.error('Test suite execution error:', err)
    failed++
  } finally {
    // ── Teardown & Cleanup ────────────────────────────────────────────────
    console.log('\n--- 11. TEARDOWN & CLEANUP ---')
    try {
      await Order.deleteMany({
        _id: { $in: [order1Id, order2Id, orderCancelledId, orderUnpaidId] },
      })
      console.log('  Cleaned up test orders.')

      await Product.deleteMany({
        _id: { $in: [prod1Id, prod2Id, prodZeroId] },
      })
      console.log('  Cleaned up test products.')

      await User.deleteMany({
        _id: { $in: [adminUser?._id, customerUser?._id].filter(Boolean) },
      })
      console.log('  Cleaned up test users.')
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr)
    }

    if (server) {
      await new Promise((res) => server.close(res))
    }
    await mongoose.disconnect()
  }

  console.log('\n========================================================')
  console.log(`SALES INSIGHTS BACKEND TESTS COMPLETE: ${passed} passed, ${failed} failed`)
  console.log('========================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTestSuite()
