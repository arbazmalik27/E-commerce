const path = require('path')
const http = require('http')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const app = require('../src/app')
const Product = require('../src/models/Product')
const User = require('../src/models/User')
const FlashSale = require('../src/models/FlashSale')
const { getWishlistRecommendations } = require('../src/services/wishlistRecommendationService')

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
  console.log('--- STARTING FEATURE #9 WISHLIST RECOMMENDATIONS TEST SUITE ---')

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
    // -------------------------------------------------------------------------
    // CLEANUP STALE TEST DATA
    // -------------------------------------------------------------------------
    await User.deleteMany({ email: { $in: ['wrec_user_a@test.com', 'wrec_user_b@test.com', 'wrec_empty@test.com'] } })
    await Product.deleteMany({ name: { $regex: /^WrecTest/ } })
    await FlashSale.deleteMany({ name: { $regex: /^WrecSale/ } })

    // -------------------------------------------------------------------------
    // CREATE TEST USERS
    // -------------------------------------------------------------------------
    const userA = await User.create({
      name: 'Wishlist User A',
      email: 'wrec_user_a@test.com',
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      wishlist: [],
    })

    const userB = await User.create({
      name: 'Wishlist User B',
      email: 'wrec_user_b@test.com',
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      wishlist: [],
    })

    const emptyUser = await User.create({
      name: 'Empty Wishlist User',
      email: 'wrec_empty@test.com',
      password: 'Password123!',
      role: 'customer',
      isActive: true,
      wishlist: [],
    })

    const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
    const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
    const tokenEmpty = jwt.sign({ id: emptyUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' })

    // -------------------------------------------------------------------------
    // CREATE TEST PRODUCTS
    // -------------------------------------------------------------------------
    // Wishlist item for User A: Men -> Shirts, Brand: TrendVolt, Price: 2000
    const wishShirtA = await Product.create({
      name: 'WrecTest Linen Oversized Shirt A',
      description: 'Linen casual shirt in olive green.',
      price: 2000,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'TrendVolt',
      stock: 15,
      isActive: true,
    })

    // Wishlist item 2 for User A: Men -> Jeans, Brand: DenimCo, Price: 3000
    const wishJeansA = await Product.create({
      name: 'WrecTest Selvedge Jeans A',
      description: 'Classic straight cut denim.',
      price: 3000,
      category: 'fashion',
      department: 'men',
      subcategory: 'jeans',
      brand: 'DenimCo',
      stock: 10,
      isActive: true,
    })

    // Candidate 1: Same subcategory (shirts), same department (men), same brand (TrendVolt), similar price (2100)
    // Matches shirt on: subcategory(+40), dept(+20), brand(+15), price(+10) = 85. Matches jeans on dept(+20) = 105 total!
    const candPerfectShirt = await Product.create({
      name: 'WrecTest Studio Poplin Shirt Candidate',
      description: 'Clean crisp cotton shirt.',
      price: 2100,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'TrendVolt',
      stock: 25,
      isActive: true,
    })

    // Candidate 2: Same subcategory (shirts), same dept (men), different brand (OtherBrand), different price (5000)
    // Matches shirt on: subcategory(+40), dept(+20) = 60. Matches jeans on dept(+20) = 80 total.
    const candDiffBrandShirt = await Product.create({
      name: 'WrecTest Silk Blend Shirt Candidate',
      description: 'Luxury evening shirt.',
      price: 5000,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'OtherBrand',
      stock: 8,
      isActive: true,
    })

    // Candidate 3: Same subcategory (jeans), same dept (men), different brand, similar price (3100)
    // Matches jeans on: subcategory(+40), dept(+20), price(+10) = 70. Matches shirt on dept(+20) = 90 total.
    const candJeansMatch = await Product.create({
      name: 'WrecTest Relaxed Fit Jeans Candidate',
      description: 'Washed indigo denim.',
      price: 3100,
      category: 'fashion',
      department: 'men',
      subcategory: 'jeans',
      brand: 'UrbanCraft',
      stock: 12,
      isActive: true,
    })

    // Candidate 4: Same dept (men), different subcategory (jackets-coats), different brand
    // Matches shirt dept(+20) + jeans dept(+20) = 40 total.
    const candJacketMatch = await Product.create({
      name: 'WrecTest Utility Jacket Candidate',
      description: 'Structured canvas jacket.',
      price: 4500,
      category: 'fashion',
      department: 'men',
      subcategory: 'jackets-coats',
      brand: 'WorkwearInc',
      stock: 10,
      isActive: true,
    })

    // Candidate 5: Inactive product (must be excluded)
    const candInactive = await Product.create({
      name: 'WrecTest Inactive Shirt',
      description: 'Should never appear in recommendations.',
      price: 2000,
      category: 'fashion',
      department: 'men',
      subcategory: 'shirts',
      brand: 'TrendVolt',
      stock: 20,
      isActive: false,
    })

    // Candidate 6: Out of stock product (must be excluded)
    const candOutOfStock = await Product.create({
      name: 'WrecTest Out of Stock Jeans',
      description: 'Zero inventory product.',
      price: 2800,
      category: 'fashion',
      department: 'men',
      subcategory: 'jeans',
      brand: 'DenimCo',
      stock: 0,
      isActive: true,
    })

    // Candidate 7: Different department altogether (women -> dresses)
    const candWomenDress = await Product.create({
      name: 'WrecTest Silk Slip Dress',
      description: 'Women dress piece.',
      price: 3500,
      category: 'fashion',
      department: 'women',
      subcategory: 'dresses',
      brand: 'StudioFemme',
      stock: 14,
      isActive: true,
    })

    // Assign wishlist to userA: contains shirt A and jeans A
    await User.findByIdAndUpdate(userA._id, {
      wishlist: [wishShirtA._id, wishJeansA._id],
    })

    // Assign wishlist to userB: contains women dress
    await User.findByIdAndUpdate(userB._id, {
      wishlist: [candWomenDress._id],
    })

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated request to wishlist-recommendations returns 401
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Authentication & Security ---')
    const resUnauth = await request({ path: '/api/products/wishlist-recommendations' })
    testAssert(resUnauth.status === 401, 'Unauthenticated request returns 401')

    // -------------------------------------------------------------------------
    // TEST 2: Empty wishlist user gets clean empty state
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Empty Wishlist State ---')
    const resEmpty = await request({
      path: '/api/products/wishlist-recommendations',
      headers: { Authorization: `Bearer ${tokenEmpty}` },
    })
    testAssert(resEmpty.status === 200, 'Empty wishlist request returns 200')
    testAssert(resEmpty.data.success === true, 'Response success is true')
    testAssert(resEmpty.data.hasRecommendations === false, 'hasRecommendations is false')
    testAssert(Array.isArray(resEmpty.data.recommendations) && resEmpty.data.recommendations.length === 0, 'recommendations is empty array')

    // -------------------------------------------------------------------------
    // TEST 3: Authenticated user receives wishlist recommendations
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Authenticated Wishlist Recommendations ---')
    const resA = await request({
      path: '/api/products/wishlist-recommendations',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    testAssert(resA.status === 200, 'Authenticated request returns 200')
    testAssert(resA.data.success === true, 'Response success is true')
    testAssert(resA.data.hasRecommendations === true, 'hasRecommendations is true')
    testAssert(Array.isArray(resA.data.recommendations) && resA.data.recommendations.length > 0, 'Returns non-empty recommendations array')

    const recIds = resA.data.recommendations.map((r) => r._id.toString())

    // -------------------------------------------------------------------------
    // TEST 4: Wishlist items are strictly excluded from recommendations
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Wishlist Exclusions ---')
    testAssert(!recIds.includes(wishShirtA._id.toString()), 'Saved wishShirtA is excluded from recommendations')
    testAssert(!recIds.includes(wishJeansA._id.toString()), 'Saved wishJeansA is excluded from recommendations')

    // -------------------------------------------------------------------------
    // TEST 5: Inactive and Out of Stock products are strictly excluded
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Availability Exclusions ---')
    testAssert(!recIds.includes(candInactive._id.toString()), 'Inactive product is excluded')
    testAssert(!recIds.includes(candOutOfStock._id.toString()), 'Out of stock product is excluded')

    // -------------------------------------------------------------------------
    // TEST 6: Deterministic Scoring & Ordering
    // candPerfectShirt matched subcategory + brand + price + department on shirt & department on jeans => Highest score!
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Deterministic Scoring & Ranking ---')
    testAssert(recIds[0] === candPerfectShirt._id.toString(), 'Top recommendation is candPerfectShirt with highest combined similarity')
    testAssert(recIds.includes(candJeansMatch._id.toString()), 'candJeansMatch is included in recommendations')
    testAssert(!resA.data.recommendations[0].score, 'Internal scoring is not exposed to client')

    // -------------------------------------------------------------------------
    // TEST 7: User Isolation & IDOR Protection
    // Passing ?userId=userB._id in query should NOT change recommendations
    // -------------------------------------------------------------------------
    console.log('\n--- 7. User Isolation & IDOR Protection ---')
    const resIdor = await request({
      path: `/api/products/wishlist-recommendations?userId=${userB._id}`,
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const idorIds = resIdor.data.recommendations.map((r) => r._id.toString())
    testAssert(!idorIds.includes(candWomenDress._id.toString()), 'Client-supplied userId query parameter is ignored')
    testAssert(idorIds[0] === candPerfectShirt._id.toString(), 'Recommendations strictly match authenticated userA')

    // User B requesting recommendations gets recommendations matching User B's wishlist
    const resB = await request({
      path: '/api/products/wishlist-recommendations',
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    const recIdsB = resB.data.recommendations.map((r) => r._id.toString())
    testAssert(!recIdsB.includes(candPerfectShirt._id.toString()), 'User B does not receive User A recommendations')

    // -------------------------------------------------------------------------
    // TEST 8: Duplicate wishlist IDs handle gracefully
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Duplicate Wishlist IDs ---')
    await User.findByIdAndUpdate(userA._id, {
      wishlist: [wishShirtA._id, wishShirtA._id, wishJeansA._id],
    })
    const resDup = await request({
      path: '/api/products/wishlist-recommendations',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    testAssert(resDup.status === 200, 'Duplicate wishlist IDs handled gracefully')
    testAssert(resDup.data.hasRecommendations === true, 'Recommendations generated successfully despite duplicate IDs')

    // -------------------------------------------------------------------------
    // TEST 9: Single Wishlist Item
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Single Wishlist Item ---')
    await User.findByIdAndUpdate(userA._id, {
      wishlist: [wishShirtA._id],
    })
    const resSingle = await request({
      path: '/api/products/wishlist-recommendations',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    testAssert(resSingle.status === 200, 'Single wishlist item returns 200')
    testAssert(resSingle.data.hasRecommendations === true, 'Single item generates recommendations')
    const singleRecIds = resSingle.data.recommendations.map((r) => r._id.toString())
    testAssert(singleRecIds.includes(candPerfectShirt._id.toString()), 'Contains matching shirt candidate')

    // -------------------------------------------------------------------------
    // TEST 10: Limit Parameter Handling & Bounding
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Limit Parameter Bounding ---')
    const resLimit1 = await request({
      path: '/api/products/wishlist-recommendations?limit=2',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    testAssert(resLimit1.data.recommendations.length <= 2, 'Respects limit=2')

    const resLimitExcessive = await request({
      path: '/api/products/wishlist-recommendations?limit=999',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    testAssert(resLimitExcessive.data.recommendations.length <= 8, 'Caps excessive limit at maximum 8')

    // -------------------------------------------------------------------------
    // TEST 11: Flash Sale Pricing Integration (pricingService)
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Flash Sale Integration ---')
    const now = new Date()
    const activeFlashSale = await FlashSale.create({
      name: 'WrecSale 20% Off Shirts',
      slug: 'wrecsale-20-off-shirts',
      discountType: 'percentage',
      discountValue: 20,
      startAt: new Date(now.getTime() - 3600000), // started 1h ago
      endAt: new Date(now.getTime() + 3600000),   // ends in 1h
      active: true,
      products: [candPerfectShirt._id],
    })

    const resSale = await request({
      path: '/api/products/wishlist-recommendations',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const recPerfectWithSale = resSale.data.recommendations.find(
      (r) => r._id.toString() === candPerfectShirt._id.toString()
    )
    testAssert(recPerfectWithSale !== undefined, 'Recommended product is present')
    testAssert(recPerfectWithSale.isFlashSale === true, 'isFlashSale is true for active flash sale')
    testAssert(recPerfectWithSale.originalPrice === 2100, 'Original price is preserved')
    // 2100 - 20% = 1680
    testAssert(recPerfectWithSale.price === 1680, 'Price is discounted to authoritative salePrice (1680)')
    testAssert(recPerfectWithSale.salePrice === 1680, 'salePrice is 1680')
    testAssert(recPerfectWithSale.discountPercentage === 20, 'discountPercentage is 20')

    // Verify raw product price in MongoDB is never altered
    const candInDb = await Product.findById(candPerfectShirt._id).lean()
    testAssert(candInDb.price === 2100, 'Product.price in MongoDB is not mutated by flash sale')

    // Expired flash sale should not apply discount
    await FlashSale.findByIdAndUpdate(activeFlashSale._id, {
      endAt: new Date(now.getTime() - 60000), // expired 1m ago
    })

    const resExpiredSale = await request({
      path: '/api/products/wishlist-recommendations',
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const recPerfectExpired = resExpiredSale.data.recommendations.find(
      (r) => r._id.toString() === candPerfectShirt._id.toString()
    )
    testAssert(recPerfectExpired.isFlashSale === false, 'Expired sale is not marked as flash sale')
    testAssert(recPerfectExpired.price === 2100, 'Price returns to normal effective price (2100)')

    // -------------------------------------------------------------------------
    // TEST 12: Direct Service Level Unit Checks
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Direct Service Level Checks ---')
    const invalidUserRes = await getWishlistRecommendations('invalid-id')
    testAssert(invalidUserRes.success === true && invalidUserRes.hasRecommendations === false, 'Invalid user ID returns clean fallback')

    const nonExistentUserRes = await getWishlistRecommendations(new mongoose.Types.ObjectId().toString())
    testAssert(nonExistentUserRes.success === true && nonExistentUserRes.hasRecommendations === false, 'Non-existent user returns clean fallback')

    console.log('\n==================================================')
    console.log(`TOTAL TESTS: ${passed + failed}`)
    console.log(`PASSED: ${passed}`)
    console.log(`FAILED: ${failed}`)
    console.log('==================================================')

  } catch (err) {
    console.error('Error during test execution:', err)
    failed++
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP ALL TEST RECORDS
    // -------------------------------------------------------------------------
    await User.deleteMany({ email: { $in: ['wrec_user_a@test.com', 'wrec_user_b@test.com', 'wrec_empty@test.com'] } })
    await Product.deleteMany({ name: { $regex: /^WrecTest/ } })
    await FlashSale.deleteMany({ name: { $regex: /^WrecSale/ } })

    if (server) {
      server.close()
    }
    await mongoose.connection.close()
  }

  process.exit(failed > 0 ? 1 : 0)
}

runTests()
