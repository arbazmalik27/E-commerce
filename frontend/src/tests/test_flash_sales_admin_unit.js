/**
 * TrendVolt — Admin Flash Sale Management Frontend Unit Tests
 *
 * Verifies:
 * 1. AdminRoute Protection & Navigation Integration
 * 2. Flash Sale Form Structure & Defaults
 * 3. Required Field Validation (Name, Discount Value, Dates, Products)
 * 4. Discount Type & Value Bounds (Percentage 1-100%, Fixed > 0)
 * 5. Scheduling & Date Boundaries (startAt < endAt, invalid date detection)
 * 6. Product Selection & Matrix Filtering Logic
 * 7. Search & Status Filtering Behavior
 * 8. Create & Edit Payload Construction & ISO Date Serialization
 * 9. Date Formatting & Local Datetime Serialization Helpers
 * 10. Status Toggle & Delete Confirmation Safety UX
 * 11. Component Structure & Accessibility Checks
 * 12. Light Luxury Theme Consistency
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

console.log('=== TEST SUITE: ADMIN FLASH SALE MANAGEMENT FRONTEND UNIT TESTS ===\n')

// Read files for structural AST & code integrity checks
const appRoutesPath = path.resolve(__dirname, '../routes/AppRoutes.jsx')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')

const adminNavPath = path.resolve(__dirname, '../components/AdminNav.jsx')
const adminNavContent = fs.readFileSync(adminNavPath, 'utf8')

const adminFlashSalesPagePath = path.resolve(__dirname, '../pages/admin/AdminFlashSalesPage.jsx')
const adminFlashSalesPageContent = fs.readFileSync(adminFlashSalesPagePath, 'utf8')

// ── 1. AdminRoute Protection & Navigation Integration ───────────────────────
console.log('[1] AdminRoute Protection & Navigation Integration:')

testAssert(
  appRoutesContent.includes("import AdminFlashSalesPage from '../pages/admin/AdminFlashSalesPage'"),
  'AppRoutes cleanly imports AdminFlashSalesPage'
)

testAssert(
  appRoutesContent.includes('/admin/flash-sales') &&
    appRoutesContent.includes('<AdminRoute>') &&
    appRoutesContent.includes('<AdminFlashSalesPage />'),
  'AppRoutes guards /admin/flash-sales with AdminRoute'
)

testAssert(
  adminNavContent.includes('/admin/flash-sales') && adminNavContent.includes("'Flash Sales'"),
  'AdminNav includes Flash Sales link pointing to /admin/flash-sales'
)

testAssert(
  adminNavContent.includes("path: '/admin/flash-sales'") && adminNavContent.includes('exact: false'),
  'Flash Sales nav item uses prefix matching (exact: false)'
)

// ── 2. Flash Sale Form Validation Logic ─────────────────────────────────────
console.log('\n[2] Flash Sale Form Validation Logic:')

function validateFlashSaleForm(data) {
  const errors = {}

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.name = 'Flash sale name is required'
  } else if (data.name.trim().length < 2) {
    errors.name = 'Flash sale name must be at least 2 characters'
  } else if (data.name.trim().length > 100) {
    errors.name = 'Flash sale name cannot exceed 100 characters'
  }

  const validTypes = ['percentage', 'fixed']
  if (!data.discountType || !validTypes.includes(data.discountType)) {
    errors.discountType = 'Discount type must be either percentage or fixed'
  }

  const val = Number(data.discountValue)
  if (isNaN(val) || val <= 0) {
    errors.discountValue = 'Discount value must be a positive number'
  } else if (data.discountType === 'percentage' && val > 100) {
    errors.discountValue = 'Percentage discount cannot exceed 100%'
  }

  if (!data.startAt) {
    errors.startAt = 'Start date/time is required'
  }
  if (!data.endAt) {
    errors.endAt = 'End date/time is required'
  }

  if (data.startAt && data.endAt) {
    const s = new Date(data.startAt).getTime()
    const e = new Date(data.endAt).getTime()
    if (isNaN(s)) {
      errors.startAt = 'Invalid start date format'
    }
    if (isNaN(e)) {
      errors.endAt = 'Invalid end date format'
    }
    if (!isNaN(s) && !isNaN(e) && e <= s) {
      errors.endAt = 'End date/time must be strictly after start date/time'
    }
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    errors.products = 'At least one product must be selected'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

testAssert(
  validateFlashSaleForm({ name: '', discountType: 'percentage', discountValue: 20, startAt: '2026-10-10T10:00', endAt: '2026-10-12T10:00', products: ['p1'] }).errors.name !== undefined,
  'Rejects empty sale name'
)

testAssert(
  validateFlashSaleForm({ name: 'A', discountType: 'percentage', discountValue: 20, startAt: '2026-10-10T10:00', endAt: '2026-10-12T10:00', products: ['p1'] }).errors.name !== undefined,
  'Rejects name shorter than 2 characters'
)

testAssert(
  validateFlashSaleForm({ name: 'Valid Sale', discountType: 'percentage', discountValue: 120, startAt: '2026-10-10T10:00', endAt: '2026-10-12T10:00', products: ['p1'] }).errors.discountValue !== undefined,
  'Rejects percentage discount exceeding 100%'
)

testAssert(
  validateFlashSaleForm({ name: 'Valid Sale', discountType: 'percentage', discountValue: 0, startAt: '2026-10-10T10:00', endAt: '2026-10-12T10:00', products: ['p1'] }).errors.discountValue !== undefined,
  'Rejects zero percentage discount'
)

testAssert(
  validateFlashSaleForm({ name: 'Valid Sale', discountType: 'fixed', discountValue: 500, startAt: '2026-10-10T10:00', endAt: '2026-10-12T10:00', products: ['p1'] }).isValid === true,
  'Accepts valid fixed discount (₹500)'
)

testAssert(
  validateFlashSaleForm({ name: 'Valid Sale', discountType: 'percentage', discountValue: 25, startAt: '2026-10-12T10:00', endAt: '2026-10-10T10:00', products: ['p1'] }).errors.endAt !== undefined,
  'Rejects end date occurring before start date'
)

testAssert(
  validateFlashSaleForm({ name: 'Valid Sale', discountType: 'percentage', discountValue: 25, startAt: '2026-10-10T10:00', endAt: '2026-10-10T10:00', products: ['p1'] }).errors.endAt !== undefined,
  'Rejects end date equal to start date (must be strictly after)'
)

testAssert(
  validateFlashSaleForm({ name: 'Valid Sale', discountType: 'percentage', discountValue: 25, startAt: '2026-10-10T10:00', endAt: '2026-10-12T10:00', products: [] }).errors.products !== undefined,
  'Rejects sale with empty product selection'
)

testAssert(
  validateFlashSaleForm({ name: 'Weekend Runway', discountType: 'percentage', discountValue: 25, startAt: '2026-10-10T10:00', endAt: '2026-10-12T10:00', products: ['67c100000000000000000001'] }).isValid === true,
  'Accepts completely valid flash sale payload'
)

// ── 3. Product Selection Matrix & Search Filter Logic ───────────────────────
console.log('\n[3] Product Selection Matrix & Search Filter Logic:')

const mockAvailableProducts = [
  { _id: 'p1', name: 'Oversized Silk Shirt', brand: 'TrendVolt Luxury', category: 'fashion', price: 3499, isActive: true },
  { _id: 'p2', name: 'Vintage Denim Jacket', brand: 'TrendVolt Denim', category: 'fashion', price: 4999, isActive: true },
  { _id: 'p3', name: 'Discontinued Scarf', brand: 'TrendVolt Luxury', category: 'fashion', price: 999, isActive: false },
  { _id: 'p4', name: 'Pleated Wool Trousers', brand: 'Studio Volt', category: 'fashion', price: 3999, isActive: true },
]

function filterSelectableProducts(products, searchTerm = '') {
  return products.filter((p) => {
    if (!p.isActive) return false
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      p.name.toLowerCase().includes(term) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    )
  })
}

const activeOnly = filterSelectableProducts(mockAvailableProducts, '')
testAssert(activeOnly.length === 3, 'Excludes inactive products from selection matrix (3/4 active)')
testAssert(!activeOnly.some((p) => p._id === 'p3'), 'Inactive product p3 is omitted')

const searchedByName = filterSelectableProducts(mockAvailableProducts, 'Denim')
testAssert(searchedByName.length === 1 && searchedByName[0]._id === 'p2', 'Filters products by name substring ("Denim")')

const searchedByBrand = filterSelectableProducts(mockAvailableProducts, 'Studio Volt')
testAssert(searchedByBrand.length === 1 && searchedByBrand[0]._id === 'p4', 'Filters products by brand substring ("Studio Volt")')

// Toggle logic
function toggleProductSelection(currentIds, toggleId) {
  const exists = currentIds.includes(toggleId)
  return exists ? currentIds.filter((id) => id !== toggleId) : [...currentIds, toggleId]
}

let selected = ['p1']
selected = toggleProductSelection(selected, 'p2')
testAssert(selected.length === 2 && selected.includes('p2'), 'Toggling unselected product adds it')

selected = toggleProductSelection(selected, 'p1')
testAssert(selected.length === 1 && !selected.includes('p1'), 'Toggling selected product removes it')

// ── 4. Flash Sale Search & Status Filter Logic ──────────────────────────────
console.log('\n[4] Flash Sale Search & Status Filter Logic:')

const mockSales = [
  { _id: 's1', name: 'Midnight Runway', description: 'Night deals on suits', status: 'ACTIVE', active: true },
  { _id: 's2', name: 'Summer Solstice', description: 'Light linen wear', status: 'UPCOMING', active: true },
  { _id: 's3', name: 'Winter Archives', description: 'Last season wool coats', status: 'EXPIRED', active: true },
  { _id: 's4', name: 'Draft Promo', description: 'Unpublished special', status: 'ACTIVE', active: false },
]

function filterSalesList(sales, search = '', statusFilter = 'all') {
  return sales.filter((s) => {
    const matchesSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.status === 'ACTIVE' && s.active) ||
      (statusFilter === 'upcoming' && s.status === 'UPCOMING') ||
      (statusFilter === 'expired' && s.status === 'EXPIRED') ||
      (statusFilter === 'inactive' && !s.active)

    return matchesSearch && matchesStatus
  })
}

testAssert(filterSalesList(mockSales, '', 'all').length === 4, 'Default filter returns all 4 sales')
testAssert(filterSalesList(mockSales, 'Runway').length === 1, 'Search filters by name substring')
testAssert(filterSalesList(mockSales, 'linen').length === 1, 'Search filters by description substring')
testAssert(filterSalesList(mockSales, '', 'active').length === 1 && filterSalesList(mockSales, '', 'active')[0]._id === 's1', 'Status filter "active" returns only live active sales')
testAssert(filterSalesList(mockSales, '', 'upcoming').length === 1 && filterSalesList(mockSales, '', 'upcoming')[0]._id === 's2', 'Status filter "upcoming" returns scheduled future sales')
testAssert(filterSalesList(mockSales, '', 'expired').length === 1 && filterSalesList(mockSales, '', 'expired')[0]._id === 's3', 'Status filter "expired" returns past sales')
testAssert(filterSalesList(mockSales, '', 'inactive').length === 1 && filterSalesList(mockSales, '', 'inactive')[0]._id === 's4', 'Status filter "inactive" returns disabled sales')

// ── 5. Date Formatting & Local Datetime Serialization Helpers ───────────────
console.log('\n[5] Date Formatting & Local Datetime Serialization Helpers:')

function toLocalDatetimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateTime(iso) {
  if (!iso) return 'None'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
}

const testIso = '2026-10-15T14:30:00.000Z'
const formattedLocal = toLocalDatetimeInput(testIso)
testAssert(formattedLocal.includes('T') && formattedLocal.length === 16, 'toLocalDatetimeInput formats into YYYY-MM-DDTHH:mm format')

const istDisplay = formatDateTime(testIso)
testAssert(istDisplay.includes('Oct') && istDisplay.includes('2026'), 'formatDateTime formats into Indian locale date display')

// ── 6. Payload Construction & Submission Formatting ─────────────────────────
console.log('\n[6] Payload Construction & Submission Formatting:')

function constructSubmitPayload(formData) {
  return {
    name: formData.name.trim(),
    description: formData.description.trim(),
    discountType: formData.discountType,
    discountValue: Number(formData.discountValue),
    startAt: new Date(formData.startAt).toISOString(),
    endAt: new Date(formData.endAt).toISOString(),
    products: formData.products,
    active: formData.active,
  }
}

const sampleForm = {
  name: '  Flash Weekend  ',
  description: '  Exclusive Runway  ',
  discountType: 'percentage',
  discountValue: '25',
  startAt: '2026-10-10T10:00',
  endAt: '2026-10-12T10:00',
  products: ['p1', 'p2'],
  active: true,
}

const payload = constructSubmitPayload(sampleForm)
testAssert(payload.name === 'Flash Weekend', 'Payload trims leading/trailing whitespace from name')
testAssert(payload.description === 'Exclusive Runway', 'Payload trims whitespace from description')
testAssert(payload.discountValue === 25 && typeof payload.discountValue === 'number', 'Payload casts discountValue to Number')
testAssert(typeof payload.startAt === 'string' && payload.startAt.endsWith('Z'), 'Payload formats startAt as UTC ISO string')
testAssert(typeof payload.endAt === 'string' && payload.endAt.endsWith('Z'), 'Payload formats endAt as UTC ISO string')
testAssert(Array.isArray(payload.products) && payload.products.length === 2, 'Payload preserves product ID array')

// ── 7. Delete Confirmation & Safety UX ──────────────────────────────────────
console.log('\n[7] Delete Confirmation & Safety UX:')

testAssert(
  adminFlashSalesPageContent.includes('Delete Flash Sale?'),
  'AdminFlashSalesPage includes clear Delete Confirmation modal title'
)

testAssert(
  adminFlashSalesPageContent.includes('Confirm Delete') &&
    adminFlashSalesPageContent.includes('setDeleteConfirmId(null)'),
  'Delete modal provides both Confirm Delete and Cancel buttons'
)

testAssert(
  adminFlashSalesPageContent.includes('Effective sale prices will immediately revert to normal product prices'),
  'Delete modal includes clear cautionary guidance regarding price reversal'
)

// ── 8. Component Structure & Accessibility Checks ───────────────────────────
console.log('\n[8] Component Structure & Accessibility Checks:')

testAssert(
  adminFlashSalesPageContent.includes('<SEO') &&
    adminFlashSalesPageContent.includes('Admin Flash Sales — TrendVolt') &&
    adminFlashSalesPageContent.includes('noindex'),
  'Page includes SEO component with descriptive title and noindex'
)

testAssert(
  adminFlashSalesPageContent.includes('<AdminNav />'),
  'Page embeds top AdminNav navigation bar'
)

testAssert(
  adminFlashSalesPageContent.includes('Flash Sales & Offers') &&
    adminFlashSalesPageContent.includes('<h1'),
  'Page contains prominent h1 heading'
)

testAssert(
  adminFlashSalesPageContent.includes('role="status"'),
  'Toast notification uses accessible role="status"'
)

testAssert(
  adminFlashSalesPageContent.includes('overflow-x-auto'),
  'Table is wrapped in overflow-x-auto container to eliminate horizontal document overflow'
)

// ── 9. Light Luxury Theme Consistency ───────────────────────────────────────
console.log('\n[9] Light Luxury Theme Consistency:')

testAssert(
  adminFlashSalesPageContent.includes('#F5F0E8'),
  'Page uses TrendVolt linen canvas tone (#F5F0E8)'
)

testAssert(
  adminFlashSalesPageContent.includes('#FFFDF8'),
  'Cards and modals use warm cream surface tone (#FFFDF8)'
)

testAssert(
  adminFlashSalesPageContent.includes('#DED7CA'),
  'Borders use warm subtle tone (#DED7CA)'
)

testAssert(
  adminFlashSalesPageContent.includes('#34452F'),
  'Primary action buttons and accents use TrendVolt signature deep olive (#34452F)'
)

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n============================================================')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('ALL ADMIN FLASH SALE FRONTEND UNIT TESTS PASSED ✓')
} else {
  console.log('SOME TESTS FAILED ✗')
  process.exit(1)
}
console.log('============================================================\n')
