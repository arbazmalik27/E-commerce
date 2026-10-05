const assert = require('assert')
const { validateEnv } = require('../src/config/envValidator')
const { COOKIE_NAME, signToken, setTokenCookie, clearTokenCookie } = require('../src/utils/jwt')

console.log('=== TEST SUITE: PRODUCTION ENVIRONMENT & CONFIGURATION SAFETY ===\n')

let passed = 0
function test(desc, fn) {
  try {
    fn()
    console.log(`  ✓ PASS: ${desc}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`, err)
    process.exit(1)
  }
}

// Preserve original env
const origEnv = { ...process.env }

function resetEnv() {
  process.env = { ...origEnv }
}

// 1. Development Environment Safety
test('Development validation passes with standard dev configuration', () => {
  resetEnv()
  process.env.NODE_ENV = 'development'
  process.env.MONGODB_URI = 'mongodb://localhost:27017/trendvolt'
  process.env.JWT_SECRET = 'dev_secret_for_local_testing'
  process.env.CLIENT_URL = 'http://localhost:5173'

  const res = validateEnv({ isProduction: false, throwOnError: false })
  assert.strictEqual(res.valid, true)
  assert.strictEqual(res.errors.length, 0)
})

// 2. Production - Missing MONGODB_URI
test('Production rejects missing MONGODB_URI', () => {
  resetEnv()
  delete process.env.MONGODB_URI
  process.env.JWT_SECRET = 'a_very_long_cryptographically_secure_random_jwt_secret_12345'
  process.env.CLIENT_URL = 'https://trendvolt.vercel.app'

  const res = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('MONGODB_URI is required')))
})

// 3. Production - Malformed MONGODB_URI
test('Production rejects malformed MONGODB_URI protocol', () => {
  resetEnv()
  process.env.MONGODB_URI = 'postgres://user:pass@localhost:5432/db'
  process.env.JWT_SECRET = 'a_very_long_cryptographically_secure_random_jwt_secret_12345'
  process.env.CLIENT_URL = 'https://trendvolt.vercel.app'

  const res = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('must start with "mongodb://" or "mongodb+srv://"')))
})

// 4. Production - Missing JWT_SECRET
test('Production rejects missing JWT_SECRET', () => {
  resetEnv()
  process.env.MONGODB_URI = 'mongodb+srv://cluster.example.com/trendvolt'
  delete process.env.JWT_SECRET
  process.env.CLIENT_URL = 'https://trendvolt.vercel.app'

  const res = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('JWT_SECRET is required')))
})

// 5. Production - Default Development JWT_SECRET Placeholder
test('Production rejects default placeholder dev_jwt_secret_replace_in_production', () => {
  resetEnv()
  process.env.MONGODB_URI = 'mongodb+srv://cluster.example.com/trendvolt'
  process.env.JWT_SECRET = 'dev_jwt_secret_replace_in_production'
  process.env.CLIENT_URL = 'https://trendvolt.vercel.app'

  const res = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('cannot use an insecure development placeholder')))
})

// 6. Production - Short JWT_SECRET
test('Production rejects weak/short JWT_SECRET (< 32 characters)', () => {
  resetEnv()
  process.env.MONGODB_URI = 'mongodb+srv://cluster.example.com/trendvolt'
  process.env.JWT_SECRET = 'short_secret_only_19ch'
  process.env.CLIENT_URL = 'https://trendvolt.vercel.app'

  const res = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('must be at least 32 characters long')))
})

// 7. Production - Missing CLIENT_URL
test('Production rejects missing CLIENT_URL', () => {
  resetEnv()
  process.env.MONGODB_URI = 'mongodb+srv://cluster.example.com/trendvolt'
  process.env.JWT_SECRET = 'a_very_long_cryptographically_secure_random_jwt_secret_12345'
  delete process.env.CLIENT_URL

  const res = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('CLIENT_URL is required in production')))
})

