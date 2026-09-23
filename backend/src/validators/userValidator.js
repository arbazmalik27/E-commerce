const validateUpdateProfileInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { name } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Name is required'
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters'
  } else if (name.trim().length > 50) {
    errors.name = 'Name must be at most 50 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      name: typeof name === 'string' ? name.trim() : '',
    },
  }
}

const validateAddressInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { fullName, phone, addressLine, city, state, postalCode, country, isDefault } = body

  if (!fullName || typeof fullName !== 'string' || fullName.trim() === '') {
    errors.fullName = 'Full name is required'
  } else if (fullName.trim().length > 100) {
    errors.fullName = 'Full name cannot exceed 100 characters'
  }

  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    errors.phone = 'Phone number is required'
  } else if (phone.trim().length < 5 || phone.trim().length > 20) {
    errors.phone = 'Phone number must be between 5 and 20 characters'
  }

  if (!addressLine || typeof addressLine !== 'string' || addressLine.trim() === '') {
    errors.addressLine = 'Address line is required'
  } else if (addressLine.trim().length > 200) {
    errors.addressLine = 'Address line cannot exceed 200 characters'
  }

  if (!city || typeof city !== 'string' || city.trim() === '') {
    errors.city = 'City is required'
  } else if (city.trim().length > 100) {
    errors.city = 'City cannot exceed 100 characters'
  }

  if (!state || typeof state !== 'string' || state.trim() === '') {
    errors.state = 'State is required'
  } else if (state.trim().length > 100) {
    errors.state = 'State cannot exceed 100 characters'
  }

  if (!postalCode || typeof postalCode !== 'string' || postalCode.trim() === '') {
    errors.postalCode = 'Postal code is required'
  } else if (postalCode.trim().length > 20) {
    errors.postalCode = 'Postal code cannot exceed 20 characters'
  }

  const sanitizedCountry =
    typeof country === 'string' && country.trim() ? country.trim() : 'India'
  if (sanitizedCountry.length > 100) {
    errors.country = 'Country cannot exceed 100 characters'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      fullName: typeof fullName === 'string' ? fullName.trim() : '',
      phone: typeof phone === 'string' ? phone.trim() : '',
      addressLine: typeof addressLine === 'string' ? addressLine.trim() : '',
      city: typeof city === 'string' ? city.trim() : '',
      state: typeof state === 'string' ? state.trim() : '',
      postalCode: typeof postalCode === 'string' ? postalCode.trim() : '',
      country: sanitizedCountry,
      isDefault: Boolean(isDefault),
    },
  }
}

module.exports = {
  validateUpdateProfileInput,
  validateAddressInput,
}
