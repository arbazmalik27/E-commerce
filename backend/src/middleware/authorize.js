const ADMIN_MAX_SESSION_SECONDS = 8 * 60 * 60 // 8 hours in seconds

const authorize = (...roles) => {
  const allowedRoles = roles.flat()

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Strict Admin Session Enforcement:
    // When the route requires 'admin', verify that the session token was explicitly
    // issued with the admin role claim and does not exceed the 8-hour maximum session policy.
    // Legacy tokens or customer tokens cannot access or bypass administrative authorization.
    if (allowedRoles.includes('admin')) {
      const tokenPayload = req.tokenPayload
      if (!tokenPayload || tokenPayload.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }

      if (
        typeof tokenPayload.exp !== 'number' ||
        typeof tokenPayload.iat !== 'number' ||
        !Number.isFinite(tokenPayload.exp) ||
        !Number.isFinite(tokenPayload.iat) ||
        tokenPayload.exp <= tokenPayload.iat ||
        tokenPayload.exp - tokenPayload.iat > ADMIN_MAX_SESSION_SECONDS
      ) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    }

    next()
  }
}

module.exports = authorize
