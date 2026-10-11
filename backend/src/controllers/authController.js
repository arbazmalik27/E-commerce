const crypto = require('crypto')
const bcrypt = require('bcrypt')
const User = require('../models/User')
const {
  validateRegisterInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
} = require('../validators/authValidator')
const {
  signToken,
  setTokenCookie,
  clearTokenCookie,
  COOKIE_NAME,
  ADMIN_MAX_AGE_MS,
  ADMIN_JWT_EXPIRES_IN,
} = require('../utils/jwt')
const { sendPasswordResetEmail } = require('../services/emailService')

const BCRYPT_SALT_ROUNDS = 12

const register = async (req, res) => {
  const { isValid, errors, sanitized } = validateRegisterInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { name, email, password } = sanitized

  try {
    const exists = await User.findOne({ email })
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: 'Email is already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    })

    const token = signToken(user._id)
    setTokenCookie(res, token)

    return res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const INVALID_CREDENTIALS_MSG = 'Invalid email or password'

const login = async (req, res) => {
  const { isValid, errors, sanitized } = validateLoginInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { email, password } = sanitized

  try {
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({ success: false, message: INVALID_CREDENTIALS_MSG })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ success: false, message: INVALID_CREDENTIALS_MSG })
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Please contact support.',
      })
    }

    // Role guard: Admin accounts must not log in via customer endpoint.
    // They must use the dedicated /api/auth/admin-login endpoint with 8-hour session.
    // Return identical generic message to prevent role enumeration.
    if (user.role === 'admin') {
      return res.status(401).json({ success: false, message: INVALID_CREDENTIALS_MSG })
    }

    const token = signToken(user._id)
    setTokenCookie(res, token)

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const adminLogin = async (req, res) => {
  const { isValid, errors, sanitized } = validateLoginInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { email, password } = sanitized

  try {
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({ success: false, message: INVALID_CREDENTIALS_MSG })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(401).json({ success: false, message: INVALID_CREDENTIALS_MSG })
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Please contact support.',
      })
    }

    // Role check: Only accounts whose database role is strictly 'admin' are permitted.
    // Non-admin accounts are rejected with the identical generic authentication error
    // to prevent user enumeration or disclosing administrative roles.
    if (user.role !== 'admin') {
      return res.status(401).json({ success: false, message: INVALID_CREDENTIALS_MSG })
    }

    const token = signToken(user._id, { expiresIn: ADMIN_JWT_EXPIRES_IN, role: 'admin' })
    setTokenCookie(res, token, ADMIN_MAX_AGE_MS)

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getMe = (req, res) => {
  return res.status(200).json({ success: true, user: req.user })
}

const logout = (req, res) => {
  clearTokenCookie(res)

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  })
}

const GENERIC_FORGOT_PASSWORD_MSG =
  'If an account with that email exists, password reset instructions have been sent.'

const forgotPassword = async (req, res) => {
  const { isValid, errors, sanitized } = validateForgotPasswordInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { email } = sanitized

  try {
    const user = await User.findOne({ email })

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

      user.passwordResetToken = hashedToken
      user.passwordResetExpires = Date.now() + 15 * 60 * 1000 // 15 minutes
      await user.save()

      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '')
      const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`
      try {
        const result = await sendPasswordResetEmail({ to: user.email, resetUrl })
        if (result && result.delivered === false && process.env.EMAIL_SERVICE_ENABLED === 'true') {
          throw new Error('Email service failed to deliver message')
        }
      } catch (emailErr) {
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        await user.save()
        console.error('Password reset email dispatch error:', emailErr.message)
      }
    }

    return res.status(200).json({
      success: true,
      message: GENERIC_FORGOT_PASSWORD_MSG,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const resetPassword = async (req, res) => {
  const { isValid, errors, sanitized } = validateResetPasswordInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  const { token, password } = sanitized

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token',
      })
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)

    user.password = hashedPassword
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    // Clear existing session cookie if any
    clearTokenCookie(res)

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  register,
  login,
  adminLogin,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
}
