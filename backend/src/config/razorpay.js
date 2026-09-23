const Razorpay = require('razorpay')

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials not configured')
  }

  return new Razorpay({
    key_id,
    key_secret,
  })
}

module.exports = { getRazorpayInstance }
