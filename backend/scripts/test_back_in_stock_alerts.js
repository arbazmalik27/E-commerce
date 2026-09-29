/**
 * Automated Verification Suite for TrendVolt Feature #5:
 * Back-in-Stock Alerts
 */

const mongoose = require('mongoose')
require('dotenv').config()

const Product = require('../src/models/Product')
const User = require('../src/models/User')
const BackInStockAlert = require('../src/models/BackInStockAlert')
const { processBackInStockAlerts } = require('../src/services/stockAlertService')
const { setResendClient } = require('../src/services/emailService')
const {
  validateCreateStockAlertInput,
  validateAlertStatusQuery,
} = require('../src/validators/stockAlertValidator')

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    passedCount++
    console.log(`  PASS: ${message}`)
  } else {
    failedCount++
    console.error(`  FAIL: ${message}`)
  }
}

async function runTests() {
  console.log('=== RUNNING FEATURE #5 (BACK-IN-STOCK ALERTS) TESTS ===\n')

  // -------------------------------------------------------------
  // Test 1: Validator for Stock Alert
  // -------------------------------------------------------------
  console.log('[1] Input Validation')
  const validId = new mongoose.Types.ObjectId().toString()

  const validProductAlert = validateCreateStockAlertInput({
    productId: validId,
  })
  assert(validProductAlert.isValid, 'Product-level alert input is valid')
  assert(validProductAlert.sanitized.size === null, 'Size defaults to null')

  const validSizeAlert = validateCreateStockAlertInput({
    productId: validId,
    size: 'M',
  })
  assert(validSizeAlert.isValid, 'Size-level alert input is valid')
  assert(validSizeAlert.sanitized.size === 'M', 'Size sanitized to M')

  const invalidIdAlert = validateCreateStockAlertInput({
    productId: 'not-an-id',
    size: 'M',
  })
  assert(!invalidIdAlert.isValid, 'Invalid ObjectId rejected')

  const oversizedSize = validateCreateStockAlertInput({
    productId: validId,
    size: 'A'.repeat(50),
  })
  assert(!oversizedSize.isValid, 'Oversized size string rejected')

  const statusQueryValid = validateAlertStatusQuery({
    productId: validId,
    size: 'L',
  })
  assert(statusQueryValid.isValid, 'Status query with productId and size is valid')

  // -------------------------------------------------------------
  // Test 2: Database Integration & Duplicate Prevention
  // -------------------------------------------------------------
  console.log('\n[2] Database Model, Duplicate Prevention & Partial Unique Index')
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('MONGODB_URI missing from env')
    process.exit(1)
  }

  await mongoose.connect(mongoUri)

  try {
    // Setup test users
    let user1 = await User.findOne({ email: 'test_alert_user1@trendvolt.internal' })
    if (!user1) {
      user1 = await User.create({
        name: 'Alert User 1',
        email: 'test_alert_user1@trendvolt.internal',
        password: 'password123!',
        role: 'customer',
      })
    }

    let user2 = await User.findOne({ email: 'test_alert_user2@trendvolt.internal' })
    if (!user2) {
      user2 = await User.create({
        name: 'Alert User 2',
        email: 'test_alert_user2@trendvolt.internal',
        password: 'password123!',
        role: 'customer',
      })
    }

    // Setup test product with out-of-stock sizes and in-stock sizes
    const testProduct = await Product.create({
      name: 'Alert Test Oversized Sweatshirt',
      description: 'Test garment for back-in-stock alert verification.',
      price: 2499,
      category: 'fashion',
      department: 'men',
      subcategory: 'hoodies-sweatshirts',
      brand: 'TrendVolt Lab',
      stock: 5,
      sizes: [
        { label: 'S', available: true },
        { label: 'M', available: false }, // out of stock
        { label: 'L', available: false }, // out of stock
      ],
      isActive: true,
    })

    // Setup test product with zero stock and no sizes
    const zeroStockProduct = await Product.create({
      name: 'Alert Test Eau de Parfum',
      description: 'Luxury fragrance with zero stock for product-level alert test.',
      price: 4999,
      category: 'fashion',
      department: 'beauty-fragrance',
      subcategory: 'perfumes',
      brand: 'TrendVolt Parfums',
      stock: 0,
      sizes: [],
      isActive: true,
    })

    // Clean existing test alerts
    await BackInStockAlert.deleteMany({
      $or: [{ product: testProduct._id }, { product: zeroStockProduct._id }],
    })

    // Create active alert for User1 for Size M
    const alert1 = await BackInStockAlert.create({
      user: user1._id,
      product: testProduct._id,
      size: 'M',
      status: 'active',
    })
    assert(alert1._id && alert1.status === 'active', 'Created active alert for Size M')

    // Create active alert for User1 for Size L (distinct size)
    const alertL = await BackInStockAlert.create({
      user: user1._id,
      product: testProduct._id,
      size: 'L',
      status: 'active',
    })
    assert(alertL._id && alertL.size === 'L', 'User can subscribe to different size L independently')

    // Attempt duplicate active alert for same User1, same Product, same Size M
    let duplicateRejected = false
    try {
      await BackInStockAlert.create({
        user: user1._id,
        product: testProduct._id,
        size: 'M',
        status: 'active',
      })
    } catch {
      duplicateRejected = true
    }
    assert(duplicateRejected, 'Partial unique index rejects duplicate active alert for same user+product+size')

    // Different user subscribing to same product and size succeeds
    const user2Alert = await BackInStockAlert.create({
      user: user2._id,
      product: testProduct._id,
      size: 'M',
      status: 'active',
    })
    assert(user2Alert._id, 'Different user can subscribe to the same product and size')

    // Product-level alert subscription
    const productAlert = await BackInStockAlert.create({
      user: user1._id,
      product: zeroStockProduct._id,
      size: null,
      status: 'active',
    })
    assert(productAlert._id && productAlert.size === null, 'Product-level alert created with size: null')

    // -------------------------------------------------------------
    // Test 3: Lifecycle — Cancellation & Resubscription
    // -------------------------------------------------------------
    console.log('\n[3] Alert Cancellation & Resubscription Lifecycle')
    alert1.status = 'cancelled'
    await alert1.save()
    assert(alert1.status === 'cancelled', 'Alert status updated to cancelled')

    // Now user1 can subscribe again for Size M because previous alert is cancelled (not active)
    const resubscribedAlert = await BackInStockAlert.create({
      user: user1._id,
      product: testProduct._id,
      size: 'M',
      status: 'active',
    })
    assert(resubscribedAlert._id, 'Can re-subscribe after cancellation')

    // -------------------------------------------------------------
    // Test 4: Trigger Detection Engine
    // -------------------------------------------------------------
    console.log('\n[4] Trigger Detection Engine')

    // Mock Resend Client to verify email delivery without external network
    let sentEmails = []
    setResendClient({
      emails: {
        send: async (payload) => {
          sentEmails.push(payload)
          return { data: { id: `resend_mock_${Date.now()}` }, error: null }
        },
      },
    })

    // Enable EMAIL_SERVICE_ENABLED for this test phase
    const origEmailEnv = process.env.EMAIL_SERVICE_ENABLED
    process.env.EMAIL_SERVICE_ENABLED = 'true'

    // Scenario A: Transition Size M from available: false -> available: true
    const updatedTestProduct = {
      _id: testProduct._id,
      name: testProduct.name,
      stock: 5,
      isActive: true,
      sizes: [
        { label: 'S', available: true },
        { label: 'M', available: true }, // replenished!
        { label: 'L', available: false }, // still out of stock
      ],
    }

    const triggerResult = await processBackInStockAlerts({
      product: updatedTestProduct,
      previousProduct: testProduct,
    })

    assert(triggerResult.eligibleCount === 2, 'Found 2 eligible alerts for Size M (user1 and user2)')
    assert(triggerResult.notifiedCount === 2, 'Successfully notified 2 alerts')
    assert(sentEmails.length === 2, '2 emails sent via mocked Resend client')
    assert(sentEmails[0].subject.includes('Size M'), 'Email subject mentions Size M')

    // Verify alerts transitioned to 'notified' in DB
    const updatedUser1Alert = await BackInStockAlert.findById(resubscribedAlert._id)
    assert(updatedUser1Alert.status === 'notified', 'Alert status updated to notified')
    assert(updatedUser1Alert.notifiedAt !== null, 'notifiedAt timestamp is recorded')

    // Verify Size L alert remained untouched
    const untouchedLAlert = await BackInStockAlert.findById(alertL._id)
    assert(untouchedLAlert.status === 'active', 'Unrelated Size L alert remains active')

    // Scenario B: Product-level replenishment (0 -> 10)
    sentEmails = []
    const updatedZeroProduct = {
      _id: zeroStockProduct._id,
      name: zeroStockProduct.name,
      stock: 10, // replenished from 0!
      isActive: true,
      sizes: [],
    }

    const prodTriggerResult = await processBackInStockAlerts({
      product: updatedZeroProduct,
      previousProduct: zeroStockProduct,
    })

    assert(prodTriggerResult.eligibleCount === 1, 'Found 1 eligible product-level alert')
    assert(prodTriggerResult.notifiedCount === 1, 'Successfully notified product alert')
    assert(sentEmails.length === 1, '1 email sent for product replenishment')

    // Scenario C: Safe behavior when EMAIL_SERVICE_ENABLED is false
    process.env.EMAIL_SERVICE_ENABLED = 'false'
    sentEmails = []

    // Create a new active alert for Size L
    const newLAlert = await BackInStockAlert.create({
      user: user2._id,
      product: testProduct._id,
      size: 'L',
      status: 'active',
    })

    const replenishedLProduct = {
      _id: testProduct._id,
      name: testProduct.name,
      stock: 5,
      isActive: true,
      sizes: [
        { label: 'S', available: true },
        { label: 'M', available: true },
        { label: 'L', available: true }, // L replenished!
      ],
    }

    const disabledEmailTrigger = await processBackInStockAlerts({
      product: replenishedLProduct,
      previousProduct: updatedTestProduct,
    })

    assert(disabledEmailTrigger.eligibleCount > 0, 'Detects eligible alert even when email service is off')
    assert(disabledEmailTrigger.notifiedCount === 0, 'Does not falsely mark notified when email is disabled')
    assert(sentEmails.length === 0, 'Zero emails dispatched when email is disabled')

    const stillActiveAlert = await BackInStockAlert.findById(newLAlert._id)
    assert(stillActiveAlert.status === 'active', 'Alert remains active for future delivery')

    // Restore env
    process.env.EMAIL_SERVICE_ENABLED = origEmailEnv

    // -------------------------------------------------------------
    // Test 5: HTTP API Endpoints & Access Control
    // -------------------------------------------------------------
    console.log('\n[5] HTTP API Endpoints & Access Control')
    const jwt = require('jsonwebtoken')
    const token1 = jwt.sign({ id: user1._id }, process.env.JWT_SECRET)
    const token2 = jwt.sign({ id: user2._id }, process.env.JWT_SECRET)

    // A. Unauthenticated request rejected
    const unauthRes = await fetch('http://localhost:5000/api/stock-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: testProduct._id.toString(), size: 'M' }),
    })
    assert(unauthRes.status === 401, 'Unauthenticated alert request rejected with 401')

    // B. Subscribing to an in-stock size rejected
    const inStockRes = await fetch('http://localhost:5000/api/stock-alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ productId: testProduct._id.toString(), size: 'S' }),
    })
    assert(inStockRes.status === 400, 'Subscribing to an in-stock size S rejected with 400')

    // C. Subscribing to an out-of-stock size succeeds
    const subRes = await fetch('http://localhost:5000/api/stock-alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ productId: testProduct._id.toString(), size: 'M' }),
    })
    const subData = await subRes.json()
    assert(subRes.status === 201 && subData.success, 'Subscribing to out-of-stock size M succeeds with 201')
    const createdAlertId = subData.alert?._id

    // D. Duplicate subscription is idempotent (200)
    const dupRes = await fetch('http://localhost:5000/api/stock-alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
      },
      body: JSON.stringify({ productId: testProduct._id.toString(), size: 'M' }),
    })
    const dupData = await dupRes.json()
    assert(dupRes.status === 200 && dupData.success, 'Duplicate subscription handled idempotently with 200')

    // E. Query status returns isSubscribed: true
    const statusRes = await fetch(
      `http://localhost:5000/api/stock-alerts/status?productId=${testProduct._id.toString()}&size=M`,
      {
        headers: { Authorization: `Bearer ${token1}` },
      }
    )
    const statusData = await statusRes.json()
    assert(statusData.isSubscribed === true && statusData.alertId === createdAlertId, 'Status endpoint confirms user is subscribed')

    // F. User 2 checks status for same product & size (should be false for user 2)
    const user2StatusRes = await fetch(
      `http://localhost:5000/api/stock-alerts/status?productId=${testProduct._id.toString()}&size=M`,
      {
        headers: { Authorization: `Bearer ${token2}` },
      }
    )
    const user2StatusData = await user2StatusRes.json()
    assert(user2StatusData.isSubscribed === false, 'User 2 sees isSubscribed: false (no cross-user leakage)')

    // G. IDOR Protection: User 2 cannot cancel User 1's alert
    const idorRes = await fetch(`http://localhost:5000/api/stock-alerts/${createdAlertId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token2}` },
    })
    assert(idorRes.status === 403, 'IDOR prevented: User 2 cannot cancel User 1 alert (403)')

    // H. User 1 cancels own alert
    const cancelRes = await fetch(`http://localhost:5000/api/stock-alerts/${createdAlertId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(cancelRes.status === 200, 'User 1 cancels own alert with 200')

    // I. Status check after cancellation returns isSubscribed: false
    const postCancelStatus = await fetch(
      `http://localhost:5000/api/stock-alerts/status?productId=${testProduct._id.toString()}&size=M`,
      {
        headers: { Authorization: `Bearer ${token1}` },
      }
    )
    const postCancelData = await postCancelStatus.json()
    assert(postCancelData.isSubscribed === false, 'Post-cancellation status confirms isSubscribed: false')

    // Clean up test records
    await BackInStockAlert.deleteMany({
      $or: [{ product: testProduct._id }, { product: zeroStockProduct._id }],
    })
    await Product.deleteMany({
      _id: { $in: [testProduct._id, zeroStockProduct._id] },
    })
    await User.deleteMany({
      _id: { $in: [user1._id, user2._id] },
    })

    console.log('  Cleaned up all temporary test records.')
  } catch (err) {
    console.error('Database test error:', err)
    failedCount++
  } finally {
    await mongoose.disconnect()
    finish()
  }
}

function finish() {
  console.log('\n=== TEST RESULTS ===')
  console.log(`Passed: ${passedCount}`)
  console.log(`Failed: ${failedCount}`)
  if (failedCount > 0) {
    process.exit(1)
  } else {
    console.log('ALL BACK-IN-STOCK ALERT TESTS PASSED!')
    process.exit(0)
  }
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err)
  process.exit(1)
})
