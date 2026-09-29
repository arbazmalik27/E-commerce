const {
  TAXONOMY,
  isValidCategory,
  isValidDepartment,
  isValidSubcategory,
} = require('../constants/taxonomy')

// Helper for sizes validation
const validateSizesArray = (rawSizes) => {
  if (!Array.isArray(rawSizes)) {
    return { valid: false, error: 'Sizes must be an array' }
  }
  const result = []
  for (const item of rawSizes) {
    if (typeof item === 'string') {
      const label = item.trim()
      if (!label || label.length > 20) {
        return { valid: false, error: 'Size label must be between 1 and 20 characters' }
      }
      result.push({ label, available: true })
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      const label = typeof item.label === 'string' ? item.label.trim() : ''
      if (!label || label.length > 20) {
        return { valid: false, error: 'Size label must be between 1 and 20 characters' }
      }
      const available = typeof item.available === 'boolean' ? item.available : true
      result.push({ label, available })
    } else {
      return { valid: false, error: 'Invalid size item format' }
    }
  }
  return { valid: true, sanitized: result }
}

const validateCreateProductInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: {},
    }
  }

  const { name, description, price, category, department, subcategory, brand, stock, images, isActive, ageRange, sizes } = body

  let sanitizedSizes = []
  if (sizes !== undefined && sizes !== null) {
    const sizeRes = validateSizesArray(sizes)
    if (!sizeRes.valid) {
      errors.sizes = sizeRes.error
    } else {
      sanitizedSizes = sizeRes.sanitized
    }
  }

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
    sizes: sanitizedSizes,
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
  'sizes',
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

  const { name, description, price, category, department, subcategory, brand, stock, images, isActive, ageRange, sizes } = body
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

  if (sizes !== undefined) {
    if (sizes === null || (Array.isArray(sizes) && sizes.length === 0)) {
      sanitized.sizes = []
    } else {
      const sizeRes = validateSizesArray(sizes)
      if (!sizeRes.valid) {
        errors.sizes = sizeRes.error
      } else {
        sanitized.sizes = sizeRes.sanitized
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  }
}

/**
 * Validate and sanitize query parameters for product listing, search, filtering, and pagination.
 * Protects against NoSQL injection, malformed taxonomy values, and invalid parameters.
 */
const validateProductQueryParams = (query = {}) => {
  const sanitized = {}

  if (!query || typeof query !== 'object') {
    return {
      page: 1,
      limit: 12,
      sort: 'newest',
    }
  }

  // 1. Pagination: page & limit
  const rawPage = parseInt(query.page, 10)
  sanitized.page = !isNaN(rawPage) && rawPage > 0 ? rawPage : 1

  const rawLimit = parseInt(query.limit, 10)
  sanitized.limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 12

  // 2. Category
  if (query.category && typeof query.category === 'string' && query.category.trim()) {
    const trimmedCat = query.category.trim().toLowerCase()
    if (trimmedCat !== 'all') {
      if (isValidCategory(trimmedCat)) {
        sanitized.category = trimmedCat
      } else {
        sanitized.category = '__INVALID__'
      }
    }
  }

  // 3. Department
  if (query.department && typeof query.department === 'string' && query.department.trim()) {
    let trimmedDept = query.department.trim().toLowerCase()
    if (trimmedDept === 'mens') trimmedDept = 'men'
    if (trimmedDept === 'womens') trimmedDept = 'women'
    const effectiveCategory = sanitized.category || 'fashion'
    if (isValidDepartment(effectiveCategory, trimmedDept)) {
      sanitized.department = trimmedDept
    } else {
      sanitized.department = '__INVALID__'
    }
  }

  // 4. Subcategory
  if (query.subcategory && typeof query.subcategory === 'string' && query.subcategory.trim()) {
    const trimmedSub = query.subcategory.trim().toLowerCase()
    const effectiveCategory = sanitized.category || 'fashion'
    if (sanitized.department && sanitized.department !== '__INVALID__') {
      if (isValidSubcategory(effectiveCategory, sanitized.department, trimmedSub)) {
        sanitized.subcategory = trimmedSub
      } else {
        sanitized.subcategory = '__INVALID__'
      }
    } else if (!sanitized.department) {
      const deptMatches = Object.keys(TAXONOMY[effectiveCategory]?.departments || {}).filter((d) =>
        isValidSubcategory(effectiveCategory, d, trimmedSub)
      )
      if (deptMatches.length > 0) {
        sanitized.subcategory = trimmedSub
      } else {
        sanitized.subcategory = '__INVALID__'
      }
    } else {
      sanitized.subcategory = '__INVALID__'
    }
  }

  // 5. Search
  if (query.search && typeof query.search === 'string' && query.search.trim()) {
    sanitized.search = query.search.trim().slice(0, 100)
  }

  // 6. Brand
  if (query.brand && typeof query.brand === 'string' && query.brand.trim()) {
    sanitized.brand = query.brand.trim().slice(0, 100)
  }

  // 7. Price range
  if (query.minPrice !== undefined && query.minPrice !== null && String(query.minPrice).trim() !== '') {
    const num = Number(query.minPrice)
    if (!isNaN(num) && num >= 0 && num <= 10000000) {
      sanitized.minPrice = num
    }
  }

  if (query.maxPrice !== undefined && query.maxPrice !== null && String(query.maxPrice).trim() !== '') {
    const num = Number(query.maxPrice)
    if (!isNaN(num) && num >= 0 && num <= 10000000) {
      sanitized.maxPrice = num
    }
  }

  // 8. Stock / Availability
  const avail = (query.availability || query.stock || '').toString().trim().toLowerCase()
  if (query.inStock === 'true' || avail === 'in-stock') {
    sanitized.availability = 'in-stock'
  } else if (query.inStock === 'false' || avail === 'out-of-stock') {
    sanitized.availability = 'out-of-stock'
  }

  // 9. Sort
  const allowedSorts = ['newest', 'price-asc', 'price-desc', 'relevance', 'default']
  if (query.sort && typeof query.sort === 'string' && allowedSorts.includes(query.sort.trim().toLowerCase())) {
    sanitized.sort = query.sort.trim().toLowerCase()
  } else {
    sanitized.sort = 'newest'
  }

  // 10. Specific IDs filter (e.g. for batch fetching or recently viewed)
  if (query.ids !== undefined && query.ids !== null) {
    let rawIds = []
    if (typeof query.ids === 'string') {
      rawIds = query.ids.split(',')
    } else if (Array.isArray(query.ids)) {
      rawIds = query.ids
    }
    const validIds = rawIds
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
      .slice(0, 50)
    if (validIds.length > 0) {
      sanitized.ids = validIds
    }
  }

  // 11. Flash Sale filter
  if (query.flashSale === 'true' || query.flashSale === true) {
    sanitized.flashSale = true
  }

  return sanitized
}

module.exports = {
  validateCreateProductInput,
  validateUpdateProductInput,
  validateProductQueryParams,
}

