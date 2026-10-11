/**
 * test_admin_login.js
 * Comprehensive backend test suite for the dedicated Admin Login endpoint (POST /api/auth/admin-login).
 *
 * Verifies:
 * 1. Valid admin credentials on /api/auth/admin-login succeed (200, JWT cookie, admin role).
 * 2. Valid customer credentials on /api/auth/admin-login are rejected (401, generic message, no cookie).
 * 3. Invalid passwords are rejected (401, generic message).
 * 4. Non-existent accounts are rejected (401, generic message, no enumeration).
 * 5. Missing or malformed input returns 400 validation error.
 * 6. Client role tampering attempts in body are ignored.
 * 7. Existing customer login (/api/auth/login) remains fully functional.
 * 8. Existing customer registration (/api/auth/register) remains fully functional.
 * 9. Server-side admin authorization (/api/orders/admin) continues to block customers (403).
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const http = require('http')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = require('../src/app')
const User = require('../src/models/User')

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

function makeRequest(server, method, endpoint, body = null, cookie = null) {
  const address = server.address()
  const port = address.port

  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path: endpoint,
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (cookie) options.headers['Cookie'] = cookie

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let json = null
        try {
          json = JSON.parse(data)
        } catch {
          json = data
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        })
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function extractCookie(res) {
  const setCookie = res.headers['set-cookie']
  if (!setCookie || setCookie.length === 0) return ''
  return setCookie[0].split(';')[0]
}

const REQUIRED_TEST_DB = 'trendvolt_test'

function parseAndValidateTestUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string' || rawUri.trim() === '') {
    return {
      valid: false,
      error:
        'Missing MongoDB test connection URI. Set TEST_MONGODB_URI or MONGODB_URI targeting the dedicated "trendvolt_test" database.',
    }
  }

  let parsed
  try {
    parsed = new URL(rawUri)
  } catch {
    return {
      valid: false,
      error: 'Malformed MongoDB connection URI. Failed to parse URI structure.',
    }
  }

  if (parsed.protocol !== 'mongodb:' && parsed.protocol !== 'mongodb+srv:') {
    return {
      valid: false,
      error: `Invalid URI protocol "${parsed.protocol}". Expected "mongodb:" or "mongodb+srv:".`,
    }
  }

  const rawPath = parsed.pathname || ''
  const dbName = rawPath.replace(/^\/+/, '').split('/')[0].trim()

  if (!dbName) {
    return {
      valid: false,
      error: `No database name specified in URI pathname. The URI must explicitly target database "${REQUIRED_TEST_DB}".`,
    }
  }

  if (dbName !== REQUIRED_TEST_DB) {
    return {
      valid: false,
      error: `Target database is "${dbName}". Dedicated admin login test suite must target database "${REQUIRED_TEST_DB}". Refusing to connect.`,
    }
  }

  return {
    valid: true,
    dbName,
    uri: rawUri,
  }
}

async function run() {
  console.log('=== TEST SUITE: DEDICATED BACKEND ADMIN LOGIN API QA ===\n')

  // Explicit Test Database Guard:
  // Must target strictly 'trendvolt_test' to protect production and development data.
  const candidateUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI
  const guard = parseAndValidateTestUri(candidateUri)

  if (!guard.valid) {
    console.error(`[DATABASE SAFETY GUARD ERROR] ${guard.error}`)
    process.exit(1)
  }

  console.log(`[DATABASE SAFETY GUARD] Verified target database: "${guard.dbName}". Proceeding with connection.\n`)

  let server = null

  try {
    await mongoose.connect(guard.uri)
    console.log('Connected to MongoDB database.\n')

    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = server.address().port
    console.log(`Ephemeral test server listening on port ${port}.\n`)
    const ts = Date.now()
    const adminEmail = `admin_test_${ts}@trendvolt.com`
    const customerEmail = `cust_test_${ts}@example.com`
    const commonPassword = 'Password123!'

    const hashedPassword = await bcrypt.hash(commonPassword, 12)

    // Ensure clean test accounts
    const adminUser = await User.create({
      name: 'Test Administrator',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    })

    const customerUser = await User.create({
      name: 'Test Customer',
      email: customerEmail,
      password: hashedPassword,
      role: 'customer',
      isActive: true,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 1: Valid admin credentials on /api/auth/admin-login
    // ─────────────────────────────────────────────────────────────────────────
    console.log('[1] Valid admin login:')
    const adminRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {
      email: adminEmail,
      password: commonPassword,
    })
    assert(adminRes.status === 200, 'POST /api/auth/admin-login returns 200 for valid admin')
    assert(adminRes.data.success === true, 'Response contains success: true')
    assert(adminRes.data.user && adminRes.data.user.role === 'admin', 'Returned user role is exactly "admin"')
    assert(adminRes.data.user && adminRes.data.user.email === adminEmail, 'Returned user email matches')
    const adminCookie = extractCookie(adminRes)
    assert(adminCookie.startsWith('token='), 'Response sets HTTP-only JWT "token" cookie')
    const adminSetCookieHeader = adminRes.headers['set-cookie']?.[0] || ''
    assert(
      adminSetCookieHeader.includes('Max-Age=28800'),
      'Admin cookie maxAge is exactly 8 hours (Max-Age=28800)'
    )
    const adminToken = adminCookie.replace(/^token=/, '')
    const decodedAdmin = jwt.decode(adminToken)
    assert(
      decodedAdmin && decodedAdmin.exp - decodedAdmin.iat === 8 * 60 * 60,
      'Admin JWT token expiry is exactly 8 hours (28800 seconds)'
    )

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 2: Valid customer credentials on /api/auth/admin-login
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[2] Customer credentials rejected on /api/auth/admin-login:')
    const custOnAdminRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {
      email: customerEmail,
      password: commonPassword,
    })
    assert(custOnAdminRes.status === 401, 'Customer credentials return 401 Unauthorized')
    assert(custOnAdminRes.data.success === false, 'Response contains success: false')
    assert(
      custOnAdminRes.data.message === 'Invalid email or password',
      'Returns identical generic error "Invalid email or password" (no role enumeration)'
    )
    const custSetCookie = extractCookie(custOnAdminRes)
    assert(custSetCookie === '', 'No session or token cookie is issued for non-admin accounts')

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 3: Invalid password on /api/auth/admin-login
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[3] Invalid password on /api/auth/admin-login:')
    const badPwRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {
      email: adminEmail,
      password: 'WrongPassword999!',
    })
    assert(badPwRes.status === 401, 'Wrong password returns 401 Unauthorized')
    assert(badPwRes.data.message === 'Invalid email or password', 'Returns generic invalid credentials error')

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 4: Non-existent email on /api/auth/admin-login
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[4] Non-existent email on /api/auth/admin-login:')
    const noUserRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {
      email: `nonexistent_${ts}@nowhere.com`,
      password: 'SomePassword123!',
    })
    assert(noUserRes.status === 401, 'Non-existent email returns 401')
    assert(noUserRes.data.message === 'Invalid email or password', 'Returns identical generic error (no account enumeration)')

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 5: Missing and malformed input handling
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[5] Missing or malformed input handling:')
    const missingPw = await makeRequest(server, 'POST', '/api/auth/admin-login', {
      email: adminEmail,
    })
    assert(missingPw.status === 400, 'Missing password returns 400 Bad Request')
    assert(missingPw.data.errors && missingPw.data.errors.password, 'Validation indicates password is required')

    const badEmail = await makeRequest(server, 'POST', '/api/auth/admin-login', {
      email: 'not-an-email',
      password: commonPassword,
    })
    assert(badEmail.status === 400, 'Malformed email returns 400 Bad Request')

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 6: Client-supplied role tampering ignored
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[6] Client-supplied role tampering:')
    const tamperRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {
      email: customerEmail,
      password: commonPassword,
      role: 'admin',
    })
    assert(tamperRes.status === 401, 'Customer supplying role="admin" in body is strictly rejected with 401')

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 7: Customer login endpoint (/api/auth/login) functionality preserved
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[7] Existing customer login (/api/auth/login) preserved:')
    const custLoginRes = await makeRequest(server, 'POST', '/api/auth/login', {
      email: customerEmail,
      password: commonPassword,
    })
    assert(custLoginRes.status === 200, 'POST /api/auth/login succeeds for customer')
    assert(custLoginRes.data.user && custLoginRes.data.user.role === 'customer', 'Customer role returned as "customer"')
    const custCookie = extractCookie(custLoginRes)
    assert(custCookie.startsWith('token='), 'Customer login successfully issues session cookie')
    const custSetCookieHeader = custLoginRes.headers['set-cookie']?.[0] || ''
    assert(
      custSetCookieHeader.includes('Max-Age=604800'),
      'Customer cookie maxAge remains 7 days (Max-Age=604800)'
    )
    const custToken = custCookie.replace(/^token=/, '')
    const decodedCust = jwt.decode(custToken)
    assert(
      decodedCust && decodedCust.exp - decodedCust.iat === 7 * 24 * 60 * 60,
      'Customer JWT token expiry remains 7 days (604800 seconds)'
    )

    // Admin credentials rejected on customer /api/auth/login
    console.log('\n[7b] Admin credentials rejected on customer /api/auth/login:')
    const adminOnCustLoginRes = await makeRequest(server, 'POST', '/api/auth/login', {
      email: adminEmail,
      password: commonPassword,
    })
    assert(adminOnCustLoginRes.status === 401, 'Admin credentials on /api/auth/login rejected with 401')
    assert(adminOnCustLoginRes.data.success === false, 'Response contains success: false')
    assert(
      adminOnCustLoginRes.data.message === 'Invalid email or password',
      'Returns generic invalid credentials error (no role enumeration)'
    )
    const adminOnCustCookie = extractCookie(adminOnCustLoginRes)
    assert(adminOnCustCookie === '', 'No auth cookie is issued for admin on customer login route')

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 8: Customer registration endpoint (/api/auth/register) preserved
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[8] Customer registration (/api/auth/register) preserved:')
    const newCustEmail = `new_reg_${ts}@example.com`
    const regRes = await makeRequest(server, 'POST', '/api/auth/register', {
      name: 'New Shopper',
      email: newCustEmail,
      password: commonPassword,
    })
    assert(regRes.status === 201, 'POST /api/auth/register creates account with 201')
    assert(regRes.data.user && regRes.data.user.role === 'customer', 'New account defaults strictly to role "customer"')

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 9: Protected admin APIs still enforce authentication & authorization
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[9] Server-side protected admin API verification:')
    const unauthOrders = await makeRequest(server, 'GET', '/api/orders/admin')
    assert(unauthOrders.status === 401, 'Unauthenticated GET /api/orders/admin returns 401')

    const custOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, custCookie)
    assert(custOrders.status === 403, 'Customer session on GET /api/orders/admin returns 403 Forbidden')

    const adminOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, adminCookie)
    assert(adminOrders.status === 200, 'Admin session on GET /api/orders/admin returns 200 OK')

    // Legacy 7-day token (without admin claim) rejected on admin API
    const legacyToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const legacyOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, `token=${legacyToken}`)
    assert(legacyOrders.status === 403, 'Legacy 7-day token without admin claim is rejected on admin API with 403')

    // Admin token with duration exceeding 8h rejected on admin API
    const excessiveToken = jwt.sign({ id: adminUser._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' })
    const excessiveOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, `token=${excessiveToken}`)
    assert(excessiveOrders.status === 403, 'Admin token with duration > 8h is rejected on admin API with 403')

    // Admin token with missing exp claim rejected on admin API (fail-closed)
    const noExpToken = jwt.sign({ id: adminUser._id, role: 'admin' }, process.env.JWT_SECRET)
    const noExpOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, `token=${noExpToken}`)
    assert(noExpOrders.status === 403, 'Admin token with missing exp claim is rejected on admin API with 403')

    // Admin token with missing iat claim rejected on admin API (fail-closed)
    const nowSec = Math.floor(Date.now() / 1000)
    const noIatToken = jwt.sign(
      { id: adminUser._id, role: 'admin', exp: nowSec + 3600 },
      process.env.JWT_SECRET,
      { noTimestamp: true }
    )
    const noIatOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, `token=${noIatToken}`)
    assert(noIatOrders.status === 403, 'Admin token with missing iat claim is rejected on admin API with 403')

    // Admin token with exp <= iat rejected on admin API (fail-closed)
    const invalidOrderToken = jwt.sign(
      { id: adminUser._id, role: 'admin', iat: nowSec + 7200, exp: nowSec + 3600 },
      process.env.JWT_SECRET
    )
    const invalidOrderOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, `token=${invalidOrderToken}`)
    assert(invalidOrderOrders.status === 403, 'Admin token with exp <= iat is rejected on admin API with 403')

    // Role demotion: Pre-issued valid 8h admin token rejected when DB role is changed to customer
    const demoteAdminEmail = `demote_test_${ts}@trendvolt.com`
    const demoteAdmin = await User.create({
      name: 'Demote Test Admin',
      email: demoteAdminEmail,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    })
    const demoteToken = jwt.sign(
      { id: demoteAdmin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )
    const preDemoteOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, `token=${demoteToken}`)
    assert(preDemoteOrders.status === 200, 'Pre-demoted admin token accesses /api/orders/admin with 200 OK')

    await User.findByIdAndUpdate(demoteAdmin._id, { role: 'customer' })

    const postDemoteOrders = await makeRequest(server, 'GET', '/api/orders/admin', null, `token=${demoteToken}`)
    assert(postDemoteOrders.status === 403, 'Demoted admin token is rejected on /api/orders/admin with 403 Forbidden')

    // ─────────────────────────────────────────────────────────────────────────
    // TEST 10: Logout clears authentication cookie correctly
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n[10] Logout clears authentication cookie:')
    const logoutRes = await makeRequest(server, 'POST', '/api/auth/logout', null, adminCookie)
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK')
    const logoutCookieHeader = logoutRes.headers['set-cookie']?.[0] || ''
    assert(
      logoutCookieHeader.includes('token=;') ||
        logoutCookieHeader.includes('Expires=Thu, 01 Jan 1970') ||
        logoutCookieHeader.includes('Max-Age=0'),
      'Logout response explicitly clears authentication token cookie'
    )

    // Cleanup test records
    await User.deleteMany({
      _id: { $in: [adminUser._id, customerUser._id, regRes.data?.user?.id, demoteAdmin._id] },
    })
  } finally {
    if (server) {
      server.close()
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  }

  console.log('\n========================================')
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`)
  console.log('========================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
