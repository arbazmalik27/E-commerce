const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // +05:30 in milliseconds
const MAX_CUSTOM_DAYS = 366
const ALLOWED_RANGES = ['7d', '30d', 'thisMonth', 'lastMonth', 'custom']

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/

/**
 * Returns year, month (0-indexed), date, hours, minutes in IST
 */
function getISTParts(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth(),
    date: ist.getUTCDate(),
    hours: ist.getUTCHours(),
    minutes: ist.getUTCMinutes(),
  }
}

/**
 * Creates a UTC Date representing a specific IST calendar day & time
 */
function createISTDate(year, month, date, hours = 0, minutes = 0, seconds = 0, ms = 0) {
  const utcMillis = Date.UTC(year, month, date, hours, minutes, seconds, ms)
  return new Date(utcMillis - IST_OFFSET_MS)
}

/**
 * Formats a Date to YYYY-MM-DD in IST timezone
 */
function formatISTDate(date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ist.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Formats a Date to YYYY-MM in IST timezone
 */
function formatISTMonth(date) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Validates and computes authoritative date boundaries for analytics queries.
 *
 * Supported ranges:
 * - 7d: last 7 calendar days up to end of today in IST
 * - 30d: last 30 calendar days up to end of today in IST
 * - thisMonth: 1st of current month up to end of current month in IST
 * - lastMonth: 1st of previous month up to last millisecond of previous month in IST
 * - custom: validated startDate and endDate in ISO format (max 366 days)
 */
function validateAnalyticsRange(query = {}) {
  const range = query.range ? String(query.range).trim() : '7d'

  if (!ALLOWED_RANGES.includes(range)) {
    return {
      isValid: false,
      message: `Invalid range parameter. Must be one of: ${ALLOWED_RANGES.join(', ')}`,
    }
  }

  const now = new Date()
  const { year, month, date } = getISTParts(now)

  let startDate
  let endDate
  let isMonthly = false
  let dateFormat = '%Y-%m-%d'

  if (range === '7d') {
    startDate = createISTDate(year, month, date - 6, 0, 0, 0, 0)
    endDate = createISTDate(year, month, date, 23, 59, 59, 999)
  } else if (range === '30d') {
    startDate = createISTDate(year, month, date - 29, 0, 0, 0, 0)
    endDate = createISTDate(year, month, date, 23, 59, 59, 999)
  } else if (range === 'thisMonth') {
    startDate = createISTDate(year, month, 1, 0, 0, 0, 0)
    endDate = createISTDate(year, month + 1, 0, 23, 59, 59, 999)
  } else if (range === 'lastMonth') {
    startDate = createISTDate(year, month - 1, 1, 0, 0, 0, 0)
    endDate = createISTDate(year, month, 0, 23, 59, 59, 999)
  } else if (range === 'custom') {
    const rawStart = query.startDate ? String(query.startDate).trim() : ''
    const rawEnd = query.endDate ? String(query.endDate).trim() : ''

    if (!rawStart || !rawEnd) {
      return {
        isValid: false,
        message: 'Custom range requires both startDate and endDate parameters',
      }
    }

    if (!ISO_DATE_REGEX.test(rawStart) || !ISO_DATE_REGEX.test(rawEnd)) {
      return {
        isValid: false,
        message: 'Dates must be valid ISO date strings (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)',
      }
    }

    const parsedStart = new Date(rawStart)
    const parsedEnd = new Date(rawEnd)

    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return {
        isValid: false,
        message: 'One or both provided dates could not be parsed',
      }
    }

    // Parse date-only strings (YYYY-MM-DD) into full day bounds in IST
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawStart)) {
      const [y, m, d] = rawStart.split('-').map(Number)
      startDate = createISTDate(y, m - 1, d, 0, 0, 0, 0)
    } else {
      startDate = parsedStart
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawEnd)) {
      const [y, m, d] = rawEnd.split('-').map(Number)
      endDate = createISTDate(y, m - 1, d, 23, 59, 59, 999)
    } else {
      endDate = parsedEnd
    }

    if (endDate.getTime() <= startDate.getTime()) {
      return {
        isValid: false,
        message: 'End date must be strictly after start date',
      }
    }

    const diffDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    if (diffDays > MAX_CUSTOM_DAYS) {
      return {
        isValid: false,
        message: `Custom date range cannot exceed ${MAX_CUSTOM_DAYS} days`,
      }
    }

    // If range is wider than 90 days, group by month for readability
    if (diffDays > 90) {
      isMonthly = true
      dateFormat = '%Y-%m'
    }
  }

  return {
    isValid: true,
    range,
    startDate,
    endDate,
    isMonthly,
    dateFormat,
  }
}

/**
 * Validates product limit query param (1 to 20, default 10)
 */
function validateLimit(rawLimit) {
  if (rawLimit === undefined || rawLimit === null || rawLimit === '') {
    return { isValid: true, limit: 10 }
  }

  const num = Number(rawLimit)
  if (!Number.isInteger(num) || num < 1 || num > 20) {
    return {
      isValid: false,
      message: 'Limit must be an integer between 1 and 20',
    }
  }

  return { isValid: true, limit: num }
}

/**
 * Generates continuous list of dates in IST between start and end
 */
function generateDateSeries(startDate, endDate, isMonthly = false) {
  const dates = []

  if (isMonthly) {
    const startIst = new Date(startDate.getTime() + IST_OFFSET_MS)
    const endIst = new Date(endDate.getTime() + IST_OFFSET_MS)

    let y = startIst.getUTCFullYear()
    let m = startIst.getUTCMonth()
    const endY = endIst.getUTCFullYear()
    const endM = endIst.getUTCMonth()

    while (y < endY || (y === endY && m <= endM)) {
      dates.push(`${y}-${String(m + 1).padStart(2, '0')}`)
      m++
      if (m > 11) {
        m = 0
        y++
      }
    }
  } else {
    let curTime = new Date(startDate.getTime())
    const endMs = endDate.getTime()
    const seen = new Set()

    while (curTime.getTime() <= endMs) {
      const dStr = formatISTDate(curTime)
      if (!seen.has(dStr)) {
        seen.add(dStr)
        dates.push(dStr)
      }
      curTime = new Date(curTime.getTime() + 24 * 60 * 60 * 1000)
    }

    const lastStr = formatISTDate(endDate)
    if (!seen.has(lastStr)) {
      dates.push(lastStr)
    }
  }

  return dates
}

module.exports = {
  IST_OFFSET_MS,
  MAX_CUSTOM_DAYS,
  ALLOWED_RANGES,
  validateAnalyticsRange,
  validateLimit,
  generateDateSeries,
  formatISTDate,
  formatISTMonth,
}
