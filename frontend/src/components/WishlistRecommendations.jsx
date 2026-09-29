import { useEffect, useState } from 'react'
import api from '../services/api'
import ProductCard from './ProductCard'
import Eyebrow from './Eyebrow'

function WishlistRecommendations({ wishlistLength = 0 }) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasRecommendations, setHasRecommendations] = useState(false)

  useEffect(() => {
    if (wishlistLength === 0) return

    let isMounted = true
    setLoading(true)

    api
      .get('/products/wishlist-recommendations?limit=4')
      .then((res) => {
        if (!isMounted) return
        if (
          res.data?.success &&
          res.data?.hasRecommendations &&
          Array.isArray(res.data?.recommendations) &&
          res.data.recommendations.length > 0
        ) {
          setRecommendations(res.data.recommendations)
          setHasRecommendations(true)
        } else {
          setRecommendations([])
          setHasRecommendations(false)
        }
      })
      .catch(() => {
        if (!isMounted) return
        // Isolate failure gracefully - do not break WishlistPage, just hide section
        setRecommendations([])
        setHasRecommendations(false)
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [wishlistLength])

  // Loading state skeleton
  if (loading) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading curated recommendations"
        className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-[#DED7CA]"
      >
        <div className="mb-8 sm:mb-10 space-y-2">
          <div className="h-4 w-28 rounded bg-[#EEE7DC] animate-pulse" />
          <div className="h-8 w-64 rounded bg-[#EEE7DC] animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded bg-[#EEE7DC] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] overflow-hidden"
            >
              <div className="aspect-[4/5] bg-[#EEE7DC]" />
              <div className="p-4 space-y-2.5">
                <div className="h-4 w-3/4 rounded bg-[#EEE7DC]" />
                <div className="h-3.5 w-1/2 rounded bg-[#EEE7DC]" />
                <div className="h-9 w-full rounded-xl bg-[#EEE7DC] mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Gracefully hide section if no recommendations exist or request failed
  if (!hasRecommendations || recommendations.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="wishlist-recommendations-heading"
      className="mt-16 sm:mt-20 pt-12 sm:pt-16 border-t border-[#DED7CA]"
    >
      <div className="mb-8 sm:mb-10">
        <Eyebrow variant="terracotta" className="mb-3">
          STYLE COMPANIONS
        </Eyebrow>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2
              id="wishlist-recommendations-heading"
              className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1F211C] tracking-tight mb-2"
            >
              Complete Your Style
            </h2>
            <p className="text-sm sm:text-base text-[#5F6057]">
              Thoughtfully paired garments and accessories inspired by your saved pieces.
            </p>
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#85857A]">
            Curated Selection
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recommendations.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            showAddToCart
            variant="lookbook"
          />
        ))}
      </div>
    </section>
  )
}

export default WishlistRecommendations
