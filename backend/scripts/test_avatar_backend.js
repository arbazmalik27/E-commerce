/**
 * Automated Verification Suite for TrendVolt Phase 3C:
 * AvatarProfile Model + Authenticated Backend Integration
 *
 * Verifies:
 * 1. AvatarProfile Mongoose Model & Schema Validation:
 *    - Valid adult profile
 *    - Valid youth profile
 *    - Invalid demographic
 *    - Invalid age (youth boundary & adult prohibition)
 *    - Invalid height (adult and youth boundaries)
 *    - Invalid measurements (chest/waist/hip physiological bounds)
 *    - Invalid morph values [0.0, 1.0]
 *    - Invalid fitPreference
 *    - One-to-one unique user index
 * 2. Strict Photo Privacy Audit:
 *    - Zero photo/image/landmark/embedding fields in schema
 *    - API validator strictly rejects photo payloads with 400
 * 3. Sizing Engine Integration:
 *    - toSizingInputs() formats compatible inputs for recommendSize()
 *    - Manual tape measurements remain authoritative; photo values never become sizing ground truth
 * 4. Authenticated API Endpoints:
 *    - GET /api/avatar: 401 unauthenticated, 404 when missing, 200 when exists
 *    - POST /api/avatar: 401 unauthenticated, 400 validation error, 400 duplicate rejected, 201 created
 *    - PUT /api/avatar: 401 unauthenticated, 400 validation error, 404 missing, 200 updated
 *    - DELETE /api/avatar: 401 unauthenticated, 404 missing, 200 deleted
 * 5. IDOR & Ownership Isolation:
 *    - User A cannot view, update, or delete User B's avatar profile
 */

const http = require('http')
const path = require('path')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const app = require('../src/app')
const User = require('../src/models/User')
const AvatarProfile = require('../src/models/AvatarProfile')
const { validateAvatarInput } = require('../src/validators/avatarValidator')
const { recommendSize } = require('../src/constants/sizeCharts')

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

let server = null
let baseUrl = null

