const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must be at most 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    wishlist: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
      ],
      default: [],
    },
    addresses: {
      type: [
        new mongoose.Schema(
          {
            fullName: {
              type: String,
              required: [true, 'Full name is required'],
              trim: true,
              maxlength: [100, 'Full name cannot exceed 100 characters'],
            },
            phone: {
              type: String,
              required: [true, 'Phone number is required'],
              trim: true,
              minlength: [5, 'Phone number must be at least 5 characters'],
              maxlength: [20, 'Phone number cannot exceed 20 characters'],
            },
            addressLine: {
              type: String,
              required: [true, 'Address line is required'],
              trim: true,
              maxlength: [200, 'Address line cannot exceed 200 characters'],
            },
            city: {
              type: String,
              required: [true, 'City is required'],
              trim: true,
              maxlength: [100, 'City cannot exceed 100 characters'],
            },
            state: {
              type: String,
              required: [true, 'State is required'],
              trim: true,
              maxlength: [100, 'State cannot exceed 100 characters'],
            },
            postalCode: {
              type: String,
              required: [true, 'Postal code is required'],
              trim: true,
              maxlength: [20, 'Postal code cannot exceed 20 characters'],
            },
            country: {
              type: String,
              required: [true, 'Country is required'],
              trim: true,
              default: 'India',
              maxlength: [100, 'Country cannot exceed 100 characters'],
            },
            isDefault: {
              type: Boolean,
              default: false,
            },
          },
          { timestamps: true }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)

module.exports = User
