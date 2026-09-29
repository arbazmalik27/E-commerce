require('dotenv').config()
const mongoose = require('mongoose')
const Coupon = require('../src/models/Coupon')

const initialCoupons = [
  {
    code: 'BUY1GET1',
    type: 'buy_x_get_y',
    buyQuantity: 1,
    freeQuantity: 1,
    minimumOrderValue: 10000,
    isActive: true,
  },
  {
    code: 'BUY2GET3',
    type: 'buy_x_get_y',
    buyQuantity: 2,
    freeQuantity: 3,
    minimumOrderValue: 10000,
    isActive: true,
  },
  {
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    minimumOrderValue: 1000,
    maximumDiscount: 1000,
    isActive: true,
  },
  {
    code: 'FASHION500',
    type: 'fixed',
    value: 500,
    minimumOrderValue: 2500,
    isActive: true,
  },
]

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    for (const couponData of initialCoupons) {
      const existing = await Coupon.findOne({ code: couponData.code })
      if (!existing) {
        await Coupon.create(couponData)
        console.log(`Created coupon: ${couponData.code}`)
      } else {
        console.log(`Coupon already exists: ${couponData.code}`)
      }
    }

    console.log('Coupon seeding complete')
  } catch (err) {
    console.error('Error seeding coupons:', err)
  } finally {
    await mongoose.disconnect()
  }
}

seed()
