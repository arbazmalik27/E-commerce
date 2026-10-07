/**
 * TrendVolt Phase 7 — Outfit Presets Utility
 * 
 * Provides pure validation, snapshot creation, slot inspection,
 * and lightweight frontend storage helpers for saved outfit presets.
 */

export const PRESETS_STORAGE_KEY = 'tv_outfit_presets'

/**
 * Validates a proposed outfit preset name against constraints.
 * 
 * Rules:
 * - Outfit must contain at least 1 selected item
 * - Name must be a non-empty string when trimmed
 * - Name must not duplicate an existing preset case-insensitively
 * 
 * @param {string} name - Proposed preset name
 * @param {Array} existingPresets - Currently saved presets
 * @param {object} outfit - Canonical outfit state { top, bottom, shoes, accessories }
 * @returns {{ valid: boolean, error?: string, trimmedName?: string }}
 */
export function validatePresetName(name, existingPresets = [], outfit = null) {
  if (outfit) {
    const totalItems =
      (outfit.top ? 1 : 0) +
      (outfit.bottom ? 1 : 0) +
      (outfit.shoes ? 1 : 0) +
      (Array.isArray(outfit.accessories) ? outfit.accessories.length : 0)
    if (totalItems === 0) {
      return { valid: false, error: 'Cannot save an empty outfit.' }
    }
  }

  if (typeof name !== 'string') {
    return { valid: false, error: 'Please enter a preset name.' }
  }

  const trimmed = name.trim()
  if (!trimmed) {
    return { valid: false, error: 'Please enter a preset name.' }
  }

  const isDuplicate = Array.isArray(existingPresets) && existingPresets.some(
    (p) => (p.name || '').trim().toLowerCase() === trimmed.toLowerCase()
  )
  if (isDuplicate) {
    return { valid: false, error: 'A preset with this name already exists.' }
  }

  return { valid: true, trimmedName: trimmed }
}

/**
 * Creates an immutable snapshot of an outfit state for preset storage.
 * Guarantees no live mutable references to active wardrobe state.
 * 
 * @param {string} name - Validated preset name
 * @param {object} outfit - Canonical outfit { top, bottom, shoes, accessories }
 * @returns {object} Immutable preset record
 */
export function createOutfitSnapshot(name, outfit) {
  const trimmed = (name || '').trim()
  return {
    id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    createdAt: new Date().toISOString(),
    outfit: {
      top: outfit?.top ? JSON.parse(JSON.stringify(outfit.top)) : null,
      bottom: outfit?.bottom ? JSON.parse(JSON.stringify(outfit.bottom)) : null,
      shoes: outfit?.shoes ? JSON.parse(JSON.stringify(outfit.shoes)) : null,
      accessories: Array.isArray(outfit?.accessories)
        ? JSON.parse(JSON.stringify(outfit.accessories))
        : [],
    },
  }
}

/**
 * Derives the list of occupied slot labels ('Top', 'Bottom', 'Shoes', 'Accessories')
 * for an outfit snapshot.
 * 
 * @param {object} outfit - Canonical outfit object
 * @returns {string[]} Array of occupied slot names
 */
export function getOccupiedSlots(outfit) {
  if (!outfit) return []
  const slots = []
  if (outfit.top) slots.push('Top')
  if (outfit.bottom) slots.push('Bottom')
  if (outfit.shoes) slots.push('Shoes')
  if (Array.isArray(outfit.accessories) && outfit.accessories.length > 0) {
    slots.push('Accessories')
  }
  return slots
}

/**
 * Safely loads saved presets from browser localStorage.
 * Returns empty array if localStorage is unavailable or corrupt.
 * 
 * @returns {Array} List of saved preset records
 */
export function loadPresetsFromStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return []
    const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Safely saves presets list to browser localStorage.
 * 
 * @param {Array} presets - List of preset records to store
 */
export function savePresetsToStorage(presets) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // Fail silently on restricted storage environments
  }
}
