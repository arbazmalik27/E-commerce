const path = require('path')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const app = require('../src/app')
const FlashSale = require('../src/models/FlashSale')
const Product = require('../src/models/Product')
const User = require('../src/models/User')
const Cart = require('../src/models/Cart')
const Order = require('../src/models/Order')
const Coupon = require('../src/models/Coupon')
const {
  calculateSalePrice,
  getEffectiveProductPrice,
  checkProductConflict,
} = require('../src/services/pricingService')

let server
let baseUrl
let passed = 0
let failed = 0

function testAssert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(`${baseUrl}${options.path}`)
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }

    const req = http.request(reqOptions, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) })
        } catch {
          resolve({ status: res.statusCode, data: body })
        }
      })
    })

    req.on('error', reject)
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data))
    }
    req.end()
  })
}

async function runTests() {
  console.log('--- STARTING FEATURE #7 FLASH SALE TEST SUITE ---')

  await mongoose.connect(process.env.MONGODB_URI)
  await new Promise((resolve) => {
    server = http.createServer(app)
    server.listen(0, () => {
      const port = server.address().port
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  try {
    // Setup Test Admin & Customer Users
    await User.deleteMany({ email: { $in: ['flash_admin@test.com', 'flash_customer@test.com'] } })
    const adminUser = await User.create({
      name: 'Flash Admin',
      email: 'flash_admin@test.com',
      password: 'Password123!',
      role: 'admin',
      isActive: true,
    })
    const customerUser = await User.create({
      name: 'Flash Customer',
      email: 'flash_customer@test.com',
      password: 'Password123!',
      role: 'customer',
      isActive: true,
    })

    const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
    const customerToken = jwt.sign({ id: customerUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' })

    // Setup Test Products
    await Product.deleteMany({ name: { $regex: /^FlashTest/ } })
    const prod1 = await Product.create({
      name: 'FlashTest Oversized T-Shirt',
      description: 'Luxury oversized graphic t-shirt in organic cotton.',
      price: 2499,
      category: 'fashion',
      department: 'men',
      subcategory: 't-shirts',
      brand: 'TrendVolt Luxury',
      stock: 25,
      isActive: true,
    })

    const prod2 = await Product.create({
      name: 'FlashTest Denim Jacket',
      description: 'Vintage wash selvedge denim jacket.',
      price: 4999,
      category: 'fashion',
      department: 'men',
      subcategory: 'jackets',
      brand: 'TrendVolt Denim',
      stock: 15,
      isActive: true,
    })

    const prod3 = await Product.create({
      name: 'FlashTest Cargo Trousers',
      description: 'Relaxed fit utilitarian cargo trousers.',
      price: 3200,
      category: 'fashion',
      department: 'men',
      subcategory: 'pants',
      brand: 'TrendVolt Utilitarian',
      stock: 0, // Out of stock
      isActive: true,
    })

    // Cleanup any existing test flash sales
    await FlashSale.deleteMany({ name: { $regex: /^TestSale/ } })

    // ==========================================
    // 1. PRICING ENGINE UNIT TESTS
    // ==========================================
    console.log('\n[1] Authoritative Pricing Engine Unit Tests:')
    const price20Percent = calculateSalePrice(2499, 'percentage', 20)
    testAssert(price20Percent.salePrice === 1999.2, '20% percentage discount on 2499 calculates to 1999.20')
    testAssert(price20Percent.discountPercentage === 20, 'Percentage is exactly 20%')

    const fixed500 = calculateSalePrice(2000, 'fixed', 500)
    testAssert(fixed500.salePrice === 1500, 'Fixed ₹500 discount on ₹2000 calculates to ₹1500')
    testAssert(fixed500.discountPercentage === 25, 'Discount percentage for ₹500 on ₹2000 is 25%')

    const excessiveFixed = calculateSalePrice(500, 'fixed', 9999)
    testAssert(excessiveFixed.salePrice === 1, 'Excessive fixed discount guarantees salePrice > 0 (clamped to ₹1 minimum)')

    // ==========================================
    // 2. SCHEDULING TESTS (UPCOMING, ACTIVE, EXPIRED)
    // ==========================================
    console.log('\n[2] Scheduling States (Upcoming, Active, Expired):')
    const now = new Date()

    // Create Active Flash Sale
    const activeSale = await FlashSale.create({
      name: 'TestSale Active Weekend',
      discountType: 'percentage',
      discountValue: 28,
      startAt: new Date(now.getTime() - 2 * 3600 * 1000), // started 2h ago
      endAt: new Date(now.getTime() + 4 * 3600 * 1000),   // ends in 4h
      products: [prod1._id],
      active: true,
      createdBy: adminUser._id,
    })

    const effectiveActive = await getEffectiveProductPrice(prod1)
    testAssert(effectiveActive.isFlashSale === true, 'Product in active flash sale marked isFlashSale = true')
    testAssert(effectiveActive.price === 1799.28, `Authoritative sale price calculates to ₹1799.28 (got ${effectiveActive.price})`)
    testAssert(effectiveActive.originalPrice === 2499, 'Original product price preserved intact')

    // Create Upcoming Flash Sale
    const upcomingSale = await FlashSale.create({
      name: 'TestSale Upcoming Autumn',
      discountType: 'percentage',
      discountValue: 15,
      startAt: new Date(now.getTime() + 10 * 3600 * 1000), // starts in 10h
      endAt: new Date(now.getTime() + 24 * 3600 * 1000),
      products: [prod2._id],
      active: true,
      createdBy: adminUser._id,
    })

    const effectiveUpcoming = await getEffectiveProductPrice(prod2)
    testAssert(effectiveUpcoming.isFlashSale === false, 'Product in upcoming flash sale is NOT sold at sale price yet')
    testAssert(effectiveUpcoming.price === 4999, 'Upcoming sale product remains at full regular price')
    testAssert(effectiveUpcoming.upcomingFlashSale !== null, 'Upcoming sale schedule returned for customer countdown banner')

    // Create Expired Flash Sale
    const expiredSale = await FlashSale.create({
      name: 'TestSale Expired Yesteryear',
      discountType: 'fixed',
      discountValue: 1000,
      startAt: new Date(now.getTime() - 48 * 3600 * 1000),
      endAt: new Date(now.getTime() - 2 * 3600 * 1000), // expired 2h ago
      products: [prod3._id],
      active: true,
      createdBy: adminUser._id,
    })

    const effectiveExpired = await getEffectiveProductPrice(prod3)
    testAssert(effectiveExpired.isFlashSale === false, 'Expired flash sale product is NOT sold at sale price')
    testAssert(effectiveExpired.price === 3200, 'Expired sale product reverts authoritatively to normal price')

    // ==========================================
    // 3. PRODUCT CONFLICT DETECTION
    // ==========================================
    console.log('\n[3] Overlapping Sale Conflict Detection:')
    const conflictCheck = await checkProductConflict(
      [prod1._id],
      new Date(now.getTime() - 1 * 3600 * 1000),
      new Date(now.getTime() + 5 * 3600 * 1000)
    )
    testAssert(conflictCheck.hasConflict === true, 'Backend detects overlapping active sale for prod1')

    // Admin API attempt to create conflicting sale
    const conflictRes = await request(
      {
        path: '/api/flash-sales/admin',
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      {
        name: 'TestSale Conflicting',
        discountType: 'percentage',
        discountValue: 30,
        startAt: new Date(now.getTime() - 1 * 3600 * 1000).toISOString(),
        endAt: new Date(now.getTime() + 5 * 3600 * 1000).toISOString(),
        products: [prod1._id.toString()],
        active: true,
      }
    )
    testAssert(conflictRes.status === 400, 'Admin API rejects overlapping active flash sale with HTTP 400')

    // ==========================================
    // 4. CUSTOMER STOREFRONT & FILTER APIS
    // ==========================================
    console.log('\n[4] Customer Storefront Endpoints:')
    const publicSalesRes = await request({ path: '/api/flash-sales' })
    testAssert(publicSalesRes.status === 200, 'GET /api/flash-sales returns HTTP 200')
    testAssert(Array.isArray(publicSalesRes.data.flashSales), 'Returns array of active flash sales')
    testAssert(
      publicSalesRes.data.flashSales.some((s) => s._id.toString() === activeSale._id.toString()),
      'Currently active sale is present in customer feed'
    )
    testAssert(
      !publicSalesRes.data.flashSales.some((s) => s._id.toString() === expiredSale._id.toString()),
      'Expired sale is NOT present in customer feed'
    )

    // Catalog Flash Sale Filter
    const catalogFilterRes = await request({ path: '/api/products?flashSale=true' })
    testAssert(catalogFilterRes.status === 200, 'GET /api/products?flashSale=true returns HTTP 200')
    const filterIds = (catalogFilterRes.data.products || []).map((p) => p._id.toString())
    testAssert(filterIds.includes(prod1._id.toString()), 'Active flash sale product included in flashSale filter')
    testAssert(!filterIds.includes(prod2._id.toString()), 'Upcoming product excluded from flashSale filter')

    // ==========================================
    // 5. CART AUTHORITATIVE PRICING & TAMPER PREVENTION
    // ==========================================
    console.log('\n[5] Cart Authoritative Pricing & Tamper Resistance:')
    await Cart.deleteMany({ user: customerUser._id })

    // Add active flash sale product to cart with arbitrary client prices injected
    const addTamperedCart = await request(
      {
        path: '/api/cart/items',
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        productId: prod1._id.toString(),
        quantity: 1,
        price: 1, // Tampered price
        salePrice: 1,
        total: 1,
      }
    )
    testAssert(addTamperedCart.status === 200, 'Add to cart succeeds')
    const cartItem = addTamperedCart.data.cart.items.find((i) => i.product._id.toString() === prod1._id.toString())
    testAssert(cartItem.product.price === 1799.28, `Backend enforces authoritative sale price ₹1799.28 (got ₹${cartItem.product.price})`)
    testAssert(addTamperedCart.data.cart.totalAmount === 1799.28, `Cart total ignores client manipulation and equals ₹1799.28`)

    // Stock check on out-of-stock product
    const addOosCart = await request(
      {
        path: '/api/cart/items',
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        productId: prod3._id.toString(),
        quantity: 1,
      }
    )
    testAssert(addOosCart.status === 400, 'Adding out-of-stock product rejected even if in flash sale')

    // ==========================================
    // 6. CART REVALIDATION ON SALE EXPIRATION
    // ==========================================
    console.log('\n[6] Cart Revalidation on Sale Expiration:')
    // Force activeSale to expire now
    await FlashSale.findByIdAndUpdate(activeSale._id, {
      endAt: new Date(now.getTime() - 1000),
    })

    const cartRefetch = await request({
      path: '/api/cart',
      headers: { Authorization: `Bearer ${customerToken}` },
    })
    testAssert(cartRefetch.status === 200, 'GET /api/cart succeeds')
    const revalidatedItem = cartRefetch.data.cart.items.find((i) => i.product._id.toString() === prod1._id.toString())
    testAssert(
      revalidatedItem.product.price === 2499,
      `After sale expiration, cart revalidates authoritatively to original price ₹2499 (got ₹${revalidatedItem.product.price})`
    )
    testAssert(
      cartRefetch.data.cart.totalAmount === 2499,
      `Cart total revalidates authoritatively to ₹2499 (got ₹${cartRefetch.data.cart.totalAmount})`
    )

    // Restore sale back to active for order creation test
    await FlashSale.findByIdAndUpdate(activeSale._id, {
      endAt: new Date(now.getTime() + 4 * 3600 * 1000),
    })

    // ==========================================
    // 7. ORDER CREATION & SNAPSHOT INTEGRITY
    // ==========================================
    console.log('\n[7] Order Creation & Snapshot Integrity:')
    const orderRes = await request(
      {
        path: '/api/orders',
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        shippingAddress: {
          fullName: 'Flash Tester',
          phone: '9876543210',
          addressLine: '12 Fashion Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        // Injected malicious pricing fields
        subtotal: 50,
        totalAmount: 50,
        price: 50,
      }
    )

    testAssert(orderRes.status === 201, 'POST /api/orders creates order successfully')
    const order = orderRes.data.order
    testAssert(order.items[0].price === 1799.28, `Order snapshot stores authoritative sale price ₹1799.28`)
    testAssert(order.subtotal === 1799.28, `Order subtotal is authoritatively ₹1799.28`)
    testAssert(order.totalAmount === 1799.28, `Order final totalAmount is authoritatively ₹1799.28`)

    // ==========================================
    // 8. PAYMENT AMOUNT & RAZORPAY SECURITY
    // ==========================================
    console.log('\n[8] Razorpay Integration Security:')
    // Attempt to tamper with Razorpay payment order amount
    const paymentOrderRes = await request(
      {
        path: '/api/payments/razorpay-order',
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        orderId: order._id.toString(),
        amount: 100, // Malicious paise override attempt
      }
    )
    testAssert(
      paymentOrderRes.status === 200,
      'POST /api/payments/razorpay-order succeeds with backend Order.totalAmount'
    )
    testAssert(
      paymentOrderRes.data.amount === 179928,
      `Razorpay order amount uses exact Order.totalAmount * 100 paise = 179928 (got ${paymentOrderRes.data.amount})`
    )

    // ==========================================
    // 9. COUPON INTERACTION ON FLASH SALE PRODUCT
    // ==========================================
    console.log('\n[9] Coupon Interaction on Flash Sale Pricing:')
    await Coupon.deleteMany({ code: 'FLASHCOUPON10' })
    const coupon10 = await Coupon.create({
      code: 'FLASHCOUPON10',
      type: 'percentage',
      value: 10,
      minimumOrderValue: 500,
      isActive: true,
      startsAt: new Date(now.getTime() - 3600 * 1000),
      expiresAt: new Date(now.getTime() + 24 * 3600 * 1000),
      createdBy: adminUser._id,
    })

    // Customer creates new order with coupon applied to flash sale item
    const orderWithCouponRes = await request(
      {
        path: '/api/orders',
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
      },
      {
        shippingAddress: {
          fullName: 'Flash Coupon Tester',
          phone: '9876543210',
          addressLine: '12 Fashion Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        couponCode: 'FLASHCOUPON10',
      }
    )
    testAssert(orderWithCouponRes.status === 201, 'Order with coupon and flash sale product creates successfully')
    const orderWithCoupon = orderWithCouponRes.data.order
    testAssert(orderWithCoupon.subtotal === 1799.28, 'Subtotal reflects flash sale price ₹1799.28')
    // 10% coupon on 1799.28 = 179.93
    testAssert(orderWithCoupon.discount === 179.93, `Coupon discount calculated on flash sale price: ₹179.93 (got ${orderWithCoupon.discount})`)
    // 1799.28 - 179.93 = 1619.35
    testAssert(orderWithCoupon.totalAmount === 1619.35, `Final total authoritatively calculated: ₹1619.35 (got ${orderWithCoupon.totalAmount})`)

    // ==========================================
    // 10. ADMIN RBAC & CRUD OPERATIONS
    // ==========================================
    console.log('\n[10] Admin RBAC & Security Operations:')
    // Unauthorized customer attempt
    const customerAdminAttempt = await request(
      {
        path: '/api/flash-sales/admin/all',
        headers: { Authorization: `Bearer ${customerToken}` },
      }
    )
    testAssert(customerAdminAttempt.status === 403, 'Non-admin customer forbidden from admin endpoints (HTTP 403)')

    // Admin toggle status
    const toggleRes = await request(
      {
        path: `/api/flash-sales/admin/${activeSale._id}/toggle`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    testAssert(toggleRes.status === 200, 'Admin can toggle flash sale status')

    // Admin delete
    const deleteRes = await request(
      {
        path: `/api/flash-sales/admin/${activeSale._id}`,
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    )
    testAssert(deleteRes.status === 200, 'Admin can delete flash sale')

  } catch (err) {
    console.error('Test execution failed with error:', err)
    failed++
  } finally {
    // Cleanup
    await FlashSale.deleteMany({ name: { $regex: /^TestSale/ } })
    await Product.deleteMany({ name: { $regex: /^FlashTest/ } })
    await User.deleteMany({ email: { $in: ['flash_admin@test.com', 'flash_customer@test.com'] } })
    await Coupon.deleteMany({ code: 'FLASHCOUPON10' })
    await mongoose.disconnect()
    server.close()

    console.log('\n=============================================')
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
    console.log('=============================================')
    process.exit(failed > 0 ? 1 : 0)
  }
}

runTests()
