/**
 * test_analytics.js
 * Comprehensive backend test suite for Advanced Admin Analytics.
 *
 * Covers:
 * 1. Authentication (401 unauthenticated)
 * 2. Authorization (403 customer, 200 admin)
 * 3. Input Validation (invalid ranges, invalid dates, end <= start, range > 366 days, invalid/excessive limit)
 * 4. Data Correctness (controlled test data: revenue, orders, AOV, products, customers, repeat rate, coupons, payments)
 * 5. Security (read-only, no mutation endpoints, no client influence on totals, no userId manipulation)
 * 6. Clean tear-down of all test data
 */

const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = require('../src/app')
const Order = require('../src/models/Order')
const Product = require('../src/models/Product')
const User = require('../src/models/User')
const Payment = require('../src/models/Payment')

let server
let baseUrl
let passed = 0
let failed = 0
const failures = []

function testAssert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
    failures.push(message)
  }
}

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(`${baseUrl}${path}`)
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }

    const req = http.request(reqOptions, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) })
        } catch {
          resolve({ status: res.statusCode, data: body })
        }
      })
    })

    req.on('error', reject)
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    req.end()
  })
}

function createToken(userId, role = 'admin') {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

async function runTests() {
  console.log('========================================================')
  console.log('STARTING ADVANCED ADMIN ANALYTICS BACKEND TEST SUITE')
  console.log('========================================================\n')

  await mongoose.connect(process.env.MONGODB_URI)

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  const testSuffix = Date.now().toString()
  const createdUserIds = []
  const createdProductIds = []
  const createdOrderIds = []
  const createdPaymentIds = []

  try {
    // ----------------------------------------------------
    // SETUP: Test Users (Admin & Customer)
    // ----------------------------------------------------
    const adminUser = await User.create({
      name: `Analytics Admin ${testSuffix}`,
      email: `admin_analytics_${testSuffix}@example.com`,
      password: 'Password123!',
      role: 'admin',
    })
    createdUserIds.push(adminUser._id)

    const customerUser = await User.create({
      name: `Analytics Customer A ${testSuffix}`,
      email: `customer_a_${testSuffix}@example.com`,
      password: 'Password123!',
      role: 'customer',
      createdAt: new Date('2026-08-02T10:00:00.000Z'),
    })
    createdUserIds.push(customerUser._id)

    const customerUserB = await User.create({
      name: `Analytics Customer B ${testSuffix}`,
      email: `customer_b_${testSuffix}@example.com`,
      password: 'Password123!',
      role: 'customer',
      createdAt: new Date('2026-08-04T10:00:00.000Z'),
    })
    createdUserIds.push(customerUserB._id)

    const adminToken = createToken(adminUser._id, 'admin')
    const customerToken = createToken(customerUser._id, 'customer')

    const adminHeader = { Authorization: `Bearer ${adminToken}` }
    const customerHeader = { Authorization: `Bearer ${customerToken}` }

    // ----------------------------------------------------
    // 1. AUTHENTICATION TESTS
    // ----------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION TESTS ---')
    const unauthRes = await request('/api/analytics/overview')
    testAssert(unauthRes.status === 401, 'Unauthenticated request to /overview returns 401')

    const unauthProducts = await request('/api/analytics/products')
    testAssert(unauthProducts.status === 401, 'Unauthenticated request to /products returns 401')

    const unauthCustomers = await request('/api/analytics/customers')
    testAssert(unauthCustomers.status === 401, 'Unauthenticated request to /customers returns 401')

    const unauthCoupons = await request('/api/analytics/coupons')
    testAssert(unauthCoupons.status === 401, 'Unauthenticated request to /coupons returns 401')

    const unauthPayments = await request('/api/analytics/payments')
    testAssert(unauthPayments.status === 401, 'Unauthenticated request to /payments returns 401')

    // ----------------------------------------------------
    // 2. AUTHORIZATION TESTS
    // ----------------------------------------------------
    console.log('\n--- 2. AUTHORIZATION TESTS ---')
    const customerOverview = await request('/api/analytics/overview', { headers: customerHeader })
    testAssert(customerOverview.status === 403, 'Customer role accessing /overview returns 403 Forbidden')

    const customerProducts = await request('/api/analytics/products', { headers: customerHeader })
    testAssert(customerProducts.status === 403, 'Customer role accessing /products returns 403 Forbidden')

    const customerAnalyticsCust = await request('/api/analytics/customers', { headers: customerHeader })
    testAssert(customerAnalyticsCust.status === 403, 'Customer role accessing /customers returns 403 Forbidden')

    const adminOverview = await request('/api/analytics/overview', { headers: adminHeader })
    testAssert(adminOverview.status === 200, 'Admin role accessing /overview returns 200 OK')
    testAssert(adminOverview.data.success === true, 'Response contains success: true')

    // ----------------------------------------------------
    // 3. INPUT VALIDATION TESTS
    // ----------------------------------------------------
    console.log('\n--- 3. INPUT VALIDATION TESTS ---')
    const invalidRange = await request('/api/analytics/overview?range=bad_range', { headers: adminHeader })
    testAssert(invalidRange.status === 400, 'Invalid range parameter returns 400')
    testAssert(invalidRange.data.message.includes('Invalid range parameter'), 'Error message describes invalid range')

    const missingCustomDates = await request('/api/analytics/overview?range=custom', { headers: adminHeader })
    testAssert(missingCustomDates.status === 400, 'Missing custom dates returns 400')

    const invalidCustomDates = await request('/api/analytics/overview?range=custom&startDate=not-a-date&endDate=also-not', { headers: adminHeader })
    testAssert(invalidCustomDates.status === 400, 'Malformed date strings return 400')

    const endBeforeStart = await request('/api/analytics/overview?range=custom&startDate=2026-08-10&endDate=2026-08-01', { headers: adminHeader })
    testAssert(endBeforeStart.status === 400, 'End date before start date returns 400')
    testAssert(endBeforeStart.data.message.includes('after start date'), 'Error mentions end date must be after start date')

    const excessiveRange = await request('/api/analytics/overview?range=custom&startDate=2024-01-01&endDate=2026-01-01', { headers: adminHeader })
    testAssert(excessiveRange.status === 400, 'Range exceeding 366 days returns 400')
    testAssert(excessiveRange.data.message.includes('366 days'), 'Error message confirms 366-day limit')

    const invalidLimit = await request('/api/analytics/products?limit=not_a_number', { headers: adminHeader })
    testAssert(invalidLimit.status === 400, 'Non-integer product limit returns 400')

    const excessiveLimit = await request('/api/analytics/products?limit=999', { headers: adminHeader })
    testAssert(excessiveLimit.status === 400, 'Excessive product limit (> 20) returns 400')

    const zeroLimit = await request('/api/analytics/products?limit=0', { headers: adminHeader })
    testAssert(zeroLimit.status === 400, 'Product limit of 0 returns 400')

    // ----------------------------------------------------
    // 4. DATA CORRECTNESS WITH CONTROLLED TEST DATA
    // ----------------------------------------------------
    console.log('\n--- 4. DATA CORRECTNESS WITH CONTROLLED TEST DATA ---')

    // Create 2 distinct test products
    const productA = await Product.create({
      name: `Analytics Watch Alpha ${testSuffix}`,
      description: 'Luxury chronograph watch for analytics testing',
      price: 1000,
      category: 'fashion',
      department: 'accessories',
      subcategory: 'watches',
      brand: 'TrendVolt Luxe',
      stock: 25,
      isActive: true,
    })
    createdProductIds.push(productA._id)

    const productB = await Product.create({
      name: `Analytics Shirt Beta ${testSuffix}`,
      description: 'Fine silk shirt for analytics testing',
      price: 500,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'TrendVolt Luxe',
      stock: 4, // low stock (<= 5)
      isActive: true,
    })
    createdProductIds.push(productB._id)

    // Controlled Date Range: 2026-08-01 to 2026-08-10
    const testRangeQuery = 'range=custom&startDate=2026-08-01&endDate=2026-08-10'

    // Order 1: Customer A, Product Alpha (qty 2, subtotal 2000), Coupon TESTCOUPON, total 1800, paid, confirmed
    const order1 = await Order.create({
      user: customerUser._id,
      orderNumber: `ORD-TEST-1-${testSuffix}`,
      items: [
        {
          product: productA._id,
          name: productA.name,
          price: 1000,
          quantity: 2,
          subtotal: 2000,
        },
      ],
      shippingAddress: {
        fullName: 'Test Customer A',
        phone: '9876543210',
        addressLine: '123 Fashion Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: 2000,
      discount: 200,
      coupon: {
        code: 'TESTCOUPON10',
        type: 'fixed',
        value: 200,
        discountAmount: 200,
      },
      shippingFee: 0,
      totalAmount: 1800,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
    })
    createdOrderIds.push(order1._id)

    // Order 2: Customer A, Product Beta (qty 3, subtotal 1500), total 1500, paid, delivered
    const order2 = await Order.create({
      user: customerUser._id,
      orderNumber: `ORD-TEST-2-${testSuffix}`,
      items: [
        {
          product: productB._id,
          name: productB.name,
          price: 500,
          quantity: 3,
          subtotal: 1500,
        },
      ],
      shippingAddress: {
        fullName: 'Test Customer A',
        phone: '9876543210',
        addressLine: '123 Fashion Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: 1500,
      discount: 0,
      coupon: null,
      shippingFee: 0,
      totalAmount: 1500,
      paymentStatus: 'paid',
      orderStatus: 'delivered',
      createdAt: new Date('2026-08-05T10:00:00.000Z'),
    })
    createdOrderIds.push(order2._id)

    // Order 3: Customer B, Product Alpha (qty 1, subtotal 1000), total 1000, paid BUT cancelled -> EXCLUDED from revenue!
    const order3 = await Order.create({
      user: customerUserB._id,
      orderNumber: `ORD-TEST-3-${testSuffix}`,
      items: [
        {
          product: productA._id,
          name: productA.name,
          price: 1000,
          quantity: 1,
          subtotal: 1000,
        },
      ],
      shippingAddress: {
        fullName: 'Test Customer B',
        phone: '9876543211',
        addressLine: '456 Silk Rd',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      subtotal: 1000,
      discount: 0,
      coupon: null,
      shippingFee: 0,
      totalAmount: 1000,
      paymentStatus: 'paid',
      orderStatus: 'cancelled',
      createdAt: new Date('2026-08-06T10:00:00.000Z'),
    })
    createdOrderIds.push(order3._id)

    // Order 4: Customer B, Product Beta (qty 1, subtotal 500), total 500, UNPAID (pending), pending -> EXCLUDED from revenue!
    const order4 = await Order.create({
      user: customerUserB._id,
      orderNumber: `ORD-TEST-4-${testSuffix}`,
      items: [
        {
          product: productB._id,
          name: productB.name,
          price: 500,
          quantity: 1,
          subtotal: 500,
        },
      ],
      shippingAddress: {
        fullName: 'Test Customer B',
        phone: '9876543211',
        addressLine: '456 Silk Rd',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
      },
      subtotal: 500,
      discount: 0,
      coupon: null,
      shippingFee: 0,
      totalAmount: 500,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      createdAt: new Date('2026-08-07T10:00:00.000Z'),
    })
    createdOrderIds.push(order4._id)

    // Create corresponding payment attempts
    const pay1 = await Payment.create({
      order: order1._id,
      user: customerUser._id,
      razorpayOrderId: `order_rzp_1_${testSuffix}`,
      razorpayPaymentId: `pay_rzp_1_${testSuffix}`,
      razorpaySignature: 'sig_dummy_1',
      amount: 1800,
      currency: 'INR',
      status: 'successful',
      createdAt: new Date('2026-08-03T10:05:00.000Z'),
    })
    createdPaymentIds.push(pay1._id)

    const pay2 = await Payment.create({
      order: order2._id,
      user: customerUser._id,
      razorpayOrderId: `order_rzp_2_${testSuffix}`,
      razorpayPaymentId: `pay_rzp_2_${testSuffix}`,
      razorpaySignature: 'sig_dummy_2',
      amount: 1500,
      currency: 'INR',
      status: 'successful',
      createdAt: new Date('2026-08-05T10:05:00.000Z'),
    })
    createdPaymentIds.push(pay2._id)

    const pay3 = await Payment.create({
      order: order3._id,
      user: customerUserB._id,
      razorpayOrderId: `order_rzp_3_${testSuffix}`,
      razorpayPaymentId: `pay_rzp_3_${testSuffix}`,
      razorpaySignature: 'sig_dummy_3',
      amount: 1000,
      currency: 'INR',
      status: 'failed',
      createdAt: new Date('2026-08-06T10:05:00.000Z'),
    })
    createdPaymentIds.push(pay3._id)

    const pay4 = await Payment.create({
      order: order4._id,
      user: customerUserB._id,
      razorpayOrderId: `order_rzp_4_${testSuffix}`,
      razorpayPaymentId: `pay_rzp_4_${testSuffix}`,
      razorpaySignature: 'sig_dummy_4',
      amount: 500,
      currency: 'INR',
      status: 'pending',
      createdAt: new Date('2026-08-07T10:05:00.000Z'),
    })
    createdPaymentIds.push(pay4._id)

    // --- Query Overview Endpoint ---
    const overviewRes = await request(`/api/analytics/overview?${testRangeQuery}`, { headers: adminHeader })
    testAssert(overviewRes.status === 200, 'Overview returns 200 for controlled test range')
    const kpis = overviewRes.data.kpis

    // Revenue: 1800 (Order 1) + 1500 (Order 2) = 3300. Order 3 cancelled excluded. Order 4 pending excluded.
    testAssert(kpis.totalRevenue === 3300, `Total revenue matches exactly: expected 3300, got ${kpis.totalRevenue}`)
    testAssert(kpis.revenue === 3300, `kpis.revenue matches locked scope schema: expected 3300, got ${kpis.revenue}`)
    testAssert(kpis.paidOrders === 2, `Paid orders count matches exactly: expected 2, got ${kpis.paidOrders}`)
    testAssert(kpis.orders === 2, `kpis.orders matches locked scope schema: expected 2, got ${kpis.orders}`)
    testAssert(kpis.averageOrderValue === 1650, `AOV matches: expected 1650, got ${kpis.averageOrderValue}`)
    testAssert(kpis.newCustomers >= 2, `New customers in range includes created test users (got ${kpis.newCustomers})`)
    testAssert(kpis.paymentSuccessRate === 50, `Payment success rate: 2 of 4 successful = 50% (got ${kpis.paymentSuccessRate}%)`)
    testAssert(kpis.cancelledOrders === 1, `Cancelled orders count matches: expected 1, got ${kpis.cancelledOrders}`)

    // Overview trends structure
    testAssert(Array.isArray(overviewRes.data.trends?.revenue), 'overview returns trends.revenue array')
    testAssert(Array.isArray(overviewRes.data.trends?.orders), 'overview returns trends.orders array')
    testAssert(Array.isArray(overviewRes.data.trends?.customers), 'overview returns trends.customers array')

    // Overview payments structure
    testAssert(overviewRes.data.payments?.totalAttempts === 4, 'overview.payments.totalAttempts equals 4')
    testAssert(overviewRes.data.payments?.successful === 2, 'overview.payments.successful equals 2')
    testAssert(overviewRes.data.payments?.successRate === 50, 'overview.payments.successRate equals 50%')

    // Fulfillment status breakdown
    const fulfillment = overviewRes.data.fulfillment || overviewRes.data.fulfillmentStatus
    testAssert(fulfillment.confirmed >= 1, `Fulfillment confirmed count includes Order 1 (got ${fulfillment.confirmed})`)
    testAssert(fulfillment.delivered >= 1, `Fulfillment delivered count includes Order 2 (got ${fulfillment.delivered})`)
    testAssert(fulfillment.cancelled >= 1, `Fulfillment cancelled count includes Order 3 (got ${fulfillment.cancelled})`)
    testAssert(fulfillment.pending >= 1, `Fulfillment pending count includes Order 4 (got ${fulfillment.pending})`)

    // Trend series continuity
    const trend = overviewRes.data.trend
    testAssert(Array.isArray(trend) && trend.length >= 10, `Trend array contains daily continuous records for range (got ${trend.length} days)`)
    const aug3Data = trend.find((t) => t.date === '2026-08-03')
    testAssert(aug3Data && aug3Data.revenue === 1800 && aug3Data.orders === 1, '2026-08-03 trend entry has 1800 revenue and 1 order')

    // --- Query Product Analytics ---
    const prodRes = await request(`/api/analytics/products?${testRangeQuery}&limit=10`, { headers: adminHeader })
    testAssert(prodRes.status === 200, 'Products analytics returns 200')
    const topByUnits = prodRes.data.topByUnits
    const topByRevenue = prodRes.data.topByRevenue

    // Top by units: Product Beta sold 3 units, Product Alpha sold 2 units
    const betaByUnits = topByUnits.find((p) => p.name === productB.name)
    const alphaByUnits = topByUnits.find((p) => p.name === productA.name)
    testAssert(betaByUnits && betaByUnits.unitsSold === 3, 'Product Beta units sold = 3')
    testAssert(alphaByUnits && alphaByUnits.unitsSold === 2, 'Product Alpha units sold = 2')
    testAssert(topByUnits[0].name === productB.name, 'Product Beta is top by units (3 sold vs 2)')

    // Top by revenue: Product Alpha had 2000, Product Beta had 1500
    testAssert(topByRevenue[0].name === productA.name, 'Product Alpha is top by revenue (₹2000 vs ₹1500)')
    const alphaByRev = topByRevenue.find((p) => p.name === productA.name)
    testAssert(alphaByRev && alphaByRev.revenue === 2000, 'Product Alpha revenue = 2000')

    // Catalog Health
    const catalog = prodRes.data.catalogHealth
    testAssert(catalog.active >= 2, `Active products count includes test products (got ${catalog.active})`)
    testAssert(catalog.lowStock >= 1, `Low stock products count includes Product Beta (stock 4 <= 5, got ${catalog.lowStock})`)

    // --- Query Customer Analytics ---
    const custRes = await request(`/api/analytics/customers?${testRangeQuery}`, { headers: adminHeader })
    testAssert(custRes.status === 200, 'Customer analytics returns 200')
    const custData = custRes.data.customers || custRes.data

    testAssert(custData.totalCustomers >= 2, `Total customers count >= 2 (got ${custData.totalCustomers})`)
    testAssert(custData.activeCustomers >= 2, `Active customers count >= 2 (got ${custData.activeCustomers})`)
    // Customer A has 2 paid orders -> repeat customer! Customer B has 0 paid non-cancelled orders.
    testAssert(custData.customersWithPaidOrders === 1, `Customers with paid orders in test range = 1 (Customer A)`)
    testAssert(custData.repeatCustomers === 1, `Repeat customers = 1 (Customer A had 2 orders)`)
    testAssert(custData.repeatCustomerRate === 100, `Repeat customer rate = 100% (1 repeat / 1 customer with orders)`)
    testAssert(Array.isArray(custData.newCustomersTrend), 'New customers acquisition trend is returned as an array')
    testAssert(custRes.data.customersWithPaidOrders === 1, 'Top-level customersWithPaidOrders present')

    // --- Query Coupon Analytics ---
    const coupRes = await request(`/api/analytics/coupons?${testRangeQuery}`, { headers: adminHeader })
    testAssert(coupRes.status === 200, 'Coupon analytics returns 200')
    const coupData = coupRes.data.coupons || coupRes.data
    testAssert(coupData.ordersWithCoupon === 1 || coupData.ordersUsingCoupons === 1, `Orders with coupon = 1 (Order 1)`)
    testAssert(coupData.totalDiscountGiven === 200 || coupData.totalDiscount === 200, `Total discount given = 200`)
    testAssert(coupData.couponAttributedRevenue === 1800, `Coupon-attributed revenue = 1800`)
    testAssert(coupData.topCoupons.length >= 1, 'Top coupons contains entry')
    testAssert(coupData.topCoupons[0].code === 'TESTCOUPON10', 'Top coupon code is TESTCOUPON10')
    testAssert(coupData.topCoupons[0].uses === 1, 'Top coupon uses count = 1')
    testAssert(coupRes.data.ordersWithCoupon === 1, 'Top-level ordersWithCoupon present')
    testAssert(coupRes.data.totalDiscountGiven === 200, 'Top-level totalDiscountGiven present')

    // --- Query Payment Analytics ---
    const payRes = await request(`/api/analytics/payments?${testRangeQuery}`, { headers: adminHeader })
    testAssert(payRes.status === 200, 'Payment analytics returns 200')
    const payments = payRes.data.payments
    testAssert(payments.totalAttempts === 4, `Total payment attempts = 4`)
    testAssert(payments.successful === 2, `Successful payments = 2`)
    testAssert(payments.failed === 1, `Failed payments = 1`)
    testAssert(payments.pending === 1, `Pending payments = 1`)
    testAssert(payments.paymentSuccessRate === 50, `Payment success rate = 50%`)

    // ----------------------------------------------------
    // 5. SECURITY & READ-ONLY ENFORCEMENT
    // ----------------------------------------------------
    console.log('\n--- 5. SECURITY & READ-ONLY ENFORCEMENT ---')
    // No mutation endpoints allowed
    const postRes = await request('/api/analytics/overview', { method: 'POST', headers: adminHeader, body: { revenue: 999999 } })
    testAssert(postRes.status === 404, 'POST to /api/analytics/overview returns 404 (read-only)')

    const putRes = await request('/api/analytics/overview', { method: 'PUT', headers: adminHeader, body: { revenue: 999999 } })
    testAssert(putRes.status === 404, 'PUT to /api/analytics/overview returns 404 (read-only)')

    const deleteRes = await request('/api/analytics/overview', { method: 'DELETE', headers: adminHeader })
    testAssert(deleteRes.status === 404, 'DELETE to /api/analytics/overview returns 404 (read-only)')

    // Client cannot tamper with metrics via query or body
    const tamperRes = await request(`/api/analytics/overview?${testRangeQuery}&totalRevenue=99999999&paidOrders=999&userId=${customerUserB._id}`, {
      headers: adminHeader,
    })
    testAssert(tamperRes.status === 200, 'Query with spoofed metrics accepted but ignored')
    testAssert(tamperRes.data.kpis.totalRevenue === 3300, 'totalRevenue remains 3300 regardless of spoofed query parameters')
    testAssert(tamperRes.data.kpis.paidOrders === 2, 'paidOrders remains 2 regardless of spoofed query parameters')

  } finally {
    // ----------------------------------------------------
    // 6. TEARDOWN & COMPLETE TEST DATA CLEANUP
    // ----------------------------------------------------
    console.log('\n--- 6. TEARDOWN & CLEANUP ---')
    if (createdOrderIds.length > 0) {
      const delOrders = await Order.deleteMany({ _id: { $in: createdOrderIds } })
      console.log(`  Cleaned up ${delOrders.deletedCount} test orders.`)
    }
    if (createdPaymentIds.length > 0) {
      const delPayments = await Payment.deleteMany({ _id: { $in: createdPaymentIds } })
      console.log(`  Cleaned up ${delPayments.deletedCount} test payments.`)
    }
    if (createdProductIds.length > 0) {
      const delProducts = await Product.deleteMany({ _id: { $in: createdProductIds } })
      console.log(`  Cleaned up ${delProducts.deletedCount} test products.`)
    }
    if (createdUserIds.length > 0) {
      const delUsers = await User.deleteMany({ _id: { $in: createdUserIds } })
      console.log(`  Cleaned up ${delUsers.deletedCount} test users.`)
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    await mongoose.connection.close()
  }

  console.log('\n========================================================')
  console.log(`ANALYTICS BACKEND TESTS COMPLETE: ${passed} passed, ${failed} failed`)
  console.log('========================================================\n')

  if (failed > 0) {
    console.error('Test Failures:')
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`))
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal error running analytics tests:', err)
  process.exit(1)
})
