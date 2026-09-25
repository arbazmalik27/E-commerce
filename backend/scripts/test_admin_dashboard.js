/**
 * test_admin_dashboard.js
 * Comprehensive backend QA for the Admin Dashboard Live KPIs & Recent Orders module.
 */

const http = require('http')

const BASE_URL = 'http://localhost:5000'

let passed = 0
let failed = 0
const failures = []

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
    failures.push(message)
  }
}

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (cookie) options.headers['Cookie'] = cookie

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(data) } catch { json = data }
        resolve({ status: res.statusCode, headers: res.headers, data: json })
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function getCookie(res) {
  const setCookie = res.headers['set-cookie']
  if (!setCookie || setCookie.length === 0) return ''
  return setCookie[0].split(';')[0]
}

async function run() {
  console.log('=== TEST SUITE: ADMIN DASHBOARD LIVE KPIS & RECENT ORDERS ===\n')

  const ts = Date.now()
  const customerEmail = `cust_dash_${ts}@example.com`
  const password = 'Password123!'

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Unauthenticated request to /api/orders/admin/dashboard
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Test 1: Unauthenticated dashboard request blocked...')
  const unauthRes = await request('GET', '/api/orders/admin/dashboard')
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/orders/admin/dashboard returns 401')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Customer (non-admin) request to /api/orders/admin/dashboard
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 2: Customer dashboard request blocked with 403...')
  const regCust = await request('POST', '/api/auth/register', {
    name: 'Customer Bob',
    email: customerEmail,
    password,
  })
  assert(regCust.status === 201, 'Customer registered with 201')
  const custCookie = getCookie(regCust)
  assert(custCookie.length > 0, 'Customer received auth cookie')

  const custDash = await request('GET', '/api/orders/admin/dashboard', null, custCookie)
  assert(custDash.status === 403, 'Customer GET /api/orders/admin/dashboard returns 403 Forbidden')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Admin login and dashboard request
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 3: Admin dashboard request returns 200...')
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@trendvolt.com',
    password: 'AdminPass123!',
  })
  assert(adminLogin.status === 200, 'Admin login returns 200')
  const adminCookie = getCookie(adminLogin)
  assert(adminCookie.length > 0, 'Admin received auth cookie')

  const adminDash = await request('GET', '/api/orders/admin/dashboard', null, adminCookie)
  assert(adminDash.status === 200, 'Admin GET /api/orders/admin/dashboard returns 200')
  assert(adminDash.data.success === true, 'Response has success: true')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Stats object schema and KPI types
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 4: Stats schema validation...')
  const stats = adminDash.data.stats
  assert(stats !== undefined && stats !== null, 'Response has stats object')
  assert(typeof stats.totalUsers === 'number', 'totalUsers is a number')
  assert(typeof stats.totalProducts === 'number', 'totalProducts is a number')
  assert(typeof stats.totalOrders === 'number', 'totalOrders is a number')
  assert(typeof stats.totalRevenue === 'number', 'totalRevenue is a number')
  assert(typeof stats.pendingOrders === 'number', 'pendingOrders is a number')
  assert(typeof stats.processingOrders === 'number', 'processingOrders is a number')
  assert(typeof stats.shippedOrders === 'number', 'shippedOrders is a number')
  assert(typeof stats.deliveredOrders === 'number', 'deliveredOrders is a number')
  assert(stats.totalUsers >= 2, `totalUsers count is accurate (at least 2, found ${stats.totalUsers})`)
  assert(stats.totalProducts >= 5, `totalProducts count is accurate (at least 5, found ${stats.totalProducts})`)
  assert(stats.totalOrders >= 0, `totalOrders is non-negative (${stats.totalOrders})`)
  assert(stats.totalRevenue >= 0, `totalRevenue is non-negative (${stats.totalRevenue})`)

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Recent orders array validation
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 5: Recent orders validation...')
  const recentOrders = adminDash.data.recentOrders
  assert(Array.isArray(recentOrders), 'recentOrders is an array')
  assert(recentOrders.length <= 5, `recentOrders capped at 5 (found ${recentOrders.length})`)

  if (recentOrders.length > 0) {
    const firstOrder = recentOrders[0]
    assert(typeof firstOrder.orderNumber === 'string', 'Order has orderNumber string')
    assert(typeof firstOrder.totalAmount === 'number', 'Order has totalAmount number')
    assert(typeof firstOrder.orderStatus === 'string', 'Order has orderStatus string')
    assert(typeof firstOrder.paymentStatus === 'string', 'Order has paymentStatus string')
    assert(typeof firstOrder.createdAt === 'string', 'Order has createdAt timestamp')
    assert(firstOrder.password === undefined, 'No sensitive password field exposed')

    // Verify ordering is newest-first
    if (recentOrders.length > 1) {
      let isOrdered = true
      for (let i = 0; i < recentOrders.length - 1; i++) {
        if (new Date(recentOrders[i].createdAt) < new Date(recentOrders[i + 1].createdAt)) {
          isOrdered = false
          break
        }
      }
      assert(isOrdered, 'Recent orders sorted newest-first by createdAt descending')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: Compare dashboard order counts with full orders list
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 6: Cross-check stats against /api/orders/admin full list...')
  const fullOrdersRes = await request('GET', '/api/orders/admin', null, adminCookie)
  assert(fullOrdersRes.status === 200, 'GET /api/orders/admin returns 200')
  const allOrders = fullOrdersRes.data.orders || []
  assert(stats.totalOrders === allOrders.length, `totalOrders (${stats.totalOrders}) matches allOrders count (${allOrders.length})`)

  const expectedPending = allOrders.filter(o => o.orderStatus === 'pending').length
  const expectedProcessing = allOrders.filter(o => o.orderStatus === 'processing').length
  const expectedShipped = allOrders.filter(o => o.orderStatus === 'shipped').length
  const expectedDelivered = allOrders.filter(o => o.orderStatus === 'delivered').length

  assert(stats.pendingOrders === expectedPending, `pendingOrders (${stats.pendingOrders}) matches actual pending (${expectedPending})`)
  assert(stats.processingOrders === expectedProcessing, `processingOrders (${stats.processingOrders}) matches actual processing (${expectedProcessing})`)
  assert(stats.shippedOrders === expectedShipped, `shippedOrders (${stats.shippedOrders}) matches actual shipped (${expectedShipped})`)
  assert(stats.deliveredOrders === expectedDelivered, `deliveredOrders (${stats.deliveredOrders}) matches actual delivered (${expectedDelivered})`)

  // Expected revenue: only orders with paymentStatus === 'paid' AND orderStatus !== 'cancelled'
  const expectedRevenue = allOrders
    .filter(o => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  assert(
    Math.abs(stats.totalRevenue - expectedRevenue) < 0.01,
    `totalRevenue (₹${stats.totalRevenue}) matches qualifying paid non-cancelled orders (₹${expectedRevenue})`
  )

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: Verify uncollected/cancelled orders do not inflate revenue
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 7: Unpaid/cancelled orders do NOT inflate revenue...')
  const unpaidOrders = allOrders.filter(o => o.paymentStatus !== 'paid' || o.orderStatus === 'cancelled')
  const unpaidSum = unpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const totalAllOrdersSum = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

  if (unpaidOrders.length > 0) {
    assert(
      stats.totalRevenue < totalAllOrdersSum,
      `totalRevenue (₹${stats.totalRevenue}) excludes unpaid/cancelled orders sum (₹${unpaidSum})`
    )
  } else {
    console.log('  ℹ No unpaid/cancelled orders currently in DB to compare delta')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  if (failures.length > 0) {
    console.log('\nFAILURES:')
    failures.forEach(f => console.log(`  ✗ ${f}`))
  } else {
    console.log('ALL DASHBOARD TESTS PASSED ✓')
  }
  console.log('='.repeat(60))
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('\nFATAL ERROR:', err)
  process.exit(1)
})
