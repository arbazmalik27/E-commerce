import { useEffect } from 'react'
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  buildCanonicalUrl,
  formatTitle,
  resolveImageUrl,
} from '../utils/seo'

/**
 * Safely updates or creates a meta tag in document.head.
 * If content is null/undefined/empty, the tag is removed.
 *
 * @param {'name'|'property'} keyAttr - Attribute name to match ('name' or 'property')
 * @param {string} keyValue - Value of attribute (e.g. 'description', 'og:title')
 * @param {string|null} content - Content string or null to remove
 */
function updateMetaTag(keyAttr, keyValue, content) {
  if (typeof document === 'undefined') return

  let element = document.querySelector(`meta[${keyAttr}="${keyValue}"]`)

  if (!content) {
    if (element) {
      element.remove()
    }
    return
  }

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(keyAttr, keyValue)
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

/**
 * Safely updates or creates the canonical link tag in document.head.
 * If url is null/empty, the tag is removed.
 *
 * @param {string|null} url - Fully qualified canonical URL or null
 */
function updateCanonicalLink(url) {
  if (typeof document === 'undefined') return

  let link = document.querySelector('link[rel="canonical"]')

  if (!url) {
    if (link) {
      link.remove()
    }
    return
  }

  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }

  link.setAttribute('href', url)
}

/**
 * Universal SEO hook for TrendVolt pages.
 * Handles document title, meta description, robots directives,
 * canonical link tags, Open Graph, and Twitter Cards.
 *
 * @param {Object} options
 * @param {string} [options.title] - Page title (will be formatted with '| TrendVolt')
 * @param {string} [options.description] - Page meta description
 * @param {string} [options.canonical] - Canonical path or URL (e.g. '/products')
 * @param {boolean} [options.noindex=false] - Whether to exclude from search engines
 * @param {string} [options.ogTitle] - Custom Open Graph title
 * @param {string} [options.ogDescription] - Custom Open Graph description
 * @param {string} [options.ogType='website'] - Open Graph type ('website', 'product', 'article')
 * @param {string} [options.ogUrl] - Custom Open Graph URL (defaults to canonical URL)
 * @param {string} [options.ogImage] - Social share image URL or relative path
 * @param {'summary'|'summary_large_image'} [options.twitterCard] - Twitter card type
 * @param {string} [options.twitterTitle] - Custom Twitter card title
 * @param {string} [options.twitterDescription] - Custom Twitter card description
 * @param {string} [options.twitterImage] - Custom Twitter card image
 */
export function useSEO({
  title,
  description,
  canonical,
  noindex = false,
  ogTitle,
  ogDescription,
  ogType = 'website',
  ogUrl,
  ogImage,
  twitterCard,
  twitterTitle,
  twitterDescription,
  twitterImage,
} = {}) {
  const finalTitle = formatTitle(title)
  const finalDescription = description || DEFAULT_DESCRIPTION
  const finalCanonical = canonical ? buildCanonicalUrl(canonical) : ''
  const finalOgTitle = ogTitle || finalTitle
  const finalOgDescription = ogDescription || finalDescription
  const finalOgType = ogType || 'website'
  const finalOgUrl = ogUrl ? buildCanonicalUrl(ogUrl) : finalCanonical
  const resolvedOgImage = ogImage ? resolveImageUrl(ogImage) : null
  const finalTwitterCard = twitterCard || (resolvedOgImage ? 'summary_large_image' : 'summary')
  const finalTwitterTitle = twitterTitle || finalOgTitle
  const finalTwitterDescription = twitterDescription || finalOgDescription
  const resolvedTwitterImage = twitterImage ? resolveImageUrl(twitterImage) : resolvedOgImage

  useEffect(() => {
    // 1. Title
    document.title = finalTitle

    // 2. Meta description
    updateMetaTag('name', 'description', finalDescription)

    // 3. Robots directive
    const robotsDirective = noindex ? 'noindex, nofollow' : 'index, follow'
    updateMetaTag('name', 'robots', robotsDirective)

    // 4. Open Graph tags
    updateMetaTag('property', 'og:site_name', SITE_NAME)
    updateMetaTag('property', 'og:title', finalOgTitle)
    updateMetaTag('property', 'og:description', finalOgDescription)
    updateMetaTag('property', 'og:type', finalOgType)
    updateMetaTag('property', 'og:url', finalOgUrl || null)
    updateMetaTag('property', 'og:image', resolvedOgImage)

    // 5. Twitter Card tags
    updateMetaTag('name', 'twitter:card', finalTwitterCard)
    updateMetaTag('name', 'twitter:title', finalTwitterTitle)
    updateMetaTag('name', 'twitter:description', finalTwitterDescription)
    updateMetaTag('name', 'twitter:image', resolvedTwitterImage)

    // 6. Canonical link
    updateCanonicalLink(noindex ? null : (finalCanonical || null))
  }, [
    finalTitle,
    finalDescription,
    finalCanonical,
    noindex,
    finalOgTitle,
    finalOgDescription,
    finalOgType,
    finalOgUrl,
    resolvedOgImage,
    finalTwitterCard,
    finalTwitterTitle,
    finalTwitterDescription,
    resolvedTwitterImage,
  ])
}

export default useSEO
