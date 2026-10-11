const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const app = require('../src/app')
const Product = require('../src/models/Product')
const Order = require('../src/models/Order')
const User = require('../src/models/User')
const {
  generateOpIds,
  allocateOrderInventory,
  compensateOrderInventory,
} = require('../src/services/inventoryAllocationService')

const REQUIRED_TEST_DB = 'trendvolt_test'

function parseAndValidateTestUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string' || rawUri.trim() === '') {
    return {
      valid: false,
      protocol: null,
      hasDbPath: false,
      dbName: null,
      error:
        'Missing MongoDB test connection URI. Set TEST_MONGODB_URI or MONGODB_URI targeting "trendvolt_test".',
    }
  }

  const trimmed = rawUri.trim().replace(/^["']|["']$/g, '')
  let protocol = ''
  let dbName = ''

  try {
    const parsed = new URL(trimmed)
    protocol = parsed.protocol.toLowerCase()
    const rawPath = (parsed.pathname || '').replace(/^\/+/, '')
    dbName = rawPath.split('/')[0].split('?')[0].trim()
  } catch (_urlErr) {
    // Fallback parser for valid MongoDB connection strings that WHATWG URL parser rejects (e.g. comma-separated hosts)
    const match = trimmed.match(/^(mongodb(?:\+srv)?):\/\/([^/?#]+)(?:\/([^?#]*))?(?:\?.*)?$/i)
    if (!match) {
      return {
        valid: false,
        protocol: null,
        hasDbPath: false,
        dbName: null,
        error: 'Malformed MongoDB connection URI. Failed to parse URI structure.',
      }
    }
    protocol = match[1].toLowerCase() + ':'
    const rawPath = (match[3] || '').replace(/^\/+/, '')
    dbName = rawPath.split('/')[0].split('?')[0].trim()
  }

  if (protocol !== 'mongodb:' && protocol !== 'mongodb+srv:') {
    return {
      valid: false,
      protocol,
      hasDbPath: !!dbName,
      dbName: dbName || null,
      error: `Invalid URI protocol "${protocol}". Expected "mongodb:" or "mongodb+srv:".`,
    }
  }

  if (!dbName) {
    return {
      valid: false,
      protocol,
      hasDbPath: false,
      dbName: null,
      error: `Missing database name in URI pathname. The URI must explicitly target database "${REQUIRED_TEST_DB}".`,
    }
  }

  if (dbName !== REQUIRED_TEST_DB) {
    return {
      valid: false,
      protocol,
      hasDbPath: true,
      dbName,
      error: `Target database is "${dbName}". Dedicated safety tests must target database "${REQUIRED_TEST_DB}". Aborting to protect data.`,
    }
  }

  return {
    valid: true,
    protocol,
    hasDbPath: true,
    dbName,
    uri: trimmed,
  }
}

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
  console.log('======================================================')
  console.log('TRENDVOLT — INVENTORY SAFETY & CONCURRENCY TEST SUITE')
  console.log('======================================================\n')

  // Prefer TEST_MONGODB_URI when it is a non-empty string; fall back to MONGODB_URI.
  const hasTestUri = typeof process.env.TEST_MONGODB_URI === 'string' && process.env.TEST_MONGODB_URI.trim().length > 0
  const selectedVar = hasTestUri ? 'TEST_MONGODB_URI' : 'MONGODB_URI'
  const candidateUri = hasTestUri ? process.env.TEST_MONGODB_URI : process.env.MONGODB_URI
  const guard = parseAndValidateTestUri(candidateUri)

  // Safe diagnostic: never prints the URI, hostname, credentials, or password.
  console.log('[DATABASE SAFETY GUARD] URI Diagnostics:')
  console.log(`  env variable selected : ${selectedVar}`)
  console.log(`  protocol              : ${guard.protocol !== null ? guard.protocol : '(unparseable)'}`)
  console.log(`  database path present : ${guard.hasDbPath}`)
  console.log(`  parsed database name  : ${guard.dbName !== null ? guard.dbName : '(none)'}`)

  if (!guard.valid) {
    console.error(`[DATABASE SAFETY GUARD ERROR] ${guard.error}`)
    console.error('')
    console.error('  FIX: Set TEST_MONGODB_URI to your Atlas connection string with database "trendvolt_test".')
    console.error('  Example (PowerShell):')
    console.error('    $env:TEST_MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>/trendvolt_test?retryWrites=true&w=majority"')
    console.error('    npm run test:inventory-safety')
    process.exit(1)
  }

  console.log(`[DATABASE SAFETY GUARD] Verified target database: "${guard.dbName}". Proceeding safely.\n`)

  await mongoose.connect(guard.uri)

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  const createdUserIds = []
  const createdProductIds = []
  const createdOrderIds = []

  try {
    const ts = Date.now()
    const testAdmin = await User.create({
      name: 'Inventory Safety Admin',
      email: `inv_safety_admin_${ts}@trendvolt.com`,
      password: 'Password123!',
      role: 'admin',
      isActive: true,
    })
    createdUserIds.push(testAdmin._id)
    const adminToken = jwt.sign({ id: testAdmin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' })

    const testCustomer = await User.create({
      name: 'Inventory Safety Customer',
      email: `inv_safety_cust_${ts}@example.com`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    })
    createdUserIds.push(testCustomer._id)

    // ----------------------------------------------------
    // TEST 1: Stock cannot become negative
    // ----------------------------------------------------
    console.log('--- TEST 1: Stock cannot become negative ---')
    const p1 = await Product.create({
      name: 'Neg Guard Jacket',
      description: 'Testing negative stock guard',
      price: 2999,
      category: 'fashion',
      department: 'men',
      brand: 'TrendVolt Lab',
      stock: 2,
    })
    createdProductIds.push(p1._id)

    // Attempt conditional decrement of 5 when stock is 2
    const decRes = await Product.findOneAndUpdate(
      { _id: p1._id, stock: { $gte: 5 } },
      { $inc: { stock: -5 } },
      { returnDocument: 'after' }
    )
    testAssert(decRes === null, 'Atomic conditional query fails when requested stock exceeds balance')

    const p1After = await Product.findById(p1._id)
    testAssert(p1After.stock === 2, 'Product stock remains 2 and never becomes negative')

    // ----------------------------------------------------
    // TEST 2: Two concurrent orders competing for the last unit: exactly one succeeds
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Concurrent orders competing for the last unit ---')
    const pLastUnit = await Product.create({
      name: 'Last Unit Shirt',
      description: 'Only 1 in stock',
      price: 1499,
      category: 'fashion',
      department: 'women',
      brand: 'TrendVolt Exclusive',
      stock: 1,
    })
    createdProductIds.push(pLastUnit._id)

    const order1 = await Order.create({
      user: testCustomer._id,
      orderNumber: `ORD-CONC-1-${ts}`,
      items: [
        {
          product: pLastUnit._id,
          name: pLastUnit.name,
          price: pLastUnit.price,
          quantity: 1,
          subtotal: 1499,
        },
      ],
      shippingAddress: {
        fullName: 'Test Recipient',
        phone: '9876543210',
        addressLine: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: 1499,
      totalAmount: 1499,
    })
    createdOrderIds.push(order1._id)

    const order2 = await Order.create({
      user: testCustomer._id,
      orderNumber: `ORD-CONC-2-${ts}`,
      items: [
        {
          product: pLastUnit._id,
          name: pLastUnit.name,
          price: pLastUnit.price,
          quantity: 1,
          subtotal: 1499,
        },
      ],
      shippingAddress: {
        fullName: 'Test Recipient',
        phone: '9876543210',
        addressLine: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: 1499,
      totalAmount: 1499,
    })
    createdOrderIds.push(order2._id)

    // Execute concurrent allocation
    const [allocResult1, allocResult2] = await Promise.all([
      allocateOrderInventory(order1),
      allocateOrderInventory(order2),
    ])

    const successCount = (allocResult1.success ? 1 : 0) + (allocResult2.success ? 1 : 0)
    const failureCount = (!allocResult1.success ? 1 : 0) + (!allocResult2.success ? 1 : 0)

    testAssert(successCount === 1, 'Exactly one concurrent allocation succeeded')
    testAssert(failureCount === 1, 'Exactly one concurrent allocation was rejected')

    const pLastUnitFresh = await Product.findById(pLastUnit._id)
    testAssert(pLastUnitFresh.stock === 0, 'Final stock is exactly 0 (no oversell)')
    testAssert(pLastUnitFresh.appliedOps.length === 1, 'AppliedOps records exactly 1 decrement operation')

    // ----------------------------------------------------
    // TEST 3: Retrying an already-applied decrement does not decrement again
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Retrying an already-applied decrement ---')
    const pRetry = await Product.create({
      name: 'Retry Denim',
      description: 'Testing retry safety',
      price: 2499,
      category: 'fashion',
      department: 'men',
      brand: 'TrendVolt Denim',
      stock: 5,
    })
    createdProductIds.push(pRetry._id)

    const orderRetry = await Order.create({
      user: testCustomer._id,
      orderNumber: `ORD-RETRY-${ts}`,
      items: [
        {
          product: pRetry._id,
          name: pRetry.name,
          price: pRetry.price,
          quantity: 2,
          subtotal: 4998,
        },
      ],
      shippingAddress: {
        fullName: 'Test Recipient',
        phone: '9876543210',
        addressLine: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: 4998,
      totalAmount: 4998,
    })
    createdOrderIds.push(orderRetry._id)

    const firstAlloc = await allocateOrderInventory(orderRetry)
    testAssert(firstAlloc.success === true, 'First allocation succeeds')
    const pAfterFirst = await Product.findById(pRetry._id)
    testAssert(pAfterFirst.stock === 3, 'Stock decremented to 3 after first allocation')

    // Retry the exact same order
    const secondAlloc = await allocateOrderInventory(orderRetry)
    testAssert(secondAlloc.success === true, 'Retry allocation returns success')
    const pAfterSecond = await Product.findById(pRetry._id)
    testAssert(pAfterSecond.stock === 3, 'Stock remains 3 (not decremented a second time)')
    testAssert(pAfterSecond.appliedOps.length === 1, 'AppliedOps does not contain duplicate decrement opId')

    // ----------------------------------------------------
    // TEST 4: Retrying compensation does not restore stock twice
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Retrying compensation does not restore stock twice ---')
    // Restore the items from orderRetry
    const firstComp = await compensateOrderInventory(orderRetry, orderRetry.items)
    testAssert(firstComp.success === true, 'First compensation call succeeds')
    const pAfterComp1 = await Product.findById(pRetry._id)
    testAssert(pAfterComp1.stock === 5, 'Stock restored back to 5')

    // Retry compensation
    const secondComp = await compensateOrderInventory(orderRetry, orderRetry.items)
    testAssert(secondComp.success === true, 'Second compensation call succeeds idempotently')
    const pAfterComp2 = await Product.findById(pRetry._id)
    testAssert(pAfterComp2.stock === 5, 'Stock remains 5 (not incremented twice to 7)')

    // ----------------------------------------------------
    // TEST 5: A later product failing in a multi-item order is handled safely
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Multi-item order partial failure and compensation ---')
    const pAvailable = await Product.create({
      name: 'Available Shoes',
      description: 'In stock item',
      price: 3999,
      category: 'fashion',
      department: 'men',
      brand: 'TrendVolt Footwear',
      stock: 10,
    })
    createdProductIds.push(pAvailable._id)

    const pOutOfStock = await Product.create({
      name: 'Sold Out Socks',
      description: 'Out of stock item',
      price: 499,
      category: 'fashion',
      department: 'men',
      brand: 'TrendVolt Footwear',
      stock: 0,
    })
    createdProductIds.push(pOutOfStock._id)

    const multiItemOrder = await Order.create({
      user: testCustomer._id,
      orderNumber: `ORD-MULTI-${ts}`,
      items: [
        {
          product: pAvailable._id,
          name: pAvailable.name,
          price: pAvailable.price,
          quantity: 2,
          subtotal: 7998,
        },
        {
          product: pOutOfStock._id,
          name: pOutOfStock.name,
          price: pOutOfStock.price,
          quantity: 1,
          subtotal: 499,
        },
      ],
      shippingAddress: {
        fullName: 'Test Recipient',
        phone: '9876543210',
        addressLine: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: 8497,
      totalAmount: 8497,
    })
    createdOrderIds.push(multiItemOrder._id)

    const multiAllocRes = await allocateOrderInventory(multiItemOrder)
    testAssert(multiAllocRes.success === false, 'Multi-item allocation failed gracefully')
    testAssert(multiAllocRes.failedItem === pOutOfStock.name, 'Failure identified the out-of-stock item')

    // Verify first item deduction was compensated back
    const pAvailableCheck = await Product.findById(pAvailable._id)
    testAssert(pAvailableCheck.stock === 10, 'First product stock was automatically restored back to 10')

    const orderCheck = await Order.findById(multiItemOrder._id)
    testAssert(orderCheck.inventoryStatus === 'failed_out_of_stock', 'Order marked failed_out_of_stock')
    testAssert(orderCheck.items[0].allocationStatus === 'restored', 'Item 1 marked restored')
    testAssert(orderCheck.items[1].allocationStatus === 'unallocated', 'Item 2 marked unallocated')

    // ----------------------------------------------------
    // TEST 6: Admin stock updates with stale expected values return 409
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Admin stock updates with stale expected values return 409 ---')
    const pOcc = await Product.create({
      name: 'OCC Test Scarf',
      description: 'Testing optimistic concurrency',
      price: 999,
      category: 'fashion',
      department: 'women',
      brand: 'TrendVolt Acc',
      stock: 10,
    })
    createdProductIds.push(pOcc._id)

    // Stale update: expectedStock is 8, but actual is 10
    const staleRes = await request(
      {
        path: `/api/admin/inventory/${pOcc._id}`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      { stock: 20, expectedStock: 8 }
    )
    testAssert(staleRes.status === 409, 'Stale stock adjustment rejected with HTTP 409 Conflict')
    testAssert(staleRes.data?.currentStock === 10, 'Response returns currentStock 10')

    // Fresh update: expectedStock is 10
    const freshRes = await request(
      {
        path: `/api/admin/inventory/${pOcc._id}`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      { stock: 20, expectedStock: 10 }
    )
    testAssert(freshRes.status === 200, 'Fresh stock adjustment succeeds with HTTP 200')
    const pOccAfter = await Product.findById(pOcc._id)
    testAssert(pOccAfter.stock === 20, 'Product stock updated to 20')

    // ----------------------------------------------------
    // TEST 7: Admin product edits preserve inventory-operation history
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Admin product edits preserve inventory-operation history ---')
    const pMeta = await Product.create({
      name: 'Original Hoodie',
      description: 'Testing metadata update preservation',
      price: 2999,
      category: 'fashion',
      department: 'men',
      brand: 'TrendVolt Lab',
      stock: 15,
      appliedOps: [
        {
          opId: 'dec_test_preserved_op',
          qty: 2,
          type: 'decrement',
          appliedAt: new Date(),
        },
      ],
    })
    createdProductIds.push(pMeta._id)

    const metaRes = await request(
      {
        path: `/api/products/${pMeta._id}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      {
        name: 'Updated Hoodie Title',
        description: 'Updated description that preserves ops',
      }
    )
    testAssert(metaRes.status === 200, 'Admin product update returns HTTP 200')

    const pMetaFresh = await Product.findById(pMeta._id)
    testAssert(pMetaFresh.name === 'Updated Hoodie Title', 'Product name was successfully updated')
    testAssert(pMetaFresh.appliedOps.length === 1, 'AppliedOps array preserved')
    testAssert(pMetaFresh.appliedOps[0].opId === 'dec_test_preserved_op', 'Preserved opId matches exactly')

    // Also test OCC on PUT /api/products/:id when stock is supplied
    const stalePutRes = await request(
      {
        path: `/api/products/${pMeta._id}`,
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      {
        name: 'Another Title',
        stock: 30,
        expectedStock: 99, // Stale expected stock
      }
    )
    testAssert(stalePutRes.status === 409, 'Product PUT with stale stock rejected with HTTP 409 Conflict')

    // ----------------------------------------------------
    // TEST 8: Recovery after simulated crash between stock mutation and order persistence
    // ----------------------------------------------------
    console.log('\n--- TEST 8: Recovery after simulated crash between stock mutation and order persistence ---')
    const pCrash = await Product.create({
      name: 'Crash Recovery Coat',
      description: 'Testing crash recovery boundary',
      price: 5999,
      category: 'fashion',
      department: 'women',
      brand: 'TrendVolt Outerwear',
      stock: 10,
    })
    createdProductIds.push(pCrash._id)

    const orderCrash = await Order.create({
      user: testCustomer._id,
      orderNumber: `ORD-CRASH-${ts}`,
      items: [
        {
          product: pCrash._id,
          name: pCrash.name,
          price: pCrash.price,
          quantity: 3,
          subtotal: 17997,
        },
      ],
      shippingAddress: {
        fullName: 'Test Recipient',
        phone: '9876543210',
        addressLine: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: 17997,
      totalAmount: 17997,
      inventoryStatus: 'unallocated',
    })
    createdOrderIds.push(orderCrash._id)

    // Simulate crash boundary: Product document was decremented and opId recorded,
    // but process died before order.save() updated the order document.
    const { decOpId } = generateOpIds(orderCrash._id, orderCrash.items[0]._id, pCrash._id)
    await Product.findOneAndUpdate(
      { _id: pCrash._id, stock: { $gte: 3 } },
      {
        $inc: { stock: -3 },
        $push: {
          appliedOps: {
            opId: decOpId,
            qty: 3,
            type: 'decrement',
            appliedAt: new Date(),
          },
        },
      }
    )

    const pAfterCrashSim = await Product.findById(pCrash._id)
    testAssert(pAfterCrashSim.stock === 7, 'Product stock is 7 at crash boundary')
    const orderBeforeRecovery = await Order.findById(orderCrash._id)
    testAssert(orderBeforeRecovery.items[0].allocationStatus === 'unallocated', 'Order is still unallocated at crash boundary')

    // Now run recovery: allocateOrderInventory is invoked on retry
    const recoveryRes = await allocateOrderInventory(orderCrash)
    testAssert(recoveryRes.success === true, 'Recovery allocation succeeds')

    const pAfterRecovery = await Product.findById(pCrash._id)
    testAssert(pAfterRecovery.stock === 7, 'Stock remained 7 during recovery (NOT decremented again to 4)')

    const orderAfterRecovery = await Order.findById(orderCrash._id)
    testAssert(orderAfterRecovery.inventoryStatus === 'allocated', 'Order marked allocated after recovery')
    testAssert(orderAfterRecovery.items[0].allocationStatus === 'allocated', 'Order item marked allocated after recovery')

  } catch (err) {
    console.error('Unexpected test error:', err)
    testAssert(false, `Unexpected exception: ${err.message}`)
  } finally {
    console.log('\n--- TEARDOWN: CLEANING UP TEST DATA ---')
    if (createdOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: createdOrderIds } })
    }
    if (createdProductIds.length > 0) {
      await Product.deleteMany({ _id: { $in: createdProductIds } })
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } })
    }

    if (server) {
      await new Promise((res) => server.close(res))
    }
    await mongoose.connection.close()

    console.log(`\nInventory Safety Test Suite: ${passed} passed, ${failed} failed\n`)
    process.exit(failed > 0 ? 1 : 0)
  }
}

if (require.main === module) {
  runTests()
}

module.exports = {
  REQUIRED_TEST_DB,
  parseAndValidateTestUri,
  runTests,
}
