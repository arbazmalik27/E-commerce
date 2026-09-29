/**
 * TrendVolt Recently Viewed Products Utility
 * 
 * Manages lightweight client-side persistence of recently viewed product IDs.
 * Note: Only minimal product IDs are persisted. Authoritative product metadata
 * (price, stock, images, names) is ALWAYS resolved dynamically from the backend.
 */

const STORAGE_KEY = 'trendvolt_recently_viewed'
export const MAX_RECENT_ITEMS = 8

/**
 * Validates whether a value is a valid 24-character hexadecimal MongoDB ObjectId string.
 */
export const isValidProductId = (id) => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id.trim())
}

/**
 * Retrieves the stored list of recently viewed product IDs.
 * Safely handles missing, corrupted, or malformed localStorage entries.
 * 
 * @returns {string[]} Array of valid product ID strings, newest first.
 */
export const getRecentlyViewedIds = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Filter to retain only valid ObjectId strings, preserving order, capped at MAX_RECENT_ITEMS
    const validIds = parsed
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((id) => isValidProductId(id))

    // Remove duplicates while preserving newest-first order
    const uniqueIds = Array.from(new Set(validIds)).slice(0, MAX_RECENT_ITEMS)
    return uniqueIds
  } catch {
    return []
  }
}

/**
 * Adds a valid product ID to the recently viewed history.
 * - Prepends the product ID to the front (newest-first).
 * - Moves already-viewed items to the front without duplication.
 * - Limits the list to MAX_RECENT_ITEMS.
 * - Ignores invalid or missing IDs.
 * 
 * @param {string} productId - The MongoDB ObjectId string of the viewed product.
 * @returns {string[]} The updated array of recently viewed product IDs.
 */
export const addRecentlyViewedId = (productId) => {
  if (!isValidProductId(productId)) {
    return getRecentlyViewedIds()
  }

  const cleanId = productId.trim()
  const existing = getRecentlyViewedIds()
  const filtered = existing.filter((id) => id !== cleanId)
  const updated = [cleanId, ...filtered].slice(0, MAX_RECENT_ITEMS)

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  } catch {
    // Fail gracefully if localStorage is unavailable or storage quota exceeded
  }

  return updated
}

/**
 * Removes a single product ID from the stored history (e.g. if detected as deleted or inactive).
 * 
 * @param {string} productId - The ID to remove.
 * @returns {string[]} The updated array of recently viewed product IDs.
 */
export const removeRecentlyViewedId = (productId) => {
  if (!isValidProductId(productId)) {
    return getRecentlyViewedIds()
  }

  const cleanId = productId.trim()
  const existing = getRecentlyViewedIds()
  const updated = existing.filter((id) => id !== cleanId)

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  } catch {
    // Fail gracefully
  }

  return updated
}

/**
 * Prunes the stored history to keep only IDs verified as active by the backend.
 * Preserves the original newest-viewed order.
 * 
 * @param {string[]} validBackendIds - Array of active product IDs returned by the backend.
 * @returns {string[]} The pruned array of recently viewed product IDs.
 */
export const syncRecentlyViewedIds = (validBackendIds) => {
  if (!Array.isArray(validBackendIds)) return getRecentlyViewedIds()

  const validSet = new Set(validBackendIds.map((id) => (typeof id === 'string' ? id.trim() : '')))
  const current = getRecentlyViewedIds()
  const pruned = current.filter((id) => validSet.has(id))

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
    }
  } catch {
    // Fail gracefully
  }

  return pruned
}

/**
 * Completely clears the stored recently viewed history.
 */
export const clearRecentlyViewed = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Fail gracefully
  }
}
