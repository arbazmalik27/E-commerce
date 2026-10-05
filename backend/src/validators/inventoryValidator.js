const mongoose = require('mongoose')
const { TAXONOMY } = require('../constants/taxonomy')

const DEFAULT_LOW_STOCK_THRESHOLD = 5
const ALLOWED_STOCK_STATUSES = ['all', 'in_stock', 'low_stock', 'out_of_stock']
const ALLOWED_SORT_FIELDS = ['stock', 'name', 'price', 'updatedAt']
const ALLOWED_SORT_ORDERS = ['asc', 'desc']

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

/**
 * Derives the server-authoritative stockStatus classification.
 * - OUT_OF_STOCK: stock <= 0
 * - LOW_STOCK: stock > 0 && stock <= 5
 * - IN_STOCK: stock > 5
 */
const getStockStatus = (stock) => {
  if (typeof stock !== 'number' || stock <= 0) return 'out_of_stock'
  if (stock <= DEFAULT_LOW_STOCK_THRESHOLD) return 'low_stock'
  return 'in_stock'
}

/**
 * Validates and sanitizes inventory overview query parameters.
 */
const validateInventoryQueryParams = (query = {}) => {
  let page = parseInt(query.page, 10)
  if (isNaN(page) || page < 1) page = 1

  let limit = parseInt(query.limit, 10)
  if (isNaN(limit) || limit < 1) limit = 20
  if (limit > 100) limit = 100

  let search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : ''

  let stockStatus = 'all'
  if (typeof query.stockStatus === 'string') {
    const statusLower = query.stockStatus.trim().toLowerCase()
    if (ALLOWED_STOCK_STATUSES.includes(statusLower)) {
      stockStatus = statusLower
    }
  }

  let department = null
  if (typeof query.department === 'string' && query.department.trim()) {
    let deptNorm = query.department.trim().toLowerCase()
    if (deptNorm === 'mens') deptNorm = 'men'
    const validDepts = Object.keys(TAXONOMY.fashion?.departments || {})
    if (validDepts.includes(deptNorm)) {
      department = deptNorm
    }
  }

  let sortBy = 'stock'
  if (typeof query.sortBy === 'string') {
    const sortLower = query.sortBy.trim()
    if (ALLOWED_SORT_FIELDS.includes(sortLower)) {
      sortBy = sortLower
    }
  }

  let sortOrder = 'asc'
  if (typeof query.sortOrder === 'string') {
    const orderLower = query.sortOrder.trim().toLowerCase()
    if (ALLOWED_SORT_ORDERS.includes(orderLower)) {
      sortOrder = orderLower
    }
  }

  return {
    page,
    limit,
    search,
    stockStatus,
    department,
    sortBy,
    sortOrder,
  }
}

/**
 * Validates stock adjustment payload.
 * Request body must contain ONLY { "stock": <integer >= 0> }.
 */
const validateUpdateStockInput = (body = {}) => {
  const errors = {}

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
      sanitized: null,
    }
  }

  const keys = Object.keys(body)
  const unexpectedKeys = keys.filter((k) => k !== 'stock')
  if (unexpectedKeys.length > 0) {
    errors.payload = `Unexpected field(s) in payload: ${unexpectedKeys.join(', ')}. Only "stock" is accepted.`
  }

  const { stock } = body

  if (stock === undefined || stock === null) {
    errors.stock = 'Stock quantity is required'
  } else if (typeof stock !== 'number' || !Number.isInteger(stock)) {
    errors.stock = 'Stock must be an integer'
  } else if (stock < 0) {
    errors.stock = 'Stock must be greater than or equal to 0'
  } else if (stock > 1000000) {
    errors.stock = 'Stock cannot exceed 1,000,000'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: Object.keys(errors).length === 0 ? { stock } : null,
  }
}

module.exports = {
  DEFAULT_LOW_STOCK_THRESHOLD,
  ALLOWED_STOCK_STATUSES,
  ALLOWED_SORT_FIELDS,
  ALLOWED_SORT_ORDERS,
  isValidObjectId,
  getStockStatus,
  validateInventoryQueryParams,
  validateUpdateStockInput,
}
