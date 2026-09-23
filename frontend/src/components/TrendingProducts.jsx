import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from './ProductCard'
import api from '../services/api'

function TrendingProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadProducts = async () => {
      try {
        const response = await api.get('/products', { params: { category: 'fashion' } })
        if (isMounted) {
          if (response.data?.success && Array.isArray(response.data.products)) {
            // Filter strictly for active fashion items
            const fashionProducts = response.data.products.filter(
              (p) => p.isActive !== false && p.category === 'fashion'
            )

            // Display up to 8 real products to match the visual lookbook grid
            setProducts(fashionProducts.slice(0, 8))
          } else {
            setProducts([])
          }
        }
      } catch {
        if (isMounted) {
          setError('Unable to load fresh picks. Please check your connection and try again.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      isMounted = false
    }
  }, [])

  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/products', { params: { category: 'fashion' } })
      if (response.data?.success && Array.isArray(response.data.products)) {
        const fashionProducts = response.data.products.filter(
          (p) => p.isActive !== false && p.category === 'fashion'
        )
        setProducts(fashionProducts.slice(0, 8))
      } else {
        setProducts([])
      }
    } catch {
      setError('Unable to load fresh picks. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="trending-products"
      aria-labelledby="trending-products-heading"
      className="relative w-full bg-neutral-950 py-16 sm:py-20 lg:py-24 text-white border-t border-white/5 overflow-hidden scroll-mt-32"
    >
      {/* Subtle atmospheric ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-b from-purple-900/10 via-purple-950/5 to-transparent blur-3xl opacity-20 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            HEADER: Editorial Lookbook Poster Header (Direct Reference Match)
           ========================================================================= */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-10 sm:mb-14">
          {/* Top Tri-Meta: Edition / Date (Left), Handle (Center), Year (Right) */}
          <div className="w-full flex items-center justify-between gap-4 text-xs font-mono font-medium tracking-[0.25em] text-neutral-400 uppercase mb-3">
            <span>NOV / EDIT</span>
            <span className="text-neutral-300">@TRENDVOLT_STUDIO</span>
            <span>2026</span>
          </div>

          {/* Master Display Title: Tall, Condensed High-Fashion Serif */}
          <h2
            id="trending-products-heading"
            className="font-serif text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-tighter text-white text-center leading-none my-2 sm:my-4 select-none"
          >
            NEW ARRIVALS
          </h2>
        </div>

        {/* =========================================================================
            LOADING SKELETON STATE (4x2 Polaroid Lookbook Grid)
           ========================================================================= */}
        {loading && (
          <div
            aria-busy="true"
            aria-label="Loading new arrivals"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
          >
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl sm:rounded-2xl bg-white/10 p-2 sm:p-2.5 animate-pulse flex flex-col justify-between"
              >
                <div className="aspect-[4/5] w-full rounded-lg bg-white/10 mb-2.5" />
                <div className="h-3 w-1/3 rounded bg-white/15 mb-2" />
                <div className="h-4 w-3/4 rounded bg-white/15 mb-3" />
                <div className="h-8 w-full rounded-full bg-white/15" />
              </div>
            ))}
          </div>
        )}

        {/* =========================================================================
            ERROR STATE
           ========================================================================= */}
        {!loading && error && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-neutral-900/80 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl backdrop-blur-md"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4 border border-red-500/30">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Unable to load new arrivals.
            </h3>
            <p className="text-sm text-neutral-400 mb-6">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-white px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* =========================================================================
            EMPTY STATE
           ========================================================================= */}
        {!loading && !error && products.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-8 sm:p-12 text-center max-w-xl mx-auto my-8">
            <h3 className="text-xl font-bold text-white mb-2">
              No products available at this time.
            </h3>
            <p className="text-sm text-neutral-400 mb-6">
              Check back soon for new arrivals.
            </p>
            <Link
              to="/products"
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-white px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore Shop
            </Link>
          </div>
        )}

        {/* =========================================================================
            4x2 LOOKBOOK POLAROID GRID (Matching Reference Architecture)
           ========================================================================= */}
        {!loading && !error && products.length > 0 && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  showAddToCart={true}
                  variant="lookbook"
                />
              ))}
            </div>

            {/* Lookbook Bottom Signature (Matching Reference Footer) */}
            <div className="mt-12 sm:mt-16 flex flex-col items-center text-center gap-2 border-t border-white/5 pt-8">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight lowercase">
                everyday essentials
              </h3>
              <p className="font-serif italic text-base sm:text-xl text-neutral-400 font-normal">
                for the elevated modern lifestyle
              </p>

              {/* View All Discovery CTA */}
              <div className="mt-4">
                <Link
                  to="/products"
                  className="group inline-flex items-center gap-2 min-h-[44px] rounded-full bg-white/10 hover:bg-white text-white hover:text-neutral-950 px-6 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-300 border border-white/15 hover:border-transparent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-lg"
                >
                  <span>View All Collection</span>
                  <svg
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default TrendingProducts
