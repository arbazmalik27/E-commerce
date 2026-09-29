const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
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
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Review title cannot exceed 100 characters'],
      default: '',
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [5, 'Review comment must be at least 5 characters'],
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: '{VALUE} is not a valid review status',
      },
      default: 'pending',
      index: true,
    },
    verifiedPurchase: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

// One review per user per product enforced at database level
reviewSchema.index({ user: 1, product: 1 }, { unique: true })

// Index for fast approved review lookups per product, ordered by newest
reviewSchema.index({ product: 1, status: 1, createdAt: -1 })

// Index for admin moderation queries
reviewSchema.index({ status: 1, createdAt: -1 })

const Review = mongoose.model('Review', reviewSchema)

module.exports = Review
