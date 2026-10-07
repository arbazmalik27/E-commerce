/**
 * Verification Suite for TrendVolt Phase 3D:
 * Product Try-On Capability Foundation (Backend)
 */

const { validateCreateProductInput, validateUpdateProductInput } = require('../src/validators/productValidator')
const Product = require('../src/models/Product')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✓ PASS: ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

console.log('\n=== TEST SUITE: PHASE 3D PRODUCT TRY-ON CAPABILITY ===\n')

// 1. Validator: Create product with valid top Try-On capability
const validTop = validateCreateProductInput({
  name: 'Classic Linen Shirt',
  description: 'Breathable linen shirt for summer.',
  price: 2499,
  category: 'fashion',
  department: 'men',
  subcategory: 'shirts',
  brand: 'TrendVolt Atelier',
  stock: 25,
  tryOn: { enabled: true, garmentType: 'top' },
})
assert(validTop.isValid, 'validateCreateProductInput accepts valid top tryOn')
assert(validTop.sanitized.tryOn.enabled === true, 'Sanitized tryOn.enabled is true')
assert(validTop.sanitized.tryOn.garmentType === 'top', 'Sanitized tryOn.garmentType is "top"')

// 2. Validator: Create product with valid bottom Try-On capability
const validBottom = validateCreateProductInput({
  name: 'Relaxed Chino Trousers',
  description: 'Tailored cotton chinos.',
  price: 2999,
  category: 'fashion',
  department: 'men',
  subcategory: 'trousers',
  brand: 'TrendVolt Atelier',
  stock: 15,
  tryOn: { enabled: true, garmentType: 'bottom' },
})
assert(validBottom.isValid, 'validateCreateProductInput accepts valid bottom tryOn')
assert(validBottom.sanitized.tryOn.enabled === true, 'Sanitized bottom tryOn.enabled is true')
assert(validBottom.sanitized.tryOn.garmentType === 'bottom', 'Sanitized bottom tryOn.garmentType is "bottom"')

// 3. Validator: Rejects invalid garment type
const invalidGarment = validateCreateProductInput({
  name: 'Leather Oxford Shoes',
  description: 'Formal dress shoes.',
  price: 4999,
  category: 'fashion',
  department: 'footwear',
  brand: 'TrendVolt Footwear',
  stock: 10,
  tryOn: { enabled: true, garmentType: 'shoes' },
})
assert(!invalidGarment.isValid, 'validateCreateProductInput rejects unsupported garmentType "shoes"')
assert(
  invalidGarment.errors['tryOn.garmentType']?.includes('either "top" or "bottom"'),
  'Returns clear error message for unsupported garment type'
)

// 4. Validator: Rejects enabled: true without garmentType
const missingGarmentType = validateCreateProductInput({
  name: 'Classic Blazer',
  description: 'Formal structured blazer.',
  price: 6999,
  category: 'fashion',
  department: 'men',
  brand: 'TrendVolt Atelier',
  stock: 5,
  tryOn: { enabled: true },
})
assert(!missingGarmentType.isValid, 'validateCreateProductInput rejects enabled: true without garmentType')

// 5. Validator: Default when tryOn is omitted
const omittedTryOn = validateCreateProductInput({
  name: 'Silk Pocket Square',
  description: 'Fine silk accessory.',
  price: 799,
  category: 'fashion',
  department: 'accessories',
  brand: 'TrendVolt Accessories',
  stock: 50,
})
assert(omittedTryOn.isValid, 'validateCreateProductInput accepts product without tryOn')
assert(omittedTryOn.sanitized.tryOn.enabled === false, 'Default tryOn.enabled is false')
assert(omittedTryOn.sanitized.tryOn.garmentType === null, 'Default tryOn.garmentType is null')

// 6. Validator: Update product with tryOn
const validUpdate = validateUpdateProductInput({
  tryOn: { enabled: true, garmentType: 'top' },
})
assert(validUpdate.isValid, 'validateUpdateProductInput accepts tryOn update')
assert(validUpdate.sanitized.tryOn.enabled === true, 'Sanitized update tryOn.enabled is true')
assert(validUpdate.sanitized.tryOn.garmentType === 'top', 'Sanitized update tryOn.garmentType is "top"')

// 7. Validator: Disable tryOn on update
const disableUpdate = validateUpdateProductInput({
  tryOn: { enabled: false },
})
assert(disableUpdate.isValid, 'validateUpdateProductInput accepts disabling tryOn')
assert(disableUpdate.sanitized.tryOn.enabled === false, 'Sanitized disabled tryOn.enabled is false')
assert(disableUpdate.sanitized.tryOn.garmentType === null, 'Sanitized disabled tryOn.garmentType is null')

