const http = require('http')
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
  console.log('\n=============================================')
  console.log('CUSTOMER CHECKOUT COUPON UX VERIFICATION')
  console.log('=============================================\n')

  await mongoose.connect(process.env.MONGODB_URI)

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  try {
    // 1. Setup test user
    const customer = await User.findOneAndUpdate(
      { email: 'ux_tester@example.com' },
      { name: 'UX Tester', email: 'ux_tester@example.com', passwordHash: 'hash', role: 'customer', isActive: true },
      { upsert: true, new: true }
    )
    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET)

    // 2. Ensure BUY1GET1 and BUY2GET3 exist
    await Coupon.findOneAndUpdate(
      { code: 'BUY1GET1' },
      { code: 'BUY1GET1', type: 'buy_x_get_y', buyQuantity: 1, freeQuantity: 1, minimumOrderValue: 10000, isActive: true },
      { upsert: true, new: true }
    )

    await Coupon.findOneAndUpdate(
      { code: 'BUY2GET3' },
      { code: 'BUY2GET3', type: 'buy_x_get_y', buyQuantity: 2, freeQuantity: 3, minimumOrderValue: 10000, isActive: true },
      { upsert: true, new: true }
    )

    // 3. Setup test products
    const p1 = await Product.create({
      name: 'UX Shirt A',
      price: 2500,
      category: 'fashion',
      brand: 'TrendVolt',
      stock: 20,
      isActive: true,
      description: 'Shirt A',
    })

    const p2 = await Product.create({
      name: 'UX Shirt B',
      price: 1500,
      category: 'fashion',
      brand: 'TrendVolt',
      stock: 20,
      isActive: true,
      description: 'Shirt B',
    })

    // STEP A: Discovery - GET /api/coupons/offers
    const offersRes = await request({
      path: '/api/coupons/offers',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    testAssert(offersRes.status === 200, 'Offers endpoint returned 200')
    const offers = offersRes.data.offers || []
    const codes = offers.map((o) => o.code)
    testAssert(codes.includes('BUY1GET1'), 'BUY1GET1 appears in active offers')
    testAssert(codes.includes('BUY2GET3'), 'BUY2GET3 appears in active offers')

    // STEP B: Cart subtotal ₹9,999 -> not eligible for BOGO
    // Cart: 3 items of 2500 + 1 item of 2499 = 9999
    await Cart.findOneAndUpdate(
      { user: customer._id },
      {
        user: customer._id,
        items: [
          { product: p1._id, quantity: 3, size: 'M' }, // 7500
          { product: p2._id, quantity: 1, size: 'L' }, // 1500 -> total 9000 < 10000
        ],
      },
      { upsert: true, new: true }
    )

    const belowMinRes = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, { code: 'BUY2GET3' })

    testAssert(belowMinRes.status === 400, 'BOGO validation rejects cart with subtotal < ₹10,000')
    testAssert(belowMinRes.data.message.includes('10,000'), 'Error message mentions ₹10,000 threshold')
    testAssert(belowMinRes.data.details && belowMinRes.data.details.shortfall > 0, 'Details include shortfall for informational frontend UI')

    // STEP C: Cart reaches ₹10,000 -> eligible for BOGO
    // Let's set 5 items: 2 of p1 (2 * 2500 = 5000), 3 of p2 (3 * 2000 = 6000? Let's use 4 * 2500 = 10000 or mixed)
    // 2 items @ 3000, 3 items @ 2000 -> total 12,000 >= 10,000
    // BUY2GET3 requires 5 items. 2 paid, 3 free. Lowest 3 are free (3 * 2000 = 6000 discount).
    const p3000 = await Product.create({
      name: 'UX Luxury Jacket',
      price: 3000,
      category: 'fashion',
      brand: 'TrendVolt',
      stock: 10,
      isActive: true,
      description: 'Jacket',
    })
    const p2000 = await Product.create({
      name: 'UX Classic Pants',
      price: 2000,
      category: 'fashion',
      brand: 'TrendVolt',
      stock: 10,
      isActive: true,
      description: 'Pants',
    })

    await Cart.findOneAndUpdate(
      { user: customer._id },
      {
        user: customer._id,
        items: [
          { product: p3000._id, quantity: 2, size: 'L' }, // 6000
          { product: p2000._id, quantity: 3, size: 'M' }, // 6000 -> total 12000
        ],
      },
      { upsert: true, new: true }
    )

    // One-click apply BUY2GET3: sends { code: 'BUY2GET3' } to existing validate API
    const applyBogoRes = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, { code: 'BUY2GET3' })

    testAssert(applyBogoRes.status === 200, 'BUY2GET3 validation succeeds when subtotal >= ₹10,000 and 5 units')
    testAssert(applyBogoRes.data.subtotal === 12000, 'Backend calculated original subtotal: ₹12,000')
    testAssert(applyBogoRes.data.freeItems === 3, 'Backend selected 3 free items')
    testAssert(applyBogoRes.data.discountAmount === 6000, 'Backend calculated discount from 3 lowest items: ₹6,000')
    testAssert(applyBogoRes.data.finalAmount === 6000, 'Backend final amount is ₹6,000')

    // STEP D: Manual entry of BUY1GET1 works on existing flow
    // 5 units: 1 paid -> 1 free. 2 groups of (1+1) = 2 free items.
    // 2 lowest items are free (2 * 2000 = 4000 discount).
    const applyBogo1Res = await request({
      path: '/api/coupons/validate',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, { code: 'BUY1GET1' })

    testAssert(applyBogo1Res.status === 200, 'BUY1GET1 validation succeeds')
    testAssert(applyBogo1Res.data.freeItems === 2, 'BUY1GET1 calculates 2 free items for 5 units')
    testAssert(applyBogo1Res.data.discountAmount === 4000, 'BUY1GET1 discount is ₹4,000')
    testAssert(applyBogo1Res.data.finalAmount === 8000, 'BUY1GET1 final total is ₹8,000')

    // STEP E: Create order with coupon and verify snapshot & payment
    const orderRes = await request({
      path: '/api/orders',
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }, {
      shippingAddress: {
        fullName: 'UX Tester',
        phone: '9988776655',
        addressLine: '456 Fashion Ave',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India',
      },
      couponCode: 'BUY2GET3',
    })

    testAssert(orderRes.status === 201, 'Order created successfully with BUY2GET3')
    const order = orderRes.data.order
    testAssert(order.subtotal === 12000, 'Order subtotal is ₹12,000')
    testAssert(order.discount === 6000, 'Authoritative discount is ₹6,000')
    testAssert(order.totalAmount === 6000, 'Authoritative order total is ₹6,000')

    // Cleanup
    await Product.deleteMany({ _id: { $in: [p1._id, p2._id, p3000._id, p2000._id] } })
    await Order.deleteMany({ user: customer._id })
    await Cart.deleteMany({ user: customer._id })
    await User.findByIdAndDelete(customer._id)

    console.log(`\n=============================================`)
    console.log(`ALL UX FLOW TESTS PASSED: ${passed} PASSED, ${failed} FAILED`)
    console.log(`=============================================\n`)

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Test error:', err)
    process.exit(1)
  } finally {
    if (server) server.close()
    await mongoose.disconnect()
    process.exit(0)
  }
}

runTests()
