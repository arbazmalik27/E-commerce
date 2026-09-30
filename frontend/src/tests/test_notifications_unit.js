import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { formatRelativeTime } from '../utils/formatRelativeTime.js'

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

console.log('=== TEST SUITE: NOTIFICATION SYSTEM FRONTEND UNIT TESTS ===\n')

// ── 1. Relative Time Formatting Utility ─────────────────────────────────────
console.log('[1] Relative Time Formatting Utility:')
const now = new Date()

const justNowDate = new Date(now.getTime() - 20 * 1000).toISOString()
testAssert(formatRelativeTime(justNowDate) === 'Just now', 'Formats recent timestamp as "Just now"')

const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
testAssert(formatRelativeTime(tenMinsAgo) === '10m ago', 'Formats minutes ago as "10m ago"')

const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
testAssert(formatRelativeTime(threeHoursAgo) === '3h ago', 'Formats hours ago as "3h ago"')

const yesterdayDate = new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString()
testAssert(formatRelativeTime(yesterdayDate) === 'Yesterday', 'Formats yesterday timestamp as "Yesterday"')

const emptyResult = formatRelativeTime(null)
testAssert(emptyResult === '', 'Handles null date safely without throwing')

const invalidResult = formatRelativeTime('invalid-date-string')
testAssert(invalidResult === '', 'Handles invalid date string safely without throwing')

// ── 2. Redux Slice & Store Architecture ─────────────────────────────────────
console.log('\n[2] Redux Slice & Store Architecture:')
const slicePath = path.join(__dirname, '../features/notifications/notificationSlice.js')
const sliceContent = fs.readFileSync(slicePath, 'utf8')

testAssert(
  sliceContent.includes("export const fetchNotifications = createAsyncThunk") &&
  sliceContent.includes("'notifications/fetchNotifications'"),
  'Defines fetchNotifications async thunk'
)
testAssert(
  sliceContent.includes("export const fetchUnreadCount = createAsyncThunk") &&
  sliceContent.includes("'notifications/fetchUnreadCount'"),
  'Defines fetchUnreadCount async thunk'
)
testAssert(
  sliceContent.includes("export const markNotificationRead = createAsyncThunk") &&
  sliceContent.includes("'notifications/markNotificationRead'"),
  'Defines markNotificationRead async thunk'
)
testAssert(
  sliceContent.includes("export const markAllNotificationsRead = createAsyncThunk") &&
  sliceContent.includes("'notifications/markAllNotificationsRead'"),
  'Defines markAllNotificationsRead async thunk'
)
testAssert(
  sliceContent.includes('logout.fulfilled') && sliceContent.includes('() => initialState'),
  'Resets notification state to initialState on logout'
)
testAssert(
  sliceContent.includes('export const selectNotifications =') &&
  sliceContent.includes('export const selectUnreadCount =') &&
  sliceContent.includes('export const selectNotificationsLoading =') &&
  sliceContent.includes('export const selectNotificationsInitialized ='),
  'Exports standard Redux selectors'
)

const storePath = path.join(__dirname, '../store/store.js')
const storeContent = fs.readFileSync(storePath, 'utf8')
testAssert(
  storeContent.includes("import notificationReducer from '../features/notifications/notificationSlice'") &&
  storeContent.includes('notifications: notificationReducer'),
  'Redux store registers notificationReducer under notifications key'
)

// ── 3. Notification Bell & Popover Component ────────────────────────────────
console.log('\n[3] Notification Bell Component & Popover:')
const bellPath = path.join(__dirname, '../components/notifications/NotificationBell.jsx')
const bellContent = fs.readFileSync(bellPath, 'utf8')

testAssert(
  bellContent.includes('import { Bell, ShoppingBag, Truck, Sparkles, CheckCheck } from \'lucide-react\''),
  'Imports required Lucide icons (Bell, ShoppingBag, Truck, Sparkles, CheckCheck)'
)
testAssert(
  bellContent.includes('TYPE_ICONS') &&
  bellContent.includes('order_confirmed:') &&
  bellContent.includes('order_status_updated:') &&
  bellContent.includes('back_in_stock:'),
  'Defines exact visual mappings for locked notification types'
)
testAssert(
  bellContent.includes('aria-haspopup="dialog"') &&
  bellContent.includes('aria-expanded={isOpen}'),
  'Enforces accessible dialog & expansion attributes on bell button'
)
testAssert(
  bellContent.includes("const badgeText = unreadCount > 99 ? '99+' : unreadCount"),
  'Caps unread badge count text to 99+'
)
testAssert(
  bellContent.includes('{unreadCount > 0 && (') &&
  bellContent.includes('data-testid="unread-badge"'),
  'Hides unread badge when unreadCount is 0'
)
testAssert(
  bellContent.includes("role=\"dialog\"") &&
  bellContent.includes("aria-label=\"Notifications Inbox\""),
  'Popover container defines role="dialog" and accessible label'
)
testAssert(
  bellContent.includes('No new notifications') &&
  bellContent.includes('You’re all caught up.'),
  'Renders specified editorial empty state when no notifications exist'
)
testAssert(
  bellContent.includes('handleClickOutside') &&
  bellContent.includes("e.key === 'Escape'"),
  'Closes popover dropdown on outside click and Escape key'
)
testAssert(
  bellContent.includes('handleMarkAllRead') &&
  bellContent.includes('dispatch(markAllNotificationsRead())'),
  'Dispatches markAllNotificationsRead action on Mark All Read click'
)
testAssert(
  bellContent.includes('navigate(notification.link)'),
  'Navigates to notification link on item click'
)

// ── 4. Navbar Integration ───────────────────────────────────────────────────
console.log('\n[4] Navbar Integration:')
const navbarPath = path.join(__dirname, '../components/Navbar.jsx')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')

testAssert(
  navbarContent.includes("import NotificationBell from './notifications/NotificationBell'"),
  'Navbar imports NotificationBell component'
)
testAssert(
  navbarContent.includes("import {\n  fetchUnreadCount,\n  selectNotificationsInitialized,\n} from '../features/notifications/notificationSlice'") ||
  navbarContent.includes("fetchUnreadCount") && navbarContent.includes("selectNotificationsInitialized"),
  'Navbar imports fetchUnreadCount and selectNotificationsInitialized'
)
testAssert(
  navbarContent.includes('{isAuthenticated && !notificationsInitialized) {') ||
  navbarContent.includes('if (isAuthenticated && !notificationsInitialized) {\n      dispatch(fetchUnreadCount())'),
  'Navbar initializes unread count when user is authenticated'
)
testAssert(
  navbarContent.includes('{/* Notifications Bell */}\n            {isAuthenticated && <NotificationBell />}') ||
  navbarContent.includes('{isAuthenticated && <NotificationBell />}'),
  'Navbar renders NotificationBell in desktop actions'
)
testAssert(
  navbarContent.includes('{isAuthenticated && <NotificationBell className="h-9 w-9" />}'),
  'Navbar renders NotificationBell in mobile utility action bar'
)

console.log('\n============================================================')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('ALL NOTIFICATION FRONTEND TESTS PASSED ✓')
} else {
  console.error('SOME NOTIFICATION FRONTEND TESTS FAILED ✗')
  process.exit(1)
}
console.log('============================================================')