// 8. Production - Invalid CLIENT_URL scheme
test('Production rejects invalid CLIENT_URL scheme', () => {
  resetEnv()
  process.env.MONGODB_URI = 'mongodb+srv://cluster.example.com/trendvolt'
  process.env.JWT_SECRET = 'a_very_long_cryptographically_secure_random_jwt_secret_12345'
  process.env.CLIENT_URL = 'ftp://invalid-domain.com'

  const res = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(res.valid, false)
  assert.ok(res.errors.some((e) => e.includes('contains an invalid origin')))
})

// 9. Conditional Resend Key Enforcement
test('Enforces RESEND_API_KEY only when EMAIL_SERVICE_ENABLED is "true"', () => {
  resetEnv()
  process.env.MONGODB_URI = 'mongodb+srv://cluster.example.com/trendvolt'
  process.env.JWT_SECRET = 'a_very_long_cryptographically_secure_random_jwt_secret_12345'
  process.env.CLIENT_URL = 'https://trendvolt.vercel.app'
  process.env.EMAIL_SERVICE_ENABLED = 'true'
  delete process.env.RESEND_API_KEY

  const resDisabled = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(resDisabled.valid, false)
  assert.ok(resDisabled.errors.some((e) => e.includes('RESEND_API_KEY is required')))

  // When disabled, succeeds without RESEND_API_KEY
  process.env.EMAIL_SERVICE_ENABLED = 'false'
  const resEnabled = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(resEnabled.valid, true)
})

// 10. Valid Production Configuration
test('Accepts fully valid production configuration', () => {
  resetEnv()
  process.env.MONGODB_URI = 'mongodb+srv://cluster.example.com/trendvolt'
  process.env.JWT_SECRET = 'a_very_long_cryptographically_secure_random_jwt_secret_12345'
  process.env.CLIENT_URL = 'https://trendvolt.vercel.app,https://trendvolt.com'
  process.env.RAZORPAY_KEY_ID = 'rzp_live_test123'
  process.env.RAZORPAY_KEY_SECRET = 'sec_live_test123'

  const res = validateEnv({ isProduction: true, throwOnError: false })
  assert.strictEqual(res.valid, true)
  assert.strictEqual(res.errors.length, 0)
})

// 11. Startup Exception Throwing
test('validateEnv throws Error when throwOnError: true on invalid production env', () => {
  resetEnv()
  delete process.env.MONGODB_URI
  delete process.env.JWT_SECRET

  assert.throws(
    () => validateEnv({ isProduction: true, throwOnError: true }),
    /CONFIGURATION ERROR: Unsafe or Missing Environment/
  )
})

// 12. Cookie Configuration
test('JWT Cookie is configured safely for development vs production', () => {
  let cookieOptions = null
  const mockRes = {
    cookie: (name, val, opts) => {
      cookieOptions = opts
    },
    clearCookie: (name, opts) => {
      cookieOptions = opts
    },
  }

  // Development
  process.env.NODE_ENV = 'development'
  delete process.env.COOKIE_SAME_SITE
  setTokenCookie(mockRes, 'test_token')
  assert.strictEqual(cookieOptions.httpOnly, true)
  assert.strictEqual(cookieOptions.secure, false)
  assert.strictEqual(cookieOptions.sameSite, 'lax')

  // Production (cross-site Vercel + Render)
  process.env.NODE_ENV = 'production'
  delete process.env.COOKIE_SAME_SITE
  setTokenCookie(mockRes, 'test_token')
  assert.strictEqual(cookieOptions.httpOnly, true)
  assert.strictEqual(cookieOptions.secure, true)
  assert.strictEqual(cookieOptions.sameSite, 'none')

  // Clear cookie in production
  clearTokenCookie(mockRes)
  assert.strictEqual(cookieOptions.httpOnly, true)
  assert.strictEqual(cookieOptions.secure, true)
  assert.strictEqual(cookieOptions.sameSite, 'none')
})

resetEnv()
console.log(`\nAll ${passed} production environment validation tests passed successfully!\n`)
