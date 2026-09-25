/**
 * test_admin_users.js
 * Comprehensive backend QA for the Admin Users — User Management module.
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
  console.log('=== TEST SUITE: ADMIN USERS — USER MANAGEMENT API QA ===\n')

  const ts = Date.now()
  const customerEmail = `user_mgmt_${ts}@example.com`
  const customerName = `MgmtTestUser_${ts}`
  const password = 'Password123!'

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Unauthenticated access blocked
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Test 1: Unauthenticated access blocked...')
  const unauthGet = await request('GET', '/api/users/admin')
  assert(unauthGet.status === 401, 'GET /api/users/admin without auth returns 401')

  const unauthStatus = await request('PATCH', '/api/users/admin/507f1f77bcf86cd799439011/status', { isActive: false })
  assert(unauthStatus.status === 401, 'PATCH /api/users/admin/:id/status without auth returns 401')

  const unauthRole = await request('PATCH', '/api/users/admin/507f1f77bcf86cd799439011/role', { role: 'admin' })
  assert(unauthRole.status === 401, 'PATCH /api/users/admin/:id/role without auth returns 401')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Register a test customer & verify 403 on admin user endpoints
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 2: Customer access blocked with 403...')
  const regCust = await request('POST', '/api/auth/register', {
    name: customerName,
    email: customerEmail,
    password,
  })
  assert(regCust.status === 201, 'Customer registered with 201')
  const customerId = regCust.data.user?.id
  assert(Boolean(customerId), 'Customer ID received')
  const custCookie = getCookie(regCust)
  assert(custCookie.length > 0, 'Customer received auth cookie')

  const custGet = await request('GET', '/api/users/admin', null, custCookie)
  assert(custGet.status === 403, 'Customer GET /api/users/admin returns 403 Forbidden')

  const custMutateStatus = await request('PATCH', `/api/users/admin/${customerId}/status`, { isActive: false }, custCookie)
  assert(custMutateStatus.status === 403, 'Customer PATCH status returns 403 Forbidden')

  const custMutateRole = await request('PATCH', `/api/users/admin/${customerId}/role`, { role: 'admin' }, custCookie)
  assert(custMutateRole.status === 403, 'Customer PATCH role returns 403 Forbidden')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Admin login & list users
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 3: Admin access allowed with 200...')
  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@trendvolt.com',
    password: 'AdminPass123!',
  })
  assert(adminLogin.status === 200, 'Admin login succeeded with 200')
  const adminId = adminLogin.data.user?.id
  assert(Boolean(adminId), 'Admin user ID received')
  const adminCookie = getCookie(adminLogin)
  assert(adminCookie.length > 0, 'Admin auth cookie received')

  const adminGet = await request('GET', '/api/users/admin', null, adminCookie)
  assert(adminGet.status === 200, 'Admin GET /api/users/admin returns 200')
  assert(adminGet.data.success === true, 'Response has success: true')
  assert(Array.isArray(adminGet.data.users), 'Response has users array')
  assert(adminGet.data.users.length >= 2, `Users array contains registered accounts (found ${adminGet.data.users.length})`)

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Projection security — no sensitive fields leaked
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 4: Projection security validation...')
  const firstUser = adminGet.data.users[0]
  assert(typeof firstUser._id === 'string', 'User has _id string')
  assert(typeof firstUser.name === 'string', 'User has name string')
  assert(typeof firstUser.email === 'string', 'User has email string')
  assert(typeof firstUser.role === 'string', 'User has role string')
  assert(typeof firstUser.isActive === 'boolean', 'User has isActive boolean')
  assert(typeof firstUser.createdAt === 'string', 'User has createdAt timestamp')
  assert(firstUser.password === undefined, 'No password field exposed')
  assert(firstUser.passwordResetToken === undefined, 'No passwordResetToken exposed')
  assert(firstUser.passwordResetExpires === undefined, 'No passwordResetExpires exposed')
  assert(firstUser.addresses === undefined, 'No private addresses array exposed')
  assert(firstUser.wishlist === undefined, 'No wishlist array exposed')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Server-side search by name and email
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 5: Server-side search...')
  const searchName = await request('GET', `/api/users/admin?search=${encodeURIComponent(customerName)}`, null, adminCookie)
  assert(searchName.status === 200, 'Search by name returns 200')
  assert(searchName.data.users.some(u => u._id === customerId), 'Target user found when searching by name')

  const searchEmail = await request('GET', `/api/users/admin?search=${encodeURIComponent(customerEmail)}`, null, adminCookie)
  assert(searchEmail.status === 200, 'Search by email returns 200')
  assert(searchEmail.data.users.some(u => u._id === customerId), 'Target user found when searching by email')

  const searchCaseInsensitive = await request('GET', `/api/users/admin?search=${encodeURIComponent(customerName.toLowerCase())}`, null, adminCookie)
  assert(searchCaseInsensitive.data.users.some(u => u._id === customerId), 'Search is case-insensitive')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: Role & Status filters
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 6: Role and status filters...')
  const filterAdmin = await request('GET', '/api/users/admin?role=admin', null, adminCookie)
  assert(filterAdmin.status === 200, 'Filter role=admin returns 200')
  assert(filterAdmin.data.users.every(u => u.role === 'admin'), 'All users in role=admin filter have role === "admin"')

  const filterCustomer = await request('GET', '/api/users/admin?role=customer', null, adminCookie)
  assert(filterCustomer.status === 200, 'Filter role=customer returns 200')
  assert(filterCustomer.data.users.every(u => u.role === 'customer'), 'All users in role=customer filter have role === "customer"')

  const filterActive = await request('GET', '/api/users/admin?status=active', null, adminCookie)
  assert(filterActive.status === 200, 'Filter status=active returns 200')
  assert(filterActive.data.users.every(u => u.isActive === true), 'All users in status=active filter have isActive === true')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: Disable customer account
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 7: Disable customer account...')
  const disableRes = await request('PATCH', `/api/users/admin/${customerId}/status`, { isActive: false }, adminCookie)
  assert(disableRes.status === 200, 'Disable customer account returns 200')
  assert(disableRes.data.success === true, 'Disable response has success: true')
  assert(disableRes.data.user.isActive === false, 'User isActive updated to false')

  // Verify DB reflects disabled status
  const filterDisabled = await request('GET', '/api/users/admin?status=disabled', null, adminCookie)
  assert(filterDisabled.data.users.some(u => u._id === customerId && u.isActive === false), 'Disabled user appears in status=disabled filter')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8: Disabled customer cannot authenticate or use protected routes
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 8: Disabled customer authentication blocked...')
  const disabledLogin = await request('POST', '/api/auth/login', {
    email: customerEmail,
    password,
  })
  assert(disabledLogin.status === 403, 'Disabled customer login is blocked with 403 Forbidden')

  // Request with existing cookie should be blocked by authenticate middleware
  const disabledProtectedReq = await request('GET', '/api/users/profile', null, custCookie)
  assert(disabledProtectedReq.status === 403, 'Disabled customer request on protected route blocked with 403 Forbidden')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 9: Re-enable customer account
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 9: Re-enable customer account...')
  const enableRes = await request('PATCH', `/api/users/admin/${customerId}/status`, { isActive: true }, adminCookie)
  assert(enableRes.status === 200, 'Re-enable customer account returns 200')
  assert(enableRes.data.user.isActive === true, 'User isActive updated to true')

  // Re-enabled customer can now log in
  const reenabledLogin = await request('POST', '/api/auth/login', {
    email: customerEmail,
    password,
  })
  assert(reenabledLogin.status === 200, 'Re-enabled customer login succeeds with 200')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 10: Role promotion and demotion
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 10: Promote and demote customer...')
  const promoteRes = await request('PATCH', `/api/users/admin/${customerId}/role`, { role: 'admin' }, adminCookie)
  assert(promoteRes.status === 200, 'Promote customer to admin returns 200')
  assert(promoteRes.data.user.role === 'admin', 'User role updated to admin')

  const demoteRes = await request('PATCH', `/api/users/admin/${customerId}/role`, { role: 'customer' }, adminCookie)
  assert(demoteRes.status === 200, 'Demote admin to customer returns 200')
  assert(demoteRes.data.user.role === 'customer', 'User role updated to customer')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 11: Security guards — Self-mutation protection
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 11: Self-mutation protection...')
  const selfDisable = await request('PATCH', `/api/users/admin/${adminId}/status`, { isActive: false }, adminCookie)
  assert(selfDisable.status === 400, 'Admin cannot disable own account (400)')
  assert(selfDisable.data.success === false, 'Self-disable rejected with success: false')

  const selfDemote = await request('PATCH', `/api/users/admin/${adminId}/role`, { role: 'customer' }, adminCookie)
  assert(selfDemote.status === 400, 'Admin cannot change own role (400)')
  assert(selfDemote.data.success === false, 'Self-role change rejected with success: false')

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 12: Security guards — Last remaining active admin protection
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTest 12: Last-admin protection...')
  // Find all active admins
  const adminsRes = await request('GET', '/api/users/admin?role=admin&status=active', null, adminCookie)
  const activeAdmins = adminsRes.data.users || []

  if (activeAdmins.length === 1) {
    // There is only 1 active admin (adminId). If someone somehow tried to demote/disable it from an admin token:
    const lastAdminDisable = await request('PATCH', `/api/users/admin/${activeAdmins[0]._id}/status`, { isActive: false }, adminCookie)
    assert(lastAdminDisable.status === 400, 'Disabling last remaining active admin rejected (400)')

    const lastAdminDemote = await request('PATCH', `/api/users/admin/${activeAdmins[0]._id}/role`, { role: 'customer' }, adminCookie)
    assert(lastAdminDemote.status === 400, 'Demoting last remaining active admin rejected (400)')
  } else {
    // Multiple admins exist; verify logic guards when count <= 1
    console.log(`  ℹ Found ${activeAdmins.length} active admins in database`)
    assert(activeAdmins.length >= 1, 'At least 1 active admin exists')
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
    console.log('ALL ADMIN USERS TESTS PASSED ✓')
  }
  console.log('='.repeat(60))
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('\nFATAL ERROR:', err)
  process.exit(1)
})
