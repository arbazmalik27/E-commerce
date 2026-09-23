const http = require('http')

const BASE_URL = 'http://localhost:5000'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (cookie) {
      options.headers['Cookie'] = cookie
    }

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

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

function getCookie(res) {
  const setCookie = res.headers['set-cookie']
  if (!setCookie || setCookie.length === 0) return ''
  return setCookie[0].split(';')[0]
}

async function run() {
  console.log('=== TEST SUITE: CUSTOMER PROFILE & ADDRESS MANAGEMENT ===\n')

  const testUserAEmail = `testuser_${Date.now()}@example.com`
  const testUserBEmail = `testuser_b_${Date.now()}@example.com`
  const password = 'Password123!'

  // 1. Unauthenticated access blocked
  console.log('Test 1: Unauthenticated access blocked on /api/users/profile & addresses...')
  const unauthProfile = await request('GET', '/api/users/profile')
  assert(unauthProfile.status === 401, 'GET /api/users/profile blocked without auth (401)')

  const unauthAddresses = await request('GET', '/api/users/addresses')
  assert(unauthAddresses.status === 401, 'GET /api/users/addresses blocked without auth (401)')

  const unauthCreateAddr = await request('POST', '/api/users/addresses', { fullName: 'Test' })
  assert(unauthCreateAddr.status === 401, 'POST /api/users/addresses blocked without auth (401)')

  // 2. Register Test User A
  console.log('\nTest 2: Register & authenticate Test User A...')
  const regA = await request('POST', '/api/auth/register', {
    name: 'Customer Alice',
    email: testUserAEmail,
    password,
  })
  assert(regA.status === 201, 'User A registered with 201')
  const cookieA = getCookie(regA)
  assert(cookieA.length > 0, 'User A received auth cookie')

  // 3. Fetch User A profile
  console.log('\nTest 3: Authenticated profile fetch...')
  const profA = await request('GET', '/api/users/profile', null, cookieA)
  assert(profA.status === 200, 'GET /api/users/profile succeeded with 200')
  assert(profA.data.user.name === 'Customer Alice', 'User name is "Customer Alice"')
  assert(profA.data.user.email === testUserAEmail, 'Email matches')
  assert(profA.data.user.role === 'customer', 'Role is "customer"')
  assert(typeof profA.data.user.createdAt === 'string', 'createdAt present')
  assert(!profA.data.user.password, 'Password hash is NOT exposed')

  // 4. Update User A profile
  console.log('\nTest 4: Update profile name...')
  const updateProf = await request('PUT', '/api/users/profile', { name: 'Alice Walker' }, cookieA)
  assert(updateProf.status === 200, 'PUT /api/users/profile succeeded with 200')
  assert(updateProf.data.user.name === 'Alice Walker', 'Name updated to "Alice Walker"')

  // 5. Protected fields cannot be escalated
  console.log('\nTest 5: Protection against role/email escalation...')
  const escalateAttempt = await request(
    'PUT',
    '/api/users/profile',
    { name: 'Alice Hacker', role: 'admin', email: 'hacked@example.com' },
    cookieA
  )
  assert(escalateAttempt.status === 200, 'Update request processed')
  assert(escalateAttempt.data.user.name === 'Alice Hacker', 'Name updated')
  assert(escalateAttempt.data.user.role === 'customer', 'Role remains "customer" (escalation blocked)')
  assert(escalateAttempt.data.user.email === testUserAEmail, 'Email remains unchanged')

  // 6. Address list initially empty
  console.log('\nTest 6: Fetch addresses initially...')
  const addrList1 = await request('GET', '/api/users/addresses', null, cookieA)
  assert(addrList1.status === 200, 'GET /api/users/addresses succeeded with 200')
  assert(Array.isArray(addrList1.data.addresses), 'addresses is an array')
  assert(addrList1.data.addresses.length === 0, 'addresses is initially empty')

  // 7. Add First Address (should auto-become default)
  console.log('\nTest 7: Add first address (auto-default)...')
  const address1Data = {
    fullName: 'Alice Walker',
    phone: '9876543210',
    addressLine: '42 MG Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    country: 'India',
  }
  const addRes1 = await request('POST', '/api/users/addresses', address1Data, cookieA)
  assert(addRes1.status === 201, 'POST /api/users/addresses succeeded with 201')
  assert(addRes1.data.address.fullName === 'Alice Walker', 'Full name saved')
  assert(addRes1.data.address.city === 'Bengaluru', 'City saved')
  assert(addRes1.data.address.isDefault === true, 'First address automatically set as isDefault = true')
  const addr1Id = addRes1.data.address._id

  // 8. Add Second Address (without isDefault, should not be default)
  console.log('\nTest 8: Add second address without isDefault...')
  const address2Data = {
    fullName: 'Alice Office',
    phone: '9876543211',
    addressLine: 'Tower B, Outer Ring Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560103',
    country: 'India',
    isDefault: false,
  }
  const addRes2 = await request('POST', '/api/users/addresses', address2Data, cookieA)
  assert(addRes2.status === 201, 'Second address created')
  assert(addRes2.data.address.isDefault === false, 'Second address isDefault is false')
  const addr2Id = addRes2.data.address._id

  // 9. Add Third Address with isDefault: true (should unset others)
  console.log('\nTest 9: Add third address with isDefault: true...')
  const address3Data = {
    fullName: 'Alice Vacation',
    phone: '9876543212',
    addressLine: 'Beach Road, Calangute',
    city: 'Goa',
    state: 'Goa',
    postalCode: '403516',
    country: 'India',
    isDefault: true,
  }
  const addRes3 = await request('POST', '/api/users/addresses', address3Data, cookieA)
  assert(addRes3.status === 201, 'Third address created')
  assert(addRes3.data.address.isDefault === true, 'Third address is default')
  const addr3Id = addRes3.data.address._id

  // Verify that address 1 is no longer default
  const addrListCheck = await request('GET', '/api/users/addresses', null, cookieA)
  const defaultCount = addrListCheck.data.addresses.filter((a) => a.isDefault).length
  assert(defaultCount === 1, 'Exactly one address is default')
  const currentDefault = addrListCheck.data.addresses.find((a) => a.isDefault)
  assert(currentDefault._id === addr3Id, 'Address 3 is the exclusive default')

  // 10. Update Address details
  console.log('\nTest 10: Update Address details...')
  const updateRes = await request(
    'PUT',
    `/api/users/addresses/${addr2Id}`,
    {
      ...address2Data,
      addressLine: 'Suite 404, Tech Park',
      phone: '9998887776',
    },
    cookieA
  )
  assert(updateRes.status === 200, 'PUT /api/users/addresses/:id succeeded with 200')
  assert(updateRes.data.address.addressLine === 'Suite 404, Tech Park', 'Address line updated')
  assert(updateRes.data.address.phone === '9998887776', 'Phone updated')

  // 11. Explicitly set default address via PATCH
  console.log('\nTest 11: Set default address via PATCH /api/users/addresses/:id/default...')
  const patchDef = await request('PATCH', `/api/users/addresses/${addr1Id}/default`, null, cookieA)
  assert(patchDef.status === 200, 'PATCH default succeeded with 200')
  const afterPatchList = await request('GET', '/api/users/addresses', null, cookieA)
  const newDefault = afterPatchList.data.addresses.find((a) => a.isDefault)
  assert(newDefault._id === addr1Id, 'Address 1 is now default')

  // 12. Delete Address
  console.log('\nTest 12: Delete an address...')
  const delRes = await request('DELETE', `/api/users/addresses/${addr3Id}`, null, cookieA)
  assert(delRes.status === 200, 'DELETE succeeded with 200')
  const afterDelList = await request('GET', '/api/users/addresses', null, cookieA)
  assert(afterDelList.data.addresses.length === 2, '2 addresses remaining')
  assert(!afterDelList.data.addresses.find((a) => a._id === addr3Id), 'Address 3 is removed')

  // 13. Ownership Isolation: Register User B and verify they cannot modify User A's address
  console.log('\nTest 13: User ownership isolation...')
  const regB = await request('POST', '/api/auth/register', {
    name: 'Customer Bob',
    email: testUserBEmail,
    password,
  })
  const cookieB = getCookie(regB)

  const bGetAAddress = await request('PUT', `/api/users/addresses/${addr1Id}`, address1Data, cookieB)
  assert(bGetAAddress.status === 404, 'User B cannot update User A address (returns 404)')

  const bDeleteAAddress = await request('DELETE', `/api/users/addresses/${addr1Id}`, null, cookieB)
  assert(bDeleteAAddress.status === 404, 'User B cannot delete User A address (returns 404)')

  console.log(`\n=== TEST SUMMARY: ${passed} passed, ${failed} failed ===`)
  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Test script crashed:', err)
  process.exit(1)
})
