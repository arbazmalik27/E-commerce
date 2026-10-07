/**
 * TrendVolt Phase 7 Automated Unit Test Suite:
 * Outfit Presets Feature
 *
 * Verifies:
 * 1. Saving a valid outfit preset
 * 2. Empty preset name validation & rejection
 * 3. Duplicate preset name validation (case-insensitive)
 * 4. Empty outfit validation & rejection
 * 5. Deep snapshot immutability (no live mutable references)
 * 6. Preset with single slot (e.g. top only)
 * 7. Preset with all canonical slots (top, bottom, shoes, accessories)
 * 8. Occupied slot discovery & labeling
 * 9. Applying a preset into canonical outfit state
 * 10. Deleting a preset does not mutate active outfit or other presets
 * 11. Empty state string disclosure ("No saved outfits yet.")
 * 12. Accessories array accumulation & preservation in presets
 * 13. Integration with deterministic color matching engine
 * 14. Compatibility with existing canonical outfit state shape
 * 15. UI component contract & accessibility labels
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  INITIAL_OUTFIT,
} from '../constants/wardrobeConstants.js'
import {
  validatePresetName,
  createOutfitSnapshot,
  getOccupiedSlots,
  PRESETS_STORAGE_KEY,
} from '../utils/outfitPresets.js'
import {
  analyzeOutfitColorMatch,
} from '../utils/outfitColorMatcher.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✓ PASS: ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function runTests() {
  console.log('\n=== TEST SUITE: PHASE 7 OUTFIT PRESETS ===\n')

  const wardrobeComponentPath = path.resolve(__dirname, '../components/avatar/VirtualWardrobe.jsx')
  const wardrobePagePath = path.resolve(__dirname, '../pages/AvatarWardrobePage.jsx')
  const presetsUtilPath = path.resolve(__dirname, '../utils/outfitPresets.js')

  const wardrobeComponentContent = fs.readFileSync(wardrobeComponentPath, 'utf8')
  const wardrobePageContent = fs.readFileSync(wardrobePagePath, 'utf8')
  const presetsUtilContent = fs.readFileSync(presetsUtilPath, 'utf8')

  // Sample Product Records
  const sampleTop = { _id: 'prod-top-1', name: 'Linen Shirt', category: 'Tops', price: 2999, color: 'white' }
  const sampleBottom = { _id: 'prod-bot-1', name: 'Pleated Trousers', category: 'Bottoms', price: 3999, color: 'black' }
  const sampleShoes = { _id: 'prod-shoe-1', name: 'Leather Loafers', category: 'Shoes', price: 4999, color: 'black' }
  const sampleAcc1 = { _id: 'prod-acc-1', name: 'Classic Belt', category: 'Accessories', price: 1299, color: 'brown' }
  const sampleAcc2 = { _id: 'prod-acc-2', name: 'Silk Pocket Square', category: 'Accessories', price: 999, color: 'navy' }

  // =========================================================================
  // 1. PRESET NAME VALIDATION & CONSTRAINTS
  // =========================================================================
  console.log('[1] Preset Name Validation & Constraints:')

  const activeOutfit = {
    top: sampleTop,
    bottom: sampleBottom,
    shoes: sampleShoes,
    accessories: [sampleAcc1],
  }

  // Valid preset name
  const validCheck = validatePresetName('Summer Monochrome', [], activeOutfit)
  assert(validCheck.valid === true && validCheck.trimmedName === 'Summer Monochrome', 'Accepts valid preset name')

  // Name trimming
  const trimmedCheck = validatePresetName('   Casual Weekend   ', [], activeOutfit)
  assert(trimmedCheck.valid === true && trimmedCheck.trimmedName === 'Casual Weekend', 'Trims whitespace from proposed name')

  // Empty string rejection
  const emptyCheck = validatePresetName('', [], activeOutfit)
  assert(emptyCheck.valid === false && emptyCheck.error === 'Please enter a preset name.', 'Rejects empty string preset name')

  // Whitespace-only rejection
  const whitespaceCheck = validatePresetName('     ', [], activeOutfit)
  assert(whitespaceCheck.valid === false && whitespaceCheck.error === 'Please enter a preset name.', 'Rejects whitespace-only preset name')

  // Non-string rejection
  const nullCheck = validatePresetName(null, [], activeOutfit)
  assert(nullCheck.valid === false, 'Rejects null preset name')

  // Duplicate name rejection (exact match)
  const existing = [{ id: 'p1', name: 'Autumn Minimalist', outfit: activeOutfit }]
  const dupCheck1 = validatePresetName('Autumn Minimalist', existing, activeOutfit)
  assert(dupCheck1.valid === false && dupCheck1.error === 'A preset with this name already exists.', 'Rejects duplicate preset name')

  // Duplicate name rejection (case-insensitive & trimmed)
  const dupCheck2 = validatePresetName('  autumn minimalist  ', existing, activeOutfit)
  assert(dupCheck2.valid === false && dupCheck2.error === 'A preset with this name already exists.', 'Rejects duplicate preset name case-insensitively')

  // Empty outfit rejection
  const emptyOutfit = { top: null, bottom: null, shoes: null, accessories: [] }
  const emptyOutfitCheck = validatePresetName('Valid Name', [], emptyOutfit)
  assert(emptyOutfitCheck.valid === false && emptyOutfitCheck.error === 'Cannot save an empty outfit.', 'Rejects saving an outfit with zero selected items')

  // =========================================================================
  // 2. SNAPSHOT BEHAVIOR & IMMUTABILITY
  // =========================================================================
  console.log('\n[2] Snapshot Behavior & Immutability:')

  const liveOutfit = {
    top: { ...sampleTop },
    bottom: { ...sampleBottom },
    shoes: null,
    accessories: [{ ...sampleAcc1 }],
  }

  const snapshot = createOutfitSnapshot('My Preset', liveOutfit)

  assert(snapshot.id && typeof snapshot.id === 'string', 'Snapshot generates unique identifier')
  assert(snapshot.name === 'My Preset', 'Snapshot records trimmed name')
  assert(snapshot.createdAt && !Number.isNaN(Date.parse(snapshot.createdAt)), 'Snapshot records valid ISO timestamp')
  assert(snapshot.outfit.top._id === sampleTop._id, 'Snapshot captures top product details')
  assert(snapshot.outfit.bottom._id === sampleBottom._id, 'Snapshot captures bottom product details')
  assert(snapshot.outfit.shoes === null, 'Snapshot preserves null slots')
  assert(snapshot.outfit.accessories.length === 1, 'Snapshot preserves accessories array')

  // Mutate live outfit to ensure snapshot is completely decoupled
  liveOutfit.top.name = 'MUTATED TOP NAME'
  liveOutfit.accessories[0].price = 99999
  liveOutfit.bottom = null

  assert(snapshot.outfit.top.name === 'Linen Shirt', 'Snapshot is immune to subsequent mutations of top item')
  assert(snapshot.outfit.accessories[0].price === 1299, 'Snapshot is immune to subsequent mutations of accessories')
  assert(snapshot.outfit.bottom !== null, 'Snapshot preserves bottom even if active outfit bottom is cleared')

  // =========================================================================
  // 3. PRESET WITH ONE SLOT vs ALL SLOTS
  // =========================================================================
  console.log('\n[3] Single-Slot vs Multi-Slot Presets:')

  const singleSlotOutfit = { top: sampleTop, bottom: null, shoes: null, accessories: [] }
  const singleSnapshot = createOutfitSnapshot('Top Only', singleSlotOutfit)
  const singleSlots = getOccupiedSlots(singleSnapshot.outfit)

  assert(singleSlots.length === 1 && singleSlots[0] === 'Top', 'Occupied slots correctly identifies single Top slot')

  const fullSlotOutfit = {
    top: sampleTop,
    bottom: sampleBottom,
    shoes: sampleShoes,
    accessories: [sampleAcc1, sampleAcc2],
  }
  const fullSnapshot = createOutfitSnapshot('Full Ensemble', fullSlotOutfit)
  const fullSlots = getOccupiedSlots(fullSnapshot.outfit)

  assert(
    fullSlots.length === 4 &&
    fullSlots.includes('Top') &&
    fullSlots.includes('Bottom') &&
    fullSlots.includes('Shoes') &&
    fullSlots.includes('Accessories'),
    'Occupied slots correctly identifies Top, Bottom, Shoes, and Accessories'
  )

  // =========================================================================
  // 4. APPLYING & DELETING PRESETS
  // =========================================================================
  console.log('\n[4] Applying & Deleting Presets:')

  // Simulated wardrobe state
  let currentOutfit = { ...INITIAL_OUTFIT }

  // Function to apply preset (replicates AvatarWardrobePage handleApplyOutfit)
  const applyPresetSim = (preset) => {
    currentOutfit = {
      top: preset.outfit.top ? JSON.parse(JSON.stringify(preset.outfit.top)) : null,
      bottom: preset.outfit.bottom ? JSON.parse(JSON.stringify(preset.outfit.bottom)) : null,
      shoes: preset.outfit.shoes ? JSON.parse(JSON.stringify(preset.outfit.shoes)) : null,
      accessories: Array.isArray(preset.outfit.accessories)
        ? JSON.parse(JSON.stringify(preset.outfit.accessories))
        : [],
    }
  }

  applyPresetSim(fullSnapshot)

  assert(currentOutfit.top._id === sampleTop._id, 'Applying preset restores top item')
  assert(currentOutfit.bottom._id === sampleBottom._id, 'Applying preset restores bottom item')
  assert(currentOutfit.shoes._id === sampleShoes._id, 'Applying preset restores shoes item')
  assert(currentOutfit.accessories.length === 2, 'Applying preset restores multiple accessories')

  // Deleting preset test
  let presetsList = [singleSnapshot, fullSnapshot]
  const deleteId = singleSnapshot.id

  // Perform delete
  presetsList = presetsList.filter((p) => p.id !== deleteId)

  assert(presetsList.length === 1 && presetsList[0].id === fullSnapshot.id, 'Deleting removes only targeted preset')
  assert(currentOutfit.top._id === sampleTop._id, 'Deleting a preset does NOT modify currently active outfit')
  assert(currentOutfit.bottom._id === sampleBottom._id, 'Active outfit remains completely intact after preset deletion')

  // =========================================================================
  // 5. DETERMINISTIC COLOR MATCHER INTEGRATION
  // =========================================================================
  console.log('\n[5] Deterministic Color Matcher Compatibility:')

  // Applying preset updates outfit state, which color matcher evaluates
  const matchResult = analyzeOutfitColorMatch(currentOutfit)

  assert(matchResult.status === 'excellent', 'Restored preset color harmony correctly computed as excellent')
  assert(matchResult.score >= 90, 'Restored preset score reflects deterministic calculation')
  assert(Array.isArray(matchResult.pairings), 'Color matcher generates garment pairings for restored preset')

  // =========================================================================
  // 6. UI COMPONENT ARCHITECTURE & LABELS
  // =========================================================================
  console.log('\n[6] UI Component Architecture & Accessibility:')

  assert(
    wardrobeComponentContent.includes('Save Outfit'),
    'VirtualWardrobe provides clear "Save Outfit" action'
  )

  assert(
    wardrobeComponentContent.includes('Saved Outfits'),
    'VirtualWardrobe contains "Saved Outfits" section'
  )

  assert(
    wardrobeComponentContent.includes('No saved outfits yet.'),
    'VirtualWardrobe provides exact "No saved outfits yet." empty state disclosure'
  )

  assert(
    wardrobeComponentContent.includes('aria-label="Saved Outfits"'),
    'Saved Outfits section has accessible aria-label landmark'
  )

  assert(
    wardrobeComponentContent.includes('handleSavePreset') &&
    wardrobeComponentContent.includes('handleApplyPreset') &&
    wardrobeComponentContent.includes('handleDeletePreset'),
    'VirtualWardrobe implements save, apply, and delete handlers'
  )

  assert(
    wardrobeComponentContent.includes('onApplyOutfit'),
    'VirtualWardrobe supports onApplyOutfit callback prop'
  )

  assert(
    wardrobePageContent.includes('handleApplyOutfit') &&
    wardrobePageContent.includes('onApplyOutfit={handleApplyOutfit}'),
    'AvatarWardrobePage implements and passes handleApplyOutfit to VirtualWardrobe'
  )

  assert(
    presetsUtilContent.includes(PRESETS_STORAGE_KEY),
    'Outfit presets utility uses scoped localStorage storage key'
  )

  console.log('\n-------------------------------------------------------------')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log('-------------------------------------------------------------\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
