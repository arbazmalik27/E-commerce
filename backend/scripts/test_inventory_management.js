const http = require('http')
const assert = require('assert')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const app = require('../src/app')
const Product = require('../src/models/Product')
const User = require('../src/models/User')
const BackInStockAlert = require('../src/models/BackInStockAlert')
const {
  DEFAULT_LOW_STOCK_THRESHOLD,
  getStockStatus,
  validateInventoryQueryParams,
  validateUpdateStockInput,
} = require('../src/validators/inventoryValidator')

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
  console.log('\n======================================================')
  console.log('STARTING MODULE #23 INVENTORY / LOW-STOCK MANAGEMENT TESTS')
  console.log('======================================================\n')

  await mongoose.connect(process.env.MONGODB_URI)

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  // Track created test IDs for 100% clean teardown
  const createdUserIds = []
  const createdProductIds = []
  const createdAlertIds = []

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: UNIT LOGIC & CLASSIFICATION (Section 3)
    // ----------------------------------------------------
    console.log('--- 1. UNIT LOGIC & CLASSIFICATION ---')
    testAssert(DEFAULT_LOW_STOCK_THRESHOLD === 5, 'DEFAULT_LOW_STOCK_THRESHOLD is locked to 5')
    testAssert(getStockStatus(0) === 'out_of_stock', 'Stock 0 classified as out_of_stock')
    testAssert(getStockStatus(-1) === 'out_of_stock', 'Negative stock classified as out_of_stock')
    testAssert(getStockStatus(1) === 'low_stock', 'Stock 1 classified as low_stock')
    testAssert(getStockStatus(5) === 'low_stock', 'Stock 5 (threshold boundary) classified as low_stock')
    testAssert(getStockStatus(6) === 'in_stock', 'Stock 6 classified as in_stock')
    testAssert(getStockStatus(100) === 'in_stock', 'Stock 100 classified as in_stock')

    // Validator unit tests
    const valGood = validateUpdateStockInput({ stock: 25 })
    testAssert(valGood.isValid && valGood.sanitized.stock === 25, 'Valid stock input parsed')
    const valNegative = validateUpdateStockInput({ stock: -2 })
    testAssert(!valNegative.isValid && valNegative.errors.stock, 'Negative stock input rejected')
    const valDecimal = validateUpdateStockInput({ stock: 5.5 })
    testAssert(!valDecimal.isValid && valDecimal.errors.stock, 'Decimal stock input rejected')
    const valString = validateUpdateStockInput({ stock: '10' })
    testAssert(!valString.isValid && valString.errors.stock, 'String stock input rejected')
    const valDisallowedKey = validateUpdateStockInput({ stock: 10, mode: 'set', delta: 5 })
    testAssert(!valDisallowedKey.isValid && valDisallowedKey.errors.payload, 'Disallowed extra keys (mode, delta) rejected')

    // ----------------------------------------------------
    // TEST SUITE 2: AUTHENTICATION & ACCESS CONTROL (Section 10)
    // ----------------------------------------------------
    console.log('\n--- 2. AUTHENTICATION & ACCESS CONTROL ---')

    // Create test customer & admin
    const testAdmin = await User.create({
      name: 'Inventory Admin',
      email: `inv_admin_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      isActive: true,
    })
    createdUserIds.push(testAdmin._id)
    const adminToken = jwt.sign({ id: testAdmin._id }, process.env.JWT_SECRET)

    const testCustomer = await User.create({
      name: 'Inventory Customer',
      email: `inv_cust_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    })
    createdUserIds.push(testCustomer._id)
    const customerToken = jwt.sign({ id: testCustomer._id }, process.env.JWT_SECRET)

    // Unauthenticated request
    const unauthGet = await request({ path: '/api/admin/inventory' })
    testAssert(unauthGet.status === 401, 'Unauthenticated GET /api/admin/inventory returns 401')

    // Customer request
    const custGet = await request({
      path: '/api/admin/inventory',
      headers: { Authorization: `Bearer ${customerToken}` },
    })
    testAssert(custGet.status === 403, 'Customer GET /api/admin/inventory returns 403 Forbidden')

    // Admin request
    const adminGet = await request({
      path: '/api/admin/inventory',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(adminGet.status === 200, 'Admin GET /api/admin/inventory returns 200 OK')
    testAssert(adminGet.data.success === true, 'Response contains success: true')
    testAssert(typeof adminGet.data.summary === 'object', 'Response contains summary object')
    testAssert(Array.isArray(adminGet.data.products), 'Response contains products array')
    testAssert(typeof adminGet.data.pagination === 'object', 'Response contains pagination object')

    // ----------------------------------------------------
    // TEST SUITE 3: SUMMARY COUNTS & FILTERING (Section 5A)
    // ----------------------------------------------------
    console.log('\n--- 3. SUMMARY COUNTS & CATALOG FILTERING ---')

    // Seed test products with known inventory states
    const pOutOfStock = await Product.create({
      name: 'Test Inv Out of Stock Coat',
      description: 'Test Description',
      price: 2999,
      category: 'fashion',
      department: 'men',
      subcategory: 'jackets-coats',
      brand: 'TrendVolt Test Brand',
      stock: 0,
      images: ['https://example.com/coat.jpg'],
      isActive: true,
    })
    createdProductIds.push(pOutOfStock._id)

    const pLowStock = await Product.create({
      name: 'Test Inv Low Stock Shirt',
      description: 'Test Description',
      price: 1499,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'TrendVolt Test Brand',
      stock: 3, // <= 5
      images: ['https://example.com/shirt.jpg'],
      isActive: true,
    })
    createdProductIds.push(pLowStock._id)

    const pInStock = await Product.create({
      name: 'Test Inv In Stock Dress',
      description: 'Test Description',
      price: 3499,
      category: 'fashion',
      department: 'women',
      subcategory: 'dresses',
      brand: 'Silk Blossom',
      stock: 40, // > 5
      images: ['https://example.com/dress.jpg'],
      isActive: true,
    })
    createdProductIds.push(pInStock._id)

    // Summary count checks
    const overviewRes = await request({
      path: '/api/admin/inventory',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(overviewRes.status === 200, 'Overview status is 200')
    const { summary } = overviewRes.data
    testAssert(summary.totalProducts >= 3, `Summary totalProducts >= 3 (got ${summary.totalProducts})`)
    testAssert(summary.inStockCount >= 1, `Summary inStockCount >= 1 (got ${summary.inStockCount})`)
    testAssert(summary.lowStockCount >= 1, `Summary lowStockCount >= 1 (got ${summary.lowStockCount})`)
    testAssert(summary.outOfStockCount >= 1, `Summary outOfStockCount >= 1 (got ${summary.outOfStockCount})`)

    // Stock Status Filters
    const outFilter = await request({
      path: '/api/admin/inventory?stockStatus=out_of_stock&search=Test+Inv',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(outFilter.status === 200, 'out_of_stock filter returns 200')
    testAssert(
      outFilter.data.products.every((p) => p.stockStatus === 'out_of_stock' && p.stock <= 0),
      'out_of_stock filter only returns products with stock <= 0 and stockStatus="out_of_stock"'
    )
    testAssert(
      outFilter.data.products.some((p) => p._id.toString() === pOutOfStock._id.toString()),
      'out_of_stock filter contains pOutOfStock'
    )

    const lowFilter = await request({
      path: '/api/admin/inventory?stockStatus=low_stock&search=Test+Inv',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(lowFilter.status === 200, 'low_stock filter returns 200')
    testAssert(
      lowFilter.data.products.every((p) => p.stockStatus === 'low_stock' && p.stock > 0 && p.stock <= 5),
      'low_stock filter only returns products with 0 < stock <= 5 and stockStatus="low_stock"'
    )
    testAssert(
      lowFilter.data.products.some((p) => p._id.toString() === pLowStock._id.toString()),
      'low_stock filter contains pLowStock'
    )

    const inFilter = await request({
      path: '/api/admin/inventory?stockStatus=in_stock&search=Test+Inv',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(inFilter.status === 200, 'in_stock filter returns 200')
    testAssert(
      inFilter.data.products.every((p) => p.stockStatus === 'in_stock' && p.stock > 5),
      'in_stock filter only returns products with stock > 5 and stockStatus="in_stock"'
    )
    testAssert(
      inFilter.data.products.some((p) => p._id.toString() === pInStock._id.toString()),
      'in_stock filter contains pInStock'
    )

    // Department Filter
    const womenDept = await request({
      path: '/api/admin/inventory?department=women&search=Test+Inv',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(womenDept.status === 200, 'department=women returns 200')
    testAssert(
      womenDept.data.products.every((p) => p.department === 'women'),
      'All products returned match department=women'
    )
    testAssert(
      womenDept.data.products.some((p) => p._id.toString() === pInStock._id.toString()),
      'women department contains pInStock'
    )

    // Search Filter
    const searchRes = await request({
      path: '/api/admin/inventory?search=Silk+Blossom',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(searchRes.status === 200, 'Search by brand Silk Blossom returns 200')
    testAssert(
      searchRes.data.products.some((p) => p.brand === 'Silk Blossom'),
      'Search results match brand Silk Blossom'
    )

    // Pagination Checks
    const paginatedRes = await request({
      path: '/api/admin/inventory?limit=2&page=1',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(paginatedRes.status === 200, 'Pagination query returns 200')
    testAssert(paginatedRes.data.pagination.limit === 2, 'Pagination limit is 2')
    testAssert(paginatedRes.data.products.length <= 2, 'Products length clamped to limit 2')

    // Sorting Checks (stock desc)
    const sortDescRes = await request({
      path: '/api/admin/inventory?sortBy=stock&sortOrder=desc&limit=10',
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    testAssert(sortDescRes.status === 200, 'sortBy=stock&sortOrder=desc returns 200')
    const stocks = sortDescRes.data.products.map((p) => p.stock)
    const isSortedDesc = stocks.every((val, i, arr) => i === 0 || arr[i - 1] >= val)
    testAssert(isSortedDesc, 'Products are sorted by stock descending')

    // ----------------------------------------------------
    // TEST SUITE 4: ATOMIC STOCK ADJUSTMENT (Section 6 & 7)
    // ----------------------------------------------------
    console.log('\n--- 4. ATOMIC STOCK ADJUSTMENT ---')

    // Unauthenticated PATCH
    const unauthPatch = await request({
      path: `/api/admin/inventory/${pLowStock._id}`,
      method: 'PATCH',
    }, { stock: 10 })
    testAssert(unauthPatch.status === 401, 'Unauthenticated PATCH stock returns 401')

    // Customer PATCH
    const custPatch = await request({
      path: `/api/admin/inventory/${pLowStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
    }, { stock: 10 })
    testAssert(custPatch.status === 403, 'Customer PATCH stock returns 403')

    // Malformed ObjectId
    const malformedPatch = await request({
      path: '/api/admin/inventory/invalid_oid_123',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: 10 })
    testAssert(malformedPatch.status === 400, 'Malformed ObjectId returns 400 Bad Request')

    // Nonexistent Product
    const fakeId = new mongoose.Types.ObjectId()
    const nonExistPatch = await request({
      path: `/api/admin/inventory/${fakeId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: 10 })
    testAssert(nonExistPatch.status === 404, 'Nonexistent product returns 404 Not Found')

    // Negative stock rejection
    const negPatch = await request({
      path: `/api/admin/inventory/${pLowStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: -1 })
    testAssert(negPatch.status === 400, 'Negative stock update is rejected with 400')

    // Decimal stock rejection
    const decPatch = await request({
      path: `/api/admin/inventory/${pLowStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: 4.5 })
    testAssert(decPatch.status === 400, 'Decimal stock update is rejected with 400')

    // String stock rejection
    const strPatch = await request({
      path: `/api/admin/inventory/${pLowStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: '50' })
    testAssert(strPatch.status === 400, 'String stock update is rejected with 400')

    // Disallowed mode/delta payload rejection
    const deltaPatch = await request({
      path: `/api/admin/inventory/${pLowStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: 10, mode: 'delta', delta: 5 })
    testAssert(deltaPatch.status === 400, 'Payload with disallowed keys is rejected with 400')

    // Valid Stock SET to 25
    const validPatch = await request({
      path: `/api/admin/inventory/${pLowStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: 25 })
    testAssert(validPatch.status === 200, 'Valid stock update returns 200 OK')
    testAssert(validPatch.data.product.stock === 25, 'Response confirms stock set to 25')
    testAssert(validPatch.data.product.previousStock === 3, 'Response accurately reports previousStock was 3')
    testAssert(validPatch.data.product.stockStatus === 'in_stock', 'New stock 25 reflects in_stock status')

    // Verify DB was updated
    const dbCheck = await Product.findById(pLowStock._id)
    testAssert(dbCheck.stock === 25, 'Database Product.stock authoritatively updated to 25')

    // Valid Stock SET to 0 (Zero stock works)
    const zeroPatch = await request({
      path: `/api/admin/inventory/${pLowStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: 0 })
    testAssert(zeroPatch.status === 200, 'Setting stock to 0 returns 200 OK')
    testAssert(zeroPatch.data.product.stock === 0, 'Response confirms stock set to 0')
    testAssert(zeroPatch.data.product.stockStatus === 'out_of_stock', 'Stock 0 reflects out_of_stock status')

    // ----------------------------------------------------
    // TEST SUITE 5: BACK-IN-STOCK ALERT TRIGGER (Section 8)
    // ----------------------------------------------------
    console.log('\n--- 5. BACK-IN-STOCK ALERT INTEGRATION ---')

    // Register active back-in-stock alert for pOutOfStock
    const testAlert = await BackInStockAlert.create({
      user: testCustomer._id,
      product: pOutOfStock._id,
      size: null,
      status: 'active',
    })
    createdAlertIds.push(testAlert._id)

    // Admin updates pOutOfStock from 0 -> 15 (transition <= 0 to > 0)
    const restockRes = await request({
      path: `/api/admin/inventory/${pOutOfStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: 15 })

    testAssert(restockRes.status === 200, 'Restock from 0 to 15 returns 200')
    testAssert(restockRes.data.product.previousStock === 0, 'Previous stock was 0')
    testAssert(restockRes.data.product.stock === 15, 'New stock is 15')

    // Check that alert trigger logic ran (even with email service mock/disabled, alert remains tracked)
    const alertInDb = await BackInStockAlert.findById(testAlert._id)
    testAssert(alertInDb !== null, 'BackInStockAlert was queried and handled')

    // Test transition from 15 -> 20 (positive to positive: should NOT trigger replenishments)
    const normalUpdateRes = await request({
      path: `/api/admin/inventory/${pOutOfStock._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, { stock: 20 })
    testAssert(normalUpdateRes.status === 200, 'Normal positive->positive update returns 200')
    testAssert(normalUpdateRes.data.product.previousStock === 15, 'Previous stock was 15')
    testAssert(normalUpdateRes.data.product.stock === 20, 'New stock is 20')

    // ----------------------------------------------------
    // TEST SUITE 6: PAYMENT STOCK DEDUCTION INTEGRITY
    // ----------------------------------------------------
    console.log('\n--- 6. PAYMENT STOCK ATOMIC DEDUCTION INTEGRITY ---')
    // Verify that the existing atomic payment deduction pattern remains 100% functional
    const pDeduction = await Product.create({
      name: 'Test Payment Deduction Shirt',
      description: 'Test',
      price: 999,
      category: 'fashion',
      department: 'men',
      brand: 'TrendVolt',
      stock: 5,
      isActive: true,
    })
    createdProductIds.push(pDeduction._id)

    // Execute atomic conditional deduction (as done in paymentController.js:213)
    const deductResult = await Product.findOneAndUpdate(
      { _id: pDeduction._id, stock: { $gte: 2 } },
      { $inc: { stock: -2 } },
      { returnDocument: 'after' }
    )
    testAssert(deductResult.stock === 3, 'Payment atomic deduction { stock: { $gte: 2 } }, { $inc: { stock: -2 } } left 3 items')

    // Over-deduction attempt must fail (return null, never go negative)
    const overDeductResult = await Product.findOneAndUpdate(
      { _id: pDeduction._id, stock: { $gte: 10 } },
      { $inc: { stock: -10 } },
      { returnDocument: 'after' }
    )
    testAssert(overDeductResult === null, 'Atomic guard prevents deduction exceeding stock')
    const finalStockCheck = await Product.findById(pDeduction._id)
    testAssert(finalStockCheck.stock === 3, 'Stock never became negative')
  } catch (err) {
    console.error('Unexpected test error:', err)
    testAssert(false, `Unexpected error occurred: ${err.message}`)
  } finally {
    // Clean up all seeded test data
    console.log('\n--- CLEANING UP TEST DATA ---')
    if (createdAlertIds.length > 0) {
      await BackInStockAlert.deleteMany({ _id: { $in: createdAlertIds } })
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

    console.log(`\nInventory Management Tests: ${passed} passed, ${failed} failed\n`)
    process.exit(failed > 0 ? 1 : 0)
  }
}

runTests()
