/**
 * TRENDVOLT — Production Environment Configuration Validator
 *
 * Enforces startup validation for production environments:
 * - Guarantees MONGODB_URI is provided and well-formed
 * - Guarantees JWT_SECRET is strong (not default placeholder, >= 32 chars in production)
 * - Guarantees CLIENT_URL is provided in production for CORS protection
 * - Ensures conditional services (Resend) have required keys only when enabled
 * - Fails fast with clear, human-readable startup errors in production
 * - Does not break local development or test suites
 */

const validateEnv = (options = {}) => {
  const isProduction =
    options.isProduction !== undefined
      ? options.isProduction
      : process.env.NODE_ENV === 'production'
  const isTest =
    options.isTest !== undefined
      ? options.isTest
      : process.env.NODE_ENV === 'test'

  // Skip strict validation in test runs unless explicitly requested
  if (isTest && !options.force) {
    return { valid: true, errors: [], warnings: [] }
  }

  const errors = []
  const warnings = []

  // 1. MONGODB_URI
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri || typeof mongoUri !== 'string' || mongoUri.trim() === '') {
    errors.push('MONGODB_URI is required but was not provided.')
  } else if (!/^mongodb(\+srv)?:\/\//i.test(mongoUri.trim())) {
    errors.push('MONGODB_URI must start with "mongodb://" or "mongodb+srv://".')
  }

  // 2. JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET
  const devPlaceholders = [
    'dev_jwt_secret_replace_in_production',
    'your_jwt_secret_minimum_32_characters_here',
    'secret',
    'jwt_secret',
    'changeme',
    'admin',
  ]

  if (!jwtSecret || typeof jwtSecret !== 'string' || jwtSecret.trim() === '') {
    errors.push('JWT_SECRET is required but was not provided.')
  } else if (isProduction) {
    if (devPlaceholders.includes(jwtSecret.trim().toLowerCase())) {
      errors.push('JWT_SECRET cannot use an insecure development placeholder in production.')
    } else if (jwtSecret.trim().length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long in production for cryptographic security.')
    }
  }

  // 3. CLIENT_URL (CORS & Frontend Linkages)
  const clientUrl = process.env.CLIENT_URL
  if (isProduction) {
    if (!clientUrl || typeof clientUrl !== 'string' || clientUrl.trim() === '') {
      errors.push('CLIENT_URL is required in production to configure CORS and authentication redirects.')
    } else {
      const urls = clientUrl.split(',').map((u) => u.trim())
      const invalidUrl = urls.find((u) => !/^https?:\/\//i.test(u))
      if (invalidUrl) {
        errors.push(`CLIENT_URL contains an invalid origin: "${invalidUrl}". Must start with http:// or https://.`)
      }
    }
  }

  // 4. Email Service (Conditional: only when EMAIL_SERVICE_ENABLED === 'true')
  if (process.env.EMAIL_SERVICE_ENABLED === 'true') {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey || typeof resendKey !== 'string' || resendKey.trim() === '') {
      errors.push('RESEND_API_KEY is required when EMAIL_SERVICE_ENABLED is set to "true".')
    }
  }

  // 5. Payment Gateway (Informational warning if missing in production)
  if (isProduction) {
    const razorpayKey = process.env.RAZORPAY_KEY_ID
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET
    if (!razorpayKey || !razorpaySecret) {
      warnings.push('Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not fully configured; payments will fail until set.')
    }
  }

  // Output warnings if any
  if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(`[Config Warning] ${w}`))
  }

  // Handle fatal errors
  if (errors.length > 0) {
    const errorMessage = [
      '==================================================',
      ' ❌ CONFIGURATION ERROR: Unsafe or Missing Environment',
      '==================================================',
      ...errors.map((e) => ` • ${e}`),
      '==================================================',
    ].join('\n')

    if (options.throwOnError !== false) {
      throw new Error(errorMessage)
    }

    return { valid: false, errors, warnings }
  }

  return { valid: true, errors: [], warnings }
}

module.exports = { validateEnv }
