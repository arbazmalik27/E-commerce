const mongoose = require('mongoose')

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
      default: 1,
    },
  },
  { _id: true }
)

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: function (items) {
          if (!Array.isArray(items)) return false
          const productIds = items.map((item) =>
            item.product && item.product._id
              ? item.product._id.toString()
              : item.product.toString()
          )
          return new Set(productIds).size === productIds.length
        },
        message: 'Duplicate product entries in the same cart are not allowed',
      },
    },
  },
  { timestamps: true }
)

const Cart = mongoose.model('Cart', cartSchema)

module.exports = Cart
