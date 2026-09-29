/**
 * Automated Verification Suite for TrendVolt Feature #4:
 * Size Guide + Size Recommendation
 */

const mongoose = require('mongoose')
require('dotenv').config()

const Product = require('../src/models/Product')
const Cart = require('../src/models/Cart')
const Order = require('../src/models/Order')
const User = require('../src/models/User')
const {
  getProductSizeCategory,
  SIZE_CHARTS,
  recommendSize,
} = require('../src/constants/sizeCharts')
const { validateAddToCartInput } = require('../src/validators/cartValidator')
const { validateCreateProductInput } = require('../src/validators/productValidator')

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    passedCount++
    console.log(`  PASS: ${message}`)
  } else {
    failedCount++
    console.error(`  FAIL: ${message}`)
  }
}

async function runTests() {
  console.log('=== RUNNING FEATURE #4 (SIZE GUIDE & RECOMMENDATION) TESTS ===\n')

  // -------------------------------------------------------------
  // Test 1: Category Mapping & Size Charts Structure
  // -------------------------------------------------------------
  console.log('[1] Taxonomy to Size Chart Mapping')
  assert(getProductSizeCategory('men', 't-shirts') === 'men-tops', 'Men T-Shirts map to men-tops')
  assert(getProductSizeCategory('men', 'jeans') === 'men-bottoms', 'Men Jeans map to men-bottoms')
  assert(getProductSizeCategory('women', 'dresses') === 'women-tops', 'Women Dresses map to women-tops')
  assert(getProductSizeCategory('women', 'skirts') === 'women-bottoms', 'Women Skirts map to women-bottoms')
  assert(getProductSizeCategory('footwear', 'sneakers') === 'footwear', 'Sneakers map to footwear')
  assert(getProductSizeCategory('kids', 'kids-clothing') === 'kids-clothing', 'Kids clothing maps to kids-clothing')
  assert(getProductSizeCategory('kids', 'kids-footwear') === 'kids-footwear', 'Kids footwear maps to kids-footwear')
  assert(getProductSizeCategory('accessories', 'watches') === null, 'Accessories return null (no sizing)')
  assert(getProductSizeCategory('beauty-fragrance', 'perfumes') === null, 'Beauty returns null (no sizing)')

  // -------------------------------------------------------------
  // Test 2: Deterministic Recommendation Engine
  // -------------------------------------------------------------
  console.log('\n[2] Sizing Recommendation Determinism')
  // Men's Chest 39 inches -> M (38-40)
  const recMenM = recommendSize({
    department: 'men',
    subcategory: 't-shirts',
    measurements: { chest: 39 },
    unit: 'in',
    fitPreference: 'regular',
  })
  assert(recMenM.status === 'recommended', 'Status is recommended')
  assert(recMenM.recommendedSize === 'M', 'Recommended size is M for 39" chest')
  assert(recMenM.disclaimer && !recMenM.disclaimer.includes('perfect fit guaranteed'), 'Does not claim perfect fit guarantee')

  // Between sizes check (Men's Chest 40 inches -> between M and L)
  const recBetween = recommendSize({
    department: 'men',
    subcategory: 't-shirts',
    measurements: { chest: 40 },
    unit: 'in',
    fitPreference: 'relaxed',
  })
  assert(recBetween.status === 'recommended', 'Status is recommended for boundary')
  assert(recBetween.betweenSizes !== null || recBetween.recommendedSize === 'L', 'Roomier preference shifts towards L')

  // Women's Bust 34 inches -> S (33-35)
  const recWomenS = recommendSize({
    department: 'women',
    subcategory: 'tops',
    measurements: { chest: 34 },
    unit: 'in',
  })
  assert(recWomenS.recommendedSize === 'S', 'Recommended size is S for 34" bust')

  // Footwear 27.0 cm -> Size 9 UK/IN
  const recShoes = recommendSize({
    department: 'footwear',
    subcategory: 'sneakers',
    measurements: { footLength: 27.0 },
    unit: 'cm',
  })
  assert(recShoes.recommendedSize === '9', 'Recommended shoe size is 9 for 27.0 cm foot')

  // Kids age 6 -> 6-7Y
  const recKids = recommendSize({
    department: 'kids',
    subcategory: 'kids-clothing',
    measurements: { age: 6 },
  })
  assert(recKids.recommendedSize === '6-7Y', 'Recommended kids clothing is 6-7Y for age 6')

  // Missing required measurement
  const recMissing = recommendSize({
    department: 'men',
    subcategory: 't-shirts',
    measurements: {},
  })
  assert(recMissing.status === 'insufficient_data', 'Missing input handled safely as insufficient_data')

  // Out of stock product sizes handling
  const recOutOfStock = recommendSize({
    department: 'men',
    subcategory: 't-shirts',
    measurements: { chest: 39 }, // recommends M
    productSizes: [
      { label: 'S', available: true },
      { label: 'M', available: false }, // M is out of stock!
      { label: 'L', available: true },
    ],
  })
  assert(recOutOfStock.isAvailable === false, 'Detects out of stock size')
  assert(recOutOfStock.status === 'out_of_stock', 'Status marked as out_of_stock')

  // -------------------------------------------------------------
  // Test 3: Product Validator for Sizes
  // -------------------------------------------------------------
  console.log('\n[3] Product Model and Validator for Sizes')
  const validProd = validateCreateProductInput({
    name: 'Classic Oxford Cotton Shirt',
    description: 'A crisp luxury tailored button-down shirt for effortless elegance.',
    price: 3499,
    category: 'fashion',
    department: 'men',
    subcategory: 'shirts',
    brand: 'TrendVolt Studio',
    stock: 25,
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: false },
    ],
  })
  assert(validProd.isValid, 'Product with valid sizes array passes validation')
  assert(validProd.sanitized.sizes.length === 3, 'Sanitized sizes length is 3')

  const invalidSizeProd = validateCreateProductInput({
    name: 'Invalid Shirt Sample',
    description: 'A crisp luxury tailored button-down shirt for effortless elegance.',
    price: 3499,
    category: 'fashion',
    department: 'men',
    subcategory: 'shirts',
    brand: 'TrendVolt Studio',
    stock: 25,
    sizes: [{ label: '', available: true }],
  })
  assert(!invalidSizeProd.isValid, 'Product with empty size label rejected')

  // -------------------------------------------------------------
  // Test 4: Cart Validator for Size
  // -------------------------------------------------------------
  console.log('\n[4] Cart Validator for Size')
  const fakeId = new mongoose.Types.ObjectId().toString()
  const validCartInput = validateAddToCartInput({
    productId: fakeId,
    quantity: 2,
    size: 'M',
  })
  assert(validCartInput.isValid, 'Valid cart input with size M passes')
  assert(validCartInput.sanitized.size === 'M', 'Sanitized size is M')

  const noSizeCartInput = validateAddToCartInput({
    productId: fakeId,
    quantity: 1,
  })
  assert(noSizeCartInput.isValid, 'Valid cart input without size passes with null')
  assert(noSizeCartInput.sanitized.size === null, 'Sanitized size is null')

  const emptySizeCartInput = validateAddToCartInput({
    productId: fakeId,
    quantity: 1,
    size: '   ',
  })
  assert(!emptySizeCartInput.isValid, 'Whitespace-only size rejected')

  // -------------------------------------------------------------
  // Test 5: MongoDB Live Database Integration Tests
  // -------------------------------------------------------------
  console.log('\n[5] Database Integration (Cart, Orders, Sizing)')
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('MONGODB_URI not found in env, skipping live DB tests')
    finish()
    return
  }

  await mongoose.connect(mongoUri)

  try {
    // Find or create test user
    let user = await User.findOne({ email: 'test_sizeguide@trendvolt.internal' })
    if (!user) {
      user = await User.create({
        name: 'Size Guide Tester',
        email: 'test_sizeguide@trendvolt.internal',
        password: 'password123!',
        role: 'customer',
      })
    }

    // Clean existing cart
    await Cart.deleteOne({ user: user._id })

    // Create a test product with sizes
    const testProduct = await Product.create({
      name: 'Size Test Linen Overshirt',
      description: 'Exclusive artisanal linen overshirt designed for rigorous sizing verification.',
      price: 2999,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'TrendVolt Atelier',
      stock: 10,
      sizes: [
        { label: 'S', available: true },
        { label: 'M', available: true },
        { label: 'L', available: true },
        { label: 'XL', available: false }, // out of stock
      ],
      isActive: true,
    })

    // Test Cart creation with distinct sizes
    const cart = new Cart({
      user: user._id,
      items: [
        { product: testProduct._id, quantity: 1, size: 'M' },
        { product: testProduct._id, quantity: 2, size: 'L' },
      ],
    })
    await cart.save()
    assert(cart.items.length === 2, 'Cart successfully stores M and L as distinct items')
    assert(cart.items[0].size === 'M' && cart.items[1].size === 'L', 'Sizes preserved distinctly')

    // Test Duplicate prevention for SAME product + SAME size
    let duplicateErrorThrown = false
    try {
      cart.items.push({ product: testProduct._id, quantity: 1, size: 'M' })
      await cart.save()
    } catch {
      duplicateErrorThrown = true
    }
    assert(duplicateErrorThrown, 'Compound index/validator prevents duplicate (product + same size)')

    // Restore clean cart with M and L
    await Cart.deleteOne({ user: user._id })
    const validCart = await Cart.create({
      user: user._id,
      items: [
        { product: testProduct._id, quantity: 1, size: 'M' },
        { product: testProduct._id, quantity: 2, size: 'L' },
      ],
    })

    // Test Order creation preserving size snapshot
    const testOrder = await Order.create({
      user: user._id,
      orderNumber: `ORD-TEST-${Date.now()}`,
      items: [
        {
          product: testProduct._id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 1,
          subtotal: testProduct.price,
          size: 'M',
        },
        {
          product: testProduct._id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 2,
          subtotal: testProduct.price * 2,
          size: 'L',
        },
      ],
      shippingAddress: {
        fullName: 'Size Guide Tester',
        phone: '9876543210',
        addressLine: '123 Luxury Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: testProduct.price * 3,
      totalAmount: testProduct.price * 3,
    })

    assert(testOrder.items.length === 2, 'Order successfully created with 2 items')
    assert(testOrder.items[0].size === 'M', 'Order item 1 preserves size M snapshot')
    assert(testOrder.items[1].size === 'L', 'Order item 2 preserves size L snapshot')

    // Test Historical Order without size compatibility
    const historicalOrder = await Order.create({
      user: user._id,
      orderNumber: `ORD-HIST-${Date.now()}`,
      items: [
        {
          product: testProduct._id,
          name: testProduct.name,
          price: testProduct.price,
          quantity: 1,
          subtotal: testProduct.price,
          // no size field
        },
      ],
      shippingAddress: {
        fullName: 'Size Guide Tester',
        phone: '9876543210',
        addressLine: '123 Luxury Lane',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      subtotal: testProduct.price,
      totalAmount: testProduct.price,
    })

    assert(historicalOrder.items[0].size === null, 'Historical order without size has size: null without error')

    // Clean up test records
    await Order.deleteMany({ _id: { $in: [testOrder._id, historicalOrder._id] } })
    await Cart.deleteOne({ _id: validCart._id })
    await Product.deleteOne({ _id: testProduct._id })
    await User.deleteOne({ _id: user._id })

    console.log('  Cleaned up all temporary test artifacts from DB.')
  } catch (err) {
    console.error('Database test error:', err)
    failedCount++
  } finally {
    await mongoose.disconnect()
    finish()
  }
}

function finish() {
  console.log('\n=== TEST RESULTS ===')
  console.log(`Passed: ${passedCount}`)
  console.log(`Failed: ${failedCount}`)
  if (failedCount > 0) {
    process.exit(1)
  } else {
    console.log('ALL SIZE GUIDE & RECOMMENDATION TESTS PASSED!')
    process.exit(0)
  }
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err)
  process.exit(1)
})
