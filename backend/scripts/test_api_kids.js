const http = require('http')

const BASE_URL = 'http://localhost:5000'

let adminCookie = ''
let createdProductId = null
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
        } catch (e) {
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

async function runApiTests() {
  console.log('=== TEST SUITE: BACKEND API INTEGRATION FOR KIDS TAXONOMY ===\n')

  // Step 1: Admin Login
  console.log('Step 1: Admin Login...')
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@trendvolt.com',
    password: 'AdminPass123!',
  })
  assert(loginRes.status === 200, 'Admin login succeeded with 200')
  const setCookie = loginRes.headers['set-cookie']
  if (setCookie && setCookie.length > 0) {
    adminCookie = setCookie.map((c) => c.split(';')[0]).join('; ')
  }
  assert(Boolean(adminCookie), 'Admin JWT cookie retrieved')

  // Step 2: Create Valid Kids Product
  console.log('\nStep 2: Create Product with Fashion -> Kids -> Boys & ageRange...')
  const validKidsProduct = {
    name: 'Kids Graphic Cotton Tee',
    description: 'Comfortable everyday cotton tee designed for active kids.',
    price: 899,
    category: 'fashion',
    department: 'kids',
    subcategory: 'boys',
    brand: 'TrendVolt Junior',
    stock: 20,
    images: ['https://example.com/kids-tee.jpg'],
    ageRange: '8-10 years',
    isActive: true,
  }

  const createRes = await request('POST', '/api/products', validKidsProduct, adminCookie)
  assert(createRes.status === 201, 'POST /api/products created Kids product with 201')
  assert(createRes.data?.product?.department === 'kids', 'Product department is "kids"')
  assert(createRes.data?.product?.subcategory === 'boys', 'Product subcategory is "boys"')
  assert(createRes.data?.product?.ageRange === '8-10 years', 'Product ageRange is "8-10 years"')
  createdProductId = createRes.data?.product?._id
  assert(Boolean(createdProductId), 'Created product ID received')

  // Step 3: Test Rejections of Invalid Combinations via API
  console.log('\nStep 3: Test Rejections of Invalid Taxonomy Combinations...')

  // Invalid 1: Fashion -> Kids -> Shirts
  const inv1 = await request(
    'POST',
    '/api/products',
    { ...validKidsProduct, subcategory: 'shirts' },
    adminCookie
  )
  assert(inv1.status === 400, 'Fashion -> Kids -> Shirts rejected with 400')
  assert(Boolean(inv1.data?.errors?.subcategory), 'Error indicates invalid subcategory')

  // Invalid 2: Fashion -> Kids -> Earbuds
  const inv2 = await request(
    'POST',
    '/api/products',
    { ...validKidsProduct, subcategory: 'earbuds' },
    adminCookie
  )
  assert(inv2.status === 400, 'Fashion -> Kids -> Earbuds rejected with 400')

  // Invalid 3: Fashion -> Men -> Boys
  const inv3 = await request(
    'POST',
    '/api/products',
    { ...validKidsProduct, department: 'men', subcategory: 'boys' },
    adminCookie
  )
  assert(inv3.status === 400, 'Fashion -> Men -> Boys rejected with 400')

  // Invalid 4: Electronics -> Kids
  const inv4 = await request(
    'POST',
    '/api/products',
    { ...validKidsProduct, category: 'electronics', department: 'kids' },
    adminCookie
  )
  assert(inv4.status === 400, 'Electronics -> Kids rejected with 400')

  // Step 4: Product Filtering Endpoints
  console.log('\nStep 4: Test GET /api/products Filtering...')

  // Filter: category=fashion&department=kids
  const filterDeptRes = await request('GET', '/api/products?category=fashion&department=kids')
  assert(filterDeptRes.status === 200, 'GET /api/products?category=fashion&department=kids returned 200')
  assert(
    filterDeptRes.data?.products?.some((p) => p._id === createdProductId),
    'Kids product found in department=kids filter'
  )
  assert(
    filterDeptRes.data?.products?.every((p) => p.department === 'kids'),
    'All returned products have department === "kids"'
  )

  // Filter: category=fashion&department=kids&subcategory=boys
  const filterSubRes = await request(
    'GET',
    '/api/products?category=fashion&department=kids&subcategory=boys'
  )
  assert(
    filterSubRes.status === 200,
    'GET /api/products?category=fashion&department=kids&subcategory=boys returned 200'
  )
  assert(
    filterSubRes.data?.products?.some((p) => p._id === createdProductId),
    'Kids product found in subcategory=boys filter'
  )

  // Filter: category=fashion&department=kids&subcategory=girls
  const filterGirlsRes = await request(
    'GET',
    '/api/products?category=fashion&department=kids&subcategory=girls'
  )
  assert(filterGirlsRes.status === 200, 'GET filter subcategory=girls returned 200')
  assert(
    !filterGirlsRes.data?.products?.some((p) => p._id === createdProductId),
    'Boys product NOT returned in subcategory=girls filter'
  )

  // Preserve existing filter: category=fashion&department=men&subcategory=shirts
  const filterMenRes = await request(
    'GET',
    '/api/products?category=fashion&department=men&subcategory=shirts'
  )
  assert(filterMenRes.status === 200, 'GET existing filter men/shirts returned 200')
  assert(
    filterMenRes.data?.products?.length > 0,
    'Existing men shirts returned correctly'
  )

  // Step 5: Test Product Update with ageRange & Kids subcategory
  console.log('\nStep 5: Test PUT /api/products/:id...')
  const updateRes = await request(
    'PUT',
    `/api/products/${createdProductId}`,
    {
      subcategory: 'kids-clothing',
      ageRange: '8-10 years (Standard)',
    },
    adminCookie
  )
  assert(updateRes.status === 200, 'PUT /api/products/:id succeeded with 200')
  assert(
    updateRes.data?.product?.subcategory === 'kids-clothing',
    'Product subcategory updated to "kids-clothing"'
  )
  assert(
    updateRes.data?.product?.ageRange === '8-10 years (Standard)',
    'Product ageRange updated to "8-10 years (Standard)"'
  )

  // Step 6: Clean up test product
  console.log('\nStep 6: Clean up test product...')
  const delRes = await request('DELETE', `/api/products/${createdProductId}`, null, adminCookie)
  assert(delRes.status === 200, 'DELETE test product succeeded with 200')

  console.log(`\n=== API TEST SUMMARY: ${passed} passed, ${failed} failed ===\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

runApiTests().catch((err) => {
  console.error('API test failed with error:', err)
  process.exit(1)
})
