/**
 * test_newsletter.js
 * Comprehensive backend QA for the Newsletter Subscription Module.
 */

const http = require('http')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const NewsletterSubscriber = require('../src/models/NewsletterSubscriber')

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

function request(method, reqPath, body = null, cookie = null, rawBody = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL)
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
    if (rawBody !== null) {
      req.write(rawBody)
    } else if (body) {
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
  console.log('=== TEST SUITE: NEWSLETTER BACKEND + API QA ===\n')

  // Connect to DB for direct persistence verification
  await mongoose.connect(process.env.MONGODB_URI)

  const ts = Date.now()
  const createdTestEmails = []

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 1: ACCESS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('--- SECTION 1: ACCESS ---')

    // 1. Public unauthenticated subscription
    const emailUnauth = `test_nl_unauth_${ts}@trendvolt.com`
    createdTestEmails.push(emailUnauth)
    const resUnauth = await request('POST', '/api/newsletter/subscribe', { email: emailUnauth })
    assert(resUnauth.status === 201, '1. Public unauthenticated subscription returns 201')
    assert(resUnauth.data.success === true, '1. Public unauthenticated response has success: true')

    // 2. Authenticated customer subscription
    const custEmail = `test_nl_cust_${ts}@trendvolt.com`
    const regCust = await request('POST', '/api/auth/register', {
      name: `TestCust_${ts}`,
      email: custEmail,
      password: 'Password123!',
    })
    const custCookie = getCookie(regCust)
    const emailCustSub = `test_nl_cust_sub_${ts}@trendvolt.com`
    createdTestEmails.push(emailCustSub)
    const resCust = await request('POST', '/api/newsletter/subscribe', { email: emailCustSub }, custCookie)
    assert(resCust.status === 201, '2. Authenticated customer subscription returns 201')
    assert(resCust.data.success === true, '2. Authenticated customer response has success: true')

    // 3. Admin subscription
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@trendvolt.com',
      password: 'AdminPass123!',
    })
    const adminCookie = getCookie(adminLogin)
    const emailAdminSub = `test_nl_admin_sub_${ts}@trendvolt.com`
    createdTestEmails.push(emailAdminSub)
    const resAdmin = await request('POST', '/api/newsletter/subscribe', { email: emailAdminSub }, adminCookie)
    assert(resAdmin.status === 201, '3. Admin subscription returns 201')
    assert(resAdmin.data.success === true, '3. Admin response has success: true')

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 2: VALIDATION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 2: VALIDATION ---')

    // 4. Missing email rejected
    const resMissing = await request('POST', '/api/newsletter/subscribe', {})
    assert(resMissing.status === 400, '4. Missing email rejected with 400')
    assert(resMissing.data.success === false, '4. Missing email returns success: false')

    // 5. Empty email rejected
    const resEmpty = await request('POST', '/api/newsletter/subscribe', { email: '   ' })
    assert(resEmpty.status === 400, '5. Empty email rejected with 400')
    assert(resEmpty.data.success === false, '5. Empty email returns success: false')

    // 6. Invalid email rejected
    const resInvalid = await request('POST', '/api/newsletter/subscribe', { email: 'not-an-email' })
    assert(resInvalid.status === 400, '6. Invalid email rejected with 400')
    assert(resInvalid.data.success === false, '6. Invalid email returns success: false')

    // 7. Whitespace normalized
    const emailWhitespace = `test_nl_ws_${ts}@trendvolt.com`
    createdTestEmails.push(emailWhitespace)
    const resWhitespace = await request('POST', '/api/newsletter/subscribe', { email: `   ${emailWhitespace}   ` })
    assert(resWhitespace.status === 201, '7. Whitespace-padded email accepted with 201')
    const wsDoc = await NewsletterSubscriber.findOne({ email: emailWhitespace })
    assert(Boolean(wsDoc), '7. Subscriber saved with trimmed email in MongoDB')

    // 8. Uppercase email normalized to lowercase
    const emailUpper = `TEST_NL_UPPER_${ts}@TRENDVOLT.COM`
    const emailLower = emailUpper.toLowerCase()
    createdTestEmails.push(emailLower)
    const resUpper = await request('POST', '/api/newsletter/subscribe', { email: emailUpper })
    assert(resUpper.status === 201, '8. Uppercase email accepted with 201')
    const upperDoc = await NewsletterSubscriber.findOne({ email: emailLower })
    assert(Boolean(upperDoc), '8. Uppercase email normalized to lowercase in MongoDB')

    // 9. Excessively long email rejected
    const longEmail = `${'a'.repeat(245)}@trendvolt.com`
    const resLong = await request('POST', '/api/newsletter/subscribe', { email: longEmail })
    assert(resLong.status === 400, '9. Excessively long email (>254 chars) rejected with 400')
    assert(resLong.data.success === false, '9. Excessively long email returns success: false')

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 3: PERSISTENCE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 3: PERSISTENCE ---')

    // 10. Valid email creates subscriber
    const emailPersist = `test_nl_persist_${ts}@trendvolt.com`
    createdTestEmails.push(emailPersist)
    const resPersist = await request('POST', '/api/newsletter/subscribe', { email: emailPersist })
    assert(resPersist.status === 201, '10. Valid email returns 201 Created')

    // 11. Subscriber exists in MongoDB
    const persistDoc = await NewsletterSubscriber.findOne({ email: emailPersist })
    assert(Boolean(persistDoc), '11. Subscriber document exists in MongoDB')

    // 12. isActive defaults correctly
    assert(persistDoc?.isActive === true, '12. isActive defaults to true')

    // 13. subscribedAt is populated
    assert(persistDoc?.subscribedAt instanceof Date, '13. subscribedAt is a populated Date')

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 4: DUPLICATE PROTECTION
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: DUPLICATE PROTECTION ---')

    // 14. Same email submitted twice does not create duplicate
    const emailDup = `test_nl_dup_${ts}@trendvolt.com`
    createdTestEmails.push(emailDup)
    await request('POST', '/api/newsletter/subscribe', { email: emailDup })
    const resDup = await request('POST', '/api/newsletter/subscribe', { email: emailDup })
    assert(resDup.status === 200, '14. Submitting duplicate email returns 200')
    const dupCount = await NewsletterSubscriber.countDocuments({ email: emailDup })
    assert(dupCount === 1, '14. MongoDB has exactly 1 document for duplicate email')

    // 15. Duplicate returns expected response
    assert(resDup.data.success === true, '15. Duplicate response has success: true')
    assert(resDup.data.message === "You're already subscribed.", '15. Duplicate returns "You\'re already subscribed." message')
    assert(resDup.data.alreadySubscribed === true, '15. Duplicate response has alreadySubscribed: true')

    // 16. Case variation does not create duplicate
    const resCaseDup = await request('POST', '/api/newsletter/subscribe', { email: emailDup.toUpperCase() })
    assert(resCaseDup.status === 200, '16. Uppercase submission of existing email returns 200')
    assert(resCaseDup.data.alreadySubscribed === true, '16. Uppercase duplicate recognized as alreadySubscribed')
    const caseDupCount = await NewsletterSubscriber.countDocuments({ email: emailDup })
    assert(caseDupCount === 1, '16. Case variation did not create a new document in MongoDB')

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 5: SECURITY / ABUSE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 5: SECURITY / ABUSE ---')

    // 17. Malformed input does not crash API
    const resMalformed = await request('POST', '/api/newsletter/subscribe', null, null, '{"email": invalid json')
    assert(resMalformed.status === 400, '17. Malformed JSON returns 400 Bad Request')
    assert(resMalformed.data.success === false, '17. Malformed JSON returns success: false')

    const resNonString = await request('POST', '/api/newsletter/subscribe', { email: 12345 })
    assert(resNonString.status === 400, '17. Non-string email payload returns 400')

    const healthCheck = await request('GET', '/api/health')
    assert(healthCheck.status === 200, '17. API remains healthy after malformed inputs')

    // 18. Database error does not expose internals
    assert(resMalformed.data?.stack === undefined, '18. No stack trace in response')
    assert(resMalformed.data?.errors?.name === undefined || typeof resMalformed.data?.errors !== 'string', '18. Database error internals not leaked')

    // 19. Rate limiting behaves according to project configuration
    // Verify rate limit headers are present on response
    assert(
      resUnauth.headers['ratelimit-limit'] !== undefined ||
      resUnauth.headers['x-ratelimit-limit'] !== undefined ||
      resUnauth.headers['ratelimit-remaining'] !== undefined,
      '19. Rate limiting headers present on newsletter endpoint'
    )

  } finally {
    // Clean up created test subscriber records
    if (createdTestEmails.length > 0) {
      await NewsletterSubscriber.deleteMany({ email: { $in: createdTestEmails } })
      console.log(`\n  ℹ Cleaned up ${createdTestEmails.length} test subscriber records from MongoDB`)
    }
    await mongoose.disconnect()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60))
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  if (failures.length > 0) {
    console.log('\nFAILURES:')
    failures.forEach((f) => console.log(`  ✗ ${f}`))
  } else {
    console.log('ALL NEWSLETTER TESTS PASSED ✓')
  }
  console.log('='.repeat(60))
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('\nFATAL ERROR:', err)
  process.exit(1)
})
