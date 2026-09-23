const {
  TAXONOMY,
  isValidCategory,
  isValidDepartment,
  isValidSubcategory,
} = require('../src/constants/taxonomy')
const {
  validateCreateProductInput,
  validateUpdateProductInput,
} = require('../src/validators/productValidator')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

console.log('=== TEST SUITE: TAXONOMY UNIT VALIDATION ===')

// 1. Kids Department and Subcategories
assert(isValidCategory('fashion'), 'fashion is valid category')
assert(isValidDepartment('fashion', 'kids'), 'Fashion -> Kids is valid department')
assert(isValidSubcategory('fashion', 'kids', 'boys'), 'Fashion -> Kids -> Boys is valid subcategory')
assert(isValidSubcategory('fashion', 'kids', 'girls'), 'Fashion -> Kids -> Girls is valid subcategory')
assert(isValidSubcategory('fashion', 'kids', 'kids-clothing'), 'Fashion -> Kids -> Kids Clothing is valid subcategory')
assert(isValidSubcategory('fashion', 'kids', 'kids-footwear'), 'Fashion -> Kids -> Kids Footwear is valid subcategory')
assert(isValidSubcategory('fashion', 'kids', 'kids-accessories'), 'Fashion -> Kids -> Kids Accessories is valid subcategory')

// 2. Existing valid taxonomy combinations preserved
assert(isValidDepartment('fashion', 'men'), 'Fashion -> Men is valid department')
assert(isValidDepartment('fashion', 'women'), 'Fashion -> Women is valid department')
assert(isValidDepartment('fashion', 'footwear'), 'Fashion -> Footwear is valid department')
assert(isValidDepartment('fashion', 'accessories'), 'Fashion -> Accessories is valid department')
assert(isValidDepartment('fashion', 'beauty-fragrance'), 'Fashion -> Beauty & Fragrance is valid department')
assert(isValidSubcategory('fashion', 'men', 'shirts'), 'Fashion -> Men -> Shirts is valid')
assert(isValidSubcategory('fashion', 'women', 'tops'), 'Fashion -> Women -> Tops is valid')

// 3. Electronics & Invalid combinations correctly rejected
assert(!isValidCategory('electronics'), 'Electronics category is REJECTED')
assert(!isValidDepartment('electronics', 'audio'), 'Electronics -> Audio is REJECTED')
assert(!isValidDepartment('electronics', 'gaming'), 'Electronics -> Gaming is REJECTED')
assert(!isValidDepartment('electronics', 'wearables'), 'Electronics -> Wearables is REJECTED')
assert(!isValidDepartment('electronics', 'mobiles-tablets'), 'Electronics -> Mobiles & Tablets is REJECTED')
assert(!isValidDepartment('electronics', 'computers'), 'Electronics -> Computers is REJECTED')
assert(!isValidDepartment('electronics', 'home-electronics'), 'Electronics -> Home Electronics is REJECTED')
assert(!isValidSubcategory('fashion', 'kids', 'shirts'), 'Fashion -> Kids -> Shirts is REJECTED')
assert(!isValidSubcategory('fashion', 'kids', 'earbuds'), 'Fashion -> Kids -> Earbuds is REJECTED')
assert(!isValidSubcategory('fashion', 'men', 'earbuds'), 'Fashion -> Men -> Earbuds is REJECTED')
assert(!isValidSubcategory('fashion', 'men', 'boys'), 'Fashion -> Men -> Boys is REJECTED')
assert(!isValidDepartment('electronics', 'kids'), 'Electronics -> Kids is REJECTED')
assert(!isValidSubcategory('electronics', 'kids', 'boys'), 'Electronics -> Kids -> Boys is REJECTED')

console.log('\n=== TEST SUITE: PRODUCT VALIDATOR & AGERANGE ===')

// 4. Create Product Validator with Kids and ageRange
const validKidsInput = {
  name: "Boys' Cotton Graphic T-Shirt",
  description: "Soft breathable 100% cotton tee for boys everyday wear.",
  price: 699,
  category: "fashion",
  department: "kids",
  subcategory: "boys",
  brand: "TrendVolt Junior",
  stock: 25,
  images: ["https://example.com/kids-tee.jpg"],
  ageRange: "8-10 years",
}

const v1 = validateCreateProductInput(validKidsInput)
assert(v1.isValid === true, 'validateCreateProductInput accepts valid Kids product with ageRange')
assert(v1.sanitized.category === 'fashion', 'Sanitized category is fashion')
assert(v1.sanitized.department === 'kids', 'Sanitized department is kids')
assert(v1.sanitized.subcategory === 'boys', 'Sanitized subcategory is boys')
assert(v1.sanitized.ageRange === '8-10 years', 'Sanitized ageRange is "8-10 years"')

// 5. Create Product Validator Rejections
const invalidKidsInput1 = {
  ...validKidsInput,
  subcategory: 'shirts', // Not valid for kids!
}
const v2 = validateCreateProductInput(invalidKidsInput1)
assert(v2.isValid === false, 'validateCreateProductInput rejects Fashion -> Kids -> Shirts')
assert(Boolean(v2.errors.subcategory), 'Error indicates subcategory is invalid for kids')

const invalidKidsInput2 = {
  ...validKidsInput,
  category: 'electronics',
  department: 'kids',
}
const v3 = validateCreateProductInput(invalidKidsInput2)
assert(v3.isValid === false, 'validateCreateProductInput rejects Electronics -> Kids')

const invalidKidsInput3 = {
  ...validKidsInput,
  department: 'men',
  subcategory: 'boys',
}
const v4 = validateCreateProductInput(invalidKidsInput3)
assert(v4.isValid === false, 'validateCreateProductInput rejects Fashion -> Men -> Boys')

// 6. Update Product Validator with ageRange
const existingProductMock = {
  _id: '507f1f77bcf86cd799439011',
  category: 'fashion',
  department: 'kids',
  subcategory: 'boys',
}
const updateInput = {
  ageRange: '8-10 years',
  price: 799,
}
const v5 = validateUpdateProductInput(updateInput, existingProductMock)
assert(v5.isValid === true, 'validateUpdateProductInput accepts ageRange update')
assert(v5.sanitized.ageRange === '8-10 years', 'Sanitized update ageRange is "8-10 years"')

// 7. Update Product Validator Electronics Rejections
const updateElectronics = { category: 'electronics' }
const v6 = validateUpdateProductInput(updateElectronics, existingProductMock)
assert(v6.isValid === false, 'validateUpdateProductInput rejects update to category: electronics')
assert(Boolean(v6.errors.category), 'Error confirms category must be fashion')

const updateAudioDept = { department: 'audio' }
const v7 = validateUpdateProductInput(updateAudioDept, existingProductMock)
assert(v7.isValid === false, 'validateUpdateProductInput rejects update to department: audio')

console.log(`\nResults: ${passed} passed, ${failed} failed.`)
if (failed > 0) {
  process.exit(1)
}
