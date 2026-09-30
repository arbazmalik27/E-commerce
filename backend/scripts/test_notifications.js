/**
 * Automated Verification Suite for TrendVolt Feature:
 * Notification System
 *
 * Covers:
 * - Model validation & indexes
 * - Security, authentication, and IDOR protection
 * - API endpoints (list, unread-count, mark one read, mark all read)
 * - Business event triggers (payment confirmation, order status updates, back-in-stock)
 * - Idempotency & duplicate prevention
 * - Failure isolation (side-effect safety)
 * - Complete test data cleanup
 */

const mongoose = require('mongoose')
require('dotenv').config()

const User = require('../src/models/User')
const Order = require('../src/models/Order')
const Product = require('../src/models/Product')
const BackInStockAlert = require('../src/models/BackInStockAlert')
const Notification = require('../src/models/Notification')
const {
  createNotification,
  createOrderConfirmedNotification,
  createOrderStatusNotification,
  createBackInStockNotification,
} = require('../src/services/notificationService')
const { processBackInStockAlerts } = require('../src/services/stockAlertService')
const { signToken } = require('../src/utils/jwt')
const app = require('../src/app')

// Simple in-process HTTP mock helper using Node's http/express handler or direct request
const http = require('http')

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    passedCount++
    console.log(`  ✓ PASS: ${message}`)
  } else {
    failedCount++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

// Track IDs created during testing for guaranteed cleanup
const createdUserIds = []
const createdOrderIds = []
const createdProductIds = []
const createdAlertIds = []
const createdNotificationIds = []

async function cleanup() {
  console.log('\n[Cleanup] Removing temporary test records...')
  if (createdNotificationIds.length > 0) {
    await Notification.deleteMany({ _id: { $in: createdNotificationIds } })
  }
  if (createdUserIds.length > 0) {
    await Notification.deleteMany({ user: { $in: createdUserIds } })
    await User.deleteMany({ _id: { $in: createdUserIds } })
  }
  if (createdOrderIds.length > 0) {
    await Order.deleteMany({ _id: { $in: createdOrderIds } })
  }
  if (createdProductIds.length > 0) {
    await Product.deleteMany({ _id: { $in: createdProductIds } })
  }
  if (createdAlertIds.length > 0) {
    await BackInStockAlert.deleteMany({ _id: { $in: createdAlertIds } })
  }
  console.log('  Cleaned up all temporary test records.')
}

// Lightweight HTTP request helper against the local express app
function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: options.path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let rawData = ''
        res.on('data', (chunk) => {
          rawData += chunk
        })
        res.on('end', () => {
          let parsed = null
          try {
            parsed = JSON.parse(rawData)
          } catch {
            parsed = rawData
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed })
        })
      }
    )

    req.on('error', reject)
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body))
    }
    req.end()
  })
}

