import assert from 'node:assert'

// Mock localStorage environment for headless Node test
const storage = new Map()
global.window = {
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, val) => storage.set(key, String(val)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
  },
}

const STORAGE_KEY = 'trendvolt_recently_viewed'
const MAX_RECENT_ITEMS = 8

const isValidProductId = (id) => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id.trim())
}

const getRecentlyViewedIds = () => {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const validIds = parsed
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((id) => isValidProductId(id))
    return Array.from(new Set(validIds)).slice(0, MAX_RECENT_ITEMS)
  } catch {
    return []
  }
}

const addRecentlyViewedId = (productId) => {
  if (!isValidProductId(productId)) return getRecentlyViewedIds()
  const cleanId = productId.trim()
  const existing = getRecentlyViewedIds()
  const filtered = existing.filter((id) => id !== cleanId)
  const updated = [cleanId, ...filtered].slice(0, MAX_RECENT_ITEMS)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  } catch {}
  return updated
}

const removeRecentlyViewedId = (productId) => {
  if (!isValidProductId(productId)) return getRecentlyViewedIds()
  const cleanId = productId.trim()
  const existing = getRecentlyViewedIds()
  const updated = existing.filter((id) => id !== cleanId)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  } catch {}
  return updated
}

const syncRecentlyViewedIds = (validBackendIds) => {
  if (!Array.isArray(validBackendIds)) return getRecentlyViewedIds()
  const validSet = new Set(validBackendIds.map((id) => (typeof id === 'string' ? id.trim() : '')))
  const current = getRecentlyViewedIds()
  const pruned = current.filter((id) => validSet.has(id))
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    }
  } catch {}
  return pruned
}

const clearRecentlyViewed = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
}

let passed = 0
function test(desc, fn) {
  try {
    fn()
    console.log(`  ✓ PASS: ${desc}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc}`, err)
    process.exit(1)
  }
}

console.log('=== TEST SUITE: RECENTLY VIEWED PRODUCTS UNIT TESTS ===\n')

// 1. Initial State
test('Initial getRecentlyViewedIds returns empty array', () => {
  storage.clear()
  const ids = getRecentlyViewedIds()
  assert.deepStrictEqual(ids, [])
})

// 2. ID Validation
test('Validates 24-character hexadecimal MongoDB ObjectIds', () => {
  assert.strictEqual(isValidProductId('6aae361aa139bd5a38bf90ea'), true)
  assert.strictEqual(isValidProductId('6aae361ba139bd5a38bf90ee'), true)
  assert.strictEqual(isValidProductId('invalid-id'), false)
  assert.strictEqual(isValidProductId('12345'), false)
  assert.strictEqual(isValidProductId(null), false)
  assert.strictEqual(isValidProductId(undefined), false)
  assert.strictEqual(isValidProductId({}), false)
  assert.strictEqual(isValidProductId('6aae361aa139bd5a38bf90eZ'), false) // non-hex character
})

// 3. Adding Valid Product ID
test('Adding valid ID stores it in localStorage', () => {
  storage.clear()
  const res = addRecentlyViewedId('6aae361aa139bd5a38bf90ea')
  assert.deepStrictEqual(res, ['6aae361aa139bd5a38bf90ea'])
  assert.deepStrictEqual(getRecentlyViewedIds(), ['6aae361aa139bd5a38bf90ea'])
})

// 4. Invalid IDs ignored
test('Invalid product IDs are rejected and do not modify storage', () => {
  storage.clear()
  addRecentlyViewedId('6aae361aa139bd5a38bf90ea')
  addRecentlyViewedId('not-a-valid-id')
  addRecentlyViewedId(null)
  assert.deepStrictEqual(getRecentlyViewedIds(), ['6aae361aa139bd5a38bf90ea'])
})

// 5. Unshifting & Ordering (Newest First)
test('Subsequent views prepend to front (newest-first)', () => {
  storage.clear()
  addRecentlyViewedId('6aae361aa139bd5a38bf90ea') // A
  addRecentlyViewedId('6aae361aa139bd5a38bf90eb') // B
  addRecentlyViewedId('6aae361aa139bd5a38bf90ec') // C
  assert.deepStrictEqual(getRecentlyViewedIds(), [
    '6aae361aa139bd5a38bf90ec', // C
    '6aae361aa139bd5a38bf90eb', // B
    '6aae361aa139bd5a38bf90ea', // A
  ])
})

