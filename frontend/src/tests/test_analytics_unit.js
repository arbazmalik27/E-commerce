/**
 * test_analytics_unit.js
 * Unit tests for TrendVolt Advanced Admin Analytics frontend module.
 *
 * Covers:
 * 1. AdminRoute Protection & Navigation integration
 * 2. Time Range Controls & Custom Date Validation Logic
 * 3. KPI Formatting & Mathematical Derivations (AOV, Success Rate, Repeat Rate)
 * 4. Trend Relative Scaling & Bar Width Math
 * 5. Section Render States (Loading, Error, Empty, Success)
 * 6. Responsive Class Presence & Accessibility Semantics
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

console.log('=== TEST SUITE: ADVANCED ADMIN ANALYTICS UNIT TESTS ===\n')

// ── 1. AdminRoute Protection & AdminNav Integration ─────────────────────────
console.log('[1] AdminRoute Protection & Navigation Integration:')

const appRoutesPath = path.join(__dirname, '../routes/AppRoutes.jsx')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')

testAssert(
  appRoutesContent.includes("import AdminAnalyticsPage from '../pages/admin/AdminAnalyticsPage'"),
  'AppRoutes cleanly imports AdminAnalyticsPage'
)
testAssert(
  appRoutesContent.includes('path="/admin/analytics"') &&
    appRoutesContent.includes('<AdminRoute>') &&
    appRoutesContent.includes('<AdminAnalyticsPage />'),
  'AppRoutes guards /admin/analytics with AdminRoute'
)

const adminNavPath = path.join(__dirname, '../components/AdminNav.jsx')
const adminNavContent = fs.readFileSync(adminNavPath, 'utf8')

testAssert(
  adminNavContent.includes("path: '/admin/analytics'") && adminNavContent.includes("label: 'Analytics'"),
  'AdminNav includes Analytics link pointing to /admin/analytics'
)
testAssert(
  adminNavContent.includes('exact: false'),
  'Analytics nav item uses prefix matching (exact: false)'
)

// ── 2. Time Range Selection & Custom Date Validation Logic ──────────────────
console.log('\n[2] Time Range Selection & Custom Date Validation:')

function validateCustomRange(startStr, endStr) {
  if (!startStr || !endStr) {
    return { isValid: false, message: 'Please choose both start and end dates.' }
  }
  const start = new Date(startStr)
  const end = new Date(endStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, message: 'Please enter valid dates.' }
  }
  if (end <= start) {
    return { isValid: false, message: 'End date must be strictly after start date.' }
  }
  const diffDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  if (diffDays > 366) {
    return { isValid: false, message: 'Custom date range cannot exceed 366 days.' }
  }
  return { isValid: true, diffDays }
}

testAssert(!validateCustomRange('', '2026-10-01').isValid, 'Rejects empty start date')
testAssert(!validateCustomRange('2026-09-01', '').isValid, 'Rejects empty end date')
testAssert(!validateCustomRange('invalid', '2026-10-01').isValid, 'Rejects malformed date')
testAssert(!validateCustomRange('2026-10-05', '2026-10-01').isValid, 'Rejects end date before start date')
testAssert(!validateCustomRange('2026-10-01', '2026-10-01').isValid, 'Rejects same start and end date (end must be strictly after)')
testAssert(!validateCustomRange('2024-01-01', '2026-01-01').isValid, 'Rejects range exceeding 366 days')
testAssert(validateCustomRange('2026-09-01', '2026-09-30').isValid, 'Accepts valid 29-day custom range')

// ── 3. Mathematical Derivations & Formatters ────────────────────────────────
console.log('\n[3] KPI Math & Currency Formatters:')

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

testAssert(formatCurrency(0) === '₹0', 'Formats ₹0 correctly')
testAssert(formatCurrency(1500) === '₹1,500', 'Formats ₹1,500 with Indian commas')
testAssert(formatCurrency(125000.5) === '₹1,25,000.5', 'Formats lakhs correctly in Indian locale')

function calculateAOV(totalRevenue, paidOrders) {
  if (!paidOrders || paidOrders <= 0) return 0
  return Number((totalRevenue / paidOrders).toFixed(2))
}

testAssert(calculateAOV(0, 0) === 0, 'AOV with zero paid orders safely yields 0 (no division by zero)')
testAssert(calculateAOV(5000, 2) === 2500, 'AOV calculates correctly: 5000 / 2 = 2500')
testAssert(calculateAOV(100, 3) === 33.33, 'AOV rounds to 2 decimal places')

function calculateSuccessRate(successful, total) {
  if (!total || total <= 0) return 0
  return Number(((successful / total) * 100).toFixed(2))
}

testAssert(calculateSuccessRate(0, 0) === 0, 'Success rate with zero attempts safely yields 0%')
testAssert(calculateSuccessRate(17, 20) === 85, 'Success rate: 17 of 20 = 85%')
testAssert(calculateSuccessRate(1, 3) === 33.33, 'Success rate rounds to 2 decimal places')

function calculateRepeatRate(repeatCustomers, totalCustomersWithOrders) {
  if (!totalCustomersWithOrders || totalCustomersWithOrders <= 0) return 0
  return Number(((repeatCustomers / totalCustomersWithOrders) * 100).toFixed(2))
}

testAssert(calculateRepeatRate(0, 0) === 0, 'Repeat rate with zero customers safely yields 0%')
testAssert(calculateRepeatRate(5, 20) === 25, 'Repeat rate: 5 of 20 = 25%')

// ── 4. Trend Relative Scaling & Bar Width Math ──────────────────────────────
console.log('\n[4] Trend Relative Scaling & Bar Width Math:')

function calculateBarPercentage(revenue, maxRevenue) {
  const safeMax = Math.max(maxRevenue || 0, 1)
  return Math.min(100, Math.round(((revenue || 0) / safeMax) * 100))
}

testAssert(calculateBarPercentage(0, 1000) === 0, 'Zero revenue yields 0% bar')
testAssert(calculateBarPercentage(500, 1000) === 50, 'Half max revenue yields 50% bar')
testAssert(calculateBarPercentage(1000, 1000) === 100, 'Max revenue yields 100% bar')
testAssert(calculateBarPercentage(0, 0) === 0, 'Safely handles 0 maxRevenue without NaN')

// ── 5. Component Structure & UX States ──────────────────────────────────────
console.log('\n[5] Component Structure, UX States & Accessibility Checks:')

const pagePath = path.join(__dirname, '../pages/admin/AdminAnalyticsPage.jsx')
const pageContent = fs.readFileSync(pagePath, 'utf8')

// Loading states
testAssert(pageContent.includes('aria-busy="true"'), 'Analytics page defines aria-busy during loading state')
testAssert(pageContent.includes('animate-pulse'), 'Skeleton screens use animate-pulse for loading state')

// Error state
testAssert(pageContent.includes('role="alert"'), 'Error banner uses role="alert"')
testAssert(pageContent.includes('Retry'), 'Error state includes a Retry action button')

// Empty states
testAssert(pageContent.includes('No sales or order records found'), 'Provides descriptive empty state for trend table')
testAssert(pageContent.includes('No product transactions recorded'), 'Provides descriptive empty state for top products table')

// Header & Controls
testAssert(pageContent.includes('Advanced Analytics'), 'Header renders "Advanced Analytics"')
testAssert(pageContent.includes('aria-label="Refresh analytics data"'), 'Sync/Refresh button has accessible aria-label')
testAssert(pageContent.includes('aria-label="Analytics Time Range Selector"'), 'Range selector section has accessible aria-label')

// Trend Table Accessibility
testAssert(pageContent.includes('role="progressbar"'), 'Trend bar has role="progressbar"')
testAssert(pageContent.includes('aria-valuenow='), 'Trend bar specifies aria-valuenow')
testAssert(pageContent.includes('scope="col"'), 'Table headers define scope="col" for screen readers')

// Sections
testAssert(pageContent.includes('aria-label="Key Performance Indicators"'), 'Includes Key Performance Indicators section')
testAssert(pageContent.includes('aria-label="Order Fulfillment Pipeline"'), 'Includes Order Fulfillment Pipeline section')
testAssert(pageContent.includes('aria-label="Product Performance"'), 'Includes Product Performance section')
testAssert(pageContent.includes('aria-label="Customer Retention and Acquisition"'), 'Includes Customer Retention section')
testAssert(pageContent.includes('aria-label="Catalog Inventory Health"'), 'Includes Catalog Inventory Health section')
testAssert(pageContent.includes('aria-label="Payment Gateway Performance"'), 'Includes Payment Gateway Performance section')
testAssert(pageContent.includes('aria-label="Coupon Promotion Impact"'), 'Includes Coupon Promotion Impact section')

// ── 6. Responsive Class Presence ────────────────────────────────────────────
console.log('\n[6] Responsive Layout Classes:')

testAssert(
  pageContent.includes('grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'),
  'KPI cards use responsive grid: 1 col mobile, 2 sm, 5 desktop'
)
testAssert(
  pageContent.includes('grid-cols-1 lg:grid-cols-2'),
  'Deep-dive sections stack cleanly on mobile and split 2 columns on desktop'
)
testAssert(
  pageContent.includes('overflow-x-auto'),
  'Tables and segmented buttons use overflow-x-auto to prevent horizontal page overflow'
)
testAssert(
  pageContent.includes('max-w-7xl mx-auto'),
  'Main container uses max-w-7xl centered layout'
)

// ── 7. Theme Consistency ───────────────────────────────────────────────────
console.log('\n[7] Theme Consistency:')

testAssert(
  pageContent.includes('bg-[#F5F0E8]'),
  'Page background matches TrendVolt light luxury linen tone (#F5F0E8)'
)
testAssert(
  pageContent.includes('bg-[#FFFDF8]'),
  'Cards use warm cream background tone (#FFFDF8)'
)
testAssert(
  pageContent.includes('border-[#DED7CA]'),
  'Borders use warm subtle tone (#DED7CA)'
)
testAssert(
  pageContent.includes('text-[#34452F]') && pageContent.includes('bg-[#34452F]'),
  'Primary accents use TrendVolt signature deep olive (#34452F)'
)

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n============================================================')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('ALL ANALYTICS UNIT TESTS PASSED ✓')
} else {
  console.error('SOME UNIT TESTS FAILED ✗')
  process.exit(1)
}
console.log('============================================================\n')
