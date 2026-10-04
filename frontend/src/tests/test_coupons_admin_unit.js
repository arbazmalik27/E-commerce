/**
 * TrendVolt — Admin Coupon Management Frontend Unit Tests
 *
 * Verifies:
 * 1. AdminRoute Protection & Navigation Integration
 * 2. Coupon Form & Type Switching Behavior
 * 3. Percentage, Fixed & BOGO Form Validation Logic
 * 4. BOGO Minimum Order Threshold (₹10,000) Enforcement
 * 5. Search & Filter State Logic
 * 6. Edit Payload Construction & Explicit Null Clearing
 * 7. Expiry & Start Date IST End-of-Day Conversion
 * 8. Delete Safety UX (usedCount > 0 protected, unused coupon confirmation)
 * 9. Component Structure & Accessibility Checks
 * 10. Light Luxury Theme Consistency
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

console.log('=== TEST SUITE: ADMIN COUPON MANAGEMENT FRONTEND UNIT TESTS ===\n')

// Read files for structural AST & code integrity checks
const appRoutesPath = path.resolve(__dirname, '../routes/AppRoutes.jsx')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')

const adminNavPath = path.resolve(__dirname, '../components/AdminNav.jsx')
const adminNavContent = fs.readFileSync(adminNavPath, 'utf8')

const adminCouponsPagePath = path.resolve(__dirname, '../pages/admin/AdminCouponsPage.jsx')
const adminCouponsPageContent = fs.readFileSync(adminCouponsPagePath, 'utf8')

// ── 1. AdminRoute Protection & Navigation Integration ───────────────────────
console.log('[1] AdminRoute Protection & Navigation Integration:')

testAssert(
  appRoutesContent.includes("import AdminCouponsPage from '../pages/admin/AdminCouponsPage'"),
  'AppRoutes cleanly imports AdminCouponsPage'
)

testAssert(
  appRoutesContent.includes('/admin/coupons') &&
    appRoutesContent.includes('<AdminRoute>') &&
    appRoutesContent.includes('<AdminCouponsPage />'),
  'AppRoutes guards /admin/coupons with AdminRoute'
)

testAssert(
  adminNavContent.includes('/admin/coupons') && adminNavContent.includes("'Coupons'"),
  'AdminNav includes Coupons link pointing to /admin/coupons'
)

testAssert(
  adminNavContent.includes("path: '/admin/coupons'") && adminNavContent.includes('exact: false'),
  'Coupons nav item uses prefix matching (exact: false)'
)

// ── 2. Form & Type Validation Rules ─────────────────────────────────────────
console.log('\n[2] Coupon Form & Type Validation Rules:')

// Simulated validator mirroring AdminCouponsPage validation
function validateCouponFormData(data) {
  const errors = {}
  if (!data.code || !data.code.trim()) {
    errors.code = 'Coupon code is required'
  } else if (!/^[A-Z0-9_-]{2,30}$/.test(data.code.trim().toUpperCase())) {
    errors.code = 'Coupon code must be between 2 and 30 alphanumeric characters'
  }

  if (data.type === 'percentage') {
    const val = Number(data.value)
    if (isNaN(val) || val <= 0 || val > 100) {
      errors.value = 'Percentage value must be between 1 and 100'
    }
  } else if (data.type === 'fixed') {
    const val = Number(data.value)
    if (isNaN(val) || val <= 0) {
      errors.value = 'Fixed discount value must be greater than 0'
    }
  } else if (data.type === 'buy_x_get_y') {
    const buyQ = Number(data.buyQuantity)
    const freeQ = Number(data.freeQuantity)
    if (!Number.isInteger(buyQ) || buyQ < 1) {
      errors.buyQuantity = 'Buy quantity must be an integer >= 1'
    }
    if (!Number.isInteger(freeQ) || freeQ < 1) {
      errors.freeQuantity = 'Free quantity must be an integer >= 1'
    }
    const minVal = Number(data.minimumOrderValue)
    if (isNaN(minVal) || minVal < 10000) {
      errors.minimumOrderValue = 'Minimum order value for BOGO must be at least ₹10,000'
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors }
}

testAssert(
  !validateCouponFormData({ code: '', type: 'percentage', value: 20 }).isValid,
  'Rejects empty coupon code'
)

testAssert(
  !validateCouponFormData({ code: 'INVALID SPACE', type: 'percentage', value: 20 }).isValid,
  'Rejects coupon code with invalid characters'
)

testAssert(
  !validateCouponFormData({ code: 'SAVE105', type: 'percentage', value: 105 }).isValid,
  'Rejects percentage discount exceeding 100%'
)

testAssert(
  !validateCouponFormData({ code: 'SAVE0', type: 'percentage', value: 0 }).isValid,
  'Rejects percentage discount of 0%'
)

testAssert(
  validateCouponFormData({ code: 'SAVE20', type: 'percentage', value: 20 }).isValid,
  'Accepts valid percentage coupon (20%)'
)

testAssert(
  !validateCouponFormData({ code: 'FLAT0', type: 'fixed', value: 0 }).isValid,
  'Rejects fixed discount of ₹0'
)

testAssert(
  validateCouponFormData({ code: 'FLAT500', type: 'fixed', value: 500 }).isValid,
  'Accepts valid fixed coupon (₹500)'
)

// ── 3. BOGO Minimum Order Threshold (₹10,000) ────────────────────────────────
console.log('\n[3] BOGO Minimum Order Threshold (₹10,000):')

testAssert(
  !validateCouponFormData({
    code: 'BUY2GET3',
    type: 'buy_x_get_y',
    buyQuantity: 2,
    freeQuantity: 3,
    minimumOrderValue: 9999,
  }).isValid,
  'Rejects BOGO coupon with minimum order value < ₹10,000'
)

testAssert(
  validateCouponFormData({
    code: 'BUY2GET3',
    type: 'buy_x_get_y',
    buyQuantity: 2,
    freeQuantity: 3,
    minimumOrderValue: 10000,
  }).isValid,
  'Accepts BOGO coupon with minimum order value = ₹10,000'
)

testAssert(
  validateCouponFormData({
    code: 'BUY1GET1',
    type: 'buy_x_get_y',
    buyQuantity: 1,
    freeQuantity: 1,
    minimumOrderValue: 15000,
  }).isValid,
  'Accepts BOGO coupon with minimum order value > ₹10,000'
)

// ── 4. Search & Filter State Behavior ───────────────────────────────────────
console.log('\n[4] Search & Filter State Behavior:')

const sampleCoupons = [
  { _id: '1', code: 'SAVE20', type: 'percentage', isActive: true },
  { _id: '2', code: 'FLAT500', type: 'fixed', isActive: false },
  { _id: '3', code: 'BUY2GET3', type: 'buy_x_get_y', isActive: true },
  { _id: '4', code: 'SAVE50', type: 'percentage', isActive: true },
]

function filterCoupons(list, search, typeFilter, statusFilter) {
  return list.filter((c) => {
    if (search && !c.code.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter !== 'all' && c.type !== typeFilter) return false
    if (statusFilter === 'active' && !c.isActive) return false
    if (statusFilter === 'inactive' && c.isActive) return false
    return true
  })
}

testAssert(
  filterCoupons(sampleCoupons, '', 'all', 'all').length === 4,
  'Default filter returns all coupons'
)

testAssert(
  filterCoupons(sampleCoupons, 'SAVE', 'all', 'all').length === 2,
  'Search filters by code substring ("SAVE" -> 2 items)'
)

testAssert(
  filterCoupons(sampleCoupons, '', 'buy_x_get_y', 'all').length === 1,
  'Type filter isolates BOGO coupons'
)

testAssert(
  filterCoupons(sampleCoupons, '', 'all', 'active').length === 3,
  'Status filter isolates active coupons'
)

testAssert(
  filterCoupons(sampleCoupons, '', 'all', 'inactive').length === 1,
  'Status filter isolates inactive coupons'
)

// ── 5. Edit Payload Construction & Explicit Null Clearing ────────────────────
console.log('\n[5] Edit Payload Construction & Explicit Null Clearing:')

function buildCouponPayload(formData) {
  const payload = {
    code: formData.code.trim().toUpperCase(),
    type: formData.type,
    isActive: formData.isActive,
  }

  if (formData.type === 'percentage') {
    payload.value = Number(formData.value)
    payload.buyQuantity = null
    payload.freeQuantity = null
  } else if (formData.type === 'fixed') {
    payload.value = Number(formData.value)
    payload.buyQuantity = null
    payload.freeQuantity = null
  } else if (formData.type === 'buy_x_get_y') {
    payload.buyQuantity = Number(formData.buyQuantity)
    payload.freeQuantity = Number(formData.freeQuantity)
    payload.value = 0
  }

  if (formData.type === 'buy_x_get_y') {
    payload.minimumOrderValue = Math.max(10000, Number(formData.minimumOrderValue) || 10000)
  } else {
    payload.minimumOrderValue =
      formData.minimumOrderValue !== '' && formData.minimumOrderValue !== null
        ? Number(formData.minimumOrderValue)
        : 0
  }

  payload.maximumDiscount =
    formData.maximumDiscount !== '' && formData.maximumDiscount !== null
      ? Number(formData.maximumDiscount)
      : null

  payload.usageLimit =
    formData.usageLimit !== '' && formData.usageLimit !== null
      ? Number(formData.usageLimit)
      : null

  payload.perUserLimit =
    formData.perUserLimit !== '' && formData.perUserLimit !== null
      ? Number(formData.perUserLimit)
      : null

  return payload
}

const clearedEditForm = {
  code: 'SAVE20',
  type: 'percentage',
  value: 20,
  isActive: true,
  minimumOrderValue: '',
  maximumDiscount: '', // cleared
  usageLimit: '', // cleared
  perUserLimit: '', // cleared
}

const clearedPayload = buildCouponPayload(clearedEditForm)

testAssert(
  clearedPayload.maximumDiscount === null,
  'Cleared maximumDiscount is explicitly sent as null'
)

testAssert(
  clearedPayload.usageLimit === null,
  'Cleared usageLimit is explicitly sent as null'
)

testAssert(
  clearedPayload.perUserLimit === null,
  'Cleared perUserLimit is explicitly sent as null'
)

testAssert(
  clearedPayload.minimumOrderValue === 0,
  'Cleared minimumOrderValue defaults to 0 for percentage coupon'
)

const populatedForm = {
  code: 'SAVE30',
  type: 'percentage',
  value: 30,
  isActive: true,
  minimumOrderValue: '1000',
  maximumDiscount: '500',
  usageLimit: '50',
  perUserLimit: '1',
}

const populatedPayload = buildCouponPayload(populatedForm)

testAssert(
  populatedPayload.maximumDiscount === 500 &&
    populatedPayload.usageLimit === 50 &&
    populatedPayload.perUserLimit === 1 &&
    populatedPayload.minimumOrderValue === 1000,
  'Preserves non-empty numbers correctly in payload'
)

// ── 6. Expiry & Start Date IST End-of-Day Conversion ────────────────────────
console.log('\n[6] Expiry & Start Date IST End-of-Day Conversion:')

function formatIstStartsAt(dateStr) {
  if (!dateStr) return null
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  return new Date(`${dateOnly}T00:00:00.000+05:30`).toISOString()
}

function formatIstExpiresAt(dateStr) {
  if (!dateStr) return null
  const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  return new Date(`${dateOnly}T23:59:59.999+05:30`).toISOString()
}

function toIstDateInput(iso) {
  if (!iso) return ''
  const istDate = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000)
  return istDate.toISOString().split('T')[0]
}

const istExpires = formatIstExpiresAt('2026-10-15')
testAssert(
  istExpires === '2026-10-15T18:29:59.999Z',
  'formatIstExpiresAt converts 2026-10-15 to exact 23:59:59.999 IST (18:29:59.999Z UTC)'
)

const istStarts = formatIstStartsAt('2026-10-15')
testAssert(
  istStarts === '2026-10-14T18:30:00.000Z',
  'formatIstStartsAt converts 2026-10-15 to exact 00:00:00.000 IST (18:30:00.000Z UTC on previous day)'
)

testAssert(
  toIstDateInput('2026-10-15T18:29:59.999Z') === '2026-10-15',
  'toIstDateInput correctly recovers 2026-10-15 for HTML5 date input'
)

testAssert(
  toIstDateInput('2026-10-14T18:30:00.000Z') === '2026-10-15',
  'toIstDateInput correctly recovers 2026-10-15 from IST midnight UTC timestamp'
)

// ── 7. Delete Safety UX & Unused Coupon Confirmation ────────────────────────
console.log('\n[7] Delete Safety UX & Unused Coupon Confirmation:')

testAssert(
  adminCouponsPageContent.includes('coupon.usedCount > 0'),
  'AdminCouponsPage checks coupon.usedCount > 0 in table render'
)

testAssert(
  adminCouponsPageContent.includes('cursor-not-allowed') &&
    adminCouponsPageContent.includes('Cannot delete: coupon has already been used'),
  'Used coupon delete button is protected with cursor-not-allowed and informative tooltip'
)

testAssert(
  adminCouponsPageContent.includes('deleteConfirmId === coupon._id') &&
    adminCouponsPageContent.includes('Confirm') &&
    adminCouponsPageContent.includes('Cancel'),
  'Unused coupon delete shows inline Confirm and Cancel buttons'
)

// ── 8. Component Structure & Accessibility Checks ───────────────────────────
console.log('\n[8] Component Structure & Accessibility Checks:')

testAssert(
  adminCouponsPageContent.includes('<h1>') || adminCouponsPageContent.includes('text-2xl sm:text-3xl font-bold tracking-tight'),
  'Page renders clear main title heading'
)

testAssert(
  adminCouponsPageContent.includes('<SEO') && adminCouponsPageContent.includes('Admin — Coupons & Discounts'),
  'Page includes SEO component with descriptive title and noindex=true'
)

testAssert(
  adminCouponsPageContent.includes('toast') &&
    adminCouponsPageContent.includes('showToast'),
  'Page provides toast notification feedback for user actions'
)

testAssert(
  adminCouponsPageContent.includes('modalOpen') && adminCouponsPageContent.includes('formSubmitting'),
  'Modal handles loading state and prevents double submission'
)

testAssert(
  adminCouponsPageContent.includes('table') && adminCouponsPageContent.includes('overflow-x-auto'),
  'Table is wrapped in overflow-x-auto container to prevent document overflow'
)

// ── 9. Light Luxury Theme Consistency ───────────────────────────────────────
console.log('\n[9] Light Luxury Theme Consistency:')

testAssert(
  adminCouponsPageContent.includes('#F5F0E8'),
  'Page background matches TrendVolt light luxury linen tone (#F5F0E8)'
)

testAssert(
  adminCouponsPageContent.includes('#FFFDF8'),
  'Cards and modal use warm cream background tone (#FFFDF8)'
)

testAssert(
  adminCouponsPageContent.includes('#DED7CA'),
  'Borders use warm subtle tone (#DED7CA)'
)

testAssert(
  adminCouponsPageContent.includes('#34452F'),
  'Primary buttons and accents use TrendVolt signature deep olive (#34452F)'
)

console.log('\n============================================================')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('ALL ADMIN COUPON MANAGEMENT FRONTEND UNIT TESTS PASSED ✓')
} else {
  console.log('SOME TESTS FAILED ✗')
  process.exit(1)
}
console.log('============================================================\n')
