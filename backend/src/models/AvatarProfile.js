/**
 * TrendVolt Phase 3C — AvatarProfile Mongoose Model
 *
 * Persists authenticated consumer avatar state following the frozen avatar schema.
 * Enforces one-to-one user relationship, strict youth vs adult demographic branching,
 * and absolute zero storage of raw photos, facial landmarks, or biometric vectors.
 */

const mongoose = require('mongoose')

const YOUTH_DEMOGRAPHICS = ['boys', 'girls', 'kids']
const ADULT_DEMOGRAPHICS = ['men', 'women']

const avatarProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for avatar profile ownership'],
      unique: true,
      index: true,
    },
    demographic: {
      type: String,
      required: [true, 'Demographic is required'],
      enum: {
        values: ['men', 'women', 'boys', 'girls', 'kids'],
        message: '{VALUE} is not a supported demographic',
      },
      lowercase: true,
      trim: true,
    },
    age: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          const isYouth = YOUTH_DEMOGRAPHICS.includes(this.demographic)
          if (isYouth) {
            return Number.isInteger(val) && val >= 2 && val <= 13
          }
          return val === null || val === undefined
        },
        message: 'Age is required (2–13) for youth demographics, and must be null for adult demographics',
      },
    },
    heightCm: {
      type: Number,
      required: [true, 'Height in centimeters is required'],
      validate: {
        validator: function (val) {
          const isYouth = YOUTH_DEMOGRAPHICS.includes(this.demographic)
          if (isYouth) {
            return typeof val === 'number' && val >= 75 && val <= 180
          }
          return typeof val === 'number' && val >= 130 && val <= 230
        },
        message: 'Height value is outside valid anthropometric range for demographic',
      },
    },
    estimatedMeasurements: {
      chest: {
        type: Number,
        default: null,
        min: [30, 'Chest measurement must be at least 30 cm'],
        max: [200, 'Chest measurement cannot exceed 200 cm'],
      },
      waist: {
        type: Number,
        default: null,
        min: [30, 'Waist measurement must be at least 30 cm'],
        max: [200, 'Waist measurement cannot exceed 200 cm'],
      },
      hip: {
        type: Number,
        default: null,
        min: [30, 'Hip measurement must be at least 30 cm'],
        max: [200, 'Hip measurement cannot exceed 200 cm'],
      },
      unit: {
        type: String,
        enum: ['cm', 'in'],
        default: 'cm',
      },
    },
    fitPreference: {
      type: String,
      enum: {
        values: ['slim', 'regular', 'relaxed'],
        message: '{VALUE} is not a valid fit preference',
      },
      default: 'regular',
      lowercase: true,
      trim: true,
    },
    morphWeights: {
      chestScale: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      waistScale: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      hipScale: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      legLength: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      torsoDepth: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
    },
    appearance: {
      skinTone: {
        type: String,
        default: '#DDB088',
        match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid skin tone hex color code'],
      },
      hairStyle: {
        type: String,
        default: 'style-buzz',
      },
      hairColor: {
        type: String,
        default: '#2B1B15',
        match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hair color hex code'],
      },
      eyeColor: {
        type: String,
        default: '#2D1F17',
        match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid eye color hex code'],
      },
      facialHair: {
        type: String,
        default: 'clean',
        trim: true,
      },
    },
    facialSuggestions: {
      faceWidth: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      jawWidth: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      chinLength: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      noseWidth: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      eyeSpacing: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      cheekFullness: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      lipFullness: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
      eyeSize: { type: Number, min: 0.0, max: 1.0, default: 0.0 },
    },
  },
  {
    timestamps: true,
    strict: 'throw', // Prohibits unmodeled fields (photos, raw landmarks, embeddings)
  }
)



/**
 * Transforms avatar profile attributes into authoritative inputs
 * compatible with the existing sizing engine recommendSize().
 */
avatarProfileSchema.methods.toSizingInputs = function () {
  const isYouth = YOUTH_DEMOGRAPHICS.includes(this.demographic)
  let department = 'men'
  if (isYouth) {
    department = 'kids'
  } else if (this.demographic === 'women') {
    department = 'women'
  }

  const measurements = isYouth
    ? {
        age: this.age,
        height: this.heightCm,
      }
    : {
        chest: this.estimatedMeasurements?.chest,
        waist: this.estimatedMeasurements?.waist,
        hip: this.estimatedMeasurements?.hip,
        height: this.heightCm,
      }

  return {
    department,
    measurements,
    unit: this.estimatedMeasurements?.unit || 'cm',
    fitPreference: this.fitPreference || 'regular',
  }
}

const AvatarProfile = mongoose.model('AvatarProfile', avatarProfileSchema)

module.exports = AvatarProfile
