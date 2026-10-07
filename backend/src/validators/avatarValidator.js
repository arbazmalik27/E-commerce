/**
 * TrendVolt Phase 3C — Avatar Profile Backend Validator
 * Strict server-side validation enforcing demographic rules, anthropometric bounds,
 * morph weight normalization, and absolute zero photo/biometric transmission.
 */

const ALLOWED_DEMOGRAPHICS = ['men', 'women', 'boys', 'girls', 'kids']
const YOUTH_DEMOGRAPHICS = ['boys', 'girls', 'kids']
const ADULT_DEMOGRAPHICS = ['men', 'women']
const ALLOWED_FIT_PREFERENCES = ['slim', 'regular', 'relaxed']
const ALLOWED_UNITS = ['cm', 'in']

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const MORPH_KEYS = ['chestScale', 'waistScale', 'hipScale', 'legLength', 'torsoDepth']
const FACIAL_KEYS = [
  'faceWidth',
  'jawWidth',
  'chinLength',
  'noseWidth',
  'eyeSpacing',
  'cheekFullness',
  'lipFullness',
  'eyeSize',
]

/**
 * Validates avatar profile payload for creation or update.
 * @param {Object} body
 * @param {{ isUpdate?: boolean }} options
 * @returns {{ isValid: boolean, errors: Object, sanitized: Object }}
 */
