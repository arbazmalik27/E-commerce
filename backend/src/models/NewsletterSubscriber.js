const mongoose = require('mongoose')

const newsletterSubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [254, 'Email cannot exceed 254 characters'],
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
})

const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema)

module.exports = NewsletterSubscriber