// 8. Model Schema Invariant Test
const productDoc = new Product({
  name: 'Model Test Garment',
  description: 'Testing schema invariants',
  price: 1999,
  category: 'fashion',
  brand: 'TrendVolt',
  stock: 10,
  tryOn: { enabled: true, garmentType: 'top', assetUrl: '/models/garments/shirt_01.glb', assetStatus: 'active' },
})
assert(productDoc.tryOn.enabled === true, 'Product model preserves tryOn.enabled')
assert(productDoc.tryOn.garmentType === 'top', 'Product model preserves tryOn.garmentType')
assert(productDoc.tryOn.assetUrl === '/models/garments/shirt_01.glb', 'Product model preserves tryOn.assetUrl')
assert(productDoc.tryOn.assetStatus === 'active', 'Product model preserves tryOn.assetStatus')

// 9. Phase 3E Real Garment Metadata Validation
const validAssetProduct = validateCreateProductInput({
  name: 'Tailored Oxford Shirt',
  description: 'Verified 3D mesh product.',
  price: 3499,
  category: 'fashion',
  department: 'men',
  subcategory: 'shirts',
  brand: 'TrendVolt Atelier',
  stock: 12,
  tryOn: {
    enabled: true,
    garmentType: 'top',
    assetUrl: '/models/garments/oxford_shirt.glb',
  },
})
assert(validAssetProduct.isValid, 'validateCreateProductInput accepts product with valid assetUrl')
assert(validAssetProduct.sanitized.tryOn.assetUrl === '/models/garments/oxford_shirt.glb', 'Sanitizes and preserves valid assetUrl')
assert(validAssetProduct.sanitized.tryOn.assetStatus === 'active', 'Defaults assetStatus to active when assetUrl is present')

const pendingAssetProduct = validateCreateProductInput({
  name: 'Summer Knit Top',
  description: 'Try-On enabled without linked asset.',
  price: 1999,
  category: 'fashion',
  department: 'women',
  subcategory: 'tops',
  brand: 'TrendVolt Studio',
  stock: 20,
  tryOn: {
    enabled: true,
    garmentType: 'top',
  },
})
assert(pendingAssetProduct.isValid, 'validateCreateProductInput accepts tryOn without assetUrl')
assert(pendingAssetProduct.sanitized.tryOn.assetUrl === null, 'Sanitizes omitted assetUrl as null')
assert(pendingAssetProduct.sanitized.tryOn.assetStatus === 'pending', 'Defaults assetStatus to pending when assetUrl is omitted')

// 10. Phase 3F Strict Active Validation: Active status requires asset reference
const invalidActiveProduct = validateCreateProductInput({
  name: 'No Mesh Jacket',
  description: 'Attempts active status without asset.',
  price: 4999,
  category: 'fashion',
  department: 'men',
  subcategory: 'jackets',
  brand: 'TrendVolt',
  stock: 5,
  tryOn: {
    enabled: true,
    garmentType: 'top',
    assetStatus: 'active',
  },
})
assert(!invalidActiveProduct.isValid, 'Rejects assetStatus: active when asset reference is missing')
assert(
  invalidActiveProduct.errors['tryOn.assetStatus']?.includes('Active Try-On requires a valid production garment asset reference'),
  'Returns clear error when active status lacks asset reference'
)

// 11. Phase 3F assetReference alias support
const aliasAssetProduct = validateCreateProductInput({
  name: 'Pleated Chino Pants',
  description: 'Uses assetReference alias.',
  price: 3299,
  category: 'fashion',
  department: 'men',
  subcategory: 'trousers',
  brand: 'TrendVolt',
  stock: 10,
  tryOn: {
    enabled: true,
    garmentType: 'bottom',
    assetReference: '/models/garments/chino.glb',
  },
})
assert(aliasAssetProduct.isValid, 'Accepts tryOn using assetReference alias')
assert(aliasAssetProduct.sanitized.tryOn.assetUrl === '/models/garments/chino.glb', 'Maps assetReference to assetUrl correctly')

// 12. Phase 3F Update preserves existing assetUrl when admin updates without specifying assetUrl
const mockExisting = {
  tryOn: {
    enabled: true,
    garmentType: 'top',
    assetUrl: '/models/garments/existing_shirt.glb',
    assetStatus: 'active',
  },
}
const adminSimpleUpdate = validateUpdateProductInput(
  {
    tryOn: {
      enabled: true,
      garmentType: 'top',
    },
  },
  mockExisting
)
assert(adminSimpleUpdate.isValid, 'Accepts simple admin update without re-specifying assetUrl')
assert(adminSimpleUpdate.sanitized.tryOn.assetUrl === '/models/garments/existing_shirt.glb', 'Preserves existing assetUrl on update')
assert(adminSimpleUpdate.sanitized.tryOn.assetStatus === 'active', 'Preserves active status when assetUrl exists')

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`)
if (failed > 0) process.exit(1)
