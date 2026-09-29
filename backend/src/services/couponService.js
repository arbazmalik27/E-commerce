const Order = require('../models/Order')

/**
 * Calculates BOGO free item count using the exact business rule:
 * freeQuantity = Math.floor(eligibleQuantity / buyQuantity) * freeQuantity
 */
function calculateBogoFreeQuantity(eligibleQuantity, buyQuantity, freeQuantity) {
  if (
    typeof eligibleQuantity !== 'number' ||
    typeof buyQuantity !== 'number' ||
    typeof freeQuantity !== 'number' ||
    buyQuantity < 1 ||
    freeQuantity < 1 ||
    eligibleQuantity < buyQuantity
  ) {
    return 0
  }
  return Math.floor(eligibleQuantity / buyQuantity) * freeQuantity
}

/**
 * Authoritative discount calculation from raw cart items
 */
function calculateCartDiscount(coupon, cartItems) {
  if (!coupon || !Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      isValid: false,
      message: 'Cart is empty. Cannot apply coupon.',
    }
  }

  // Flatten cart items into individual units to select lowest-priced units accurately
  const individualUnits = []
  for (const item of cartItems) {
    const rawPrice =
      item.product && typeof item.product.price === 'number'
        ? item.product.price
        : typeof item.price === 'number'
          ? item.price
          : 0
    const price = Number(Number(rawPrice).toFixed(2))
    const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1

    for (let i = 0; i < qty; i++) {
      individualUnits.push({
        price,
        name: (item.product && item.product.name) || item.name || 'Product',
        productId: (item.product && (item.product._id || item.product)) || item._id,
      })
    }
  }

  if (individualUnits.length === 0) {
    return {
      isValid: false,
      message: 'Cart contains no valid items.',
    }
  }

  // Calculate authoritative subtotal before any discounts
  const subtotal = Number(
    individualUnits.reduce((acc, u) => acc + u.price, 0).toFixed(2)
  )

  // Sort units ascending by price so lowest-priced units are selected first for BOGO
  individualUnits.sort((a, b) => a.price - b.price)

  // 1. PERCENTAGE
  if (coupon.type === 'percentage') {
    if (coupon.minimumOrderValue > 0 && subtotal < coupon.minimumOrderValue) {
      return {
        isValid: false,
        message: `Minimum order value is ₹${coupon.minimumOrderValue.toLocaleString('en-IN')}`,
        subtotal,
      }
    }

    let discount = Number(((subtotal * coupon.value) / 100).toFixed(2))
    if (coupon.maximumDiscount !== null && coupon.maximumDiscount !== undefined && coupon.maximumDiscount >= 0) {
      discount = Math.min(discount, coupon.maximumDiscount)
    }
    discount = Math.min(discount, subtotal)
    discount = Number(discount.toFixed(2))
    const finalAmount = Number((subtotal - discount).toFixed(2))

    return {
      isValid: true,
      subtotal,
      discountAmount: discount,
      finalAmount,
      freeItems: 0,
      eligibleQuantity: individualUnits.length,
    }
  }

  // 2. FIXED
  if (coupon.type === 'fixed') {
    if (coupon.minimumOrderValue > 0 && subtotal < coupon.minimumOrderValue) {
      return {
        isValid: false,
        message: `Minimum order value is ₹${coupon.minimumOrderValue.toLocaleString('en-IN')}`,
        subtotal,
      }
    }

    let discount = Math.min(coupon.value, subtotal)
    if (coupon.maximumDiscount !== null && coupon.maximumDiscount !== undefined && coupon.maximumDiscount >= 0) {
      discount = Math.min(discount, coupon.maximumDiscount)
    }
    discount = Number(discount.toFixed(2))
    const finalAmount = Number((subtotal - discount).toFixed(2))

    return {
      isValid: true,
      subtotal,
      discountAmount: discount,
      finalAmount,
      freeItems: 0,
      eligibleQuantity: individualUnits.length,
    }
  }

  // 3. BUY X GET Y FREE
  if (coupon.type === 'buy_x_get_y') {
    // The ₹10,000 threshold is checked BEFORE applying discounts, based on original subtotal
    const requiredMin = Math.max(10000, coupon.minimumOrderValue || 0)
    if (subtotal < requiredMin) {
      return {
        isValid: false,
        message: `Minimum order value is ₹${requiredMin.toLocaleString('en-IN')}`,
        subtotal,
        requiredMin,
        shortfall: Number((requiredMin - subtotal).toFixed(2)),
      }
    }

    const buyQ = coupon.buyQuantity || 1
    const freeQ = coupon.freeQuantity || 1
    const groupSize = buyQ + freeQ
    const totalUnits = individualUnits.length

    const numGroups = Math.floor(totalUnits / groupSize)
    if (numGroups < 1) {
      return {
        isValid: false,
        message: `Cart must contain at least ${groupSize} items for ${coupon.code} (Buy ${buyQ} Get ${freeQ} Free)`,
        subtotal,
        requiredUnits: groupSize,
        currentUnits: totalUnits,
        missingUnits: groupSize - totalUnits,
      }
    }

    const freeUnitsCount = numGroups * freeQ
    const eligibleQuantity = numGroups * buyQ

    // Select the lowest-priced eligible units first for free items
    const freeUnits = individualUnits.slice(0, freeUnitsCount)
    let calculatedDiscount = Number(
      freeUnits.reduce((acc, u) => acc + u.price, 0).toFixed(2)
    )

    if (coupon.maximumDiscount !== null && coupon.maximumDiscount !== undefined && coupon.maximumDiscount >= 0) {
      calculatedDiscount = Math.min(calculatedDiscount, coupon.maximumDiscount)
    }
    calculatedDiscount = Math.min(calculatedDiscount, subtotal)
    calculatedDiscount = Number(calculatedDiscount.toFixed(2))
    const finalAmount = Number((subtotal - calculatedDiscount).toFixed(2))

    return {
      isValid: true,
      subtotal,
      discountAmount: calculatedDiscount,
      finalAmount,
      freeItems: freeUnitsCount,
      eligibleQuantity,
    }
  }

  return {
    isValid: false,
    message: 'Unsupported coupon type',
  }
}

