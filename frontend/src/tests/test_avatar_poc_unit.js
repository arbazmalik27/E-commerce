/**
 * Automated Verification Suite for TrendVolt Phase 2:
 * 3D Avatar Foundation POC (Mesh, OrbitControls, 5 Morph Targets)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let passedCount = 0
let failedCount = 0

function assert(condition, message) {
  if (condition) {
    passedCount++
    console.log(`  ✓ PASS: ${message}`)
  } else {
    failedCount++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function runTests() {
  console.log('\n=== TEST SUITE: 3D AVATAR FOUNDATION POC (PHASE 2) ===\n')

  // 1. Asset Verification: Base Avatar GLB
  console.log('[1] Base Avatar GLB Asset Integrity:')
  const glbPath = path.resolve(__dirname, '../../public/models/base_avatar_poc.glb')
  assert(fs.existsSync(glbPath), 'base_avatar_poc.glb exists in public/models/')

  const stats = fs.statSync(glbPath)
  const sizeKb = stats.size / 1024
  assert(sizeKb > 50 && sizeKb < 2000, `Asset size is within mobile budget (${sizeKb.toFixed(1)} KB, budget < 2MB)`)

  const buffer = fs.readFileSync(glbPath)
  // Check GLB header magic: 0x46546C67 ("glTF")
  const magic = buffer.toString('utf8', 0, 4)
  assert(magic === 'glTF', 'File has valid binary glTF header magic ("glTF")')

  const version = buffer.readUInt32LE(4)
  assert(version === 2, `glTF version is 2.0 (found ${version})`)

  // Inspect JSON chunk for required morph target names
  const jsonChunkLength = buffer.readUInt32LE(12)
  const jsonChunkType = buffer.readUInt32LE(16)
  assert(jsonChunkType === 0x4e4f534a, 'First chunk is valid JSON chunk (JSON: 0x4e4f534a)')

  const jsonString = buffer.toString('utf8', 20, 20 + jsonChunkLength)
  const gltfJson = JSON.parse(jsonString)

  assert(Boolean(gltfJson.meshes && gltfJson.meshes.length > 0), 'GLB contains at least one mesh primitive')

  const primaryMesh = gltfJson.meshes[0]
  const targetNames = primaryMesh.extras?.targetNames || primaryMesh.primitives?.[0]?.extras?.targetNames || []

  // Check the presence of target names in the JSON string or extras
  const REQUIRED_TARGETS = ['chestScale', 'waistScale', 'hipScale', 'legLength', 'torsoDepth']
  for (const target of REQUIRED_TARGETS) {
    const isPresent = jsonString.includes(`"${target}"`) || targetNames.includes(target)
    assert(isPresent, `Mesh contains required morph target: "${target}"`)
  }

  // 2. Component Structure: AvatarViewer.jsx
  console.log('\n[2] AvatarViewer Component Boundary:')
  const viewerPath = path.resolve(__dirname, '../components/avatar/AvatarViewer.jsx')
  assert(fs.existsSync(viewerPath), 'AvatarViewer.jsx component exists')

  const viewerContent = fs.readFileSync(viewerPath, 'utf8')
  assert(viewerContent.includes('OrbitControls'), 'AvatarViewer integrates OrbitControls for 360° rotation')
  assert(viewerContent.includes('GLTFLoader'), 'AvatarViewer integrates GLTFLoader for asset loading')
  assert(viewerContent.includes('morphTargetDictionary'), 'AvatarViewer detects mesh morphTargetDictionary')
  assert(viewerContent.includes('morphTargetInfluences'), 'AvatarViewer maps morphTargetInfluences dynamically')
  assert(viewerContent.includes('isWebGLAvailable'), 'AvatarViewer checks WebGL capability before mounting')
  assert(viewerContent.includes('cancelAnimationFrame'), 'AvatarViewer properly cleans up animation loop on unmount')
  assert(viewerContent.includes('controls.dispose()'), 'AvatarViewer properly disposes OrbitControls on unmount')
  assert(viewerContent.includes('renderer.dispose()'), 'AvatarViewer properly disposes WebGLRenderer on unmount')
  assert(viewerContent.includes('resetView'), 'AvatarViewer exposes imperative resetView camera method')

  // 3. Component Structure: MorphControls.jsx
  console.log('\n[3] MorphControls Verification:')
  const controlsPath = path.resolve(__dirname, '../components/avatar/MorphControls.jsx')
  assert(fs.existsSync(controlsPath), 'MorphControls.jsx component exists')

  const controlsContent = fs.readFileSync(controlsPath, 'utf8')
  for (const target of REQUIRED_TARGETS) {
    assert(controlsContent.includes(target), `MorphControls provides control for "${target}"`)
  }
  assert(controlsContent.includes('PRESETS'), 'MorphControls provides test presets for rapid evaluation')
  assert(controlsContent.includes('Reset All'), 'MorphControls provides Reset All capability')

  // 4. Page Integration & Route Isolation
  console.log('\n[4] Page & Routing Isolation:')
  const pagePath = path.resolve(__dirname, '../pages/AvatarPocPage.jsx')
  assert(fs.existsSync(pagePath), 'AvatarPocPage.jsx developer POC page exists')

  const appRoutesPath = path.resolve(__dirname, '../routes/AppRoutes.jsx')
  const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8')
  assert(appRoutesContent.includes('/avatar-poc'), 'AppRoutes registers /avatar-poc route')
  assert(appRoutesContent.includes('AvatarPocPage'), 'AppRoutes lazy-loads AvatarPocPage')

  // 5. Commerce & Sizing Preservation (Non-Interference)
  console.log('\n[5] Commerce & Sizing Integrity (Zero Interference):')
  assert(!viewerContent.includes('Cart'), 'AvatarViewer has zero dependency on Cart')
  assert(!viewerContent.includes('Order'), 'AvatarViewer has zero dependency on Orders')
  assert(!viewerContent.includes('recommendSize'), 'AvatarViewer does not alter or invoke recommendSize()')
  assert(!viewerContent.includes('api/avatar'), 'Phase 2 POC does not call unvalidated production backend APIs')

  console.log('\n============================================================')
  console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
  if (failedCount === 0) {
    console.log('ALL 3D AVATAR FOUNDATION POC TESTS PASSED ✓')
  } else {
    console.error('SOME 3D AVATAR FOUNDATION POC TESTS FAILED ✗')
    process.exit(1)
  }
  console.log('============================================================\n')
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
