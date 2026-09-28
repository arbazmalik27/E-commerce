/**
 * TRENDVOLT — SEO Utility Functions
 *
 * Provides site metadata defaults, deterministic canonical URL resolution,
 * and social image URL formatting.
 */

export const SITE_NAME = 'TrendVolt'
export const DEFAULT_TITLE = 'TrendVolt — Luxury & Everyday Fashion'
export const DEFAULT_DESCRIPTION =
  'Discover curated fashion collections, premium apparel, bespoke tailoring, and timeless wardrobe essentials at TrendVolt.'
export const DEFAULT_PRODUCTION_DOMAIN = 'https://trendvolt.com'

/**
 * Resolves the public site base URL from environment or browser origin.
 * Never hardcodes localhost as the production canonical domain.
 *
 * @returns {string} Clean base URL without trailing slash
 */
export function getSiteUrl() {
  const envUrl = import.meta.env?.VITE_SITE_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '')
  }
  return DEFAULT_PRODUCTION_DOMAIN
}

/**
 * Builds a deterministic canonical URL for a given relative or absolute path.
 * Strips query parameters and hash fragments to prevent duplicate indexing.
 *
 * @param {string} [pathOrUrl=''] - Relative path or full URL
 * @returns {string} Fully qualified canonical URL
 */
export function buildCanonicalUrl(pathOrUrl = '') {
  if (!pathOrUrl) return ''

  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      const parsed = new URL(pathOrUrl)
      return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '') || `${parsed.origin}/`
    } catch {
      return pathOrUrl.split('?')[0].split('#')[0]
    }
  }

  const siteUrl = getSiteUrl()
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  const pathWithoutQuery = cleanPath.split('?')[0].split('#')[0]

  if (pathWithoutQuery === '/' || pathWithoutQuery === '') {
    return `${siteUrl}/`
  }

  return `${siteUrl}${pathWithoutQuery.replace(/\/+$/, '')}`
}

/**
 * Formats a page title consistently with the TrendVolt brand suffix.
 *
 * @param {string} [title] - Raw page title
 * @returns {string} Standardized page title
 */
export function formatTitle(title) {
  if (!title || typeof title !== 'string' || !title.trim()) {
    return DEFAULT_TITLE
  }
  const clean = title.trim()
  if (clean === DEFAULT_TITLE || clean.endsWith(`| ${SITE_NAME}`) || clean.endsWith(`— ${SITE_NAME}`)) {
    return clean
  }
  return `${clean} | ${SITE_NAME}`
}

/**
 * Resolves an image path to a fully qualified URL for Open Graph and Twitter tags.
 *
 * @param {string|null} [imagePath] - Relative asset path or absolute URL
 * @returns {string|null} Absolute image URL or null
 */
export function resolveImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return null
  const trimmed = imagePath.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  const siteUrl = getSiteUrl()
  const pathWithSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${siteUrl}${pathWithSlash}`
}
