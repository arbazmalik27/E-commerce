/**
 * Password Reset Email Delivery Service Boundary
 * Ready for future SMTP / SendGrid / AWS SES / n8n integration.
 */
const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  // Check if an email provider or webhook is configured
  if (process.env.EMAIL_SERVICE_ENABLED === 'true') {
    // Future email provider dispatch
    return { delivered: true }
  }

  // In development / testing without third-party email provider configured,
  // do not invent fake sending or leak tokens in production.
  return { delivered: false, note: 'Email provider not configured' }
}

module.exports = { sendPasswordResetEmail }