async function runTests() {
  console.log('=== RUNNING TRENDVOLT NOTIFICATION SYSTEM VERIFICATION ===\n')

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trendvolt'
  await mongoose.connect(mongoUri)

  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))

  try {
    // -------------------------------------------------------------
    // Test 1: Model Schema Validation & Types
    // -------------------------------------------------------------
    console.log('[1] Model Schema Validation & Types:')
    const dummyUserId = new mongoose.Types.ObjectId()

    // Required fields check
    const emptyNotification = new Notification({})
    let validationErr = null
    try {
      await emptyNotification.validate()
    } catch (err) {
      validationErr = err
    }
    assert(validationErr !== null, 'Empty Notification model fails validation')
    assert(validationErr.errors.user, 'Requires "user" field')
    assert(validationErr.errors.type, 'Requires "type" field')
    assert(validationErr.errors.title, 'Requires "title" field')
    assert(validationErr.errors.message, 'Requires "message" field')

    // Invalid enum validation
    const invalidTypeNotification = new Notification({
      user: dummyUserId,
      type: 'invalid_notification_type',
      title: 'Test',
      message: 'Test message',
    })
    let enumErr = null
    try {
      await invalidTypeNotification.validate()
    } catch (err) {
      enumErr = err
    }
    assert(enumErr && enumErr.errors.type, 'Rejects invalid notification type enum')

    // Valid locked enum types
    for (const validCategory of ['order_confirmed', 'order_status_updated', 'back_in_stock']) {
      const validDoc = new Notification({
        user: dummyUserId,
        type: validCategory,
        title: 'Title',
        message: 'Message',
      })
      const err = validDoc.validateSync()
      assert(!err, `Accepts locked notification type: "${validCategory}"`)
    }

    // Max length validation
    const oversizedTitle = new Notification({
      user: dummyUserId,
      type: 'order_confirmed',
      title: 'A'.repeat(125),
      message: 'Message',
    })
    const oversizedTitleErr = oversizedTitle.validateSync()
    assert(oversizedTitleErr && oversizedTitleErr.errors.title, 'Rejects title exceeding 120 characters')

    const oversizedMsg = new Notification({
      user: dummyUserId,
      type: 'order_confirmed',
      title: 'Title',
      message: 'A'.repeat(505),
    })
    const oversizedMsgErr = oversizedMsg.validateSync()
    assert(oversizedMsgErr && oversizedMsgErr.errors.message, 'Rejects message exceeding 500 characters')

    // Verify Indexes
    const indexes = await Notification.collection.indexes()
    const indexKeys = indexes.map((idx) => JSON.stringify(idx.key))
    const hasUserCreatedAtIndex = indexKeys.some((k) => k.includes('"user":1') && k.includes('"createdAt":-1'))
    const hasUserIsReadIndex = indexKeys.some((k) => k.includes('"user":1') && k.includes('"isRead":1'))
    assert(hasUserCreatedAtIndex, 'Index { user: 1, createdAt: -1 } exists on collection')
    assert(hasUserIsReadIndex, 'Index { user: 1, isRead: 1 } exists on collection')

    // -------------------------------------------------------------
    // Test 2: Authentication & Security Controls
    // -------------------------------------------------------------
    console.log('\n[2] Authentication & Security Controls:')

    // Unauthenticated GET /api/notifications
    const unauthList = await makeRequest(server, { path: '/api/notifications' })
    assert(unauthList.status === 401, 'Unauthenticated GET /api/notifications rejected with 401')

    // Unauthenticated GET /api/notifications/unread-count
    const unauthCount = await makeRequest(server, { path: '/api/notifications/unread-count' })
    assert(unauthCount.status === 401, 'Unauthenticated GET /api/notifications/unread-count rejected with 401')

    // Unauthenticated PATCH /api/notifications/mark-all-read
    const unauthMarkAll = await makeRequest(server, {
      path: '/api/notifications/mark-all-read',
      method: 'PATCH',
    })
    assert(unauthMarkAll.status === 401, 'Unauthenticated PATCH /api/notifications/mark-all-read rejected with 401')

    // -------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------
    const userA = await User.create({
      name: 'User Alpha',
      email: `alpha_${Date.now()}@trendvolt-test.com`,
      password: 'password123',
    })
    createdUserIds.push(userA._id)
    const tokenA = signToken(userA._id)

    const userB = await User.create({
      name: 'User Beta',
      email: `beta_${Date.now()}@trendvolt-test.com`,
      password: 'password123',
    })
    createdUserIds.push(userB._id)
    const tokenB = signToken(userB._id)

    // -------------------------------------------------------------
    // Test 3: Ownership / IDOR Protection
    // -------------------------------------------------------------
    console.log('\n[3] Ownership & IDOR Protection:')

    // Create a notification for User B
    const notifB = await Notification.create({
      user: userB._id,
      type: 'order_confirmed',
      title: 'User B Order',
      message: 'Private order confirmation for User B',
    })
    createdNotificationIds.push(notifB._id)

    // User A attempts to mark User B's notification as read
    const idorPatch = await makeRequest(server, {
      path: `/api/notifications/${notifB._id}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(idorPatch.status === 404, 'User A cannot mark User B notification read (returns 404 Not Found)')

    // User A checks their notification list; User B's notification must not appear
    const listA = await makeRequest(server, {
      path: '/api/notifications',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(listA.status === 200, 'User A retrieves notification list successfully')
    assert(listA.data.count === 0, 'User A cannot view User B notifications')

    // Invalid ObjectId format
    const invalidIdRes = await makeRequest(server, {
      path: '/api/notifications/not-a-valid-id/read',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(invalidIdRes.status === 400, 'Invalid ObjectId returns 400 Bad Request')

    // -------------------------------------------------------------
    // Test 4: Notification API Endpoints
    // -------------------------------------------------------------
    console.log('\n[4] Notification API Endpoints:')

    // Create 3 notifications for User A (2 unread, 1 already read)
    const notifA1 = await Notification.create({
      user: userA._id,
      type: 'order_confirmed',
      title: 'Order ORD-1001 Confirmed',
      message: 'Your order ORD-1001 has been confirmed.',
      link: '/orders/1001',
      isRead: false,
    })
    const notifA2 = await Notification.create({
      user: userA._id,
      type: 'order_status_updated',
      title: 'Order Shipped',
      message: 'Your order ORD-1001 has been shipped.',
      link: '/orders/1001',
      isRead: false,
    })
    const notifA3 = await Notification.create({
      user: userA._id,
      type: 'back_in_stock',
      title: 'Item Restocked',
      message: 'Item is back in stock.',
      link: '/products/999',
      isRead: true,
      readAt: new Date(),
    })
    createdNotificationIds.push(notifA1._id, notifA2._id, notifA3._id)

    // Unread count
    const countRes = await makeRequest(server, {
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(countRes.status === 200, 'GET /api/notifications/unread-count returns 200')
    assert(countRes.data.unreadCount === 2, 'Accurately computes unreadCount (2 unread)')

    // List with default limit
    const listRes = await makeRequest(server, {
      path: '/api/notifications',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(listRes.status === 200, 'GET /api/notifications returns 200')
    assert(listRes.data.count === 3, 'Returns all 3 notifications for user')
    assert(listRes.data.unreadCount === 2, 'List payload includes unreadCount: 2')
    assert(
      new Date(listRes.data.notifications[0].createdAt) >= new Date(listRes.data.notifications[1].createdAt),
      'Notifications sorted newest-first'
    )

    // Limit parameter clamping
    const limitedRes = await makeRequest(server, {
      path: '/api/notifications?limit=1',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(limitedRes.data.count === 1, 'Respects query limit=1')

    // Mark single notification read
    const markOneRes = await makeRequest(server, {
      path: `/api/notifications/${notifA1._id}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(markOneRes.status === 200, 'PATCH /api/notifications/:id/read returns 200')
    assert(markOneRes.data.notification.isRead === true, 'Notification isRead transitioned to true')
    assert(markOneRes.data.notification.readAt !== null, 'readAt timestamp recorded')

    // Verify unread count decreased to 1
    const countAfterOne = await makeRequest(server, {
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(countAfterOne.data.unreadCount === 1, 'Unread count updated to 1 after marking single read')

    // Mark all read
    const markAllRes = await makeRequest(server, {
      path: '/api/notifications/mark-all-read',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(markAllRes.status === 200, 'PATCH /api/notifications/mark-all-read returns 200')
    assert(markAllRes.data.updatedCount === 1, 'Updated remaining 1 unread notification')

    // Verify unread count is now 0
    const countAfterAll = await makeRequest(server, {
      path: '/api/notifications/unread-count',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    assert(countAfterAll.data.unreadCount === 0, 'Unread count is 0 after mark-all-read')

    // -------------------------------------------------------------
    // Test 5: Business Event Triggers & Idempotency
    // -------------------------------------------------------------
    console.log('\n[5] Business Event Triggers & Idempotency:')

    // Create a mock order for User A
    const sampleOrder = await Order.create({
      user: userA._id,
      orderNumber: `ORD-TEST-${Date.now()}`,
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          name: 'Classic Linen Shirt',
          price: 2499,
          quantity: 1,
          subtotal: 2499,
        },
      ],
      shippingAddress: {
        fullName: 'User Alpha',
        phone: '9876543210',
        addressLine: '123 Atelier Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: 2499,
      totalAmount: 2499,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    })
    createdOrderIds.push(sampleOrder._id)

    // Trigger Order Confirmed notification
    const orderNotif1 = await createOrderConfirmedNotification({
      user: userA._id,
      order: sampleOrder,
    })
    createdNotificationIds.push(orderNotif1._id)
    assert(orderNotif1 !== null, 'createOrderConfirmedNotification creates notification')
    assert(orderNotif1.type === 'order_confirmed', 'Notification type is "order_confirmed"')
    assert(orderNotif1.title === 'Order confirmed', 'Title is "Order confirmed"')
    assert(orderNotif1.link === `/orders/${sampleOrder._id}`, 'Link points to /orders/:id')
    assert(orderNotif1.metadata.orderNumber === sampleOrder.orderNumber, 'Metadata stores orderNumber')

    // Idempotency: duplicate call with same order
    const orderNotifDuplicate = await createOrderConfirmedNotification({
      user: userA._id,
      order: sampleOrder,
    })
    assert(
      orderNotifDuplicate._id.toString() === orderNotif1._id.toString(),
      'Duplicate order confirmation returns existing notification (no duplicate created)'
    )
    const countConfirm = await Notification.countDocuments({
      user: userA._id,
      type: 'order_confirmed',
      'metadata.orderId': sampleOrder._id,
    })
    assert(countConfirm === 1, 'Exactly one order_confirmed notification exists in database')

    // Order Status Notifications for all 4 supported statuses
    const testStatuses = ['processing', 'shipped', 'delivered', 'cancelled']
    for (const status of testStatuses) {
      const statusNotif = await createOrderStatusNotification({
        user: userA._id,
        order: sampleOrder,
        previousStatus: 'pending',
        newStatus: status,
      })
      createdNotificationIds.push(statusNotif._id)
      assert(statusNotif !== null, `createOrderStatusNotification creates notification for "${status}"`)
      assert(statusNotif.type === 'order_status_updated', 'Type is "order_status_updated"')
      assert(statusNotif.metadata.status === status, `Metadata stores status "${status}"`)
    }

    // Ignored unchanged status (previousStatus === newStatus)
    const unchangedStatus = await createOrderStatusNotification({
      user: userA._id,
      order: sampleOrder,
      previousStatus: 'shipped',
      newStatus: 'shipped',
    })
    assert(unchangedStatus === null, 'Unchanged status does not create notification')

    // Ignored unsupported status transition (e.g. pending -> pending)
    const unsupportedStatus = await createOrderStatusNotification({
      user: userA._id,
      order: sampleOrder,
      previousStatus: 'none',
      newStatus: 'pending',
    })
    assert(unsupportedStatus === null, 'Unsupported status ("pending") does not create notification')

    // Idempotency: repeated status update
    const repeatedStatus = await createOrderStatusNotification({
      user: userA._id,
      order: sampleOrder,
      previousStatus: 'processing',
      newStatus: 'shipped',
    })
    assert(repeatedStatus !== null, 'Existing shipped notification returned idempotently')
    const countShipped = await Notification.countDocuments({
      user: userA._id,
      type: 'order_status_updated',
      'metadata.orderId': sampleOrder._id,
      'metadata.status': 'shipped',
    })
    assert(countShipped === 1, 'Only one notification exists for status "shipped"')

    // Back-in-stock notification
    const testProduct = await Product.create({
      name: 'Tailored Wool Coat',
      description: 'Handcrafted luxury overcoat.',
      price: 12999,
      category: 'fashion',
      department: 'outerwear',
      brand: 'TrendVolt Atelier',
      stock: 5,
      isActive: true,
      sizes: [{ label: 'L', available: true }],
    })
    createdProductIds.push(testProduct._id)

    const stockNotif = await createBackInStockNotification({
      user: userA._id,
      product: testProduct,
      size: 'L',
    })
    createdNotificationIds.push(stockNotif._id)
    assert(stockNotif !== null, 'createBackInStockNotification creates notification')
    assert(stockNotif.type === 'back_in_stock', 'Type is "back_in_stock"')
    assert(stockNotif.title === 'Back in stock', 'Title is "Back in stock"')
    assert(stockNotif.message.includes('Tailored Wool Coat in Size L'), 'Message includes product name and size')
    assert(stockNotif.link === `/products/${testProduct._id}`, 'Link points to product page')

    // -------------------------------------------------------------
    // Test 6: Failure Isolation (Side-Effect Safety)
    // -------------------------------------------------------------
    console.log('\n[6] Failure Isolation (Side-Effect Safety):')

    // Verify createNotification handles invalid types or missing parameters safely without throwing
    const safeFail1 = await createNotification({ user: null, type: null, title: null, message: null })
    assert(safeFail1 === null, 'createNotification safely returns null on invalid args without crashing')

    const safeFail2 = await createOrderConfirmedNotification({ user: null, order: null })
    assert(safeFail2 === null, 'createOrderConfirmedNotification safely returns null without throwing')

    const safeFail3 = await createOrderStatusNotification({ user: null, order: null, previousStatus: 'a', newStatus: 'b' })
    assert(safeFail3 === null, 'createOrderStatusNotification safely returns null without throwing')

    const safeFail4 = await createBackInStockNotification({ user: null, product: null })
    assert(safeFail4 === null, 'createBackInStockNotification safely returns null without throwing')

    // -------------------------------------------------------------
    // Test 7: End-to-End Stock Alert Service Integration
    // -------------------------------------------------------------
    console.log('\n[7] Stock Alert Service Integration:')

    const oosProduct = await Product.create({
      name: 'Merino Knit Sweater',
      description: 'Fine knitwear',
      price: 3499,
      category: 'fashion',
      department: 'knitwear',
      brand: 'TrendVolt',
      stock: 0,
      isActive: true,
      sizes: [{ label: 'M', available: false }],
    })
    createdProductIds.push(oosProduct._id)

    // Register active alert for User A
    const alertDoc = await BackInStockAlert.create({
      user: userA._id,
      product: oosProduct._id,
      size: 'M',
      status: 'active',
    })
    createdAlertIds.push(alertDoc._id)

    // Simulate inventory replenishment (M transitions available: true, stock > 0)
    const replenishedProduct = {
      _id: oosProduct._id,
      name: oosProduct.name,
      stock: 10,
      isActive: true,
      sizes: [{ label: 'M', available: true }],
    }
    const previousProduct = {
      _id: oosProduct._id,
      name: oosProduct.name,
      stock: 0,
      isActive: true,
      sizes: [{ label: 'M', available: false }],
    }

    const alertResult = await processBackInStockAlerts({
      product: replenishedProduct,
      previousProduct,
    })
    assert(alertResult.eligibleCount === 1, 'processBackInStockAlerts detected 1 eligible alert')

    // Check that in-app notification was created for User A
    const inAppStockNotif = await Notification.findOne({
      user: userA._id,
      type: 'back_in_stock',
      'metadata.productId': oosProduct._id,
    })
    assert(inAppStockNotif !== null, 'In-app notification created during processBackInStockAlerts')
    if (inAppStockNotif) {
      createdNotificationIds.push(inAppStockNotif._id)
      assert(inAppStockNotif.message.includes('Merino Knit Sweater in Size M'), 'Includes replenished size in notification')
    }

  } catch (err) {
    console.error('Unexpected test suite error:', err)
    failedCount++
  } finally {
    await cleanup()
    server.close()
    await mongoose.disconnect()

    console.log('\n============================================================')
    console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
    if (failedCount === 0) {
      console.log('ALL NOTIFICATION BACKEND TESTS PASSED ✓')
    } else {
      console.error('SOME NOTIFICATION BACKEND TESTS FAILED ✗')
      process.exit(1)
    }
    console.log('============================================================')
  }
}

runTests()
