const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['order_confirmed', 'order_status_updated', 'back_in_stock'],
        message: '{VALUE} is not a valid notification type',
      },
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    link: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
      },
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null,
      },
      orderNumber: {
        type: String,
        trim: true,
        default: null,
      },
      status: {
        type: String,
        trim: true,
        default: null,
      },
    },
  },
  { timestamps: true }
)

// Index for chronological retrieval of customer notifications
notificationSchema.index({ user: 1, createdAt: -1 })

// Index for unread count queries and bulk mark-all-read updates
notificationSchema.index({ user: 1, isRead: 1 })

// Compound index for idempotency checks (prevent duplicate status or confirmation notifications)
notificationSchema.index({ user: 1, type: 1, 'metadata.orderId': 1, 'metadata.status': 1 })

const Notification = mongoose.model('Notification', notificationSchema)

module.exports = Notification
