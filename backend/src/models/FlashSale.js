const mongoose = require('mongoose')

const flashSaleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Flash sale name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    products: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
      ],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0
        },
        message: 'At least one product must be selected for the flash sale',
      },
    },
    discountType: {
      type: String,
      required: [true, 'Discount type is required'],
      enum: {
        values: ['percentage', 'fixed'],
        message: '{VALUE} is not a valid discount type',
      },
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      validate: {
        validator: function (val) {
          if (typeof val !== 'number' || isNaN(val) || val <= 0) return false
          if (this.discountType === 'percentage') {
            return val > 0 && val <= 100
          }
          return val > 0
        },
        message: 'Discount value must be between 1 and 100 for percentage, or greater than 0 for fixed',
      },
    },
    startAt: {
      type: Date,
      required: [true, 'Start date/time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'End date/time is required'],
      validate: {
        validator: function (val) {
          if (val && this.startAt) {
            return new Date(val).getTime() > new Date(this.startAt).getTime()
          }
          return true
        },
        message: 'End date/time must be strictly after start date/time',
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Virtual isActive alias
flashSaleSchema.virtual('isActive').get(function () {
  return this.active
})

// Auto-generate slug from name if not provided
flashSaleSchema.pre('save', function () {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }
})

// Query & listing indexes
flashSaleSchema.index({ active: 1, startAt: 1, endAt: 1 })
flashSaleSchema.index({ products: 1, active: 1 })
flashSaleSchema.index({ createdAt: -1 })

const FlashSale = mongoose.model('FlashSale', flashSaleSchema)

module.exports = FlashSale
