const {
  isValidCategory,
  isValidDepartment,
  isValidSubcategory,
} = require('../constants/taxonomy')

const validateCreateProductInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { name, description, price, category, department, subcategory, brand, stock, images, isActive, ageRange } = body

  // 1. Name validation
  if (name === undefined || name === null || typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Name must be a non-empty string'
  } else if (name.trim().length > 200) {
    errors.name = 'Name cannot exceed 200 characters'
  }

  // 2. Description validation
  if (description === undefined || description === null || typeof description !== 'string' || description.trim() === '') {
    errors.description = 'Description must be a non-empty string'
  } else if (description.trim().length > 2000) {
    errors.description = 'Description cannot exceed 2000 characters'
  }

  // 3. Price validation
  if (price === undefined || price === null || typeof price !== 'number' || isNaN(price)) {
    errors.price = 'Price is required and must be a number'
  } else if (price < 0) {
    errors.price = 'Price must be greater than or equal to 0'
  }

  // 4. Category validation
  const trimmedCategory = typeof category === 'string' ? category.trim().toLowerCase() : ''
  if (!trimmedCategory || !isValidCategory(trimmedCategory)) {
    errors.category = 'Category must be fashion'
  }

  // 5. Department validation (optional, but if provided must be valid for category)
  let trimmedDepartment = null
  if (department !== undefined && department !== null && department !== '') {
    if (typeof department !== 'string' || department.trim() === '') {
      errors.department = 'Department must be a non-empty string'
    } else {
      trimmedDepartment = department.trim().toLowerCase()
      if (trimmedCategory && !isValidDepartment(trimmedCategory, trimmedDepartment)) {
        errors.department = `Department '${department}' is not valid for category '${trimmedCategory}'`
      }
    }
  }

  // 6. Subcategory validation (optional, but if provided must be valid for department)
  let trimmedSubcategory = null
  if (subcategory !== undefined && subcategory !== null && subcategory !== '') {
    if (typeof subcategory !== 'string' || subcategory.trim() === '') {
      errors.subcategory = 'Subcategory must be a non-empty string'
    } else {
      trimmedSubcategory = subcategory.trim().toLowerCase()
      if (!trimmedDepartment) {
        errors.subcategory = 'Department must be selected before specifying a subcategory'
      } else if (trimmedCategory && !isValidSubcategory(trimmedCategory, trimmedDepartment, trimmedSubcategory)) {
        errors.subcategory = `Subcategory '${subcategory}' is not valid for department '${trimmedDepartment}' in category '${trimmedCategory}'`
      }
    }
  }

  // 7. Brand validation
  if (brand === undefined || brand === null || typeof brand !== 'string' || brand.trim() === '') {
    errors.brand = 'Brand must be a non-empty string'
  } else if (brand.trim().length > 100) {
    errors.brand = 'Brand cannot exceed 100 characters'
  }

  // 8. Stock validation
  if (stock === undefined || stock === null || typeof stock !== 'number' || !Number.isInteger(stock)) {
    errors.stock = 'Stock must be an integer'
  } else if (stock < 0) {
    errors.stock = 'Stock must be greater than or equal to 0'
  }

  // 9. Images validation (optional, but if provided must be array of non-empty strings)
  if (images !== undefined) {
    if (!Array.isArray(images)) {
      errors.images = 'Images must be an array of strings'
    } else if (!images.every((img) => typeof img === 'string' && img.trim().length > 0)) {
      errors.images = 'Each image must be a valid non-empty string'
    }
  }

  // 10. isActive validation (optional, but if provided must be boolean)
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.isActive = 'isActive must be a boolean'
  }

  // 11. ageRange validation (optional, string <= 50 chars or null)
  let trimmedAgeRange = null
  if (ageRange !== undefined && ageRange !== null && ageRange !== '') {
    if (typeof ageRange !== 'string') {
      errors.ageRange = 'ageRange must be a string'
    } else if (ageRange.trim().length > 50) {
      errors.ageRange = 'ageRange cannot exceed 50 characters'
    } else {
      trimmedAgeRange = ageRange.trim()
    }
  }

  const sanitized = {
    name: typeof name === 'string' ? name.trim() : name,
    description: typeof description === 'string' ? description.trim() : description,
    price,
    category: trimmedCategory,
    department: trimmedDepartment,
    subcategory: trimmedSubcategory,
    brand: typeof brand === 'string' ? brand.trim() : brand,
    stock,
    images: Array.isArray(images) ? images.map((img) => (typeof img === 'string' ? img.trim() : img)) : [],
    isActive: typeof isActive === 'boolean' ? isActive : true,
    ageRange: trimmedAgeRange,
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  }
}

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'description',
  'price',
  'category',
  'department',
  'subcategory',
  'brand',
  'images',
  'stock',
  'isActive',
  'ageRange',
]

