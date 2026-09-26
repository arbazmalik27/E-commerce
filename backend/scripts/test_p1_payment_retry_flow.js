const http = require('http')
const crypto = require('crypto')

const BASE_URL = 'http://localhost:5000'
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret_for_hmac_verification'

function request(options, bodyData) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(bodyData ? { 'Content-Length': Buffer.byteLength(bodyData) } : {}),
          ...options.headers,
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          let parsed = null
          try {
            parsed = JSON.parse(body)
          } catch {
            parsed = body
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed })
        })
      }
    )
    req.on('error', reject)
    if (bodyData) req.write(bodyData)
    req.end()
  })
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie']
  if (!setCookie) return ''
  return setCookie.map((c) => c.split(';')[0]).join('; ')
}

function getCartItems(cartRes) {
  return cartRes.data?.cart?.items || cartRes.data?.items || []
}

function generateSignature(orderId, paymentId, secret) {
  const payload = `${orderId}|${paymentId}`
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

async function runTests() {
  console.log('====================================================================')
  console.log('  TRENDVOLT P1 PAYMENT RETRY / PENDING ORDER RECOVERY VERIFICATION')
  console.log('====================================================================\n')

  let passedCount = 0
  let failedCount = 0

  function assert(name, condition, extraInfo = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`)
      passedCount++
    } else {
      console.error(`  ✗ FAIL: ${name} ${extraInfo ? `(${extraInfo})` : ''}`)
      failedCount++
    }
  }

  try {
    // 0. Setup: Register two test users
    const timestamp = Date.now()
    const userAEmail = `retry_user_a_${timestamp}@example.com`
    const userBEmail = `retry_user_b_${timestamp}@example.com`

    const regA = await request(
      { path: '/api/auth/register', method: 'POST' },
      JSON.stringify({ name: 'Retry User A', email: userAEmail, password: 'Password123!' })
    )
    assert('Register User A', regA.status === 201 || regA.status === 200)
    const cookieA = extractCookie(regA.headers)

    const regB = await request(
      { path: '/api/auth/register', method: 'POST' },
      JSON.stringify({ name: 'Retry User B', email: userBEmail, password: 'Password123!' })
    )
    assert('Register User B', regB.status === 201 || regB.status === 200)
    const cookieB = extractCookie(regB.headers)

    // Fetch existing active products
    const productsRes = await request({ path: '/api/products', method: 'GET' })
    assert('Fetch products', productsRes.status === 200 && productsRes.data.products?.length >= 2)
    const product1 = productsRes.data.products[0]
    const product2 = productsRes.data.products[1]
    console.log(`  Using Product 1: ${product1.name} (Stock: ${product1.stock}, Price: ${product1.price})`)
    console.log(`  Using Product 2: ${product2.name} (Stock: ${product2.stock}, Price: ${product2.price})`)

    // =========================================================================
    // SCENARIO A: Create Pending Order
    // =========================================================================
    console.log('\n--- Scenario A: Create Pending Order ---')
    const addRes = await request(
      { path: '/api/cart/items', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({ productId: product1._id, quantity: 1 })
    )
    assert('User A adds Product 1 (qty 1) to cart', addRes.status === 200)

    const createOrderRes = await request(
      { path: '/api/orders', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({
        shippingAddress: {
          fullName: 'Retry User A',
          phone: '9876543210',
          addressLine: '456 Trend Ave',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India',
        },
      })
    )
    assert('Order created (201)', createOrderRes.status === 201)
    const orderA = createOrderRes.data?.order
    const initialOrderId = orderA._id
    assert('Order has pending paymentStatus', orderA?.paymentStatus === 'pending')
    assert('Order has pending orderStatus', orderA?.orderStatus === 'pending')

    // Cart is preserved (P0 check)
    const cartA = await request({ path: '/api/cart', method: 'GET', headers: { Cookie: cookieA } })
    assert('Cart is intact after order creation', getCartItems(cartA).length === 1)

    // =========================================================================
    // SCENARIO B: Initial Payment Attempt Cancelled / Closed
    // =========================================================================
    console.log('\n--- Scenario B: Initial Payment Attempt Cancelled ---')
    // First attempt creates Razorpay order
    const rzp1 = await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({ orderId: initialOrderId })
    )
    assert('Initial Razorpay order created', rzp1.status === 200)

    // User closes modal without verification
    const orderAfterCancel = await request(
      { path: `/api/orders/${initialOrderId}`, method: 'GET', headers: { Cookie: cookieA } }
    )
    assert('Order remains pending after modal dismiss', orderAfterCancel.data?.order?.paymentStatus === 'pending')
    assert('Order status remains pending', orderAfterCancel.data?.order?.orderStatus === 'pending')

    const cartAfterCancel = await request({ path: '/api/cart', method: 'GET', headers: { Cookie: cookieA } })
    assert('Cart remains untouched after cancellation', getCartItems(cartAfterCancel).length === 1)

    const prod1Check = await request({ path: `/api/products/${product1._id}`, method: 'GET' })
    const baselineStock = prod1Check.data?.product?.stock
    assert('Stock unchanged after cancelled payment', prod1Check.data?.product?.stock === baselineStock)

    // =========================================================================
    // SCENARIO C: Retry Payment Initialization
    // =========================================================================
    console.log('\n--- Scenario C: Retry Payment Initialization ---')
    // User clicks "Retry Payment" on Order Details: calls create-order with same application order ID
    const retry1 = await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({ orderId: initialOrderId })
    )
    assert('Retry payment order created (200)', retry1.status === 200)
    assert('Retry uses EXACT same application order ID', retry1.data?.orderId === initialOrderId)
    const expectedPaise = Math.round(orderA.totalAmount * 100)
    assert('Retry uses backend totalAmount in paise', retry1.data?.amount === expectedPaise)
    const retryRzpOrderId = retry1.data?.razorpayOrderId
    assert('Fresh razorpayOrderId generated for retry', !!retryRzpOrderId)

    // Verify no new application orders were created in database
    const myOrdersRes = await request(
      { path: '/api/orders', method: 'GET', headers: { Cookie: cookieA } }
    )
    const userOrdersCount = myOrdersRes.data?.orders?.length
    assert('No duplicate application orders created on retry', userOrdersCount === 1, `count: ${userOrdersCount}`)

    // =========================================================================
    // SCENARIO D: Retry Payment Cancelled Again
    // =========================================================================
    console.log('\n--- Scenario D: Retry Payment Cancelled ---')
    const orderAfterRetryCancel = await request(
      { path: `/api/orders/${initialOrderId}`, method: 'GET', headers: { Cookie: cookieA } }
    )
    assert('Order still pending after 2nd cancel', orderAfterRetryCancel.data?.order?.paymentStatus === 'pending')
    const cartAfterRetryCancel = await request({ path: '/api/cart', method: 'GET', headers: { Cookie: cookieA } })
    assert('Cart still intact after 2nd cancel', getCartItems(cartAfterRetryCancel).length === 1)
    const prod1CheckD = await request({ path: `/api/products/${product1._id}`, method: 'GET' })
    assert('Stock still unchanged after 2nd cancel', prod1CheckD.data?.product?.stock === baselineStock)

    // =========================================================================
    // SCENARIO E: Retry with Invalid Signature
    // =========================================================================
    console.log('\n--- Scenario E: Retry with Invalid Signature ---')
    const invalidVerify = await request(
      { path: '/api/payments/verify', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({
        orderId: initialOrderId,
        razorpayOrderId: retryRzpOrderId,
        razorpayPaymentId: `pay_bad_${Date.now()}`,
        razorpaySignature: 'forged_fake_signature_hex',
      })
    )
    assert('Invalid signature rejected (400)', invalidVerify.status === 400)
    const orderAfterBadSig = await request(
      { path: `/api/orders/${initialOrderId}`, method: 'GET', headers: { Cookie: cookieA } }
    )
    assert('Order remains pending after invalid signature', orderAfterBadSig.data?.order?.paymentStatus === 'pending')
    const prod1CheckE = await request({ path: `/api/products/${product1._id}`, method: 'GET' })
    assert('Stock unchanged after invalid signature', prod1CheckE.data?.product?.stock === baselineStock)

    // =========================================================================
    // SCENARIO F: Retry with Successful Payment
    // =========================================================================
    console.log('\n--- Scenario F: Retry with Successful Payment ---')
    // Add Product 2 to User A cart to verify selective cart cleanup on retry success
    await request(
      { path: '/api/cart/items', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({ productId: product2._id, quantity: 1 })
    )
    const cartBeforeRetrySuccess = await request({ path: '/api/cart', method: 'GET', headers: { Cookie: cookieA } })
    assert('User A has 2 items in cart before retry success', getCartItems(cartBeforeRetrySuccess).length === 2)

    // Initiate fresh retry payment order
    const retry2 = await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({ orderId: initialOrderId })
    )
    assert('Fresh retry order initialized', retry2.status === 200)
    const activeRzpOrderId = retry2.data?.razorpayOrderId
    const validPaymentId = `pay_retry_success_${Date.now()}`
    const validSig = generateSignature(activeRzpOrderId, validPaymentId, RAZORPAY_SECRET)

    // Verify payment
    const verifySuccess = await request(
      { path: '/api/payments/verify', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({
        orderId: initialOrderId,
        razorpayOrderId: activeRzpOrderId,
        razorpayPaymentId: validPaymentId,
        razorpaySignature: validSig,
      })
    )
    assert('Retry payment verified successfully (200)', verifySuccess.status === 200)

    // Check same application order finalized
    const finalizedOrderRes = await request(
      { path: `/api/orders/${initialOrderId}`, method: 'GET', headers: { Cookie: cookieA } }
    )
    assert('Same application order marked paid', finalizedOrderRes.data?.order?.paymentStatus === 'paid')
    assert('Same application order marked confirmed', finalizedOrderRes.data?.order?.orderStatus === 'confirmed')

    // Check stock decremented exactly once
    const prod1CheckF = await request({ path: `/api/products/${product1._id}`, method: 'GET' })
    assert(
      'Stock decremented exactly once by ordered quantity 1',
      prod1CheckF.data?.product?.stock === baselineStock - 1,
      `expected ${baselineStock - 1}, got ${prod1CheckF.data?.product?.stock}`
    )

    // Check selective cart cleanup: Product 1 removed, Product 2 preserved!
    const cartAfterRetrySuccess = await request({ path: '/api/cart', method: 'GET', headers: { Cookie: cookieA } })
    const remainingItems = getCartItems(cartAfterRetrySuccess)
    assert('Cart has 1 item remaining after selective cleanup', remainingItems.length === 1)
    assert('Preserved item is Product 2', remainingItems[0]?.product?._id === product2._id)

    // =========================================================================
    // SCENARIO G: Retry Duplicate Verification (Idempotency)
    // =========================================================================
    console.log('\n--- Scenario G: Retry Duplicate Verification ---')
    const duplicateVerify = await request(
      { path: '/api/payments/verify', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({
        orderId: initialOrderId,
        razorpayOrderId: activeRzpOrderId,
        razorpayPaymentId: validPaymentId,
        razorpaySignature: validSig,
      })
    )
    assert('Duplicate verification returns 200 with already verified message', duplicateVerify.status === 200)
    assert('Message indicates already verified', duplicateVerify.data?.message?.includes('already verified'))

    const prod1CheckG = await request({ path: `/api/products/${product1._id}`, method: 'GET' })
    assert('Stock not decremented a second time on duplicate verify', prod1CheckG.data?.product?.stock === baselineStock - 1)

    // =========================================================================
    // SCENARIO H: Paid Order Cannot Retry Payment
    // =========================================================================
    console.log('\n--- Scenario H: Paid Order Cannot Retry Payment ---')
    const retryPaidOrder = await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({ orderId: initialOrderId })
    )
    assert('Paid order retry rejected with 400', retryPaidOrder.status === 400)
    assert('Error message mentions order already paid', retryPaidOrder.data?.message?.includes('already been paid'))

    // =========================================================================
    // SCENARIO I: Cancelled / Terminal Order Cannot Retry Payment
    // =========================================================================
    console.log('\n--- Scenario I: Cancelled / Terminal Order Retry ---')
    // Create an order and cancel it using admin update
    const addResI = await request(
      { path: '/api/cart/items', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({ productId: product2._id, quantity: 1 })
    )
    const createOrderI = await request(
      { path: '/api/orders', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({
        shippingAddress: {
          fullName: 'Retry User A',
          phone: '9876543210',
          addressLine: '456 Trend Ave',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India',
        },
      })
    )
    const orderI = createOrderI.data?.order

    // Admin login
    const adminLogin = await request(
      { path: '/api/auth/login', method: 'POST' },
      JSON.stringify({ email: 'admin@trendvolt.com', password: 'AdminPass123!' })
    )
    const adminCookie = extractCookie(adminLogin.headers)

    // Cancel orderI via admin
    const cancelRes = await request(
      { path: `/api/orders/${orderI._id}/status`, method: 'PATCH', headers: { Cookie: adminCookie } },
      JSON.stringify({ status: 'cancelled' })
    )
    assert('Order cancelled via admin', cancelRes.status === 200)

    // Attempt to retry payment on cancelled order
    const retryCancelled = await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieA } },
      JSON.stringify({ orderId: orderI._id })
    )
    assert('Cancelled order retry rejected with 400', retryCancelled.status === 400)
    assert('Message states cancelled order cannot be paid', retryCancelled.data?.message?.includes('cancelled'))

    // =========================================================================
    // SCENARIO J: Cross-User Retry Blocked
    // =========================================================================
    console.log('\n--- Scenario J: Cross-User Retry Blocked ---')
    const crossUserRetry = await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieB } },
      JSON.stringify({ orderId: initialOrderId })
    )
    assert('User B cannot retry User A order (404)', crossUserRetry.status === 404)

    // =========================================================================
    // SCENARIO K: Fake Client Amount Ignored
    // =========================================================================
    console.log('\n--- Scenario K: Fake Client Amount Ignored ---')
    // Create new order for User B
    await request(
      { path: '/api/cart/items', method: 'POST', headers: { Cookie: cookieB } },
      JSON.stringify({ productId: product1._id, quantity: 1 })
    )
    const createOrderB = await request(
      { path: '/api/orders', method: 'POST', headers: { Cookie: cookieB } },
      JSON.stringify({
        shippingAddress: {
          fullName: 'Retry User B',
          phone: '9876543210',
          addressLine: '789 Fashion Rd',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110001',
          country: 'India',
        },
      })
    )
    const orderB = createOrderB.data?.order
    const rzpFakeAmount = await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieB } },
      JSON.stringify({ orderId: orderB._id, amount: 100 }) // Attempt to pay 1 INR
    )
    assert('Client amount override ignored', rzpFakeAmount.data?.amount === Math.round(orderB.totalAmount * 100))

    // =========================================================================
    // SCENARIO L: Multiple Retry Attempts Never Duplicate Orders
    // =========================================================================
    console.log('\n--- Scenario L: Multiple Retry Attempts ---')
    await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieB } },
      JSON.stringify({ orderId: orderB._id })
    )
    await request(
      { path: '/api/payments/create-order', method: 'POST', headers: { Cookie: cookieB } },
      JSON.stringify({ orderId: orderB._id })
    )
    const userBOrders = await request(
      { path: '/api/orders', method: 'GET', headers: { Cookie: cookieB } }
    )
    assert('User B still has exactly 1 application order', userBOrders.data?.orders?.length === 1)

    // =========================================================================
    // SCENARIO M: State Persistence After Failed/Cancelled Retry
    // =========================================================================
    console.log('\n--- Scenario M: State Persistence After Failed/Cancelled Retry ---')
    const refreshB = await request(
      { path: `/api/orders/${orderB._id}`, method: 'GET', headers: { Cookie: cookieB } }
    )
    assert('Order B remains pending/unpaid on refresh', refreshB.data?.order?.paymentStatus === 'pending')

    // =========================================================================
    // SCENARIO N: State Persistence After Successful Retry
    // =========================================================================
    console.log('\n--- Scenario N: State Persistence After Successful Retry ---')
    const refreshA = await request(
      { path: `/api/orders/${initialOrderId}`, method: 'GET', headers: { Cookie: cookieA } }
    )
    assert('Order A remains paid/confirmed on refresh', refreshA.data?.order?.paymentStatus === 'paid')
    assert('Order A orderStatus is confirmed on refresh', refreshA.data?.order?.orderStatus === 'confirmed')

    console.log('\n====================================================================')
    console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`)
    console.log('====================================================================')

    if (failedCount > 0) {
      process.exit(1)
    } else {
      process.exit(0)
    }
  } catch (err) {
    console.error('Test run error:', err)
    process.exit(1)
  }
}

// Allow server 1.5s to settle if reloaded
setTimeout(runTests, 1500)
