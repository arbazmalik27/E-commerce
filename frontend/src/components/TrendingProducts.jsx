import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RefreshCw } from 'lucide-react'
import ProductCard from './ProductCard'
import Eyebrow from './Eyebrow'
import api from '../services/api'
import { FALLBACK_TRENDING_PRODUCTS } from '../data/fallbackProducts'

function TrendingProducts() {
  const [products, setProducts] = useState(FALLBACK_TRENDING_PRODUCTS.slice(0, 8))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadProducts = async (retryCount = 0) => {
      try {
        const response = await api.get('/products', { params: { category: 'fashion', limit: 20 } })
        const rawProducts = Array.isArray(response.data?.products)
          ? response.data.products
          : Array.isArray(response.data)
          ? response.data
          : []
        if (isMounted) {
          const fashionProducts = rawProducts.filter(
            (p) => p && p.isActive !== false && p.category === 'fashion'
          )
          if (fashionProducts.length > 0) {
            setProducts(fashionProducts.slice(0, 8))
          }
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        if (retryCount < 1 && isMounted) {
          setTimeout(() => {
            if (isMounted) loadProducts(retryCount + 1)
          }, 1200)
          return
        }
        if (isMounted) {
          console.warn('TrendingProducts: Backend API offline or unreachable, continuing with curated fallback:', err?.message || err)
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
      const response = await api.get('/products', { params: { category: 'fashion', limit: 20 } })
      const rawProducts = Array.isArray(response.data?.products)
        ? response.data.products
        : Array.isArray(response.data)
        ? response.data
        : []
      const fashionProducts = rawProducts.filter(
        (p) => p && p.isActive !== false && p.category === 'fashion'
      )
      if (fashionProducts.length > 0) {
        setProducts(fashionProducts.slice(0, 8))
      }
    } catch (err) {
      console.warn('TrendingProducts retry failed:', err?.message || err)
      setError('Unable to load fresh picks.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="trending-products"
      aria-labelledby="trending-products-heading"
      className="relative w-full bg-[#EEE7DC] py-16 sm:py-20 lg:py-24 text-[#1F211C] border-b border-[#DED7CA] overflow-hidden scroll-mt-32"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            HEADER: Editorial Lookbook Poster Header
           ========================================================================= */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-12 sm:mb-16">
          <div className="w-full flex items-center justify-between gap-4 text-xs font-mono font-medium tracking-[0.25em] text-[#85857A] uppercase mb-4">
            <span>SEASON &apos;26</span>
            <span className="text-[#34452F] font-bold">@TRENDVOLT_STUDIO</span>
            <span>EDITION 02</span>
          </div>

          <div className="mb-3">
            <Eyebrow variant="olive">NEW DROP</Eyebrow>
          </div>

          <h2
            id="trending-products-heading"
            className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-[#1F211C] text-center leading-none my-2 select-none"
          >
            LATEST ARRIVALS
          </h2>

          <p className="mt-4 text-sm sm:text-base text-[#5F6057] font-normal leading-relaxed max-w-lg">
            Contemporary silhouettes and seasonal layers, crafted for relaxed everyday elegance.
          </p>
        </div>

        {/* =========================================================================
            LOADING SKELETON STATE
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
                className="rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] p-3 animate-pulse flex flex-col justify-between shadow-xs"
              >
                <div className="aspect-[4/5] w-full rounded-xl bg-[#EEE7DC] mb-3" />
                <div className="h-3 w-1/3 rounded bg-[#DED7CA] mb-2" />
                <div className="h-4 w-3/4 rounded bg-[#DED7CA] mb-3" />
                <div className="h-9 w-full rounded-full bg-[#EEE7DC]" />
              </div>
            ))}
          </div>
        )}

        {/* =========================================================================
            ERROR STATE
           ========================================================================= */}
        {!loading && error && products.length === 0 && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-[#FFFDF8] p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs"
          >
            <h3 className="text-xl font-bold text-[#1F211C] mb-2">
              Unable to load new arrivals.
            </h3>
            <p className="text-sm text-[#5F6057] mb-6">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#34452F] px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] transition-all hover:bg-[#263722] active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            EMPTY STATE
           ========================================================================= */}
        {!loading && !error && products.length === 0 && (
          <div className="rounded-3xl border border-[#DED7CA] bg-[#FFFDF8] p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs">
            <h3 className="text-xl font-bold text-[#1F211C] mb-2">
              No products available at this time.
            </h3>
            <p className="text-sm text-[#5F6057] mb-6">
              Check back soon for new arrivals.
            </p>
            <Link
              to="/products"
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#34452F] px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] transition-all hover:bg-[#263722] active:scale-95 cursor-pointer"
            >
              Explore Shop
            </Link>
          </div>
        )}

        {/* =========================================================================
            LOOKBOOK EDITORIAL GRID
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
                  useHomepageImageMapping={true}
                />
              ))}
            </div>

            {/* Lookbook Bottom Signature */}
            <div className="mt-14 sm:mt-18 flex flex-col items-center text-center gap-2 border-t border-[#DED7CA] pt-10">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1F211C] tracking-tight lowercase">
                everyday essentials
              </h3>
              <p className="italic text-base sm:text-lg text-[#5F6057] font-normal">
                for the elevated modern wardrobe
              </p>

              {/* View All Discovery CTA */}
              <div className="mt-4">
                <Link
                  to="/products"
                  className="group inline-flex items-center gap-2 min-h-[44px] rounded-full bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-7 py-3 text-xs font-bold tracking-wider uppercase transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] shadow-xs"
                >
                  <span>View Full Catalog</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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
