const http = require('http')
const assert = require('assert')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = require('../src/app')
const Coupon = require('../src/models/Coupon')
const Product = require('../src/models/Product')
const User = require('../src/models/User')
const Cart = require('../src/models/Cart')
const Order = require('../src/models/Order')
const Payment = require('../src/models/Payment')
const {
  calculateBogoFreeQuantity,
  calculateCartDiscount,
} = require('../src/services/couponService')

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

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(`${baseUrl}${options.path}`)
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
    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

async function runTests() {
  console.log('\n========================================')
  console.log('STARTING FEATURE #6 COUPON SYSTEM TESTS')
  console.log('========================================\n')

  await mongoose.connect(process.env.MONGODB_URI)

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: BOGO FORMULA UNIT TESTS (Section 3.3, 23, 24, 33)
    // ----------------------------------------------------
    console.log('\n--- 1. BOGO FORMULA UNIT TESTS ---')
    // BUY1GET1
    testAssert(calculateBogoFreeQuantity(1, 1, 1) === 1, 'BUY1GET1: 1 eligible -> 1 free')
    testAssert(calculateBogoFreeQuantity(2, 1, 1) === 2, 'BUY1GET1: 2 eligible -> 2 free')
    testAssert(calculateBogoFreeQuantity(3, 1, 1) === 3, 'BUY1GET1: 3 eligible -> 3 free')

    // BUY2GET3
    testAssert(calculateBogoFreeQuantity(1, 2, 3) === 0, 'BUY2GET3: 1 eligible -> 0 free')
    testAssert(calculateBogoFreeQuantity(2, 2, 3) === 3, 'BUY2GET3: 2 eligible -> 3 free')
    testAssert(calculateBogoFreeQuantity(4, 2, 3) === 6, 'BUY2GET3: 4 eligible -> 6 free')
    testAssert(calculateBogoFreeQuantity(6, 2, 3) === 9, 'BUY2GET3: 6 eligible -> 9 free')
    testAssert(calculateBogoFreeQuantity(8, 2, 3) === 12, 'BUY2GET3: 8 eligible -> 12 free')

    // ----------------------------------------------------
    // TEST SUITE 2: CART DISCOUNT CALCULATION & BOGO MINIMUM ORDER
    // ----------------------------------------------------
    console.log('\n--- 2. BOGO MINIMUM SUBTOTAL & CART DISCOUNT ---')
    const bogoCoupon = {
      code: 'TESTBOGO23',
      type: 'buy_x_get_y',
      buyQuantity: 2,
      freeQuantity: 3,
      minimumOrderValue: 10000,
    }

    // Subtotal ₹9,999 -> reject
    const cart9999 = [
      { price: 9999, quantity: 5, product: { price: 1999.8 } }, // 1999.8 * 5 = 9999
    ]
    const res9999 = calculateCartDiscount(bogoCoupon, cart9999)
    testAssert(!res9999.isValid && res9999.message.includes('10,000'), '₹9,999 cart subtotal is REJECTED for BOGO')

    // Subtotal ₹10,000 -> eligible
    const cart10000 = [
      { price: 2000, quantity: 5, product: { price: 2000 } }, // 5 units @ 2000 = 10,000
    ]
    const res10000 = calculateCartDiscount(bogoCoupon, cart10000)
    testAssert(res10000.isValid === true, '₹10,000 cart subtotal is ELIGIBLE for BOGO')
    testAssert(res10000.freeItems === 3, '₹10,000 cart (5 units) gets exactly 3 free items')
    testAssert(res10000.discountAmount === 6000, '3 free items @ 2000 each = ₹6,000 discount')
    testAssert(res10000.finalAmount === 4000, 'Final amount is ₹4,000')

    // Subtotal ₹10,001 -> eligible
    const cart10001 = [
      { price: 2000, quantity: 4, product: { price: 2000 } },
      { price: 2001, quantity: 1, product: { price: 2001 } },
    ]
    const res10001 = calculateCartDiscount(bogoCoupon, cart10001)
    testAssert(res10001.isValid === true, '₹10,001 cart subtotal is ELIGIBLE for BOGO')

    // ----------------------------------------------------
    // TEST SUITE 3: LOWEST-PRICED ELIGIBLE UNITS SELECTED FIRST (Section 7)
    // ----------------------------------------------------
    console.log('\n--- 3. LOWEST-PRICED UNITS SELECTION & MAXIMUM DISCOUNT ---')
    // Mixed prices cart: 5 items total (2 expensive, 3 cheaper)
    // Total subtotal = 4000 + 4000 + 1000 + 1000 + 1000 = 11,000 (>= 10,000)
    const mixedCart = [
      { product: { name: 'Jeans A', price: 4000 }, quantity: 1 },
      { product: { name: 'Jeans B', price: 4000 }, quantity: 1 },
      { product: { name: 'T-Shirt 1', price: 1000 }, quantity: 1 },
      { product: { name: 'T-Shirt 2', price: 1200 }, quantity: 1 },
      { product: { name: 'T-Shirt 3', price: 800 }, quantity: 1 },
    ]
    // 3 lowest units are: 800 + 1000 + 1200 = 3,000
    const resMixed = calculateCartDiscount(bogoCoupon, mixedCart)
    testAssert(resMixed.isValid === true, 'Mixed cart is valid')
    testAssert(resMixed.discountAmount === 3000, 'Selected 3 lowest units (800 + 1000 + 1200 = ₹3,000 discount)')
    testAssert(resMixed.finalAmount === 8000, 'Final amount pays for the 2 highest items (4000 + 4000 = ₹8,000)')

    // Maximum discount cap on BOGO
    const bogoWithCap = {
      ...bogoCoupon,
      maximumDiscount: 2500,
    }
    const resCap = calculateCartDiscount(bogoWithCap, mixedCart)
    testAssert(resCap.discountAmount === 2500, 'BOGO discount capped at maximumDiscount (₹2,500)')
    testAssert(resCap.finalAmount === 8500, 'Final amount with cap is ₹8,500')

    // ----------------------------------------------------
    // TEST SUITE 4: PERCENTAGE & FIXED DISCOUNT CALCULATIONS
    // ----------------------------------------------------
    console.log('\n--- 4. PERCENTAGE & FIXED COUPONS ---')
    const percentCoupon = {
      code: 'SAVE20',
      type: 'percentage',
      value: 20,
      minimumOrderValue: 1000,
      maximumDiscount: 500,
    }
    const cartForPercent = [
      { product: { price: 2000 }, quantity: 1 },
    ]
    // 20% of 2000 = 400 (< 500 cap)
    const resPercent = calculateCartDiscount(percentCoupon, cartForPercent)
    testAssert(resPercent.discountAmount === 400, 'Percentage discount 20% of 2000 = ₹400')
    testAssert(resPercent.finalAmount === 1600, 'Final amount = ₹1,600')

    // Exceeding cap
    const largeCart = [
      { product: { price: 5000 }, quantity: 1 },
    ]
    // 20% of 5000 = 1000 -> capped at 500
    const resPercentCapped = calculateCartDiscount(percentCoupon, largeCart)
    testAssert(resPercentCapped.discountAmount === 500, 'Percentage discount capped at maximumDiscount (₹500)')
    testAssert(resPercentCapped.finalAmount === 4500, 'Final amount = ₹4,500')

    // Fixed coupon
    const fixedCoupon = {
      code: 'FLAT300',
      type: 'fixed',
      value: 300,
      minimumOrderValue: 500,
    }
    const resFixed = calculateCartDiscount(fixedCoupon, [{ product: { price: 1000 }, quantity: 1 }])
    testAssert(resFixed.discountAmount === 300, 'Fixed coupon ₹300 off ₹1,000')
    testAssert(resFixed.finalAmount === 700, 'Final amount = ₹700')

    // Discount never exceeds subtotal (cannot make payable negative)
    const smallCart = [{ product: { price: 200 }, quantity: 1 }]
    const fixedBig = { code: 'FLAT500', type: 'fixed', value: 500, minimumOrderValue: 0 }
    const resNegativePrevent = calculateCartDiscount(fixedBig, smallCart)
    testAssert(resNegativePrevent.discountAmount === 200, 'Fixed discount clamped to subtotal (never negative)')
    testAssert(resNegativePrevent.finalAmount === 0, 'Final amount is ₹0, not negative')

    // ----------------------------------------------------
    // TEST SUITE 5: DATABASE MODEL & CODE NORMALIZATION
    // ----------------------------------------------------
    console.log('\n--- 5. DATABASE MODEL & NORMALIZATION ---')
    // Clean any prior test coupons
    await Coupon.deleteMany({ code: { $in: ['TESTNORM50', 'TESTDUP', 'TESTACTIVE', 'TESTEXPIRED', 'TESTGLOBAL', 'TESTUSERLIMIT', 'TESTORDERCOUPON'] } })

    const lowerCoupon = await Coupon.create({
      code: '  testnorm50  ',
      type: 'percentage',
      value: 50,
    })
    testAssert(lowerCoupon.code === 'TESTNORM50', 'Coupon code trimmed and normalized to uppercase')

    // Duplicate code rejection
    let dupFailed = false
    try {
      await Coupon.create({
        code: 'TESTNORM50',
        type: 'fixed',
        value: 100,
      })
    } catch {
      dupFailed = true
    }
    testAssert(dupFailed === true, 'Duplicate coupon code is rejected by database unique index')

    // ----------------------------------------------------
    // TEST SUITE 6: REST API — AUTHENTICATION & VALIDATION
    // ----------------------------------------------------
    console.log('\n--- 6. REST API VALIDATION & SECURITY ---')
    // Create test user & tokens
    const testCustomer = await User.findOneAndUpdate(
      { email: 'coupontestuser@example.com' },
      { name: 'Coupon Test Customer', email: 'coupontestuser@example.com', passwordHash: 'hash', role: 'customer', isActive: true },
      { upsert: true, new: true }
    )
    const customerToken = jwt.sign({ id: testCustomer._id }, process.env.JWT_SECRET)

    const testAdmin = await User.findOneAndUpdate(
      { email: 'couponadmin@example.com' },
      { name: 'Coupon Test Admin', email: 'couponadmin@example.com', passwordHash: 'hash', role: 'admin', isActive: true },
      { upsert: true, new: true }
    )
    const adminToken = jwt.sign({ id: testAdmin._id }, process.env.JWT_SECRET)

    // Unauthenticated call to /api/coupons/validate -> 401
    const unauthRes = await request({
      path: '/api/coupons/validate',
      method: 'POST',
    }, { code: 'TESTNORM50' })
    testAssert(unauthRes.status === 401, 'Unauthenticated coupon validation is REJECTED (401)')

    // Customer trying admin endpoint -> 403
    const adminForbidden = await request({
      path: '/api/coupons/admin',
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` },
    })
    testAssert(adminForbidden.status === 403, 'Customer accessing admin coupons endpoint is FORBIDDEN (403)')

    // Admin accessing admin endpoint -> 200
    const adminAllowed = await request({
      path: '/api/coupons/admin',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(adminAllowed.status === 200 && adminAllowed.data.success, 'Admin accessing admin coupons succeeds (200)')

    // ----------------------------------------------------
    // TEST SUITE 7: CART POPULATION & VALIDATE API
    // ----------------------------------------------------
    console.log('\n--- 7. CART REVALIDATION IN VALIDATE API ---')
    // Create test product
    const testProduct = await Product.create({
      name: 'Test Fashion Shirt',
      price: 2500,
      category: 'fashion',
      brand: 'TrendVolt Test',
      stock: 50,
      isActive: true,
      description: 'Test product for coupon',
    })

    // Set user's cart: 5 units @ 2500 = ₹12,500
    await Cart.findOneAndUpdate(
      { user: testCustomer._id },
      {
        user: testCustomer._id,
        items: [{ product: testProduct._id, quantity: 5, size: 'M' }],
      },
      { upsert: true, new: true }
    )

    // Create active BOGO coupon in DB
    const liveBogo = await Coupon.create({
      code: 'LIVEBUY2GET3',
      type: 'buy_x_get_y',
      buyQuantity: 2,
      freeQuantity: 3,
      minimumOrderValue: 10000,
      isActive: true,
    })

    // Client validates with fake values in body (must be ignored)
    const validateRes = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, {
      code: 'LIVEBUY2GET3',
      discountAmount: 999999, // FAKE
      finalAmount: 1, // FAKE
      freeQuantity: 100, // FAKE
    })

    testAssert(validateRes.status === 200, 'Valid coupon validation returned 200')
    testAssert(validateRes.data.subtotal === 12500, 'Backend calculated subtotal authoritatively: ₹12,500')
    testAssert(validateRes.data.freeItems === 3, 'Backend calculated 3 free items')
    testAssert(validateRes.data.discountAmount === 7500, 'Backend calculated discount (3 * 2500 = ₹7,500), ignoring client manipulation')
    testAssert(validateRes.data.finalAmount === 5000, 'Authoritative final total: ₹5,000')

    // ----------------------------------------------------
    // TEST SUITE 8: INACTIVE, EXPIRED & USAGE LIMIT VALIDATION
    // ----------------------------------------------------
    console.log('\n--- 8. INACTIVE, EXPIRED & LIMIT CHECKS ---')
    // Inactive coupon
    const inactiveCoupon = await Coupon.create({
      code: 'INACTIVE50',
      type: 'percentage',
      value: 50,
      isActive: false,
    })
    const resInactive = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, { code: 'INACTIVE50' })
    testAssert(resInactive.status === 400 && resInactive.data.message.includes('not active'), 'Inactive coupon rejected with clear message')

    // Expired coupon
    const expiredCoupon = await Coupon.create({
      code: 'EXPIRED10',
      type: 'percentage',
      value: 10,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    })
    const resExpired = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, { code: 'EXPIRED10' })
    testAssert(resExpired.status === 400 && resExpired.data.message.includes('expired'), 'Expired coupon rejected with clear message')

    // Global usage limit reached
    const maxedCoupon = await Coupon.create({
      code: 'MAXEDOUT',
      type: 'fixed',
      value: 100,
      usageLimit: 5,
      usedCount: 5,
    })
    const resMaxed = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, { code: 'MAXEDOUT' })
    testAssert(resMaxed.status === 400 && resMaxed.data.message.includes('limit reached'), 'Maxed out coupon rejected')

    // ----------------------------------------------------
    // TEST SUITE 9: ORDER CREATION WITH COUPON & SNAPSHOT
    // ----------------------------------------------------
    console.log('\n--- 9. ORDER CREATION WITH AUTHORITATIVE REVALIDATION ---')
    const createOrderRes = await request({
      path: '/api/orders',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, {
      shippingAddress: {
        fullName: 'Jane Doe',
        phone: '9876543210',
        addressLine: '123 Trend Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      couponCode: 'LIVEBUY2GET3',
      discountAmount: 12000, // FAKE client discount (must be ignored)
      totalAmount: 500, // FAKE client total (must be ignored)
    })

    testAssert(createOrderRes.status === 201, 'Order created successfully with coupon')
    const createdOrder = createOrderRes.data.order
    testAssert(createdOrder.subtotal === 12500, 'Order subtotal is ₹12,500')
    testAssert(createdOrder.discount === 7500, 'Order discount calculated by server: ₹7,500 (fake discount ignored)')
    testAssert(createdOrder.totalAmount === 5000, 'Order totalAmount is ₹5,000 (fake total ignored)')
    testAssert(createdOrder.coupon && createdOrder.coupon.code === 'LIVEBUY2GET3', 'Order has coupon snapshot stored')
    testAssert(createdOrder.coupon.discountAmount === 7500, 'Coupon snapshot discountAmount is preserved')

    // Verify Coupon usedCount is NOT incremented yet (application != usage finalization)
    const liveBogoAfterOrder = await Coupon.findById(liveBogo._id)
    testAssert(liveBogoAfterOrder.usedCount === 0, 'Applying/ordering does NOT increment coupon usedCount')

    // ----------------------------------------------------
    // TEST SUITE 10: RAZORPAY AMOUNT INTEGRITY & USAGE FINALIZATION
    // ----------------------------------------------------
    console.log('\n--- 10. RAZORPAY PAYMENT & USAGE FINALIZATION ---')
    // Create payment order
    const rzpOrderRes = await request({
      path: '/api/payments/create-order',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, { orderId: createdOrder._id })

    testAssert(rzpOrderRes.status === 200, 'Razorpay order created successfully')
    // Amount in paise must equal order.totalAmount * 100 (5000 * 100 = 500000 paise)
    testAssert(rzpOrderRes.data.amount === 500000, 'Razorpay order amount matches Order.totalAmount in paise (₹5,000 = 500000 paise)')

    // Verify payment using mock HMAC signature
    const crypto = require('crypto')
    const rzpOrderId = rzpOrderRes.data.razorpayOrderId
    const rzpPaymentId = 'pay_mock_' + Date.now()
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${rzpOrderId}|${rzpPaymentId}`)
      .digest('hex')

    const verifyRes = await request({
      path: '/api/payments/verify',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, {
      orderId: createdOrder._id,
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: rzpPaymentId,
      razorpaySignature: expectedSig,
    })

    testAssert(verifyRes.status === 200 && verifyRes.data.success, 'Payment verification succeeds')

    // Check Coupon usedCount is now incremented atomically
    const liveBogoAfterPaid = await Coupon.findById(liveBogo._id)
    testAssert(liveBogoAfterPaid.usedCount === 1, 'Coupon usedCount incremented to 1 ONLY after successful verified payment')

    // ----------------------------------------------------
    // TEST SUITE 11: PER-USER LIMIT
    // ----------------------------------------------------
    console.log('\n--- 11. PER-USER USAGE LIMIT ENFORCEMENT ---')
    // Create coupon with perUserLimit = 1
    const onePerUserCoupon = await Coupon.create({
      code: 'ONEPERUSER',
      type: 'fixed',
      value: 50,
      minimumOrderValue: 0,
      perUserLimit: 1,
    })

    // First use: user has not used ONEPERUSER in any paid order
    // Populate user's cart with 1 unit of product
    await Cart.findOneAndUpdate(
      { user: testCustomer._id },
      { items: [{ product: testProduct._id, quantity: 1 }] }
    )
    const check1 = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, { code: 'ONEPERUSER' })
    testAssert(check1.status === 200, 'User can validate ONEPERUSER before using it')

    // Create a paid order with ONEPERUSER for this customer
    await Order.create({
      user: testCustomer._id,
      orderNumber: 'ORD-USER-TEST-' + Date.now(),
      items: [{ product: testProduct._id, name: 'Shirt', price: 2500, quantity: 1, subtotal: 2500 }],
      shippingAddress: { fullName: 'A', phone: '12345678', addressLine: 'B', city: 'C', state: 'D', postalCode: '123', country: 'E' },
      subtotal: 2500,
      discount: 50,
      coupon: { code: 'ONEPERUSER', type: 'fixed', value: 50, discountAmount: 50 },
      shippingFee: 0,
      totalAmount: 2450,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
    })

    // Try validating again after having 1 paid order
    const check2 = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, { code: 'ONEPERUSER' })
    testAssert(check2.status === 400 && check2.data.message.includes('already used'), 'Per-user limit enforced: user rejected after reaching limit')

    // Cleanup test products, coupons, orders
    await Coupon.deleteMany({ code: { $in: ['TESTNORM50', 'LIVEBUY2GET3', 'INACTIVE50', 'EXPIRED10', 'MAXEDOUT', 'ONEPERUSER'] } })
    await Product.findByIdAndDelete(testProduct._id)
    await Order.deleteMany({ user: testCustomer._id })
    await Payment.deleteMany({ user: testCustomer._id })
    await Cart.deleteMany({ user: testCustomer._id })
    await User.findByIdAndDelete(testCustomer._id)
    await User.findByIdAndDelete(testAdmin._id)

    console.log(`\n========================================`)
    console.log(`ALL TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`)
    console.log(`========================================\n`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Unhandled test suite error:', err)
    process.exit(1)
  } finally {
    if (server) server.close()
    await mongoose.disconnect()
  }
}

runTests()
