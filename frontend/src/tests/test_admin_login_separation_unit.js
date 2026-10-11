/**
 * test_admin_login_separation_unit.js
 * Focused unit test suite for TrendVolt Admin Login Separation.
 *
 * Verifies:
 * 1. Admin login page existence, structure, and design tokens
 * 2. AppRoutes configuration: /admin/login registered without redirect loops
 * 3. AdminRoute redirection: unauthenticated users redirected to /admin/login with preserved state
 * 4. Customer login compatibility: /login remains intact and functional for shoppers
 * 5. Customer access denial on /admin/login: explicit denial message, no admin grant, safe customer return
 * 6. Role-based post-login enforcement: customer credentials rejected on admin portal with session cleanup
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

console.log('=== TEST SUITE: ADMIN LOGIN SEPARATION UNIT TESTS ===\n')

// ── 1. Admin Login Page Existence & Component Structure ─────────────────────────
console.log('[1] Admin Login Page Component:')

const adminLoginPagePath = path.join(__dirname, '../pages/admin/AdminLoginPage.jsx')
testAssert(fs.existsSync(adminLoginPagePath), 'AdminLoginPage.jsx exists in src/pages/admin/')

const adminLoginContent = fs.readFileSync(adminLoginPagePath, 'utf8')

testAssert(
  adminLoginContent.includes('export default AdminLoginPage'),
  'AdminLoginPage exports default component'
)
testAssert(
  adminLoginContent.includes('canonical="/admin/login"') && adminLoginContent.includes('noindex={true}'),
  'AdminLoginPage includes SEO component configured with /admin/login canonical and noindex'
)
testAssert(
  adminLoginContent.includes('selectAuthInitialized') &&
    adminLoginContent.includes('selectIsAuthenticated') &&
    adminLoginContent.includes('selectUser'),
  'AdminLoginPage consumes standard Redux auth selectors'
)

// ── 2. AppRoutes Registration & Loop Prevention ─────────────────────────────────
console.log('\n[2] AppRoutes Configuration & Redirect Loop Safety:')

const appRoutesPath = path.join(__dirname, '../routes/AppRoutes.jsx')
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')

testAssert(
  appRoutesContent.includes("import('../pages/admin/AdminLoginPage')"),
  'AppRoutes lazy loads AdminLoginPage'
)
testAssert(
  appRoutesContent.includes('path="/admin/login"'),
  'AppRoutes registers /admin/login path'
)

// Crucial: /admin/login must NOT be nested inside <AdminRoute> to prevent infinite redirect loops
const adminLoginRouteIndex = appRoutesContent.indexOf('path="/admin/login"')
testAssert(
  adminLoginRouteIndex !== -1 && !appRoutesContent.slice(adminLoginRouteIndex, adminLoginRouteIndex + 120).includes('<AdminRoute>'),
  '/admin/login route is registered outside <AdminRoute> (loop prevention)'
)

// ── 3. AdminRoute Protection & State Preservation ──────────────────────────────
console.log('\n[3] AdminRoute Redirection Logic:')

const adminRoutePath = path.join(__dirname, '../components/AdminRoute.jsx')
const adminRouteContent = fs.readFileSync(adminRoutePath, 'utf8')

testAssert(
  adminRouteContent.includes('to="/admin/login"'),
  'AdminRoute redirects unauthenticated visitors to /admin/login'
)
testAssert(
  adminRouteContent.includes('state={{ from: location }}'),
  'AdminRoute preserves the intended location in state.from'
)
testAssert(
  adminRouteContent.includes("user?.role !== 'admin'") && adminRouteContent.includes('to="/"'),
  'AdminRoute redirects non-admin users away to safe storefront route (/)'
)

// ── 4. Customer Login Compatibility ─────────────────────────────────────────────
console.log('\n[4] Customer Login Compatibility:')

const customerLoginPagePath = path.join(__dirname, '../pages/LoginPage.jsx')
const customerLoginContent = fs.readFileSync(customerLoginPagePath, 'utf8')

testAssert(
  appRoutesContent.includes('path="/login"') && appRoutesContent.includes('<LoginPage />'),
  'Customer /login route remains actively configured'
)
testAssert(
  customerLoginContent.includes("canonical=\"/login\""),
  'LoginPage retains customer /login canonical'
)
testAssert(
  customerLoginContent.includes("destination = fromPath || (user?.role === 'admin' ? '/admin' : '/')"),
  'LoginPage preserves customer redirect to intended destination (e.g. /checkout) or home (/)'
)

// ── 5. Customer Denial & Safe Return on /admin/login ────────────────────────────
console.log('\n[5] Customer Denial & Safe Storefront Return:')

testAssert(
  adminLoginContent.includes("isAuthenticated && user?.role !== 'admin'"),
  'AdminLoginPage explicitly identifies authenticated non-admin users'
)
testAssert(
  adminLoginContent.includes('Administrator Privileges Required') &&
    adminLoginContent.includes('ACCESS RESTRICTED'),
  'AdminLoginPage displays prominent access-denied message for customers'
)
testAssert(
  adminLoginContent.includes('Return to Storefront') && adminLoginContent.includes('to="/"'),
  'AdminLoginPage provides explicit safe return action to customer storefront (/)'
)
testAssert(
  adminLoginContent.includes('Sign In with Different Account'),
  'AdminLoginPage allows customer to sign out and switch accounts directly'
)

// ── 6. Role-Based Login Submission Guard ────────────────────────────────────────
console.log('\n[6] Post-Submission Role Verification & Session Cleansing:')

testAssert(
  adminLoginContent.includes("loggedInUser?.role !== 'admin'") &&
    adminLoginContent.includes('dispatch(logout())'),
  'AdminLoginPage immediately revokes session and invokes logout if non-admin logs in'
)
testAssert(
  adminLoginContent.includes('destination =') &&
    adminLoginContent.includes("fromPath.startsWith('/admin')") &&
    adminLoginContent.includes("fromPath !== '/admin/login'"),
  'AdminLoginPage safely bounds admin destination to valid /admin routes and avoids loops'
)

// ── Summary ─────────────────────────────────────────────────────────────────────
console.log('\n========================================')
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`)
console.log('========================================\n')

if (failed > 0) {
  process.exit(1)
}
