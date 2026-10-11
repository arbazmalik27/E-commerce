const assert = require('assert')
const mongoose = require('mongoose')
const Product = require('../src/models/Product')
const Order = require('../src/models/Order')
const { generateOpIds } = require('../src/services/inventoryAllocationService')
const { validateUpdateStockInput } = require('../src/validators/inventoryValidator')
const { validateUpdateProductInput } = require('../src/validators/productValidator')

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

async function runUnitTests() {
  console.log('======================================================')
  console.log('TRENDVOLT — INVENTORY SAFETY UNIT & LOGIC VERIFICATION')
  console.log('======================================================\n')

  try {
    // ----------------------------------------------------
    // SUITE 1: Deterministic Operation Key Generation
    // ----------------------------------------------------
    console.log('--- 1. DETERMINISTIC OP-ID GENERATION ---')
    const orderId = new mongoose.Types.ObjectId()
    const itemId = new mongoose.Types.ObjectId()
    const productId = new mongoose.Types.ObjectId()

    const { decOpId, resOpId } = generateOpIds(orderId, itemId, productId)
    testAssert(decOpId === `dec_${orderId}_${itemId}_${productId}`, 'decOpId format matches deterministic pattern')
    testAssert(resOpId === `res_${orderId}_${itemId}_${productId}`, 'resOpId format matches deterministic pattern')

    // Deterministic guarantee across multiple calls
    const secondGen = generateOpIds(orderId, itemId, productId)
    testAssert(secondGen.decOpId === decOpId, 'decOpId is 100% deterministic across multiple invocations')
    testAssert(secondGen.resOpId === resOpId, 'resOpId is 100% deterministic across multiple invocations')

    // Distinct per item / product
    const otherItemId = new mongoose.Types.ObjectId()
    const otherGen = generateOpIds(orderId, otherItemId, productId)
    testAssert(otherGen.decOpId !== decOpId, 'Distinct item yields distinct decOpId')

    // ----------------------------------------------------
    // SUITE 2: Stock Adjustment Validator OCC Support
    // ----------------------------------------------------
    console.log('\n--- 2. INVENTORY ADJUSTMENT VALIDATOR OCC CHECKS ---')
    // Standard adjustment without expectedStock (backward compatibility)
    const valStd = validateUpdateStockInput({ stock: 25 })
    testAssert(valStd.isValid && valStd.sanitized.stock === 25 && valStd.sanitized.expectedStock === undefined, 'Stock without expectedStock passes')

    // Adjustment with expectedStock
    const valOcc = validateUpdateStockInput({ stock: 30, expectedStock: 25 })
    testAssert(valOcc.isValid && valOcc.sanitized.stock === 30 && valOcc.sanitized.expectedStock === 25, 'Stock with valid expectedStock passes')

    // Invalid expectedStock (negative)
    const valNegOcc = validateUpdateStockInput({ stock: 30, expectedStock: -1 })
    testAssert(!valNegOcc.isValid && valNegOcc.errors.expectedStock, 'Negative expectedStock rejected')

    // Invalid expectedStock (non-integer)
    const valFloatOcc = validateUpdateStockInput({ stock: 30, expectedStock: 5.5 })
    testAssert(!valFloatOcc.isValid && valFloatOcc.errors.expectedStock, 'Decimal expectedStock rejected')

    // Disallowed extra fields
    const valBadField = validateUpdateStockInput({ stock: 10, expectedStock: 5, hackerField: true })
    testAssert(!valBadField.isValid && valBadField.errors.payload, 'Unapproved payload fields rejected')

    // ----------------------------------------------------
    // SUITE 3: Product Update Validator Concurrency & Protection
    // ----------------------------------------------------
    console.log('\n--- 3. PRODUCT UPDATE VALIDATOR CONCURRENCY & FIELD PROTECTION ---')
    // expectedStock allowed in updateProduct
    const valProdOcc = validateUpdateProductInput({ stock: 50, expectedStock: 40 })
    testAssert(valProdOcc.isValid && valProdOcc.sanitized.stock === 50 && valProdOcc.sanitized.expectedStock === 40, 'expectedStock accepted in validateUpdateProductInput')

    // Disallowed operational fields (appliedOps) cannot be injected
    const valInjectedOp = validateUpdateProductInput({
      name: 'Sneakers',
      appliedOps: [{ opId: 'fake_op', qty: 10, type: 'decrement' }],
    })
    testAssert(!valInjectedOp.isValid && valInjectedOp.errors.fields, 'Unapproved appliedOps injection rejected by validator')

    // Standard metadata update without stock
    const valMeta = validateUpdateProductInput({ name: 'Valid Shirt Name' })
    testAssert(valMeta.isValid && valMeta.sanitized.name === 'Valid Shirt Name' && valMeta.sanitized.stock === undefined, 'Metadata update without stock sanitized properly')

    // ----------------------------------------------------
    // SUITE 4: Mongoose Model Schema Validations
    // ----------------------------------------------------
    console.log('\n--- 4. MONGOOSE SCHEMA DEFINITION VERIFICATION ---')
    // Product model schema check
    const sampleProduct = new Product({
      name: 'Schema Product',
      description: 'Testing schema definitions',
      price: 1999,
      category: 'fashion',
      department: 'men',
      brand: 'TrendVolt',
      stock: 10,
      appliedOps: [
        {
          opId: 'dec_test_1_2_3',
          qty: 2,
          type: 'decrement',
          appliedAt: new Date(),
        },
      ],
    })
    const prodValError = sampleProduct.validateSync()
    testAssert(prodValError === undefined, 'Product document with appliedOps satisfies schema validation')

    // Reject invalid appliedOps type
    sampleProduct.appliedOps[0].type = 'invalid_type'
    const invalidOpError = sampleProduct.validateSync()
    testAssert(invalidOpError !== undefined && invalidOpError.errors['appliedOps.0.type'], 'Invalid appliedOps.type rejected by enum')

    // Order model schema check
    const sampleOrder = new Order({
      user: new mongoose.Types.ObjectId(),
      orderNumber: 'ORD-UNIT-TEST-1',
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          name: 'Order Item 1',
          price: 999,
          quantity: 1,
          subtotal: 999,
          allocationStatus: 'allocated',
        },
      ],
      shippingAddress: {
        fullName: 'Jane Doe',
        phone: '9876543210',
        addressLine: '123 Street',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India',
      },
      subtotal: 999,
      totalAmount: 999,
      inventoryStatus: 'allocated',
    })
    const orderValError = sampleOrder.validateSync()
    testAssert(orderValError === undefined, 'Order document with allocationStatus and inventoryStatus satisfies schema validation')

    // Reject invalid inventoryStatus
    sampleOrder.inventoryStatus = 'invalid_status'
    const invalidInvStatus = sampleOrder.validateSync()
    testAssert(invalidInvStatus !== undefined && invalidInvStatus.errors.inventoryStatus, 'Invalid inventoryStatus rejected by enum')

    // Reject invalid item allocationStatus
    sampleOrder.inventoryStatus = 'allocated'
    sampleOrder.items[0].allocationStatus = 'invalid_item_status'
    const invalidItemStatus = sampleOrder.validateSync()
    testAssert(invalidItemStatus !== undefined && invalidItemStatus.errors['items.0.allocationStatus'], 'Invalid items[0].allocationStatus rejected by enum')

    // ----------------------------------------------------
    // SUITE 5: Compensation Detection & Crash Recovery Regressions
    // ----------------------------------------------------
    console.log('\n--- 5. COMPENSATION DETECTION & CRASH RECOVERY REGRESSIONS ---')
    const { allocateOrderInventory, compensateOrderInventory } = require('../src/services/inventoryAllocationService')

    const store = new Map()
    const origFindById = Product.findById
    const origFindOneAndUpdate = Product.findOneAndUpdate

    try {
      Product.findById = async function (id) {
        const key = id?.toString()
        const doc = store.get(key)
        return doc ? JSON.parse(JSON.stringify(doc)) : null
      }

      Product.findOneAndUpdate = async function (query, update) {
        const id = query._id?.toString()
        const doc = store.get(id)
        if (!doc) return null

        if (query.stock && query.stock.$gte !== undefined) {
          if (doc.stock < query.stock.$gte) return null
        }

        if (query['appliedOps.opId']) {
          if (query['appliedOps.opId'].$ne) {
            const neId = query['appliedOps.opId'].$ne
            if (doc.appliedOps.some((o) => o.opId === neId)) return null
          }
          if (query['appliedOps.opId'].$nin) {
            const ninIds = query['appliedOps.opId'].$nin
            if (doc.appliedOps.some((o) => ninIds.includes(o.opId))) return null
          }
        }

        if (update.$inc && update.$inc.stock !== undefined) {
          doc.stock += update.$inc.stock
        }
        if (update.$push && update.$push.appliedOps) {
          doc.appliedOps.push(update.$push.appliedOps)
        }

        return JSON.parse(JSON.stringify(doc))
      }

      // REGRESSION 1: Decrement applied, then compensation applied, then allocation retried
      console.log('-> Subtest 1: Allocation retry after prior compensation')
      const p1Id = new mongoose.Types.ObjectId()
      store.set(p1Id.toString(), {
        _id: p1Id,
        name: 'Regress Shoe',
        stock: 10,
        appliedOps: [],
      })

      const ord1Id = new mongoose.Types.ObjectId()
      const item1Id = new mongoose.Types.ObjectId()
      const mockOrder1 = {
        _id: ord1Id,
        items: [{ _id: item1Id, product: p1Id, name: 'Regress Shoe', quantity: 2, allocationStatus: 'unallocated' }],
        inventoryStatus: 'unallocated',
        save: async function () {},
      }

      // Initial allocation succeeds
      const alloc1 = await allocateOrderInventory(mockOrder1)
      testAssert(alloc1.success === true, 'Initial allocation succeeds')
      testAssert(store.get(p1Id.toString()).stock === 8, 'Product stock is 8 after initial decrement')

      // Compensation applied
      const comp1 = await compensateOrderInventory(mockOrder1, mockOrder1.items)
      testAssert(comp1.success === true, 'Compensation succeeds')
      testAssert(store.get(p1Id.toString()).stock === 10, 'Product stock restored back to 10')

      // Allocation RETRIED after compensation
      const allocRetry = await allocateOrderInventory(mockOrder1)
      testAssert(allocRetry.success === false, 'Allocation retry correctly rejected because matching compensation exists')
      testAssert(store.get(p1Id.toString()).stock === 10, 'Stock remains 10 (not decremented again)')
      testAssert(mockOrder1.inventoryStatus === 'failed_out_of_stock', 'Order status marked failed_out_of_stock')
      testAssert(mockOrder1.items[0].allocationStatus === 'restored', 'Item status marked restored, not allocated')

      // REGRESSION 2: Crash after compensating one item in a multi-item order, followed by retry
      console.log('-> Subtest 2: Crash recovery during partial multi-item compensation')
      const pAId = new mongoose.Types.ObjectId()
      const pBId = new mongoose.Types.ObjectId()
      const ord2Id = new mongoose.Types.ObjectId()
      const itAId = new mongoose.Types.ObjectId()
      const itBId = new mongoose.Types.ObjectId()

      // Seed state where both items were decremented, but only Item A was compensated before a crash
      const decA = `dec_${ord2Id}_${itAId}_${pAId}`
      const resA = `res_${ord2Id}_${itAId}_${pAId}`
      const decB = `dec_${ord2Id}_${itBId}_${pBId}`

      store.set(pAId.toString(), {
        _id: pAId,
        name: 'Item A',
        stock: 10, // already restored (+2)
        appliedOps: [
          { opId: decA, qty: 2, type: 'decrement', appliedAt: new Date() },
          { opId: resA, qty: 2, type: 'restore', appliedAt: new Date() },
        ],
      })

      store.set(pBId.toString(), {
        _id: pBId,
        name: 'Item B',
        stock: 7, // was decremented (-3), crash happened before restoring!
        appliedOps: [
          { opId: decB, qty: 3, type: 'decrement', appliedAt: new Date() },
        ],
      })

      const mockOrder2 = {
        _id: ord2Id,
        items: [
          { _id: itAId, product: pAId, name: 'Item A', quantity: 2, allocationStatus: 'unallocated' },
          { _id: itBId, product: pBId, name: 'Item B', quantity: 3, allocationStatus: 'unallocated' },
        ],
        inventoryStatus: 'unallocated',
        save: async function () {},
      }

      // Retry is executed
      const crashRetry = await allocateOrderInventory(mockOrder2)
      testAssert(crashRetry.success === false, 'Crash retry recognizes partial compensation and fails cleanly')
      testAssert(store.get(pAId.toString()).stock === 10, 'Item A stock remains 10 (not double-compensated)')
      testAssert(store.get(pBId.toString()).stock === 10, 'Item B stock recovered and restored to 10')
      testAssert(
        store.get(pBId.toString()).appliedOps.some((o) => o.opId === `res_${ord2Id}_${itBId}_${pBId}`),
        'Item B resOpId successfully recorded'
      )
      testAssert(mockOrder2.inventoryStatus === 'failed_out_of_stock', 'Order 2 marked failed_out_of_stock')
      testAssert(mockOrder2.items[0].allocationStatus === 'restored', 'Item A marked restored')
      testAssert(mockOrder2.items[1].allocationStatus === 'restored', 'Item B marked restored')

      // REGRESSION 3: Repeated compensation and allocation retries remaining idempotent
      console.log('-> Subtest 3: Repeated retry idempotency')
      const repeatComp = await compensateOrderInventory(mockOrder2, mockOrder2.items)
      testAssert(repeatComp.success === true, 'Repeated compensation call succeeds idempotently')
      testAssert(store.get(pAId.toString()).stock === 10, 'Item A stock remains 10 on duplicate compensation')
      testAssert(store.get(pBId.toString()).stock === 10, 'Item B stock remains 10 on duplicate compensation')

      const repeatAlloc = await allocateOrderInventory(mockOrder2)
      testAssert(repeatAlloc.success === false, 'Repeated allocation call remains rejected')
      testAssert(store.get(pAId.toString()).stock === 10, 'Item A stock remains 10 on duplicate allocation retry')
      testAssert(store.get(pBId.toString()).stock === 10, 'Item B stock remains 10 on duplicate allocation retry')

    } finally {
      Product.findById = origFindById
      Product.findOneAndUpdate = origFindOneAndUpdate
    }

    // ----------------------------------------------------
    // SUITE 6: MongoDB URI Parser & Atlas Test Guard Verifications
    // ----------------------------------------------------
    console.log('\n--- 6. MONGODB URI PARSER & ATLAS TEST GUARD VERIFICATIONS ---')
    const { parseAndValidateTestUri } = require('./test_inventory_safety')

    // Valid Atlas mongodb+srv:// URI with query parameters
    const validAtlasWithQuery = parseAndValidateTestUri(
      'mongodb+srv://sample_user:sample_pass@cluster0.abcde.mongodb.net/trendvolt_test?retryWrites=true&w=majority'
    )
    testAssert(validAtlasWithQuery.valid === true, 'Valid Atlas mongodb+srv:// URI with query params accepted')
    testAssert(validAtlasWithQuery.dbName === 'trendvolt_test', 'Atlas URI resolves dbName to "trendvolt_test"')
    testAssert(validAtlasWithQuery.protocol === 'mongodb+srv:', 'Atlas URI diagnostic: protocol is mongodb+srv:')
    testAssert(validAtlasWithQuery.hasDbPath === true, 'Atlas URI diagnostic: hasDbPath is true')

    // Valid Atlas URI without query parameters
    const validAtlasNoQuery = parseAndValidateTestUri(
      'mongodb+srv://sample_user:sample_pass@cluster0.abcde.mongodb.net/trendvolt_test'
    )
    testAssert(validAtlasNoQuery.valid === true, 'Valid Atlas URI without query params accepted')
    testAssert(validAtlasNoQuery.protocol === 'mongodb+srv:', 'Atlas URI (no query) diagnostic: protocol is mongodb+srv:')
    testAssert(validAtlasNoQuery.hasDbPath === true, 'Atlas URI (no query) diagnostic: hasDbPath is true')

    // Valid local URI with port
    const validLocal = parseAndValidateTestUri('mongodb://127.0.0.1:27017/trendvolt_test')
    testAssert(validLocal.valid === true, 'Valid local mongodb:// URI accepted')
    testAssert(validLocal.protocol === 'mongodb:', 'Local URI diagnostic: protocol is mongodb:')
    testAssert(validLocal.hasDbPath === true, 'Local URI diagnostic: hasDbPath is true')
    testAssert(validLocal.dbName === 'trendvolt_test', 'Local URI diagnostic: dbName is trendvolt_test')

    // Valid multi-host replica set URI with options
    const validReplicaSet = parseAndValidateTestUri(
      'mongodb://host1:27017,host2:27017/trendvolt_test?replicaSet=rs0'
    )
    testAssert(validReplicaSet.valid === true, 'Valid comma-separated multi-host URI accepted')
    testAssert(validReplicaSet.protocol === 'mongodb:', 'Replica set URI diagnostic: protocol is mongodb:')
    testAssert(validReplicaSet.hasDbPath === true, 'Replica set URI diagnostic: hasDbPath is true')

    // Rejection: Missing database name in Atlas URI (e.g. trailing slash or empty pathname before query)
    const emptyDbAtlas = parseAndValidateTestUri(
      'mongodb+srv://sample_user:sample_pass@cluster0.abcde.mongodb.net/?retryWrites=true'
    )
    testAssert(emptyDbAtlas.valid === false && emptyDbAtlas.error.includes('Missing database name'), 'Atlas URI with missing database name rejected')
    testAssert(emptyDbAtlas.protocol === 'mongodb+srv:', 'Missing-db Atlas URI diagnostic: protocol still parsed')
    testAssert(emptyDbAtlas.hasDbPath === false, 'Missing-db Atlas URI diagnostic: hasDbPath is false')
    testAssert(emptyDbAtlas.dbName === null, 'Missing-db Atlas URI diagnostic: dbName is null')

    // Rejection: Non-test database name (e.g. production/trendvolt)
    const nonTestDb = parseAndValidateTestUri(
      'mongodb+srv://sample_user:sample_pass@cluster0.abcde.mongodb.net/trendvolt?retryWrites=true'
    )
    testAssert(nonTestDb.valid === false && nonTestDb.error.includes('Target database is "trendvolt"'), 'Atlas URI targeting non-test database "trendvolt" rejected')
    testAssert(nonTestDb.protocol === 'mongodb+srv:', 'Non-test Atlas URI diagnostic: protocol parsed')
    testAssert(nonTestDb.hasDbPath === true, 'Non-test Atlas URI diagnostic: hasDbPath is true')
    testAssert(nonTestDb.dbName === 'trendvolt', 'Non-test Atlas URI diagnostic: dbName reveals wrong db without leaking connection details')

    const nonTestProdDb = parseAndValidateTestUri(
      'mongodb://localhost:27017/production_db'
    )
    testAssert(nonTestProdDb.valid === false && nonTestProdDb.error.includes('Target database is "production_db"'), 'URI targeting "production_db" rejected')
    testAssert(nonTestProdDb.dbName === 'production_db', 'Non-test local URI diagnostic: dbName is production_db')

    // Rejection: Invalid protocol
    const invalidProto = parseAndValidateTestUri('http://localhost:27017/trendvolt_test')
    testAssert(invalidProto.valid === false && invalidProto.error.includes('Invalid URI protocol'), 'HTTP protocol rejected')
    testAssert(invalidProto.protocol === 'http:', 'Invalid protocol diagnostic: protocol field carries bad value for log visibility')

    // Rejection: Malformed URI string
    const malformed = parseAndValidateTestUri('this is not a mongodb uri')
    testAssert(malformed.valid === false && malformed.error.includes('Malformed MongoDB connection URI'), 'Malformed URI rejected')
    testAssert(malformed.protocol === null, 'Malformed URI diagnostic: protocol is null')
    testAssert(malformed.hasDbPath === false, 'Malformed URI diagnostic: hasDbPath is false')
    testAssert(malformed.dbName === null, 'Malformed URI diagnostic: dbName is null')

    // Rejection: Empty string or null
    const emptyUri = parseAndValidateTestUri('')
    testAssert(emptyUri.valid === false && emptyUri.error.includes('Missing MongoDB test connection URI'), 'Empty string URI rejected')
    testAssert(emptyUri.protocol === null, 'Empty URI diagnostic: protocol is null')
    testAssert(emptyUri.hasDbPath === false, 'Empty URI diagnostic: hasDbPath is false')
    testAssert(emptyUri.dbName === null, 'Empty URI diagnostic: dbName is null')

  } catch (err) {
    console.error('Unexpected error during unit testing:', err)
    testAssert(false, `Unexpected exception: ${err.message}`)
  }

  console.log(`\nInventory Unit Safety Tests: ${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

runUnitTests()