/**
 * Validates full coupon eligibility including active status, dates, limits, and cart contents
 */
async function validateCouponEligibility({ coupon, user, cartItems }) {
  if (!coupon) {
    return { isValid: false, message: 'Invalid coupon code.' }
  }

  if (coupon.isActive === false) {
    return { isValid: false, message: 'Coupon is not active.' }
  }

  const now = new Date()

  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now.getTime()) {
    return { isValid: false, message: 'Coupon is not available yet.' }
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now.getTime()) {
    return { isValid: false, message: 'Coupon has expired.' }
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageLimit >= 0) {
    if ((coupon.usedCount || 0) >= coupon.usageLimit) {
      return { isValid: false, message: 'Coupon usage limit reached.' }
    }
  }

  if (user && coupon.perUserLimit !== null && coupon.perUserLimit !== undefined && coupon.perUserLimit >= 0) {
    const userId = user._id || user.id
    const userSuccessfulUses = await Order.countDocuments({
      user: userId,
      'coupon.code': coupon.code,
      paymentStatus: 'paid',
    })

    if (userSuccessfulUses >= coupon.perUserLimit) {
      return { isValid: false, message: 'You have already used this coupon.' }
    }
  }

  if (!cartItems || cartItems.length === 0) {
    return { isValid: false, message: 'Cart is empty. Cannot apply coupon.' }
  }

  const calculation = calculateCartDiscount(coupon, cartItems)
  if (!calculation.isValid) {
    return {
      isValid: false,
      message: calculation.message || 'Coupon is not applicable to the current cart.',
      details: calculation,
    }
  }

  return {
    isValid: true,
    calculation,
    coupon,
  }
}

module.exports = {
  calculateBogoFreeQuantity,
  calculateCartDiscount,
  validateCouponEligibility,
}
