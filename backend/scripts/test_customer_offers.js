const http = require('http')
const assert = require('assert')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = require('../src/app')
const Coupon = require('../src/models/Coupon')
const User = require('../src/models/User')
const Order = require('../src/models/Order')

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

function request(options) {
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
    req.end()
  })
}

async function runTests() {
  console.log('\n=============================================')
  console.log('STARTING CUSTOMER OFFERS ENDPOINT TESTS')
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
    // Setup test user
    const testCustomer = await User.findOneAndUpdate(
      { email: 'offerstest@example.com' },
      { name: 'Offers Tester', email: 'offerstest@example.com', passwordHash: 'hash', role: 'customer', isActive: true },
      { upsert: true, new: true }
    )
    const customerToken = jwt.sign({ id: testCustomer._id }, process.env.JWT_SECRET)

    // Clean prior test coupons
    const testCodes = ['OFFER_ACT', 'OFFER_INACT', 'OFFER_EXP', 'OFFER_FUTR', 'OFFER_MAXED', 'OFFER_PERUSER']
    await Coupon.deleteMany({ code: { $in: testCodes } })

    // 1. Active coupon
    await Coupon.create({
      code: 'OFFER_ACT',
      type: 'percentage',
      value: 15,
      isActive: true,
    })

    // 2. Inactive coupon
    await Coupon.create({
      code: 'OFFER_INACT',
      type: 'fixed',
      value: 100,
      isActive: false,
    })

    // 3. Expired coupon
    await Coupon.create({
      code: 'OFFER_EXP',
      type: 'percentage',
      value: 20,
      isActive: true,
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    })

    // 4. Future coupon
    await Coupon.create({
      code: 'OFFER_FUTR',
      type: 'percentage',
      value: 25,
      isActive: true,
      startsAt: new Date(Date.now() + 3600000), // 1 hour in future
    })

    // 5. Global limit exhausted
    await Coupon.create({
      code: 'OFFER_MAXED',
      type: 'fixed',
      value: 50,
      isActive: true,
      usageLimit: 10,
      usedCount: 10,
    })

    // 6. Per-user limit coupon
    await Coupon.create({
      code: 'OFFER_PERUSER',
      type: 'fixed',
      value: 50,
      isActive: true,
      perUserLimit: 1,
    })

    // First check: customer has not used OFFER_PERUSER yet
    const res1 = await request({
      path: '/api/coupons/offers',
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` },
    })

    testAssert(res1.status === 200, 'GET /api/coupons/offers returned 200')
    testAssert(res1.data.success === true, 'Response success is true')
    const codes1 = res1.data.offers.map((o) => o.code)

    testAssert(codes1.includes('OFFER_ACT'), 'Active coupon appears in customer offers')
    testAssert(!codes1.includes('OFFER_INACT'), 'Inactive coupon does NOT appear')
    testAssert(!codes1.includes('OFFER_EXP'), 'Expired coupon does NOT appear')
    testAssert(!codes1.includes('OFFER_FUTR'), 'Future coupon does NOT appear')
    testAssert(!codes1.includes('OFFER_MAXED'), 'Global usage limit exhausted coupon does NOT appear')
    testAssert(codes1.includes('OFFER_PERUSER'), 'Per-user limit coupon appears before user uses it')

    // Verify safe fields only
    const sampleOffer = res1.data.offers.find((o) => o.code === 'OFFER_ACT')
    testAssert(sampleOffer.usedCount === undefined, 'usedCount is NOT exposed')
    testAssert(sampleOffer.usageLimit === undefined, 'usageLimit is NOT exposed')
    testAssert(sampleOffer.perUserLimit === undefined, 'perUserLimit is NOT exposed')
    testAssert(sampleOffer.code !== undefined && sampleOffer.type !== undefined, 'Safe fields (code, type, value) are present')

    // Now record a paid order for OFFER_PERUSER for this customer
    await Order.create({
      user: testCustomer._id,
      orderNumber: 'ORD-OFFER-' + Date.now(),
      items: [{ product: new mongoose.Types.ObjectId(), name: 'Test', price: 1000, quantity: 1, subtotal: 1000 }],
      shippingAddress: { fullName: 'A', phone: '123', addressLine: 'B', city: 'C', state: 'D', postalCode: '123', country: 'E' },
      subtotal: 1000,
      discount: 50,
      coupon: { code: 'OFFER_PERUSER', type: 'fixed', value: 50, discountAmount: 50 },
      shippingFee: 0,
      totalAmount: 950,
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
    })

    // Call /api/coupons/offers again
    const res2 = await request({
      path: '/api/coupons/offers',
      method: 'GET',
      headers: { Authorization: `Bearer ${customerToken}` },
    })

    const codes2 = res2.data.offers.map((o) => o.code)
    testAssert(!codes2.includes('OFFER_PERUSER'), 'Coupon with per-user limit reached by user does NOT appear')

    // Cleanup
    await Coupon.deleteMany({ code: { $in: testCodes } })
    await Order.deleteMany({ user: testCustomer._id })
    await User.findByIdAndDelete(testCustomer._id)

    console.log(`\n=============================================`)
    console.log(`OFFERS TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`)
    console.log(`=============================================\n`)

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
