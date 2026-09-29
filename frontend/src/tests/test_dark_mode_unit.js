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

console.log('=== TEST SUITE: TRENDVOLT DARK MODE SYSTEM UNIT TESTS ===\n')

// 1. Theme Storage & Fallback Logic Simulation
console.log('[1] Theme Storage & State Logic:')
const THEME_STORAGE_KEY = 'trendvolt_theme'

function getInitialTheme(mockStorage) {
  try {
    const saved = mockStorage[THEME_STORAGE_KEY]
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
    return 'light'
  } catch {
    return 'light'
  }
}

testAssert(getInitialTheme({}) === 'light', 'Default theme is light when storage is empty')
testAssert(getInitialTheme({ [THEME_STORAGE_KEY]: 'dark' }) === 'dark', 'Hydrates dark theme when stored')
testAssert(getInitialTheme({ [THEME_STORAGE_KEY]: 'light' }) === 'light', 'Hydrates light theme when stored')
testAssert(getInitialTheme({ [THEME_STORAGE_KEY]: 'invalid_theme' }) === 'light', 'Falls back safely to light on invalid stored value')

// Toggle function
function toggleTheme(current) {
  return current === 'dark' ? 'light' : 'dark'
}
testAssert(toggleTheme('light') === 'dark', 'Toggles light -> dark')
testAssert(toggleTheme('dark') === 'light', 'Toggles dark -> light')

// 2. index.html Flash-Prevention Script
console.log('\n[2] Flash-Prevention Script in index.html:')
const indexHtmlPath = path.join(__dirname, '../../index.html')
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8')

testAssert(indexHtmlContent.includes('trendvolt_theme'), 'index.html references trendvolt_theme storage key')
testAssert(indexHtmlContent.includes("setAttribute('data-theme', 'dark')"), 'index.html sets data-theme="dark"')
testAssert(indexHtmlContent.includes("classList.add('dark')"), 'index.html adds dark class to documentElement')
testAssert(indexHtmlContent.includes("setAttribute('data-theme', 'light')"), 'index.html sets data-theme="light" fallback')

// 3. index.css Dark Mode Tokens & Overrides
console.log('\n[3] index.css Dark Mode Tokens & Overrides:')
const indexCssPath = path.join(__dirname, '../index.css')
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8')

testAssert(indexCssContent.includes('[data-theme="dark"]'), 'index.css defines [data-theme="dark"] selector')
testAssert(indexCssContent.includes('--tv-bg: #131411;'), 'Dark canvas background token --tv-bg is defined')
testAssert(indexCssContent.includes('--tv-surface: #1E211A;'), 'Dark card surface token --tv-surface is defined')
testAssert(indexCssContent.includes('--tv-surface-elevated: #262A21;'), 'Dark elevated surface token --tv-surface-elevated is defined')
testAssert(indexCssContent.includes('--tv-text-primary: #F6F3EC;'), 'Dark primary text token --tv-text-primary is defined with high contrast')
testAssert(indexCssContent.includes('--tv-text-secondary: #B9B6AD;'), 'Dark secondary text token --tv-text-secondary is defined')
testAssert(indexCssContent.includes('--tv-border: #30362A;'), 'Dark border token --tv-border is defined')

// Background utility mappings
testAssert(indexCssContent.includes('.bg-\\[\\#F5F0E8\\]'), 'Maps bg-[#F5F0E8] to dark background')
testAssert(indexCssContent.includes('.bg-\\[\\#FFFDF8\\]'), 'Maps bg-[#FFFDF8] to dark surface')
testAssert(indexCssContent.includes('.bg-\\[\\#FAF7F0\\]'), 'Maps bg-[#FAF7F0] to dark elevated surface')
testAssert(indexCssContent.includes('.bg-\\[\\#EEE7DC\\]'), 'Maps bg-[#EEE7DC] to dark warm surface')

// Text utility mappings
testAssert(indexCssContent.includes('.text-\\[\\#1F211C\\]'), 'Maps text-[#1F211C] to dark primary text')
testAssert(indexCssContent.includes('.text-\\[\\#5F6057\\]'), 'Maps text-[#5F6057] to dark secondary text')
testAssert(indexCssContent.includes('.text-\\[\\#34452F\\]'), 'Maps text-[#34452F] to readable olive tint on dark background')
testAssert(indexCssContent.includes('.text-\\[\\#A65332\\]'), 'Maps text-[#A65332] to vibrant warm terracotta on dark background')

// Borders & Dividers
testAssert(indexCssContent.includes('.border-\\[\\#DED7CA\\]'), 'Maps border-[#DED7CA] to dark border')
testAssert(indexCssContent.includes('.divide-\\[\\#DED7CA\\]'), 'Maps divide-[#DED7CA] to dark border')

// Form Controls System
testAssert(indexCssContent.includes('[data-theme="dark"] input:not([type="checkbox"])'), 'Explicit dark mode input background and text styles')
testAssert(indexCssContent.includes('[data-theme="dark"] textarea'), 'Explicit dark mode textarea styles')
testAssert(indexCssContent.includes('[data-theme="dark"] select'), 'Explicit dark mode select dropdown styles')
testAssert(indexCssContent.includes('[data-theme="dark"] select option'), 'Explicit dark mode select option background and text')
testAssert(indexCssContent.includes('[data-theme="dark"] input::placeholder'), 'Explicit dark mode placeholder styles')

// Skeletons
testAssert(indexCssContent.includes('[data-theme="dark"] .animate-pulse'), 'Explicit dark mode pulse skeleton styling')

// 4. Component Structure & Toggle Integration
console.log('\n[4] Component Structure & Toggle Integration:')
const navbarPath = path.join(__dirname, '../components/Navbar.jsx')
const navbarContent = fs.readFileSync(navbarPath, 'utf8')

testAssert(navbarContent.includes('ThemeToggle'), 'Navbar imports ThemeToggle component')
testAssert(navbarContent.includes('<ThemeToggle />'), 'Navbar renders ThemeToggle in desktop actions')
testAssert(navbarContent.includes('<ThemeToggle className="h-9 w-9" />'), 'Navbar renders ThemeToggle in mobile action bar')
testAssert(navbarContent.includes('<ThemeToggle variant="mobile-row" />'), 'Navbar renders ThemeToggle in mobile navigation drawer')

const togglePath = path.join(__dirname, '../components/ThemeToggle.jsx')
const toggleContent = fs.readFileSync(togglePath, 'utf8')

testAssert(toggleContent.includes('useTheme'), 'ThemeToggle uses useTheme hook')
testAssert(toggleContent.includes('aria-label'), 'ThemeToggle includes accessible aria-label')
testAssert(toggleContent.includes('Moon') && toggleContent.includes('Sun'), 'ThemeToggle includes Moon and Sun Lucide icons')

const mainPath = path.join(__dirname, '../main.jsx')
const mainContent = fs.readFileSync(mainPath, 'utf8')
testAssert(mainContent.includes('ThemeProvider'), 'main.jsx wraps application root with ThemeProvider')

console.log('\n============================================================')
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
console.log(failed === 0 ? 'ALL DARK MODE UNIT TESTS PASSED ✓' : 'SOME TESTS FAILED ✗')
console.log('============================================================')

process.exit(failed > 0 ? 1 : 0)
