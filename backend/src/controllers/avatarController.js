/**
 * TrendVolt Phase 3C — Avatar Profile Controller
 * Authenticated endpoints for customer 3D avatar profile CRUD.
 * Backend is authoritative source of truth. Enforces user ownership isolation.
 */

const AvatarProfile = require('../models/AvatarProfile')
const { validateAvatarInput } = require('../validators/avatarValidator')

/**
 * GET /api/avatar
 * Returns authenticated user's avatar profile.
 */
const getAvatar = async (req, res) => {
  try {
    const avatar = await AvatarProfile.findOne({ user: req.user.id })

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar profile not found',
      })
    }

    return res.status(200).json({
      success: true,
      avatar,
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV !== 'production' ? err.message : 'Server error',
    })
  }
}

/**
 * POST /api/avatar
 * Creates avatar profile for authenticated user. Rejects duplicates.
 */
const createAvatar = async (req, res) => {
  const { isValid, errors, sanitized } = validateAvatarInput(req.body)

  if (!isValid) {
    return res.status(400).json({
      success: false,
      errors,
    })
  }

  try {
    const existing = await AvatarProfile.findOne({ user: req.user.id })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Avatar profile already exists for this account. Use PUT to update.',
      })
    }

    const avatar = new AvatarProfile({
      ...sanitized,
      user: req.user.id, // Strictly server-side authenticated identity
    })

    await avatar.save()

    return res.status(201).json({
      success: true,
      avatar,
    })
  } catch (err) {
    if (err.name === 'ValidationError') {
      const fieldErrors = {}
      for (const [key, val] of Object.entries(err.errors || {})) {
        fieldErrors[key] = val.message
      }
      return res.status(400).json({ success: false, errors: fieldErrors })
    }
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Avatar profile already exists for this account.',
      })
    }
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV !== 'production' ? err.message : 'Server error',
    })
  }
}

/**
 * PUT /api/avatar
 * Updates authenticated user's avatar profile.
 */
const updateAvatar = async (req, res) => {
  const { isValid, errors, sanitized } = validateAvatarInput(req.body, { isUpdate: true })

  if (!isValid) {
    return res.status(400).json({
      success: false,
      errors,
    })
  }

  try {
    const avatar = await AvatarProfile.findOne({ user: req.user.id })

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar profile not found',
      })
    }

    // Apply sanitized updates
    if (sanitized.demographic !== undefined) avatar.demographic = sanitized.demographic
    if (sanitized.age !== undefined) avatar.age = sanitized.age
    if (sanitized.heightCm !== undefined) avatar.heightCm = sanitized.heightCm
    if (sanitized.fitPreference !== undefined) avatar.fitPreference = sanitized.fitPreference
    if (sanitized.estimatedMeasurements !== undefined) {
      avatar.estimatedMeasurements = {
        ...avatar.estimatedMeasurements?.toObject?.(),
        ...sanitized.estimatedMeasurements,
      }
    }
    if (sanitized.morphWeights !== undefined) {
      avatar.morphWeights = {
        ...avatar.morphWeights?.toObject?.(),
        ...sanitized.morphWeights,
      }
    }
    if (sanitized.appearance !== undefined) {
      avatar.appearance = {
        ...avatar.appearance?.toObject?.(),
        ...sanitized.appearance,
      }
    }
    if (sanitized.facialSuggestions !== undefined) {
      avatar.facialSuggestions = {
        ...avatar.facialSuggestions?.toObject?.(),
        ...sanitized.facialSuggestions,
      }
    }

    await avatar.save()

    return res.status(200).json({
      success: true,
      avatar,
    })
  } catch (err) {
    if (err.name === 'ValidationError') {
      const fieldErrors = {}
      for (const [key, val] of Object.entries(err.errors || {})) {
        fieldErrors[key] = val.message
      }
      return res.status(400).json({ success: false, errors: fieldErrors })
    }
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV !== 'production' ? err.message : 'Server error',
    })
  }
}

/**
 * DELETE /api/avatar
 * Deletes authenticated user's avatar profile.
 */
const deleteAvatar = async (req, res) => {
  try {
    const deleted = await AvatarProfile.findOneAndDelete({ user: req.user.id })

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Avatar profile not found',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Avatar profile deleted successfully',
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV !== 'production' ? err.message : 'Server error',
    })
  }
}

module.exports = {
  getAvatar,
  createAvatar,
  updateAvatar,
  deleteAvatar,
}