// 6. Duplicate Handling: Move to Front Without Duplicate
test('Re-viewing an existing product moves it to front without duplicate', () => {
  // Current: [C, B, A]
  // User re-views B: should become [B, C, A]
  addRecentlyViewedId('6aae361aa139bd5a38bf90eb')
  assert.deepStrictEqual(getRecentlyViewedIds(), [
    '6aae361aa139bd5a38bf90eb', // B (moved to front)
    '6aae361aa139bd5a38bf90ec', // C
    '6aae361aa139bd5a38bf90ea', // A
  ])

  // User re-views A: should become [A, B, C]
  addRecentlyViewedId('6aae361aa139bd5a38bf90ea')
  assert.deepStrictEqual(getRecentlyViewedIds(), [
    '6aae361aa139bd5a38bf90ea', // A (moved to front)
    '6aae361aa139bd5a38bf90eb', // B
    '6aae361aa139bd5a38bf90ec', // C
  ])
})

// 7. Max Limit (8 items)
test('History is capped at MAX_RECENT_ITEMS (8)', () => {
  storage.clear()
  const fakeIds = [
    '111111111111111111111111',
    '222222222222222222222222',
    '333333333333333333333333',
    '444444444444444444444444',
    '555555555555555555555555',
    '666666666666666666666666',
    '777777777777777777777777',
    '888888888888888888888888',
    '999999999999999999999999', // 9th item
    'aaaaaaaaaaaaaaaaaaaaaaaa', // 10th item
  ]
  fakeIds.forEach((id) => addRecentlyViewedId(id))
  const stored = getRecentlyViewedIds()
  assert.strictEqual(stored.length, 8)
  assert.strictEqual(stored[0], 'aaaaaaaaaaaaaaaaaaaaaaaa') // newest
  assert.strictEqual(stored[1], '999999999999999999999999')
  assert.strictEqual(stored[7], '333333333333333333333333') // oldest kept
  assert.strictEqual(stored.includes('111111111111111111111111'), false) // dropped
})

// 8. Corrupted / Malformed Storage Recovery
test('Safely handles malformed JSON in localStorage without crash', () => {
  storage.set(STORAGE_KEY, 'not-valid-json{{{')
  assert.deepStrictEqual(getRecentlyViewedIds(), [])
})

test('Safely handles non-array JSON in localStorage', () => {
  storage.set(STORAGE_KEY, JSON.stringify({ some: 'object' }))
  assert.deepStrictEqual(getRecentlyViewedIds(), [])
})

// 9. Remove Product ID
test('removeRecentlyViewedId removes single product ID cleanly', () => {
  storage.clear()
  addRecentlyViewedId('6aae361aa139bd5a38bf90ea')
  addRecentlyViewedId('6aae361aa139bd5a38bf90eb')
  removeRecentlyViewedId('6aae361aa139bd5a38bf90ea')
  assert.deepStrictEqual(getRecentlyViewedIds(), ['6aae361aa139bd5a38bf90eb'])
})

// 10. Sync Pruning of Deleted/Inactive IDs
test('syncRecentlyViewedIds prunes IDs not returned by backend', () => {
  storage.clear()
  addRecentlyViewedId('6aae361aa139bd5a38bf90ea') // A
  addRecentlyViewedId('6aae361aa139bd5a38bf90eb') // B
  addRecentlyViewedId('6aae361aa139bd5a38bf90ec') // C
  // Say backend only returns A and C (B was deleted or soft-deleted)
  const validBackend = ['6aae361aa139bd5a38bf90ea', '6aae361aa139bd5a38bf90ec']
  syncRecentlyViewedIds(validBackend)
  assert.deepStrictEqual(getRecentlyViewedIds(), [
    '6aae361aa139bd5a38bf90ec', // C
    '6aae361aa139bd5a38bf90ea', // A
  ])
})

// 11. Clear History
test('clearRecentlyViewed removes key completely', () => {
  addRecentlyViewedId('6aae361aa139bd5a38bf90ea')
  clearRecentlyViewed()
  assert.deepStrictEqual(getRecentlyViewedIds(), [])
})

console.log(`\nAll ${passed} recently viewed unit tests passed successfully!\n`)
