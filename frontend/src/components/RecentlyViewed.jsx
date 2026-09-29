import { useEffect, useState } from 'react'
import ProductCard from './ProductCard'
import Eyebrow from './Eyebrow'
import api from '../services/api'
import {
  getRecentlyViewedIds,
  removeRecentlyViewedId,
  clearRecentlyViewed,
} from '../utils/recentlyViewed'

function RecentlyViewed({
  currentProductId = null,
  title = 'Recently Viewed',
  eyebrow = 'BROWSING HISTORY',
  subtitle = 'Revisit fashion essentials you recently explored.',
  limit = 4,
  className = '',
}) {
  const [recentProducts, setRecentProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    let isMounted = true

    if (cleared) return

    const storedIds = getRecentlyViewedIds()
    // Exclude current product if viewing on ProductDetailsPage
    const targetIds = currentProductId
      ? storedIds.filter((id) => id !== currentProductId)
      : storedIds

    if (targetIds.length === 0) {
      return
    }

    const fetchRecent = async () => {
      setLoading(true)
      try {
        const queryIds = targetIds.slice(0, limit)
        const response = await api.get('/products', {
          params: {
            ids: queryIds.join(','),
            limit: queryIds.length,
          },
        })

        if (isMounted) {
          if (response.data?.success && Array.isArray(response.data.products)) {
            const fetched = response.data.products

            // Maintain exact newest-first order matching targetIds
            const productMap = new Map(fetched.map((p) => [p._id, p]))
            const ordered = []

            for (const id of queryIds) {
              const p = productMap.get(id)
              if (p) {
                ordered.push(p)
              } else {
                // Product is deleted or inactive in backend: prune from stored history
                removeRecentlyViewedId(id)
              }
            }

            setRecentProducts(ordered)
          } else {
            setRecentProducts([])
          }
        }
      } catch {
        if (isMounted) {
          setRecentProducts([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchRecent()

    return () => {
      isMounted = false
    }
  }, [currentProductId, limit, cleared])

  const handleClear = () => {
    clearRecentlyViewed()
    setRecentProducts([])
    setCleared(true)
  }

  // Hide the section completely if loading or if there are no valid products
  if (loading || recentProducts.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="recently-viewed-heading"
      className={`pt-10 sm:pt-14 border-t border-[#DED7CA]/60 ${className}`}
    >
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Eyebrow variant="olive">{eyebrow}</Eyebrow>
          <h2
            id="recently-viewed-heading"
            className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#1F211C] mt-1"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#5F6057] mt-1">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-mono uppercase tracking-wider text-[#85857A] hover:text-[#A65332] transition-colors cursor-pointer"
          title="Clear browsing history"
          aria-label="Clear recently viewed history"
        >
          Clear history
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {recentProducts.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  )
}

export default RecentlyViewed
