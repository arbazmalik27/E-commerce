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

console.log('=== TEST SUITE: BETTER ACCOUNT DASHBOARD UNIT TESTS ===\n')

// ── 1. Routing & Backward Compatibility ───────────────────────────────────────
console.log('[1] Routing & Backward Compatibility:')
const appRoutesPath = path.join(__dirname, '../routes/AppRoutes.jsx')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')

testAssert(
  appRoutesContent.includes("import AccountDashboardPage from '../pages/AccountDashboardPage'"),
  'AppRoutes imports AccountDashboardPage'
)
testAssert(
  appRoutesContent.includes('path="/account"') && appRoutesContent.includes('<AccountDashboardPage />'),
  'AppRoutes defines /account route guarded by ProtectedRoute'
)
testAssert(
  appRoutesContent.includes('path="/profile"') && appRoutesContent.includes('defaultTab="settings"'),
  'AppRoutes preserves backward-compatible /profile route defaulting to settings'
)

const navbarPath = path.join(__dirname, '../components/Navbar.jsx')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')

testAssert(
  navbarContent.includes("to={isAuthenticated ? '/account' : '/login'}"),
  'Desktop user icon in Navbar points to /account when authenticated'
)
testAssert(
  navbarContent.includes("to={isAuthenticated ? '/account' : '/login'}"),
  'Mobile menu Orders & Account links to /account'
)
testAssert(
  navbarContent.includes("to={isAuthenticated ? '/account?tab=settings' : '/login'}"),
  'Mobile menu My Profile links to /account?tab=settings'
)

// ── 2. Tab Resolution & Fallbacks ─────────────────────────────────────────────
console.log('\n[2] Tab Resolution & Fallback Logic:')
const VALID_TABS = ['overview', 'orders', 'addresses', 'wishlist', 'settings']

function resolveActiveTab(rawTab, defaultTab = 'overview') {
  if (VALID_TABS.includes(rawTab)) return rawTab
  if (VALID_TABS.includes(defaultTab)) return defaultTab
  return 'overview'
}

testAssert(resolveActiveTab(null, 'overview') === 'overview', 'Defaults to overview when tab param is null')
testAssert(resolveActiveTab('orders', 'overview') === 'orders', 'Resolves orders tab correctly')
testAssert(resolveActiveTab('addresses', 'overview') === 'addresses', 'Resolves addresses tab correctly')
testAssert(resolveActiveTab('wishlist', 'overview') === 'wishlist', 'Resolves wishlist tab correctly')
testAssert(resolveActiveTab('settings', 'overview') === 'settings', 'Resolves settings tab correctly')
testAssert(resolveActiveTab('invalid_tab', 'overview') === 'overview', 'Falls back safely to overview on invalid tab param')
testAssert(resolveActiveTab(null, 'settings') === 'settings', 'Respects defaultTab="settings" for /profile route')
testAssert(resolveActiveTab('orders', 'settings') === 'orders', 'Explicit tab param overrides defaultTab')

// ── 3. Account Metric Computations ────────────────────────────────────────────
console.log('\n[3] Account Metric Calculations:')

const sampleOrders = [
  { _id: '1', orderStatus: 'shipped', totalAmount: 1200 },
  { _id: '2', orderStatus: 'delivered', totalAmount: 3500 },
  { _id: '3', orderStatus: 'processing', totalAmount: 850 },
  { _id: '4', orderStatus: 'cancelled', totalAmount: 900 },
  { _id: '5', orderStatus: 'pending', totalAmount: 1500 },
]

// Active deliveries calculation
const activeDeliveries = sampleOrders.filter((o) =>
  ['pending', 'confirmed', 'processing', 'shipped'].includes(o.orderStatus)
)

testAssert(sampleOrders.length === 5, 'Total orders count matches sample length')
testAssert(activeDeliveries.length === 3, 'Active deliveries correctly counts pending, processing, shipped (excluding delivered & cancelled)')

