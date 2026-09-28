const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
require('dotenv').config()

const User = require('../src/models/User')
const {
  sendPasswordResetEmail,
  setResendClient,
} = require('../src/services/emailService')

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

async function runTests() {
  console.log('=== TEST SUITE: PASSWORD RESET RESEND EMAIL SERVICE ===\n')

  await mongoose.connect(process.env.MONGODB_URI)

  // ----------------------------------------------------
  // Test 1: Disabled Email Service Behavior
  // ----------------------------------------------------
  console.log('[1] Disabled Email Service Behavior:')
  const prevEnabled = process.env.EMAIL_SERVICE_ENABLED
  process.env.EMAIL_SERVICE_ENABLED = 'false'
  setResendClient(null)

  const disabledResult = await sendPasswordResetEmail({
    to: 'customer@trendvolt.com',
    resetUrl: 'http://localhost:5173/reset-password?token=dummy_test_token',
  })

  assert(disabledResult.delivered === false, 'Service returns delivered: false when EMAIL_SERVICE_ENABLED is false')
  assert(disabledResult.note === 'Email service is disabled', 'Service returns safe note when disabled')

  // ----------------------------------------------------
  // Test 2: Missing Resend API Key Handling
  // ----------------------------------------------------
  console.log('\n[2] Missing Resend API Key Handling:')
  process.env.EMAIL_SERVICE_ENABLED = 'true'
  const prevApiKey = process.env.RESEND_API_KEY
  delete process.env.RESEND_API_KEY
  setResendClient(null)

  let configErrorThrown = false
  let configErrorMessage = ''
  try {
    await sendPasswordResetEmail({
      to: 'customer@trendvolt.com',
      resetUrl: 'http://localhost:5173/reset-password?token=dummy_test_token',
    })
  } catch (err) {
    configErrorThrown = true
    configErrorMessage = err.message
  }

  assert(configErrorThrown === true, 'Throws error when RESEND_API_KEY is not configured')
  assert(configErrorMessage.includes('Resend API key is not configured'), 'Error message is safe and descriptive')
  assert(!configErrorMessage.includes('re_') && !configErrorMessage.includes('password'), 'Error message does not leak secret values')

  // ----------------------------------------------------
  // Test 3: Enabled Email Service with Mocked Resend Client
  // ----------------------------------------------------
  console.log('\n[3] Enabled Email Service with Mocked Resend Client:')
  process.env.EMAIL_SERVICE_ENABLED = 'true'
  process.env.EMAIL_FROM = 'TrendVolt Security <security@trendvolt.com>'

  let sentPayload = null
  const mockResend = {
    emails: {
      send: async (payload) => {
        sentPayload = payload
        return {
          data: { id: 'msg_resend_mock_12345' },
          error: null,
        }
      },
    },
  }
  setResendClient(mockResend)

  const testResetUrl = 'http://localhost:5173/reset-password?token=mock_resend_token_xyz789'
  const successResult = await sendPasswordResetEmail({
    to: 'customer@trendvolt.com',
    resetUrl: testResetUrl,
  })

  assert(successResult.delivered === true, 'Service reports delivered: true on successful send')
  assert(successResult.id === 'msg_resend_mock_12345', 'Resend message ID is returned')
  assert(sentPayload !== null, 'Resend emails.send was invoked')
  assert(Array.isArray(sentPayload.to) && sentPayload.to.includes('customer@trendvolt.com'), 'Recipient email matches target in array')
  assert(sentPayload.from === 'TrendVolt Security <security@trendvolt.com>', 'From header uses configured EMAIL_FROM')
  assert(sentPayload.subject.includes('Reset Your TrendVolt Password'), 'Subject line is correctly formatted')

  // Template integrity checks
  assert(sentPayload.html.includes('TRENDVOLT'), 'HTML template contains TrendVolt branding')
  assert(sentPayload.html.includes('15 minutes'), 'HTML template specifies 15 minutes expiry')
  assert(sentPayload.html.includes('Reset Password'), 'HTML template has Reset Password CTA')
  assert(sentPayload.html.includes(testResetUrl), 'HTML template includes reset URL')
  assert(sentPayload.html.includes('Security Notice'), 'HTML template includes security notice')
  assert(sentPayload.text.includes('TRENDVOLT'), 'Plain text contains TrendVolt branding')
  assert(sentPayload.text.includes('15 minutes'), 'Plain text specifies 15 minutes expiry')
  assert(sentPayload.text.includes(testResetUrl), 'Plain text includes reset URL')
  assert(sentPayload.text.includes('SECURITY NOTICE'), 'Plain text includes security notice')

  // ----------------------------------------------------
  // Test 4: End-to-End Forgot & Reset Password Flow
  // ----------------------------------------------------
  console.log('\n[4] End-to-End Forgot & Reset Password Flow:')

  const testEmail = `resend_test_user_${Date.now()}@example.com`
  const initialPassword = 'InitialSecurePassword123!'
  const newPassword = 'NewSecurePassword456!'

  // Create test user
  const hashedPassword = await bcrypt.hash(initialPassword, 12)
  const testUser = await User.create({
    name: 'Resend Test User',
    email: testEmail,
    password: hashedPassword,
  })

  // Capture email sent via mock
  let capturedResetUrl = null
  setResendClient({
    emails: {
      send: async (payload) => {
        const match = payload.text.match(/http:\/\/localhost:5173\/reset-password\?token=([a-f0-9]+)/)
        if (match) {
          capturedResetUrl = match[0]
        }
        return { data: { id: 'msg_e2e_resend_mock' }, error: null }
      },
    },
  })

  const { forgotPassword, resetPassword } = require('../src/controllers/authController')

  let forgotResponseStatus = null
  let forgotResponseBody = null
  const mockReq = { body: { email: testEmail } }
  const mockRes = {
    status: (code) => {
      forgotResponseStatus = code
      return {
        json: (data) => {
          forgotResponseBody = data
          return data
        },
      }
    },
  }

  await forgotPassword(mockReq, mockRes)

  assert(forgotResponseStatus === 200, 'forgotPassword returns HTTP 200')
  assert(forgotResponseBody.success === true, 'forgotPassword response has success: true')
  assert(forgotResponseBody.token === undefined, 'Reset token is NEVER returned in response body')
  assert(capturedResetUrl !== null, 'Reset URL was sent through the Resend client')

  // Verify token was hashed in DB
  const userInDb = await User.findById(testUser._id).select('+passwordResetToken +passwordResetExpires')
  assert(userInDb.passwordResetToken !== undefined, 'User record has passwordResetToken saved')
  assert(userInDb.passwordResetExpires > Date.now(), 'Token expiry is in the future')

  // Extract token from reset URL
  const tokenMatch = capturedResetUrl.match(/token=([a-f0-9]+)/)
  const rawToken = tokenMatch[1]

  // Execute reset password with valid token
  let resetResponseStatus = null
  let resetResponseBody = null
  const resetReq = {
    body: {
      token: rawToken,
      password: newPassword,
    },
  }
  const resetRes = {
    status: (code) => {
      resetResponseStatus = code
      return {
        json: (data) => {
          resetResponseBody = data
          return data
        },
      }
    },
    clearCookie: () => {},
  }

  await resetPassword(resetReq, resetRes)

  assert(resetResponseStatus === 200, 'resetPassword returns HTTP 200')
  assert(resetResponseBody.success === true, 'resetPassword response has success: true')

  // Verify single-use token consumed
  const userAfterReset = await User.findById(testUser._id).select('+password +passwordResetToken +passwordResetExpires')
  assert(userAfterReset.passwordResetToken === undefined, 'passwordResetToken is cleared after use (single-use)')
  assert(userAfterReset.passwordResetExpires === undefined, 'passwordResetExpires is cleared after use')

  // Verify password actually changed
  const isNewPasswordMatch = await bcrypt.compare(newPassword, userAfterReset.password)
  assert(isNewPasswordMatch === true, 'New password hash matches in database')

  // Attempting to reuse same token fails
  let reuseStatus = null
  let reuseBody = null
  const reuseRes = {
    status: (code) => {
      reuseStatus = code
      return {
        json: (data) => {
          reuseBody = data
          return data
        },
      }
    },
    clearCookie: () => {},
  }
  await resetPassword(resetReq, reuseRes)
  assert(reuseStatus === 400, 'Token reuse rejected with HTTP 400')
  assert(reuseBody.success === false, 'Token reuse returns success: false')

  // ----------------------------------------------------
  // Test 5: Rollback On Resend Delivery Error
  // ----------------------------------------------------
  console.log('\n[5] Token Rollback on Resend Delivery Error:')
  setResendClient({
    emails: {
      send: async () => {
        return {
          data: null,
          error: { message: 'Domain not verified on Resend' },
        }
      },
    },
  })

  let failedSendResponseStatus = null
  let failedSendResponseBody = null
  const failedSendRes = {
    status: (code) => {
      failedSendResponseStatus = code
      return {
        json: (data) => {
          failedSendResponseBody = data
          return data
        },
      }
    },
  }

  await forgotPassword(mockReq, failedSendRes)

  // Anti-user enumeration: user receives generic 200 message
  assert(failedSendResponseStatus === 200, 'Returns HTTP 200 to protect against user enumeration')
  assert(failedSendResponseBody.success === true, 'Returns success: true')

  // But the database token was rolled back so no undelivered token remains pending
  const userAfterFailedSend = await User.findById(testUser._id).select('+passwordResetToken +passwordResetExpires')
  assert(userAfterFailedSend.passwordResetToken === undefined, 'passwordResetToken is rolled back when Resend delivery fails')
  assert(userAfterFailedSend.passwordResetExpires === undefined, 'passwordResetExpires is rolled back when Resend delivery fails')

  // Clean up test user
  await User.findByIdAndDelete(testUser._id)

  // Restore env
  process.env.EMAIL_SERVICE_ENABLED = prevEnabled || 'false'
  if (prevApiKey) process.env.RESEND_API_KEY = prevApiKey
  setResendClient(null)

  await mongoose.disconnect()

  console.log(`\n============================================================`)
  console.log(`RESULTS: ${passed} passed, ${failed} failed`)
  console.log(`============================================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
