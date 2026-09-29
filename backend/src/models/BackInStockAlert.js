const mongoose = require('mongoose')

const backInStockAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
      index: true,
    },
    size: {
      type: String,
      trim: true,
      default: null,
      maxlength: [30, 'Size cannot exceed 30 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'notified', 'cancelled'],
        message: '{VALUE} is not a valid alert status',
      },
      default: 'active',
      index: true,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    notificationChannel: {
      type: String,
      enum: ['email'],
      default: 'email',
    },
  },
  { timestamps: true }
)

// Compound partial unique index: ensures a user cannot have duplicate ACTIVE alerts for the exact same product and size.
// Cancelled or notified alerts do not prevent creating a future active alert.
backInStockAlertSchema.index(
  { user: 1, product: 1, size: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
)

// Index for high-performance trigger lookups when inventory is replenished
backInStockAlertSchema.index({ product: 1, size: 1, status: 1 })

const BackInStockAlert = mongoose.model('BackInStockAlert', backInStockAlertSchema)

module.exports = BackInStockAlert
