import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Compass, Eye, Heart } from 'lucide-react'
import ProductCard from './ProductCard'
import Eyebrow from './Eyebrow'
import api from '../services/api'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import { getRecentlyViewedIds } from '../utils/recentlyViewed'
import { getDepartmentLabel } from '../constants/taxonomy'

function PersonalizedSection() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchPersonalized = async () => {
      try {
        setLoading(true)
        const recentIds = getRecentlyViewedIds()
        const params = {
          limit: 4,
        }
        if (recentIds.length > 0) {
          params.recent = recentIds.join(',')
        }

        const response = await api.get('/products/personalized', { params })
        if (isMounted) {
          if (response.data?.success && response.data.hasPersonalization) {
            setFeed(response.data)
          } else {
            setFeed(null)
          }
        }
      } catch {
        if (isMounted) {
          setFeed(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchPersonalized()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  // Cold Start: If still loading or no personalization signals found, render nothing (preserving standard homepage)
  if (loading || !feed || !feed.hasPersonalization) {
    return null
  }

  const { recommended, becauseYouViewed, yourStyle, continueShopping } = feed

  return (
    <div className="w-full space-y-12 sm:space-y-16 py-8 sm:py-12 bg-linear-to-b from-[#FAF7F0]/40 via-[#FFFDF8] to-[#FAF7F0]/40 border-b border-[#DED7CA]/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
        {/* =========================================================================
            1. RECOMMENDED FOR YOU (Authenticated or High-Signal Browsing)
           ========================================================================= */}
        {Array.isArray(recommended) && recommended.length > 0 && (
          <section aria-labelledby="recommended-heading" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#DED7CA]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#34452F] text-white">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <Eyebrow text="CURATED FOR YOU" variant="olive" />
                </div>
                <h2
                  id="recommended-heading"
                  className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1F211C] tracking-tight"
                >
                  Recommended For You
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#5F6057]">
                  Tailored selections aligned with your wardrobe preferences and favorite fashion silhouettes.
                </p>
              </div>

              <Link
                to="/products?category=fashion"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#34452F] hover:text-[#263722] transition-colors"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommended.slice(0, 4).map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showAddToCart={true}
                  variant="default"
                />
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            2. BECAUSE YOU VIEWED (Contextual to user's browsing journey)
           ========================================================================= */}
        {Array.isArray(becauseYouViewed) && becauseYouViewed.length > 0 && (
          <section aria-labelledby="because-viewed-heading" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#DED7CA]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#A65332] text-white">
                    <Eye className="h-3 w-3" />
                  </span>
                  <Eyebrow text="INSPIRED BY YOUR BROWSING" variant="terracotta" />
                </div>
                <h2
                  id="because-viewed-heading"
                  className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] tracking-tight"
                >
                  Because You Viewed These
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#5F6057]">
                  Pieces complementing your recent runway explorations and style inquiries.
                </p>
              </div>

              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A65332] hover:text-[#8C4326] transition-colors"
              >
                <span>View More Like This</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {becauseYouViewed.slice(0, 4).map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showAddToCart={true}
                  variant="default"
                />
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            3. PICKED FOR YOUR STYLE (Strongest department focus, e.g. Men / Women)
           ========================================================================= */}
        {yourStyle && Array.isArray(yourStyle.products) && yourStyle.products.length > 0 && (
          <section aria-labelledby="your-style-heading" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#DED7CA]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F211C] text-white">
                    <Compass className="h-3 w-3" />
                  </span>
                  <Eyebrow text="DEPARTMENT FOCUS" variant="neutral" />
                </div>
                <h2
                  id="your-style-heading"
                  className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] tracking-tight"
                >
                  Picked For Your Style: {getDepartmentLabel('fashion', yourStyle.department)}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#5F6057]">
                  Curated essentials matching your most frequented department.
                </p>
              </div>

              <Link
                to={`/products?category=fashion&department=${yourStyle.department}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1F211C] hover:text-[#34452F] transition-colors"
              >
                <span>View All {getDepartmentLabel('fashion', yourStyle.department)}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {yourStyle.products.slice(0, 4).map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showAddToCart={true}
                  variant="default"
                />
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            4. CONTINUE SHOPPING (Live enriched recently viewed products)
           ========================================================================= */}
        {Array.isArray(continueShopping) && continueShopping.length > 0 && (
          <section aria-labelledby="continue-shopping-heading" className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#DED7CA]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3F6B45] text-white">
                    <Heart className="h-3 w-3 fill-current" />
                  </span>
                  <Eyebrow text="CONTINUE EXPLORING" variant="olive" />
                </div>
                <h2
                  id="continue-shopping-heading"
                  className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] tracking-tight"
                >
                  Continue Shopping
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#5F6057]">
                  Pick up right where you left off with current live pricing and availability.
                </p>
              </div>

              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#34452F] hover:text-[#263722] transition-colors"
              >
                <span>Browse All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {continueShopping.slice(0, 4).map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showAddToCart={true}
                  variant="default"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default PersonalizedSection
