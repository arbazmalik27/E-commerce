const http = require('http')
const assert = require('assert')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = require('../src/app')
const Product = require('../src/models/Product')
const User = require('../src/models/User')
const Order = require('../src/models/Order')
const Review = require('../src/models/Review')

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
  console.log('=== TEST SUITE: PRODUCT REVIEWS & RATINGS ===\n')

  await mongoose.connect(process.env.MONGODB_URI)

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://localhost:${port}/api`
      console.log(`Ephemeral test server running at ${baseUrl}\n`)
      resolve()
    })
  })

  let testCustomer1, testCustomer2, testAdmin, testProduct, testOrderPaid, testOrderUnpaid
  let createdReviewId = null

  try {
    // 1. SETUP TEST ENTITIES
    testProduct = await Product.findOne({ isActive: true })
    testAssert(Boolean(testProduct), 'Found active test product')

    // Find or create test users
    testCustomer1 = await User.findOne({ email: 'testcustomer1@trendvolt.test' })
    if (!testCustomer1) {
      testCustomer1 = await User.create({
        name: 'Test Customer 1',
        email: 'testcustomer1@trendvolt.test',
        password: 'Password123!',
        role: 'customer',
      })
    }

    testCustomer2 = await User.findOne({ email: 'testcustomer2@trendvolt.test' })
    if (!testCustomer2) {
      testCustomer2 = await User.create({
        name: 'Test Customer 2',
        email: 'testcustomer2@trendvolt.test',
        password: 'Password123!',
        role: 'customer',
      })
    }

    testAdmin = await User.findOne({ role: 'admin' })
    testAssert(Boolean(testAdmin), 'Found admin user for moderation tests')

    const tokenCustomer1 = jwt.sign({ id: testCustomer1._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
    const tokenCustomer2 = jwt.sign({ id: testCustomer2._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
    const tokenAdmin = jwt.sign({ id: testAdmin._id }, process.env.JWT_SECRET, { expiresIn: '1h' })

    // Clean up any prior test orders or reviews for test users
    await Review.deleteMany({ user: { $in: [testCustomer1._id, testCustomer2._id] } })
    await Order.deleteMany({ user: { $in: [testCustomer1._id, testCustomer2._id] } })

    // Create a verified paid order for Customer 1
    testOrderPaid = await Order.create({
      user: testCustomer1._id,
      orderNumber: `TEST-ORD-${Date.now()}-1`,
      items: [
        {
          product: testProduct._id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 1,
          subtotal: testProduct.price,
          images: testProduct.images || [],
        },
      ],
      shippingAddress: {
        fullName: 'Test Customer 1',
        phone: '9876543210',
        addressLine: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: testProduct.price,
      shippingCost: 0,
      totalAmount: testProduct.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'paid',
      orderStatus: 'delivered',
    })

    // Create an unpaid order for Customer 2
    testOrderUnpaid = await Order.create({
      user: testCustomer2._id,
      orderNumber: `TEST-ORD-${Date.now()}-2`,
      items: [
        {
          product: testProduct._id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 1,
          subtotal: testProduct.price,
          images: testProduct.images || [],
        },
      ],
      shippingAddress: {
        fullName: 'Test Customer 2',
        phone: '9876543211',
        addressLine: '456 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: testProduct.price,
      shippingCost: 0,
      totalAmount: testProduct.price,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending',
    })

    console.log('\n--- 2. AUTHENTICATION & ELIGIBILITY ENFORCEMENT ---')
    // 2.1 Unauthenticated submission rejected
    const unauthRes = await request(
      { path: '/reviews', method: 'POST' },
      { productId: testProduct._id.toString(), orderId: testOrderPaid._id.toString(), rating: 5, comment: 'Nice!' }
    )
    testAssert(unauthRes.status === 401, 'Unauthenticated user cannot create review (401)')

    // 2.2 Customer 2 (unpaid order) rejected
    const unpaidRes = await request(
      {
        path: '/reviews',
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenCustomer2}` },
      },
      { productId: testProduct._id.toString(), orderId: testOrderUnpaid._id.toString(), rating: 5, comment: 'Unpaid order' }
    )
    testAssert(unpaidRes.status === 403, 'User with unpaid order cannot create review (403)')

    // 2.3 Customer 2 using Customer 1's paid order (IDOR) rejected
    const idorRes = await request(
      {
        path: '/reviews',
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenCustomer2}` },
      },
      { productId: testProduct._id.toString(), orderId: testOrderPaid._id.toString(), rating: 5, comment: 'IDOR attempt' }
    )
    testAssert(idorRes.status === 403, 'User cannot use another user order to create review (403 IDOR rejection)')

    // 2.4 Eligibility check endpoint
    const eligRes1 = await request({
      path: `/reviews/eligibility/${testProduct._id.toString()}`,
      headers: { Authorization: `Bearer ${tokenCustomer1}` },
    })
    testAssert(eligRes1.status === 200 && eligRes1.data.eligible === true, 'Customer 1 is eligible for review')

    const eligRes2 = await request({
      path: `/reviews/eligibility/${testProduct._id.toString()}`,
      headers: { Authorization: `Bearer ${tokenCustomer2}` },
    })
    testAssert(eligRes2.status === 200 && eligRes2.data.eligible === false, 'Customer 2 is not eligible for review')

    console.log('\n--- 3. INPUT VALIDATION ---')
    // 3.1 Rating below 1
    const invalidRatingRes = await request(
      { path: '/reviews', method: 'POST', headers: { Authorization: `Bearer ${tokenCustomer1}` } },
      { productId: testProduct._id.toString(), orderId: testOrderPaid._id.toString(), rating: 0, comment: 'Too low' }
    )
    testAssert(invalidRatingRes.status === 400, 'Rating 0 rejected (400)')

    // 3.2 Rating above 5
    const highRatingRes = await request(
      { path: '/reviews', method: 'POST', headers: { Authorization: `Bearer ${tokenCustomer1}` } },
      { productId: testProduct._id.toString(), orderId: testOrderPaid._id.toString(), rating: 6, comment: 'Too high' }
    )
    testAssert(highRatingRes.status === 400, 'Rating 6 rejected (400)')

    // 3.3 Float rating rejected
    const floatRatingRes = await request(
      { path: '/reviews', method: 'POST', headers: { Authorization: `Bearer ${tokenCustomer1}` } },
      { productId: testProduct._id.toString(), orderId: testOrderPaid._id.toString(), rating: 4.5, comment: 'Float rating' }
    )
    testAssert(floatRatingRes.status === 400, 'Float rating 4.5 rejected (400)')

    // 3.4 Empty / whitespace comment rejected
    const emptyCommentRes = await request(
      { path: '/reviews', method: 'POST', headers: { Authorization: `Bearer ${tokenCustomer1}` } },
      { productId: testProduct._id.toString(), orderId: testOrderPaid._id.toString(), rating: 5, comment: '   ' }
    )
    testAssert(emptyCommentRes.status === 400, 'Whitespace-only comment rejected (400)')

    console.log('\n--- 4. REVIEW CREATION & MODERATION WORKFLOW ---')
    // 4.1 Valid submission by Customer 1
    const createRes = await request(
      { path: '/reviews', method: 'POST', headers: { Authorization: `Bearer ${tokenCustomer1}` } },
      {
        productId: testProduct._id.toString(),
        orderId: testOrderPaid._id.toString(),
        rating: 5,
        title: 'Outstanding quality and fit',
        comment: 'Fabric feels luxurious and fits perfectly according to size chart.',
      }
    )
    testAssert(createRes.status === 201, 'Valid review created with 201')
    testAssert(createRes.data.review.status === 'pending', 'New review defaults to status pending')
    testAssert(createRes.data.review.verifiedPurchase === true, 'Review marked as verifiedPurchase: true')
    createdReviewId = createRes.data.review._id

    // 4.2 Duplicate review submission rejected
    const dupRes = await request(
      { path: '/reviews', method: 'POST', headers: { Authorization: `Bearer ${tokenCustomer1}` } },
      {
        productId: testProduct._id.toString(),
        orderId: testOrderPaid._id.toString(),
        rating: 4,
        comment: 'Trying to review again',
      }
    )
    testAssert(dupRes.status === 400, 'Duplicate review from same user for same product rejected (400)')

    // 4.3 Public display check (Pending reviews must NOT be publicly visible)
    const publicPendingRes = await request({ path: `/reviews/product/${testProduct._id.toString()}` })
    testAssert(publicPendingRes.status === 200, 'Public product reviews endpoint returned 200')
    testAssert(publicPendingRes.data.reviews.length === 0, 'Pending review is NOT visible to public')
    testAssert(publicPendingRes.data.summary.totalReviews === 0, 'Pending review count not included in totalReviews')

    console.log('\n--- 5. ADMIN MODERATION & AGGREGATION ---')
    // 5.1 Non-admin cannot access admin endpoint
    const forbiddenAdminRes = await request({
      path: '/reviews/admin',
      headers: { Authorization: `Bearer ${tokenCustomer1}` },
    })
    testAssert(forbiddenAdminRes.status === 403, 'Customer cannot access admin reviews endpoint (403)')

    // 5.2 Admin can view pending reviews
    const adminReviewsRes = await request({
      path: '/reviews/admin?status=pending',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    })
    testAssert(adminReviewsRes.status === 200, 'Admin can view pending reviews')
    const foundPending = adminReviewsRes.data.reviews.some((r) => r._id === createdReviewId)
    testAssert(foundPending, 'Admin can see the created pending review')

    // 5.3 Admin approves review
    const approveRes = await request(
      {
        path: `/reviews/admin/${createdReviewId}/status`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      },
      { status: 'approved' }
    )
    testAssert(approveRes.status === 200, 'Admin successfully approved review')
    testAssert(approveRes.data.review.status === 'approved', 'Review status updated to approved')

    // 5.4 Public display check after approval
    const publicApprovedRes = await request({ path: `/reviews/product/${testProduct._id.toString()}` })
    testAssert(publicApprovedRes.data.reviews.length === 1, 'Approved review is now visible to public')
    testAssert(publicApprovedRes.data.summary.totalReviews === 1, 'Rating summary totalReviews is 1')
    testAssert(publicApprovedRes.data.summary.averageRating === 5, 'Rating summary averageRating is 5.0')
    testAssert(publicApprovedRes.data.summary.ratingDistribution['5'] === 1, 'Distribution for 5 stars is 1')

    // 5.5 Check Product document in DB has updated cache
    const updatedProd = await Product.findById(testProduct._id)
    testAssert(updatedProd.averageRating === 5, 'Product document averageRating cached as 5')
    testAssert(updatedProd.numReviews === 1, 'Product document numReviews cached as 1')

    console.log('\n--- 6. CUSTOMER EDIT & DELETE ---')
    // 6.1 Customer 2 cannot edit Customer 1's review
    const idorEditRes = await request(
      {
        path: `/reviews/${createdReviewId}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenCustomer2}` },
      },
      { rating: 2, comment: 'Hacked comment' }
    )
    testAssert(idorEditRes.status === 403, 'Customer 2 cannot edit Customer 1 review (403 IDOR rejection)')

    // 6.2 Customer 1 edits own review (must reset to pending for re-moderation)
    const editRes = await request(
      {
        path: `/reviews/${createdReviewId}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${tokenCustomer1}` },
      },
      { rating: 4, comment: 'Updated review text after wearing for two weeks.' }
    )
    testAssert(editRes.status === 200, 'Customer 1 updated own review')
    testAssert(editRes.data.review.status === 'pending', 'Edited review status reset to pending')

    // 6.3 Public view: review is pending again, so totalReviews drops to 0
    const publicAfterEditRes = await request({ path: `/reviews/product/${testProduct._id.toString()}` })
    testAssert(publicAfterEditRes.data.reviews.length === 0, 'Edited pending review is hidden again')

    // 6.4 Customer 1 deletes own review
    const deleteRes = await request({
      path: `/reviews/${createdReviewId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenCustomer1}` },
    })
    testAssert(deleteRes.status === 200, 'Customer 1 deleted own review')

    const verifyDeleted = await Review.findById(createdReviewId)
    testAssert(verifyDeleted === null, 'Review was removed from database')

    // Check Product document rating after deletion
    const productAfterDelete = await Product.findById(testProduct._id)
    testAssert(productAfterDelete.averageRating === 0, 'Product averageRating returned to 0')
    testAssert(productAfterDelete.numReviews === 0, 'Product numReviews returned to 0')
  } finally {
    // CLEANUP: Ensure zero test reviews/orders remain in DB
    if (testCustomer1) {
      await Review.deleteMany({ user: testCustomer1._id })
      await Order.deleteMany({ user: testCustomer1._id })
      await User.findByIdAndDelete(testCustomer1._id)
    }
    if (testCustomer2) {
      await Review.deleteMany({ user: testCustomer2._id })
      await Order.deleteMany({ user: testCustomer2._id })
      await User.findByIdAndDelete(testCustomer2._id)
    }

    if (testProduct) {
      // Re-run calculateProductRating on testProduct to ensure clean DB state
      const { calculateProductRating } = require('../src/controllers/reviewController')
      await calculateProductRating(testProduct._id)
    }

    if (server) {
      server.close()
    }
    await mongoose.disconnect()
  }

  console.log(`\n========================================`)
  console.log(`Total Passed: ${passed}`)
  console.log(`Total Failed: ${failed}`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
