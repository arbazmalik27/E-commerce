const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [2, 'Coupon code must be at least 2 characters'],
      maxlength: [30, 'Coupon code cannot exceed 30 characters'],
    },
    type: {
      type: String,
      required: [true, 'Coupon type is required'],
      enum: {
        values: ['percentage', 'fixed', 'buy_x_get_y'],
        message: '{VALUE} is not a valid coupon type',
      },
    },
    value: {
      type: Number,
      default: 0,
      min: [0, 'Coupon value cannot be negative'],
      validate: {
        validator: function (val) {
          if (this.type === 'percentage') {
            return typeof val === 'number' && val > 0 && val <= 100
          }
          if (this.type === 'fixed') {
            return typeof val === 'number' && val > 0
          }
          if (this.type === 'buy_x_get_y') {
            return val === 0 || val == null
          }
          return true
        },
        message: 'Invalid value for the selected coupon type',
      },
    },
    buyQuantity: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          if (this.type === 'buy_x_get_y') {
            return typeof val === 'number' && Number.isInteger(val) && val >= 1
          }
          return val == null
        },
        message: 'Buy quantity must be an integer >= 1 for buy_x_get_y coupons, and null otherwise',
      },
    },
    freeQuantity: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          if (this.type === 'buy_x_get_y') {
            return typeof val === 'number' && Number.isInteger(val) && val >= 1
          }
          return val == null
        },
        message: 'Free quantity must be an integer >= 1 for buy_x_get_y coupons, and null otherwise',
      },
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order value cannot be negative'],
    },
    maximumDiscount: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          return val == null || (typeof val === 'number' && val >= 0)
        },
        message: 'Maximum discount must be >= 0 when provided',
      },
    },
    usageLimit: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          return val == null || (typeof val === 'number' && Number.isInteger(val) && val >= 0)
        },
        message: 'Usage limit must be an integer >= 0 when provided',
      },
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Used count must be an integer',
      },
    },
    perUserLimit: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          return val == null || (typeof val === 'number' && Number.isInteger(val) && val >= 0)
        },
        message: 'Per-user limit must be an integer >= 0 when provided',
      },
    },
    startsAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (val) {
          if (val && this.startsAt) {
            return new Date(val).getTime() >= new Date(this.startsAt).getTime()
          }
          return true
        },
        message: 'Expiration date must not be earlier than start date',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

// Normalize code before saving
couponSchema.pre('save', function () {
  if (this.code) {
    this.code = this.code.trim().toUpperCase()
  }
  // Enforce BOGO minimum order value rule (₹10,000)
  if (this.type === 'buy_x_get_y' && (!this.minimumOrderValue || this.minimumOrderValue < 10000)) {
    this.minimumOrderValue = 10000
  }
})

// Query & listing indexes
couponSchema.index({ type: 1, isActive: 1 })
couponSchema.index({ isActive: 1, startsAt: 1, expiresAt: 1 })
couponSchema.index({ createdAt: -1 })

const Coupon = mongoose.model('Coupon', couponSchema)

module.exports = Coupon