const validateUpdateProductInput = (body = {}, existingProduct = null) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const providedKeys = Object.keys(body)
  if (providedKeys.length === 0) {
    return {
      isValid: false,
      errors: { body: 'Request body cannot be empty' },
      sanitized: {},
    }
  }

  const unapprovedFields = providedKeys.filter((key) => !ALLOWED_UPDATE_FIELDS.includes(key))
  if (unapprovedFields.length > 0) {
    errors.fields = `Unapproved field(s): ${unapprovedFields.join(', ')}`
  }

  const { name, description, price, category, department, subcategory, brand, stock, images, isActive, ageRange } = body
  const sanitized = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      errors.name = 'Name must be a non-empty string'
    } else if (name.trim().length > 200) {
      errors.name = 'Name cannot exceed 200 characters'
    } else {
      sanitized.name = name.trim()
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string' || description.trim() === '') {
      errors.description = 'Description must be a non-empty string'
    } else if (description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters'
    } else {
      sanitized.description = description.trim()
    }
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || isNaN(price)) {
      errors.price = 'Price must be a number'
    } else if (price < 0) {
      errors.price = 'Price cannot be negative'
    } else {
      sanitized.price = price
    }
  }

  let effectiveCategory = existingProduct?.category
  if (category !== undefined) {
    const trimmedCategory = typeof category === 'string' ? category.trim().toLowerCase() : ''
    if (!trimmedCategory || !isValidCategory(trimmedCategory)) {
      errors.category = 'Category must be fashion'
    } else {
      sanitized.category = trimmedCategory
      effectiveCategory = trimmedCategory
    }
  }

  let effectiveDepartment = department !== undefined
    ? (typeof department === 'string' && department.trim() ? department.trim().toLowerCase() : null)
    : existingProduct?.department

  if (department !== undefined) {
    if (department === null || department === '') {
      sanitized.department = null
      effectiveDepartment = null
    } else if (typeof department !== 'string' || department.trim() === '') {
      errors.department = 'Department must be a non-empty string or null'
    } else {
      const trimmedDept = department.trim().toLowerCase()
      if (effectiveCategory && !isValidDepartment(effectiveCategory, trimmedDept)) {
        errors.department = `Department '${department}' is not valid for category '${effectiveCategory}'`
      } else {
        sanitized.department = trimmedDept
        effectiveDepartment = trimmedDept
      }
    }
  }

  if (subcategory !== undefined) {
    if (subcategory === null || subcategory === '') {
      sanitized.subcategory = null
    } else if (typeof subcategory !== 'string' || subcategory.trim() === '') {
      errors.subcategory = 'Subcategory must be a non-empty string or null'
    } else {
      const trimmedSub = subcategory.trim().toLowerCase()
      if (!effectiveDepartment) {
        errors.subcategory = 'Department must be set before specifying a subcategory'
      } else if (effectiveCategory && !isValidSubcategory(effectiveCategory, effectiveDepartment, trimmedSub)) {
        errors.subcategory = `Subcategory '${subcategory}' is not valid for department '${effectiveDepartment}' in category '${effectiveCategory}'`
      } else {
        sanitized.subcategory = trimmedSub
      }
    }
  }

  if (brand !== undefined) {
    if (typeof brand !== 'string' || brand.trim() === '') {
      errors.brand = 'Brand must be a non-empty string'
    } else if (brand.trim().length > 100) {
      errors.brand = 'Brand cannot exceed 100 characters'
    } else {
      sanitized.brand = brand.trim()
    }
  }

  if (stock !== undefined) {
    if (typeof stock !== 'number' || !Number.isInteger(stock)) {
      errors.stock = 'Stock must be an integer'
    } else if (stock < 0) {
      errors.stock = 'Stock must be greater than or equal to 0'
    } else {
      sanitized.stock = stock
    }
  }

  if (images !== undefined) {
    if (!Array.isArray(images)) {
      errors.images = 'Images must be an array of strings'
    } else if (!images.every((img) => typeof img === 'string' && img.trim().length > 0)) {
      errors.images = 'Each image must be a valid non-empty string'
    } else {
      sanitized.images = images.map((img) => (typeof img === 'string' ? img.trim() : img))
    }
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      errors.isActive = 'isActive must be a boolean'
    } else {
      sanitized.isActive = isActive
    }
  }

  if (ageRange !== undefined) {
    if (ageRange === null || ageRange === '') {
      sanitized.ageRange = null
    } else if (typeof ageRange !== 'string') {
      errors.ageRange = 'ageRange must be a string or null'
    } else if (ageRange.trim().length > 50) {
      errors.ageRange = 'ageRange cannot exceed 50 characters'
    } else {
      sanitized.ageRange = ageRange.trim()
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  }
}

module.exports = { validateCreateProductInput, validateUpdateProductInput }
