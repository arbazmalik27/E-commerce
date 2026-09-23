const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [1, 'Product name cannot be empty'],
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [1, 'Product description cannot be empty'],
      maxlength: [2000, 'Product description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      lowercase: true,
      enum: {
        values: ['fashion'],
        message: '{VALUE} is not a valid category',
      },
    },
    department: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    subcategory: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    brand: {
      type: String,
      required: [true, 'Product brand is required'],
      trim: true,
      minlength: [1, 'Product brand cannot be empty'],
      maxlength: [100, 'Product brand cannot exceed 100 characters'],
    },
    images: {
      type: [
        {
          type: String,
          trim: true,
          validate: {
            validator: (val) => typeof val === 'string' && val.trim().length > 0,
            message: 'Image URL cannot be empty',
          },
        },
      ],
      default: [],
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ageRange: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
)

productSchema.index({ category: 1, department: 1, subcategory: 1, isActive: 1 })

const Product = mongoose.model('Product', productSchema)

module.exports = Product
