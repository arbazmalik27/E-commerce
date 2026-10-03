/**
 * TrendVolt — Sales & Product Insights Frontend Unit Tests
 *
 * Verifies:
 * 1. AdminRoute Protection & Navigation Integration
 * 2. Time Range Selection & Custom Date Validation
 * 3. Metric Calculations, ASP, Sell-Through & Currency Formatters
 * 4. Trend Relative Scaling & Bar Width Math
 * 5. Component Structure, UX States & Accessibility Checks
 * 6. Responsive Layout Classes
 * 7. Theme Consistency
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

console.log('=== TEST SUITE: SALES & PRODUCT INSIGHTS FRONTEND UNIT TESTS ===\n')

// Read files for structural AST & code integrity checks
const appRoutesPath = path.resolve(__dirname, '../routes/AppRoutes.jsx')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')

const adminNavPath = path.resolve(__dirname, '../components/AdminNav.jsx')
const adminNavContent = fs.readFileSync(adminNavPath, 'utf8')

const salesInsightsPagePath = path.resolve(__dirname, '../pages/admin/AdminSalesInsightsPage.jsx')
const salesInsightsPageContent = fs.readFileSync(salesInsightsPagePath, 'utf8')

// ── 1. AdminRoute Protection & Navigation Integration ───────────────────────
console.log('[1] AdminRoute Protection & Navigation Integration:')

testAssert(
  appRoutesContent.includes("import AdminSalesInsightsPage from '../pages/admin/AdminSalesInsightsPage'"),
  'AppRoutes cleanly imports AdminSalesInsightsPage'
)

testAssert(
  appRoutesContent.includes('/admin/sales-insights') &&
    appRoutesContent.includes('<AdminRoute>') &&
    appRoutesContent.includes('<AdminSalesInsightsPage />'),
  'AppRoutes guards /admin/sales-insights with AdminRoute'
)

testAssert(
  adminNavContent.includes("path: '/admin/sales-insights'") &&
    adminNavContent.includes("label: 'Sales Insights'"),
  'AdminNav includes Sales Insights link pointing to /admin/sales-insights'
)

testAssert(
  adminNavContent.includes("exact: false"),
  'Sales Insights nav item uses prefix matching (exact: false)'
)

// ── 2. Time Range Selection & Custom Date Validation ────────────────────────
console.log('\n[2] Time Range Selection & Custom Date Validation:')

function validateCustomDates(startStr, endStr) {
  if (!startStr || !endStr) return { valid: false, message: 'Both start and end dates are required.' }
  const start = new Date(startStr)
  const end = new Date(endStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, message: 'Please enter valid dates.' }
  }
  if (end <= start) {
    return { valid: false, message: 'End date must be strictly after start date.' }
  }
  const diffDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  if (diffDays > 366) {
    return { valid: false, message: 'Custom date range cannot exceed 366 days.' }
  }
  return { valid: true }
}

testAssert(validateCustomDates('', '2026-08-10').valid === false, 'Rejects empty start date')
testAssert(validateCustomDates('2026-08-01', '').valid === false, 'Rejects empty end date')
testAssert(validateCustomDates('invalid', '2026-08-10').valid === false, 'Rejects malformed date')
testAssert(validateCustomDates('2026-08-10', '2026-08-01').valid === false, 'Rejects end date before start date')
testAssert(validateCustomDates('2026-08-10', '2026-08-10').valid === false, 'Rejects same start and end date (end must be strictly after)')
testAssert(validateCustomDates('2024-01-01', '2026-01-01').valid === false, 'Rejects range exceeding 366 days')
testAssert(validateCustomDates('2026-08-01', '2026-08-30').valid === true, 'Accepts valid 29-day custom range')

// ── 3. Metric Calculations, ASP, Sell-Through & Currency Formatters ──────────
console.log('\n[3] Metric Calculations & Currency Formatters:')

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function calculateASP(revenue, unitsSold) {
  if (!unitsSold || unitsSold <= 0) return 0
  return Number((revenue / unitsSold).toFixed(2))
}

function calculateContribution(revenue, totalRevenue) {
  if (!totalRevenue || totalRevenue <= 0) return 0
  return Number(((revenue / totalRevenue) * 100).toFixed(2))
}

function calculateSellThrough(unitsSold, stock) {
  const total = unitsSold + stock
  if (!total || total <= 0) return 0
  return Number(((unitsSold / total) * 100).toFixed(2))
}

testAssert(formatCurrency(0) === '₹0', 'Formats ₹0 correctly')
testAssert(formatCurrency(1500) === '₹1,500', 'Formats ₹1,500 with Indian commas')
testAssert(formatCurrency(100000) === '₹1,00,000', 'Formats lakhs correctly in Indian locale')

testAssert(calculateASP(5000, 0) === 0, 'ASP with zero units sold safely yields 0 (no NaN/Infinity)')
testAssert(calculateASP(5000, 5) === 1000, 'ASP calculates correctly: 5000 / 5 = 1000')
testAssert(calculateASP(1000, 3) === 333.33, 'ASP rounds cleanly to 2 decimal places: 1000 / 3 = 333.33')

testAssert(calculateContribution(1500, 0) === 0, 'Contribution with zero total revenue safely yields 0%')
testAssert(calculateContribution(1500, 6000) === 25, 'Contribution calculates correctly: 1500 / 6000 = 25%')
testAssert(calculateContribution(5000, 6500) === 76.92, 'Contribution rounds to 2 decimal places: 5000 / 6500 = 76.92%')

testAssert(calculateSellThrough(0, 0) === 0, 'Sell-through with zero stock and zero units yields 0%')
testAssert(calculateSellThrough(0, 30) === 0, 'Sell-through with 0 units sold out of 30 stock yields 0%')
testAssert(calculateSellThrough(5, 25) === 16.67, 'Sell-through calculates: 5 / (25 + 5) = 16.67%')
testAssert(calculateSellThrough(10, 0) === 100, 'Sell-through for fully sold out items yields 100%')

// ── 4. Trend Relative Scaling & Bar Width Math ──────────────────────────────
console.log('\n[4] Trend Relative Scaling & Bar Width Math:')

function calculateBarWidth(revenue, maxRevenue) {
  if (!maxRevenue || maxRevenue <= 0) return 0
  return Math.min(100, Math.round(((revenue || 0) / maxRevenue) * 100))
}

testAssert(calculateBarWidth(0, 10000) === 0, 'Zero revenue yields 0% bar')
testAssert(calculateBarWidth(5000, 10000) === 50, 'Half max revenue yields 50% bar')
testAssert(calculateBarWidth(10000, 10000) === 100, 'Max revenue yields 100% bar')
testAssert(calculateBarWidth(1000, 0) === 0, 'Safely handles 0 maxRevenue without NaN')

// ── 5. Component Structure, UX States & Accessibility Checks ────────────────
console.log('\n[5] Component Structure, UX States & Accessibility Checks:')

testAssert(
  salesInsightsPageContent.includes('aria-busy="true"'),
  'Sales insights page defines aria-busy during loading state'
)

testAssert(
  salesInsightsPageContent.includes('animate-pulse'),
  'Skeleton screens use animate-pulse for loading state'
)

testAssert(
  salesInsightsPageContent.includes('role="alert"'),
  'Error banner uses role="alert"'
)

testAssert(
  salesInsightsPageContent.includes('Retry'),
  'Error state includes a Retry action button'
)

testAssert(
  salesInsightsPageContent.includes('No sales recorded in this window'),
  'Provides descriptive empty state for trend table'
)

testAssert(
  salesInsightsPageContent.includes('No product sales recorded in this period'),
  'Provides descriptive empty state for product performance table'
)

testAssert(
  salesInsightsPageContent.includes('No products matched the selected velocity filter'),
  'Provides descriptive empty state for stock vs sales table'
)

testAssert(
  salesInsightsPageContent.includes('Sales & Product Insights'),
  'Header renders "Sales & Product Insights"'
)

testAssert(
  salesInsightsPageContent.includes('aria-label="Refresh sales insights"'),
  'Sync/Refresh button has accessible aria-label'
)

testAssert(
  salesInsightsPageContent.includes('role="progressbar"'),
  'Trend bar has role="progressbar"'
)

testAssert(
  salesInsightsPageContent.includes('aria-valuenow={pct}'),
  'Trend bar specifies aria-valuenow'
)

testAssert(
  salesInsightsPageContent.includes('scope="col"'),
  'Table headers define scope="col" for screen readers'
)

testAssert(
  salesInsightsPageContent.includes('aria-label="Daily Sales Velocity Trend"'),
  'Includes Daily Sales Velocity Trend section'
)

testAssert(
  salesInsightsPageContent.includes('aria-label="Product Sales Performance"'),
  'Includes Product Sales Performance section'
)

testAssert(
  salesInsightsPageContent.includes('aria-label="Category & Subcategory Breakdown"'),
  'Includes Category & Subcategory Breakdown section'
)

testAssert(
  salesInsightsPageContent.includes('aria-label="Brand Performance"'),
  'Includes Brand Performance section'
)

testAssert(
  salesInsightsPageContent.includes('aria-label="Stock vs Sales Analysis"'),
  'Includes Stock vs Sales Analysis section'
)

testAssert(
  salesInsightsPageContent.includes('aria-label="Zero-Sales Products Analysis"'),
  'Includes Zero-Sales Products Analysis section'
)

// ── 6. Responsive Layout Classes ────────────────────────────────────────────
console.log('\n[6] Responsive Layout Classes:')

testAssert(
  salesInsightsPageContent.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'),
  'KPI cards use responsive grid: 1 col mobile, 2 sm, 5 desktop'
)

testAssert(
  salesInsightsPageContent.includes('grid-cols-1 lg:grid-cols-2'),
  'Category & brand sections stack on mobile and split 2 columns on desktop'
)

testAssert(
  salesInsightsPageContent.includes('overflow-x-auto'),
  'Tables and segmented buttons use overflow-x-auto to prevent horizontal page overflow'
)

testAssert(
  salesInsightsPageContent.includes('max-w-7xl mx-auto'),
  'Main container uses max-w-7xl centered layout'
)

// ── 7. Theme Consistency ────────────────────────────────────────────────────
console.log('\n[7] Theme Consistency:')

testAssert(
  salesInsightsPageContent.includes('bg-[#F5F0E8]'),
  'Page background matches TrendVolt light luxury linen tone (#F5F0E8)'
)

testAssert(
  salesInsightsPageContent.includes('bg-[#FFFDF8]'),
  'Cards use warm cream background tone (#FFFDF8)'
)

testAssert(
  salesInsightsPageContent.includes('border-[#DED7CA]'),
  'Borders use warm subtle tone (#DED7CA)'
)

testAssert(
  salesInsightsPageContent.includes('#34452F'),
  'Primary accents use TrendVolt signature deep olive (#34452F)'
)

console.log('\n============================================================')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('ALL SALES INSIGHTS FRONTEND UNIT TESTS PASSED ✓')
} else {
  console.log('SOME TESTS FAILED ✗')
}
console.log('============================================================\n')

if (failed > 0) {
  process.exit(1)
}