const validateAvatarInput = (body = {}, { isUpdate = false } = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a valid JSON object' },
      sanitized: {},
    }
  }

  // 1. STRICT PRIVACY ENFORCEMENT: Reject any photo, image, landmark, or embedding parameters
  const FORBIDDEN_FIELDS = [
    'photo',
    'rawPhoto',
    'image',
    'imageUrl',
    'photoUrl',
    'frontPhoto',
    'sidePhoto',
    'landmarks',
    'faceLandmarks',
    'embeddings',
    'faceEmbeddings',
    'biometrics',
    'faceBuffer',
  ]

  for (const forbidden of FORBIDDEN_FIELDS) {
    if (body[forbidden] !== undefined) {
      errors.privacy = `Photos, facial landmarks, and biometric embeddings are strictly prohibited on the backend (${forbidden}).`
      return {
        isValid: false,
        errors,
        sanitized: {},
      }
    }
  }

  const sanitized = {}

  // 2. Demographic validation
  let demographic = body.demographic
  if (demographic !== undefined || !isUpdate) {
    if (typeof demographic !== 'string' || !ALLOWED_DEMOGRAPHICS.includes(demographic.trim().toLowerCase())) {
      errors.demographic = `Demographic must be one of: ${ALLOWED_DEMOGRAPHICS.join(', ')}`
    } else {
      demographic = demographic.trim().toLowerCase()
      sanitized.demographic = demographic
    }
  }

  const isYouth = demographic ? YOUTH_DEMOGRAPHICS.includes(demographic) : false
  const isAdult = demographic ? ADULT_DEMOGRAPHICS.includes(demographic) : false

  // 3. Age validation (Youth only: 2–13)
  if (body.age !== undefined && body.age !== null && body.age !== '') {
    const ageNum = Number(body.age)
    if (isAdult) {
      errors.age = 'Age is strictly a youth attribute and must be omitted or null for adults'
    } else if (!Number.isInteger(ageNum) || ageNum < 2 || ageNum > 13) {
      errors.age = 'Youth age must be an integer between 2 and 13 years'
    } else {
      sanitized.age = ageNum
    }
  } else if (isYouth && !isUpdate) {
    errors.age = 'Age is required for youth profiles (2-13 years)'
  } else if (isAdult || body.age === null) {
    sanitized.age = null
  }

  // 4. Height validation (cm)
  if (body.heightCm !== undefined && body.heightCm !== null && body.heightCm !== '') {
    const heightNum = Number(body.heightCm)
    if (Number.isNaN(heightNum)) {
      errors.heightCm = 'Height must be a valid number'
    } else if (isYouth && (heightNum < 75 || heightNum > 180)) {
      errors.heightCm = 'Youth height must be between 75 and 180 cm'
    } else if (isAdult && (heightNum < 130 || heightNum > 230)) {
      errors.heightCm = 'Adult height must be between 130 and 230 cm'
    } else if (!demographic && (heightNum < 75 || heightNum > 230)) {
      errors.heightCm = 'Height must be between 75 and 230 cm'
    } else {
      sanitized.heightCm = heightNum
    }
  } else if (!isUpdate) {
    errors.heightCm = 'Height in centimeters (heightCm) is required'
  }

  // 5. Fit preference
  if (body.fitPreference !== undefined && body.fitPreference !== null && body.fitPreference !== '') {
    const fit = String(body.fitPreference).trim().toLowerCase()
    if (!ALLOWED_FIT_PREFERENCES.includes(fit)) {
      errors.fitPreference = `Fit preference must be one of: ${ALLOWED_FIT_PREFERENCES.join(', ')}`
    } else {
      sanitized.fitPreference = fit
    }
  } else if (isAdult && !isUpdate) {
    sanitized.fitPreference = 'regular'
  }

  // 6. Estimated Measurements (optional manual tape inputs)
  if (body.estimatedMeasurements !== undefined && body.estimatedMeasurements !== null) {
    if (typeof body.estimatedMeasurements !== 'object' || Array.isArray(body.estimatedMeasurements)) {
      errors.estimatedMeasurements = 'estimatedMeasurements must be a JSON object'
    } else {
      const rawMeas = body.estimatedMeasurements
      const meas = {}

      // Chest
      if (rawMeas.chest !== undefined && rawMeas.chest !== null && rawMeas.chest !== '') {
        const chest = Number(rawMeas.chest)
        if (Number.isNaN(chest) || chest < 50 || chest > 160) {
          errors['estimatedMeasurements.chest'] = 'Chest measurement must be between 50 and 160 cm'
        } else {
          meas.chest = chest
        }
      } else {
        meas.chest = null
      }

      // Waist
      if (rawMeas.waist !== undefined && rawMeas.waist !== null && rawMeas.waist !== '') {
        const waist = Number(rawMeas.waist)
        if (Number.isNaN(waist) || waist < 45 || waist > 150) {
          errors['estimatedMeasurements.waist'] = 'Waist measurement must be between 45 and 150 cm'
        } else {
          meas.waist = waist
        }
      } else {
        meas.waist = null
      }

      // Hip
      if (rawMeas.hip !== undefined && rawMeas.hip !== null && rawMeas.hip !== '') {
        const hip = Number(rawMeas.hip)
        if (Number.isNaN(hip) || hip < 50 || hip > 160) {
          errors['estimatedMeasurements.hip'] = 'Hip measurement must be between 50 and 160 cm'
        } else {
          meas.hip = hip
        }
      } else {
        meas.hip = null
      }

      // Unit
      if (rawMeas.unit !== undefined && rawMeas.unit !== null) {
        const unit = String(rawMeas.unit).trim().toLowerCase()
        if (!ALLOWED_UNITS.includes(unit)) {
          errors['estimatedMeasurements.unit'] = 'Unit must be "cm" or "in"'
        } else {
          meas.unit = unit
        }
      } else {
        meas.unit = 'cm'
      }

      sanitized.estimatedMeasurements = meas
    }
  }

  // 7. Morph Weights (5 canonical keys, [0.0, 1.0])
  if (body.morphWeights !== undefined && body.morphWeights !== null) {
    if (typeof body.morphWeights !== 'object' || Array.isArray(body.morphWeights)) {
      errors.morphWeights = 'morphWeights must be a JSON object'
    } else {
      const morphs = {}
      for (const key of MORPH_KEYS) {
        const val = body.morphWeights[key]
        if (val !== undefined && val !== null) {
          const num = Number(val)
          if (Number.isNaN(num) || num < 0.0 || num > 1.0) {
            errors[`morphWeights.${key}`] = `${key} must be a number between 0.0 and 1.0`
          } else {
            morphs[key] = num
          }
        } else {
          morphs[key] = 0.0
        }
      }
      sanitized.morphWeights = morphs
    }
  }

  // 8. Appearance (skinTone, hairStyle, hairColor, eyeColor)
  if (body.appearance !== undefined && body.appearance !== null) {
    if (typeof body.appearance !== 'object' || Array.isArray(body.appearance)) {
      errors.appearance = 'appearance must be a JSON object'
    } else {
      const app = {}
      if (body.appearance.skinTone !== undefined) {
        if (!HEX_COLOR_REGEX.test(body.appearance.skinTone)) {
          errors['appearance.skinTone'] = 'skinTone must be a valid hex color string (e.g. #DDB088)'
        } else {
          app.skinTone = body.appearance.skinTone
        }
      }
      if (body.appearance.hairStyle !== undefined) {
        app.hairStyle = String(body.appearance.hairStyle).trim()
      }
      if (body.appearance.facialHair !== undefined) {
        app.facialHair = String(body.appearance.facialHair).trim()
      }
      if (body.appearance.hairColor !== undefined) {
        if (!HEX_COLOR_REGEX.test(body.appearance.hairColor)) {
          errors['appearance.hairColor'] = 'hairColor must be a valid hex color string (e.g. #2B1B15)'
        } else {
          app.hairColor = body.appearance.hairColor
        }
      }
      if (body.appearance.eyeColor !== undefined) {
        if (!HEX_COLOR_REGEX.test(body.appearance.eyeColor)) {
          errors['appearance.eyeColor'] = 'eyeColor must be a valid hex color string (e.g. #2D1F17)'
        } else {
          app.eyeColor = body.appearance.eyeColor
        }
      }
      sanitized.appearance = app
    }
  }

  // 9. Facial Suggestions / Morphs (8 canonical blendshapes, [0.0, 1.0])
  const rawFacial = body.facialSuggestions || body.facialMorphs
  if (rawFacial !== undefined && rawFacial !== null) {
    if (typeof rawFacial !== 'object' || Array.isArray(rawFacial)) {
      errors.facialSuggestions = 'facialSuggestions must be a JSON object'
    } else {
      const facial = {}
      for (const key of FACIAL_KEYS) {
        const val = rawFacial[key]
        if (val !== undefined && val !== null) {
          const num = Number(val)
          if (Number.isNaN(num) || num < 0.0 || num > 1.0) {
            errors[`facialSuggestions.${key}`] = `${key} must be a number between 0.0 and 1.0`
          } else {
            facial[key] = num
          }
        } else {
          facial[key] = 0.0
        }
      }
      sanitized.facialSuggestions = facial
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  }
}

module.exports = {
  validateAvatarInput,
  ALLOWED_DEMOGRAPHICS,
  YOUTH_DEMOGRAPHICS,
  ADULT_DEMOGRAPHICS,
  ALLOWED_FIT_PREFERENCES,
  MORPH_KEYS,
  FACIAL_KEYS,
}