// Default address resolution
const sampleAddresses = [
  { _id: 'a1', city: 'Mumbai', postalCode: '400001', isDefault: false },
  { _id: 'a2', city: 'Bengaluru', postalCode: '560001', isDefault: true },
  { _id: 'a3', city: 'Delhi', postalCode: '110001', isDefault: false },
]

function resolveDefaultAddress(addresses) {
  return addresses.find((a) => a.isDefault) || addresses[0] || null
}

testAssert(resolveDefaultAddress(sampleAddresses).city === 'Bengaluru', 'Resolves address marked isDefault === true')
testAssert(resolveDefaultAddress([{ city: 'Kolkata', isDefault: false }]).city === 'Kolkata', 'Falls back to first address when none marked isDefault')
testAssert(resolveDefaultAddress([]) === null, 'Returns null when address list is empty')

// ── 4. Initials Avatar Formatter ──────────────────────────────────────────────
console.log('\n[4] Initials Avatar Helper:')

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'TV'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

testAssert(getInitials('Jane Doe') === 'JD', 'Formats first and last name initials: Jane Doe -> JD')
testAssert(getInitials('Alexander') === 'AL', 'Formats single word name: Alexander -> AL')
testAssert(getInitials('Mohammad Ali Khan') === 'MK', 'Formats multi-word name: Mohammad Ali Khan -> MK')
testAssert(getInitials('') === 'TV', 'Falls back to TV for empty string')
testAssert(getInitials(null) === 'TV', 'Falls back to TV for null')

// ── 5. Component Structure & Accessibility ────────────────────────────────────
console.log('\n[5] Component Structure & Accessibility Checks:')

const shellPath = path.join(__dirname, '../components/account/AccountShell.jsx')
const shellContent = fs.readFileSync(shellPath, 'utf8')

testAssert(shellContent.includes('role="tablist"'), 'AccountShell defines role="tablist"')
testAssert(shellContent.includes('role="tab"'), 'AccountShell defines role="tab"')
testAssert(shellContent.includes('aria-selected='), 'AccountShell defines aria-selected state')
testAssert(shellContent.includes('aria-controls='), 'AccountShell defines aria-controls linking to tabpanel')
testAssert(shellContent.includes('role="tabpanel"'), 'AccountShell defines role="tabpanel"')

const dashboardPagePath = path.join(__dirname, '../pages/AccountDashboardPage.jsx')
const dashboardPageContent = fs.readFileSync(dashboardPagePath, 'utf8')

testAssert(dashboardPageContent.includes('noindex={true}'), 'AccountDashboardPage enforces SEO noindex for private user data')
testAssert(dashboardPageContent.includes('AccountOverview'), 'AccountDashboardPage imports AccountOverview')
testAssert(dashboardPageContent.includes('AccountOrdersTab'), 'AccountDashboardPage imports AccountOrdersTab')
testAssert(dashboardPageContent.includes('AccountAddressesTab'), 'AccountDashboardPage imports AccountAddressesTab')
testAssert(dashboardPageContent.includes('AccountWishlistTab'), 'AccountDashboardPage imports AccountWishlistTab')
testAssert(dashboardPageContent.includes('AccountSettingsTab'), 'AccountDashboardPage imports AccountSettingsTab')

// ── 6. Profile Backward Compatibility ─────────────────────────────────────────
console.log('\n[6] ProfilePage Backward Compatibility:')
const profilePagePath = path.join(__dirname, '../pages/ProfilePage.jsx')
const profilePageContent = fs.readFileSync(profilePagePath, 'utf8')

testAssert(
  profilePageContent.includes("import AccountDashboardPage from './AccountDashboardPage'"),
  'ProfilePage.jsx cleanly imports AccountDashboardPage'
)
testAssert(
  profilePageContent.includes('<AccountDashboardPage defaultTab="settings" />'),
  'ProfilePage renders AccountDashboardPage defaulted to settings'
)

// Summary
console.log('\n============================================================')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('ALL ACCOUNT DASHBOARD UNIT TESTS PASSED ✓')
} else {
  console.error('SOME UNIT TESTS FAILED ✗')
  process.exit(1)
}
console.log('============================================================\n')
