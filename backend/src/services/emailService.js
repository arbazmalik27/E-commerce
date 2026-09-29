const { Resend } = require('resend')

let customResendClient = null

/**
 * Allows test suites to inject a mocked Resend client
 */
const setResendClient = (client) => {
  customResendClient = client
}

const getResendClient = () => {
  if (customResendClient) {
    return customResendClient
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('Resend API key is not configured')
  }

  return new Resend(apiKey.trim())
}

const generateHtmlTemplate = (resetUrl) => {
  const currentYear = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password — TrendVolt</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1A1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E8E2D9; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <!-- Header -->
          <tr>
            <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid #F0ECE4;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 26px; font-weight: 600; letter-spacing: 0.05em; color: #1A1A1A;">
                TRENDVOLT
              </h1>
              <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #7A7A7A;">
                Modern Fashion &amp; Luxury
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 40px 28px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1A1A1A;">
                Password Reset Request
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
                We received a request to reset the password for your TrendVolt account. Click the button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: #34452F;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 4px; letter-spacing: 0.03em;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 8px; font-size: 12px; color: #7A7A7A; line-height: 1.5;">
                This link will expire in <strong>15 minutes</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; color: #7A7A7A; line-height: 1.5;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #34452F; word-break: break-all;">${resetUrl}</a>
              </p>

              <hr style="border: none; border-top: 1px solid #F0ECE4; margin: 24px 0;">

              <p style="margin: 0; font-size: 12px; color: #8A8A8A; line-height: 1.5;">
                <strong>Security Notice:</strong> If you did not request a password reset, no further action is required. Your account remains secure and your password has not been changed.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #FAF7F2; text-align: center; border-top: 1px solid #F0ECE4;">
              <p style="margin: 0; font-size: 11px; color: #9A9A9A;">
                &copy; ${currentYear} TrendVolt. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const generatePlainText = (resetUrl) => {
  const currentYear = new Date().getFullYear()

  return `TRENDVOLT — PASSWORD RESET REQUEST

We received a request to reset the password for your TrendVolt account.

Use the link below to choose a new password:
${resetUrl}

This link will expire in 15 minutes.

SECURITY NOTICE:
If you did not request this password reset, no further action is required. Your account remains secure and your password has not been changed.

© ${currentYear} TrendVolt. All rights reserved.`
}

/**
 * Send password reset email via Resend API.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.resetUrl - Full reset link URL
 * @returns {Promise<{delivered: boolean, id?: string, note?: string}>}
 */
const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  if (process.env.EMAIL_SERVICE_ENABLED !== 'true') {
    return { delivered: false, note: 'Email service is disabled' }
  }

  const resend = getResendClient()
  const fromAddress = process.env.EMAIL_FROM || 'TrendVolt <onboarding@resend.dev>'

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [to],
    subject: 'Reset Your TrendVolt Password',
    text: generatePlainText(resetUrl),
    html: generateHtmlTemplate(resetUrl),
  })

  if (error) {
    throw new Error(`Resend email delivery failed: ${error.message || 'Unknown error'}`)
  }

  return { delivered: true, id: data?.id }
}

/**
 * Send back-in-stock notification email via Resend API.
 * @param {Object} options
 * @param {string} options.to - Recipient customer email
 * @param {string} options.productName - Product title
 * @param {string|null} [options.size] - Specific size replenished
 * @param {string} options.productUrl - Storefront URL to purchase item
 * @returns {Promise<{delivered: boolean, id?: string, note?: string}>}
 */
const sendBackInStockEmail = async ({ to, productName, size, productUrl }) => {
  if (process.env.EMAIL_SERVICE_ENABLED !== 'true') {
    return { delivered: false, note: 'Email service is disabled' }
  }

  const resend = getResendClient()
  const fromAddress = process.env.EMAIL_FROM || 'TrendVolt <onboarding@resend.dev>'
  const sizeText = size ? ` in Size ${size}` : ''
  const subject = `Back in Stock: ${productName}${sizeText}`
  const currentYear = new Date().getFullYear()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1A1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E8E2D9; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid #F0ECE4;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 26px; font-weight: 600; letter-spacing: 0.05em; color: #1A1A1A;">
                TRENDVOLT
              </h1>
              <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #7A7A7A;">
                Modern Fashion &amp; Luxury
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 40px 28px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1A1A1A;">
                Good News — It's Back in Stock
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #4A4A4A;">
                You asked us to let you know when <strong>${productName}</strong>${sizeText} returned to stock. It is available right now on TrendVolt.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: #34452F;">
                    <a href="${productUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 4px; letter-spacing: 0.03em;">
                      Shop Now
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 8px; font-size: 12px; color: #7A7A7A; line-height: 1.5;">
                Items sell out quickly. Secure yours while supplies last.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #FAF7F2; text-align: center; border-top: 1px solid #F0ECE4;">
              <p style="margin: 0; font-size: 11px; color: #9A9A9A;">
                &copy; ${currentYear} TrendVolt. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `TRENDVOLT — BACK IN STOCK

Good news: ${productName}${sizeText} is now back in stock!

View and shop now:
${productUrl}

© ${currentYear} TrendVolt. All rights reserved.`

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [to],
    subject,
    text,
    html,
  })

  if (error) {
    throw new Error(`Resend email delivery failed: ${error.message || 'Unknown error'}`)
  }

  return { delivered: true, id: data?.id }
}

module.exports = {
  sendPasswordResetEmail,
  sendBackInStockEmail,
  setResendClient,
}