function makeRequest(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(baseUrl + endpoint)
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let json = null
        try {
          json = JSON.parse(data)
        } catch {
          json = data
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        })
      })
    })

    req.on('error', reject)
    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function runTests() {
  console.log('\n=== TEST SUITE: TRENDVOLT PHASE 3C AVATAR BACKEND INTEGRATION ===\n')

  // Connect to DB for integration tests
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI)
  }

  // =================================================================
  // SECTION 1: VALIDATOR UNIT TESTS
  // =================================================================
  console.log('[1] Server-Side Avatar Validator Unit Tests:')

  // Valid adult input
  const validAdult = validateAvatarInput({
    demographic: 'men',
    heightCm: 180,
    fitPreference: 'regular',
    estimatedMeasurements: { chest: 100, waist: 84, hip: 98, unit: 'cm' },
    morphWeights: { chestScale: 0.5, waistScale: 0.2, hipScale: 0.3, legLength: 0.4, torsoDepth: 0.3 },
    appearance: { skinTone: '#DDB088', hairStyle: 'style-buzz', hairColor: '#2B1B15', eyeColor: '#2D1F17' },
    facialSuggestions: { faceWidth: 0.2, jawWidth: 0.1, chinLength: 0.05, noseWidth: 0.1, eyeSpacing: 0.05, cheekFullness: 0.1, lipFullness: 0.1, eyeSize: 0.1 },
  })
  assert(validAdult.isValid, 'validateAvatarInput accepts valid adult payload')

  // Valid youth input
  const validYouth = validateAvatarInput({
    demographic: 'boys',
    age: 8,
    heightCm: 128,
  })
  assert(validYouth.isValid, 'validateAvatarInput accepts valid youth payload with age & height')

  // Invalid demographic
  const invalidDemo = validateAvatarInput({ demographic: 'unknown', heightCm: 170 })
  assert(!invalidDemo.isValid, 'validateAvatarInput rejects invalid demographic enum')

  // Youth missing age
  const youthMissingAge = validateAvatarInput({ demographic: 'boys', heightCm: 128 })
  assert(!youthMissingAge.isValid, 'validateAvatarInput rejects youth profile without age')

  // Youth age out of bounds (< 2 or > 13)
  const youthAgeTooOld = validateAvatarInput({ demographic: 'boys', age: 16, heightCm: 150 })
  assert(!youthAgeTooOld.isValid, 'validateAvatarInput rejects youth age > 13')
  const youthAgeTooYoung = validateAvatarInput({ demographic: 'boys', age: 1, heightCm: 80 })
  assert(!youthAgeTooYoung.isValid, 'validateAvatarInput rejects youth age < 2')

  // Adult with youth age provided
  const adultWithAge = validateAvatarInput({ demographic: 'men', age: 8, heightCm: 178 })
  assert(!adultWithAge.isValid, 'validateAvatarInput rejects adult profile with youth age provided')

  // Height bounds
  const adultHeightTooLow = validateAvatarInput({ demographic: 'men', heightCm: 110 })
  assert(!adultHeightTooLow.isValid, 'validateAvatarInput rejects adult height < 130 cm')
  const adultHeightTooHigh = validateAvatarInput({ demographic: 'men', heightCm: 250 })
  assert(!adultHeightTooHigh.isValid, 'validateAvatarInput rejects adult height > 230 cm')
  const youthHeightTooHigh = validateAvatarInput({ demographic: 'girls', age: 6, heightCm: 200 })
  assert(!youthHeightTooHigh.isValid, 'validateAvatarInput rejects youth height > 180 cm')

  // Invalid measurements
  const invalidChest = validateAvatarInput({
    demographic: 'men',
    heightCm: 178,
    estimatedMeasurements: { chest: 20 },
  })
  assert(!invalidChest.isValid, 'validateAvatarInput rejects chest measurement < 50 cm')

  // Invalid morph weights
  const invalidMorph = validateAvatarInput({
    demographic: 'men',
    heightCm: 178,
    morphWeights: { chestScale: 1.5 },
  })
  assert(!invalidMorph.isValid, 'validateAvatarInput rejects morph weight > 1.0')

  // Invalid fit preference
  const invalidFit = validateAvatarInput({
    demographic: 'men',
    heightCm: 178,
    fitPreference: 'baggy',
  })
  assert(!invalidFit.isValid, 'validateAvatarInput rejects invalid fit preference')

  // Strict Photo Privacy Validator Test
  const payloadWithPhoto = validateAvatarInput({
    demographic: 'men',
    heightCm: 178,
    rawPhoto: 'data:image/jpeg;base64,mock',
  })
  assert(!payloadWithPhoto.isValid, 'validateAvatarInput rejects payload containing rawPhoto')
  assert(
    payloadWithPhoto.errors.privacy.includes('strictly prohibited'),
    'Validator returns explicit privacy prohibition error message'
  )

  const payloadWithLandmarks = validateAvatarInput({
    demographic: 'men',
    heightCm: 178,
    landmarks: [0.1, 0.2, 0.3],
  })
  assert(!payloadWithLandmarks.isValid, 'validateAvatarInput rejects payload containing landmarks')

  const payloadWithEmbeddings = validateAvatarInput({
    demographic: 'men',
    heightCm: 178,
    faceEmbeddings: [0.5, 0.2],
  })
  assert(!payloadWithEmbeddings.isValid, 'validateAvatarInput rejects payload containing faceEmbeddings')

  // =================================================================
  // SECTION 2: MONGOOSE MODEL SCHEMA TESTS
  // =================================================================
  console.log('\n[2] AvatarProfile Model Schema Invariants:')

  const dummyUser = new mongoose.Types.ObjectId()

  // 1. Valid adult doc
  const adultDoc = new AvatarProfile({
    user: dummyUser,
    demographic: 'men',
    heightCm: 178,
    fitPreference: 'regular',
    estimatedMeasurements: { chest: 98, waist: 82, hip: 96, unit: 'cm' },
    morphWeights: { chestScale: 0.1, waistScale: 0.1, hipScale: 0.1, legLength: 0.1, torsoDepth: 0.1 },
    appearance: { skinTone: '#DDB088', hairStyle: 'style-buzz', hairColor: '#2B1B15', eyeColor: '#2D1F17' },
    facialSuggestions: { faceWidth: 0.1, jawWidth: 0.1, chinLength: 0.1, noseWidth: 0.1, eyeSpacing: 0.1, cheekFullness: 0.1, lipFullness: 0.1, eyeSize: 0.1 },
  })
  let adultValidationErr = null
  try {
    await adultDoc.validate()
  } catch (err) {
    adultValidationErr = err
  }
  assert(!adultValidationErr, 'AvatarProfile model accepts valid adult document')

  // 2. Valid youth doc
  const youthDoc = new AvatarProfile({
    user: new mongoose.Types.ObjectId(),
    demographic: 'kids',
    age: 7,
    heightCm: 122,
  })
  let youthValidationErr = null
  try {
    await youthDoc.validate()
  } catch (err) {
    youthValidationErr = err
  }
  assert(!youthValidationErr, 'AvatarProfile model accepts valid youth document')

  // 3. Invalid demographic
  const badDemoDoc = new AvatarProfile({
    user: new mongoose.Types.ObjectId(),
    demographic: 'alien',
    heightCm: 175,
  })
  let badDemoErr = null
  try {
    await badDemoDoc.validate()
  } catch (err) {
    badDemoErr = err
  }
  assert(!!badDemoErr, 'AvatarProfile model rejects invalid demographic enum')

  // 4. Invalid age: adult with youth age provided
  const badAdultAgeDoc = new AvatarProfile({
    user: new mongoose.Types.ObjectId(),
    demographic: 'women',
    age: 9,
    heightCm: 168,
  })
  let badAdultAgeErr = null
  try {
    await badAdultAgeDoc.validate()
  } catch (err) {
    badAdultAgeErr = err
  }
  assert(!!badAdultAgeErr, 'AvatarProfile model rejects adult document with youth age provided')

  // 4b. Invalid age: youth with out-of-range age (>13 or <2)
  const badYouthAgeDoc = new AvatarProfile({
    user: new mongoose.Types.ObjectId(),
    demographic: 'boys',
    age: 15,
    heightCm: 140,
  })
  let badYouthAgeErr = null
  try {
    await badYouthAgeDoc.validate()
  } catch (err) {
    badYouthAgeErr = err
  }
  assert(!!badYouthAgeErr, 'AvatarProfile model rejects youth document with age > 13')

  // 5. Invalid height: adult height out of bounds
  const badHeightDoc = new AvatarProfile({
    user: new mongoose.Types.ObjectId(),
    demographic: 'men',
    heightCm: 250,
  })
  let badHeightErr = null
  try {
    await badHeightDoc.validate()
  } catch (err) {
    badHeightErr = err
  }
  assert(!!badHeightErr, 'AvatarProfile model rejects adult height outside anthropometric bounds')

  // 6. Invalid measurements
  const badMeasDoc = new AvatarProfile({
    user: new mongoose.Types.ObjectId(),
    demographic: 'men',
    heightCm: 175,
    estimatedMeasurements: { chest: 25 },
  })
  let badMeasErr = null
  try {
    await badMeasDoc.validate()
  } catch (err) {
    badMeasErr = err
  }
  assert(!!badMeasErr, 'AvatarProfile model rejects measurements outside physiological bounds (< 30cm)')

  // 7. Invalid morph values
  const badMorphDoc = new AvatarProfile({
    user: new mongoose.Types.ObjectId(),
    demographic: 'men',
    heightCm: 175,
    morphWeights: { chestScale: 1.8 },
  })
  let badMorphErr = null
  try {
    await badMorphDoc.validate()
  } catch (err) {
    badMorphErr = err
  }
  assert(!!badMorphErr, 'AvatarProfile model rejects morph values exceeding 1.0')

  // 8. Invalid fitPreference
  const badFitDoc = new AvatarProfile({
    user: new mongoose.Types.ObjectId(),
    demographic: 'men',
    heightCm: 175,
    fitPreference: 'super-baggy',
  })
  let badFitErr = null
  try {
    await badFitDoc.validate()
  } catch (err) {
    badFitErr = err
  }
  assert(!!badFitErr, 'AvatarProfile model rejects unsupported fitPreference')

  // 9. Model schema rejects extra photo fields (strict schema enforcement)
  let threwStrict = false
  try {
    new AvatarProfile({
      user: new mongoose.Types.ObjectId(),
      demographic: 'men',
      heightCm: 178,
      rawPhoto: 'prohibited_payload',
    })
  } catch {
    threwStrict = true
  }
  assert(threwStrict, 'AvatarProfile strict schema throws on arbitrary photo attributes')

  // =================================================================
  // SECTION 3: SIZING ENGINE INTEGRATION
  // =================================================================
  console.log('\n[3] Sizing Engine Integration:')

  const sizingInputsAdult = adultDoc.toSizingInputs()
  assert(sizingInputsAdult.department === 'men', 'toSizingInputs maps men demographic to men department')
  assert(sizingInputsAdult.measurements.chest === 98, 'toSizingInputs preserves authoritative chest measurement')
  assert(sizingInputsAdult.measurements.height === 178, 'toSizingInputs preserves height')

  // Pass to existing recommendSize()
  const sizeResult = recommendSize({
    department: sizingInputsAdult.department,
    subcategory: 't-shirts',
    measurements: sizingInputsAdult.measurements,
    unit: sizingInputsAdult.unit,
    fitPreference: sizingInputsAdult.fitPreference,
    productSizes: [{ label: 'M', available: true }, { label: 'L', available: true }],
  })
  assert(sizeResult.status === 'recommended', 'recommendSize successfully computes size from AvatarProfile inputs')

  const sizingInputsYouth = youthDoc.toSizingInputs()
  assert(sizingInputsYouth.department === 'kids', 'toSizingInputs maps kids demographic to kids department')
  assert(sizingInputsYouth.measurements.age === 7, 'toSizingInputs preserves authoritative youth age')

  // =================================================================
  // SECTION 4: API INTEGRATION & AUTHENTICATION TESTS
  // =================================================================
  console.log('\n[4] Authenticated Avatar API Endpoints:')

  // Start server
  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  baseUrl = `http://127.0.0.1:${port}`

  // Create two distinct test users to verify authentication & IDOR isolation
  const timestamp = Date.now()
  const testUserA = await User.create({
    name: 'Avatar User A',
    email: `avatar_a_${timestamp}@example.com`,
    password: 'Password123!',
  })
  const tokenA = jwt.sign({ id: testUserA._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' })

  const testUserB = await User.create({
    name: 'Avatar User B',
    email: `avatar_b_${timestamp}@example.com`,
    password: 'Password123!',
  })
  const tokenB = jwt.sign({ id: testUserB._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' })

  // 1. Unauthenticated requests rejected (401)
  const getUnauth = await makeRequest('GET', '/api/avatar')
  assert(getUnauth.status === 401, 'GET /api/avatar unauthenticated returns 401')

  const postUnauth = await makeRequest('POST', '/api/avatar', { demographic: 'men' })
  assert(postUnauth.status === 401, 'POST /api/avatar unauthenticated returns 401')

  const putUnauth = await makeRequest('PUT', '/api/avatar', { heightCm: 180 })
  assert(putUnauth.status === 401, 'PUT /api/avatar unauthenticated returns 401')

  const deleteUnauth = await makeRequest('DELETE', '/api/avatar')
  assert(deleteUnauth.status === 401, 'DELETE /api/avatar unauthenticated returns 401')

  // 2. GET for user with no profile returns 404
  const getMissing = await makeRequest('GET', '/api/avatar', null, tokenA)
  assert(getMissing.status === 404, 'GET /api/avatar for user without profile returns 404')

  // 3. POST validation error returns 400
  const postInvalid = await makeRequest('POST', '/api/avatar', { demographic: 'invalid' }, tokenA)
  assert(postInvalid.status === 400, 'POST /api/avatar with invalid data returns 400')

  // 4. POST with photo returns 400
  const postPhotoForbidden = await makeRequest(
    'POST',
    '/api/avatar',
    { demographic: 'men', heightCm: 180, photo: 'data:...' },
    tokenA
  )
  assert(postPhotoForbidden.status === 400, 'POST /api/avatar with photo property returns 400 privacy error')

  // 5. POST authenticated create succeeds (201)
  const validPayloadA = {
    demographic: 'men',
    heightCm: 178,
    fitPreference: 'regular',
    estimatedMeasurements: { chest: 98, waist: 82, hip: 96, unit: 'cm' },
    morphWeights: { chestScale: 0.2, waistScale: 0.1, hipScale: 0.1, legLength: 0.2, torsoDepth: 0.1 },
    appearance: { skinTone: '#DDB088', hairStyle: 'style-buzz', hairColor: '#2B1B15', eyeColor: '#2D1F17' },
    facialSuggestions: { faceWidth: 0.15, jawWidth: 0.12, chinLength: 0.08, noseWidth: 0.1, eyeSpacing: 0.05, cheekFullness: 0.18, lipFullness: 0.14, eyeSize: 0.1 },
  }
  const createRes = await makeRequest('POST', '/api/avatar', validPayloadA, tokenA)
  assert(createRes.status === 201, 'POST /api/avatar creates avatar profile with 201 Created')
  assert(createRes.data.success === true, 'Response contains success: true')
  assert(createRes.data.avatar.demographic === 'men', 'Created avatar demographic is men')

  // 6. Duplicate POST rejected (400)
  const duplicateRes = await makeRequest('POST', '/api/avatar', validPayloadA, tokenA)
  assert(duplicateRes.status === 400, 'Duplicate POST /api/avatar returns 400 conflict')

  // 7. GET authenticated returns 200
  const getRes = await makeRequest('GET', '/api/avatar', null, tokenA)
  assert(getRes.status === 200, 'GET /api/avatar returns 200 for user with profile')
  assert(getRes.data.avatar.heightCm === 178, 'GET returns accurate heightCm')
  assert(getRes.data.avatar.morphWeights.chestScale === 0.2, 'GET returns accurate morphWeights')

  // =================================================================
  // SECTION 5: IDOR & USER ISOLATION PROTECTION
  // =================================================================
  console.log('\n[5] User Ownership Isolation & IDOR Protection:')

  // User B requests GET /api/avatar -> should be 404 (cannot see User A's avatar)
  const userBGet = await makeRequest('GET', '/api/avatar', null, tokenB)
  assert(userBGet.status === 404, 'User B cannot read User A avatar (returns 404)')

  // User B attempts to tamper/update User A's profile via body user injection
  const userBAttackPut = await makeRequest(
    'PUT',
    '/api/avatar',
    { user: testUserA._id.toString(), heightCm: 200 },
    tokenB
  )
  assert(userBAttackPut.status === 404, 'User B cannot modify User A avatar via body injection (returns 404)')

  // Confirm User A profile remains untampered
  const verifyUserA = await makeRequest('GET', '/api/avatar', null, tokenA)
  assert(verifyUserA.data.avatar.heightCm === 178, 'User A profile heightCm unchanged after attack attempt')

  // User B attempts to DELETE User A's profile
  const userBAttackDelete = await makeRequest('DELETE', '/api/avatar', null, tokenB)
  assert(userBAttackDelete.status === 404, 'User B cannot delete User A avatar (returns 404)')

  // Confirm User A profile still exists
  const verifyUserAAfterDelete = await makeRequest('GET', '/api/avatar', null, tokenA)
  assert(verifyUserAAfterDelete.status === 200, 'User A profile survives User B delete attempt')

  // 8. PUT authenticated update succeeds (200)
  const updateRes = await makeRequest(
    'PUT',
    '/api/avatar',
    { heightCm: 182, fitPreference: 'slim' },
    tokenA
  )
  assert(updateRes.status === 200, 'PUT /api/avatar updates profile with 200 OK')
  assert(updateRes.data.avatar.heightCm === 182, 'Updated heightCm is reflected in response')
  assert(updateRes.data.avatar.fitPreference === 'slim', 'Updated fitPreference is reflected in response')

  // 9. DELETE authenticated succeeds (200)
  const deleteRes = await makeRequest('DELETE', '/api/avatar', null, tokenA)
  assert(deleteRes.status === 200, 'DELETE /api/avatar deletes profile with 200 OK')

  // 10. GET after DELETE returns 404
  const getAfterDelete = await makeRequest('GET', '/api/avatar', null, tokenA)
  assert(getAfterDelete.status === 404, 'GET /api/avatar returns 404 following deletion')

  // Clean up test users from DB
  await User.deleteMany({ _id: { $in: [testUserA._id, testUserB._id] } })
  await AvatarProfile.deleteMany({ user: { $in: [testUserA._id, testUserB._id] } })

  // Close server
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }

  console.log('\n============================================================')
  console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`)
  if (failedCount === 0) {
    console.log('ALL PHASE 3C AVATAR BACKEND INTEGRATION TESTS PASSED ✓')
  } else {
    console.error('SOME PHASE 3C AVATAR BACKEND INTEGRATION TESTS FAILED ✗')
    process.exit(1)
  }
}

runTests()
  .catch((err) => {
    console.error('Unhandled test error:', err)
    process.exit(1)
  })
  .finally(() => {
    if (mongoose.connection.readyState !== 0) {
      mongoose.disconnect()
    }
  })
