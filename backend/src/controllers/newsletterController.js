const NewsletterSubscriber = require('../models/NewsletterSubscriber')
const { validateSubscribeInput } = require('../validators/newsletterValidator')

const subscribe = async (req, res) => {
  const { isValid, errors, sanitized } = validateSubscribeInput(req.body)

  if (!isValid) {
    return res.status(400).json({
      success: false,
      message: errors.email || 'Validation error',
      errors,
    })
  }

  const { email } = sanitized

  try {
    const existing = await NewsletterSubscriber.findOne({ email })
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "You're already subscribed.",
        alreadySubscribed: true,
      })
    }

    await NewsletterSubscriber.create({ email })

    return res.status(201).json({
      success: true,
      message: 'Successfully subscribed to the newsletter',
    })
  } catch (err) {
    // Handle concurrent duplicate insertion safely
    if (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000)) {
      return res.status(200).json({
        success: true,
        message: "You're already subscribed.",
        alreadySubscribed: true,
      })
    }

    return res.status(500).json({
      success: false,
      message: 'Server error',
    })
  }
}

module.exports = {
  subscribe,
}
