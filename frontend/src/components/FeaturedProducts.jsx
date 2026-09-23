import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import { addToCart } from '../features/cart/cartSlice'
import api from '../services/api'
import Eyebrow from './Eyebrow'

// Editorial position labels — purely decorative UI convention, not fake product metadata
const POSITION_CONFIG = {
  '-2': { badge: 'EDIT', badgeColor: 'bg-white/8 text-neutral-300 border-white/15' },
  '-1': { badge: 'LOOK', badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  '0': { badge: 'FEATURED', badgeColor: 'bg-purple-500/20 text-purple-200 border-purple-500/40' },
  '1': { badge: 'LOOK', badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  '2': { badge: 'EDIT', badgeColor: 'bg-white/8 text-neutral-300 border-white/15' },
}

function ShowcaseCard({
  product,
  isCenter,
  positionOffset,
  onSelect,
  isWishlisted,
  onToggleWishlist,
}) {
  const [imageError, setImageError] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addFeedback, setAddFeedback] = useState(null) // 'success' | 'error' | null

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAuthenticated = useSelector(selectIsAuthenticated)

  const hasImage =
    product.images &&
    Array.isArray(product.images) &&
    product.images.length > 0 &&
    typeof product.images[0] === 'string' &&
    product.images[0].trim().length > 0 &&
    !imageError

  const isAvailable = product.stock > 0
  const badgeInfo = POSITION_CONFIG[positionOffset] || {
    badge: 'FEATURED',
    badgeColor: 'bg-white/10 text-white border-white/20',
  }

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAvailable) return

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setIsAdding(true)
    setAddFeedback(null)

    try {
      const actionResult = await dispatch(
        addToCart({
          productId: product._id,
          quantity: 1,
        })
      )

      if (addToCart.fulfilled.match(actionResult)) {
        setAddFeedback('success')
        setTimeout(() => setAddFeedback(null), 2000)
      } else {
        setAddFeedback('error')
        setTimeout(() => setAddFeedback(null), 3000)
      }
    } catch {
      setAddFeedback('error')
      setTimeout(() => setAddFeedback(null), 3000)
    } finally {
      setIsAdding(false)
    }
  }

  const handleCardClick = () => {
    if (!isCenter && onSelect) {
      onSelect()
    }
  }

  const handleKeyDown = (e) => {
    if (!isCenter && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      if (onSelect) onSelect()
    }
  }

  return (
    <article
      role={!isCenter ? 'button' : 'article'}
      tabIndex={!isCenter ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`${isCenter ? 'Featured hero' : 'View'} ${product.name}`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[2rem] border transition-all duration-500 select-none ${
        isCenter
          ? 'w-[280px] sm:w-[295px] 2xl:w-[320px] bg-neutral-900/95 border-white/20 p-5 sm:p-6 shadow-2xl shadow-black/90 ring-1 ring-white/15 scale-105 z-20 cursor-default'
          : 'bg-neutral-900/70 border-white/10 p-4 sm:p-5 shadow-xl backdrop-blur-md cursor-pointer hover:border-white/25 hover:bg-neutral-900/85 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ' +
            (Math.abs(positionOffset) === 1
              ? 'w-[215px] 2xl:w-[245px] scale-98 z-10 opacity-85'
              : 'w-[185px] 2xl:w-[215px] scale-92 z-0 opacity-65')
      }`}
    >
      <div>
        {/* Top Bar: Editorial Badge (Left) + Wishlist Heart (Right) */}
        <div className="flex items-center justify-between gap-2 pb-2">
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${badgeInfo.badgeColor}`}
          >
            {badgeInfo.badge}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleWishlist(product._id)
            }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg
              className={`h-4 w-4 transition-colors ${
                isWishlisted ? 'fill-red-500 text-red-500' : 'fill-none stroke-current'
              }`}
              strokeWidth="1.75"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </button>
        </div>

        {/* Product Image — Full-bleed portrait frame with cinematic gradient edge */}
        <Link
          to={`/products/${product._id}`}
          onClick={(e) => !isCenter && e.preventDefault()}
          tabIndex={!isCenter ? -1 : 0}
          aria-label={`View details for ${product.name}`}
          className="relative w-full my-2 overflow-hidden rounded-2xl bg-neutral-900 block border border-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ aspectRatio: '3/4' }}
        >
          {hasImage ? (
            <>
              <img
                src={product.images[0]}
                alt={product.name}
                loading="lazy"
                onError={() => setImageError(true)}
                className="h-full w-full object-cover object-top transition-transform duration-600 ease-out group-hover:scale-[1.04] select-none"
              />
              {/* Subtle cinematic bottom gradient for text legibility if image bleeds */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-neutral-950/60 to-transparent"
                aria-hidden="true"
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-600 text-xs uppercase font-semibold tracking-wider">
              <svg className="h-8 w-8 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
          )}
        </Link>

        {/* 3 Micro-Dots Below Image (Reference Signature) */}
        <div className="flex items-center justify-center gap-1.5 my-2" aria-hidden="true">
          <span className={`h-1.5 w-1.5 rounded-full ${isCenter ? 'bg-purple-400' : 'bg-neutral-600'}`} />
          <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
        </div>

        {/* Product Title */}
        <h3
          className={`font-bold text-white tracking-tight leading-snug line-clamp-2 transition-colors ${
            isCenter
              ? 'text-base sm:text-lg group-hover:text-purple-200'
              : 'text-sm group-hover:text-neutral-100'
          }`}
        >
          <Link
            to={`/products/${product._id}`}
            onClick={(e) => !isCenter && e.preventDefault()}
            tabIndex={!isCenter ? -1 : 0}
            className="hover:underline focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>

        {/* Short Product Description — only shown if real content exists */}
        {product.description && (
          <p className="mt-1 text-xs text-neutral-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Stock Status Indicator */}
        <div className="mt-2 flex items-center gap-1.5">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              In Stock
            </span>
          ) : (
            <span className="text-[11px] font-medium text-red-400">
              Sold Out
            </span>
          )}
        </div>
      </div>

      {/* Price & Action Row */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        <span
          className={`font-black text-white tracking-tight ${
            isCenter ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
          }`}
        >
          ₹{Number(product.price).toLocaleString('en-IN')}
        </span>

        {/* Action Button: Full Pill for Center Card; Circular Icon for Flanking Cards */}
        {isCenter ? (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable || isAdding}
            aria-label={`Add ${product.name} to cart`}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 shadow-lg ${
              addFeedback === 'success'
                ? 'bg-emerald-500 text-white border border-emerald-400'
                : addFeedback === 'error'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-white hover:bg-neutral-200 text-neutral-950 hover:shadow-xl'
            }`}
          >
            {isAdding ? (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : addFeedback === 'success' ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Added</span>
              </span>
            ) : addFeedback === 'error' ? (
              <span>Failed</span>
            ) : !isAvailable ? (
              <span>Sold Out</span>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span>Add to Cart</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable || isAdding}
            title={`Add ${product.name} to cart`}
            aria-label={`Add ${product.name} to cart`}
            className={`min-h-[40px] min-w-[40px] rounded-full inline-flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 ${
              addFeedback === 'success'
                ? 'bg-emerald-500 text-white'
                : addFeedback === 'error'
                  ? 'bg-red-500/30 text-red-300'
                  : 'bg-white/10 hover:bg-white text-white hover:text-neutral-950 border border-white/15'
            }`}
          >
            {isAdding ? (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : addFeedback === 'success' ? (
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </article>
  )
}

function FeaturedProducts() {
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(2) // Default to Flagship Headphones in the center
  const [wishlist, setWishlist] = useState({})

  const touchStartX = useRef(null)

  const toggleWishlist = (productId) => {
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  // Load products on initial mount
  useEffect(() => {
    let isMounted = true

    const loadProducts = async () => {
      try {
        // Fashion-only fetch — backend now returns only fashion products,
        // but we explicitly filter as a defensive measure.
        const response = await api.get('/products', { params: { category: 'fashion' } })
        if (isMounted) {
          if (response.data?.success && Array.isArray(response.data.products)) {
            const activeList = response.data.products.filter((p) => p.isActive !== false)
            setAllProducts(activeList)
          } else {
            setAllProducts([])
          }
        }
      } catch {
        if (isMounted) {
          setError('Unable to load featured products.')
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

  // Manual retry handler
  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/products', { params: { category: 'fashion' } })
      if (response.data?.success && Array.isArray(response.data.products)) {
        const activeList = response.data.products.filter((p) => p.isActive !== false)
        setAllProducts(activeList)
      } else {
        setAllProducts([])
      }
    } catch {
      setError('Unable to load featured products.')
    } finally {
      setLoading(false)
    }
  }

  // Curate 5 distinct flagship items across Fashion departments
  const curatedShowcase = useMemo(() => {
    if (allProducts.length === 0) return []

    // 1. Timepiece / Accessories
    const accessory =
      allProducts.find((p) => /watch|sunglass|wallet|belt/i.test(p.name)) ||
      allProducts.find((p) => p.department === 'accessories')

    // 2. Footwear / Sneakers
    const footwear =
      allProducts.find((p) => /sneaker|shoe|boot|heel/i.test(p.name)) ||
      allProducts.find((p) => p.department === 'footwear' && p._id !== accessory?._id)

    // 3. Flagship Apparel / Shirts / Tops (CENTER HERO DEFAULT)
    const apparel =
      allProducts.find((p) => /shirt|top|hoodie|jacket/i.test(p.name)) ||
      allProducts[0]

    // 4. Contemporary Women / Kids / Editorial
    const editorial =
      allProducts.find((p) => /dress|kurti|saree|skirt|blazer/i.test(p.name)) ||
      allProducts.find((p) => (p.department === 'women' || p.department === 'kids') && p._id !== apparel?._id)

    // 5. Commute / Leather Goods / Outerwear
    const bag =
      allProducts.find((p) => /backpack|bag|coat/i.test(p.name)) ||
      allProducts.find((p) => p.department === 'accessories' && p._id !== accessory?._id)

    const rawCandidates = [accessory, footwear, apparel, editorial, bag]
    const selectedIds = new Set()
    const result = []

    for (const item of rawCandidates) {
      if (item && !selectedIds.has(item._id)) {
        selectedIds.add(item._id)
        result.push(item)
      }
    }

    // If any slots are missing, fill from other distinct active items
    if (result.length < 5) {
      for (const p of allProducts) {
        if (result.length >= 5) break
        if (!selectedIds.has(p._id)) {
          selectedIds.add(p._id)
          result.push(p)
        }
      }
    }

    return result.slice(0, 5)
  }, [allProducts])

  const totalProducts = curatedShowcase.length
  const safeCurrentIndex = totalProducts > 0 ? Math.min(currentIndex, totalProducts - 1) : 0

  const handlePrev = () => {
    if (totalProducts <= 1) return
    setCurrentIndex((prev) => (prev === 0 ? totalProducts - 1 : prev - 1))
  }

  const handleNext = () => {
    if (totalProducts <= 1) return
    setCurrentIndex((prev) => (prev === totalProducts - 1 ? 0 : prev + 1))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      handlePrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      handleNext()
    }
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
    touchStartX.current = null
  }

  // Helper to get product at relative offset from center
  const getProductAtOffset = (offset) => {
    if (totalProducts === 0) return null
    const targetIdx = (safeCurrentIndex + offset + totalProducts * 10) % totalProducts
    return {
      product: curatedShowcase[targetIdx],
      targetIdx,
    }
  }

  return (
    <section
      id="featured-products"
      aria-labelledby="featured-products-heading"
      className="relative w-full bg-neutral-950 py-16 sm:py-20 lg:py-24 text-white border-t border-white/5 overflow-hidden scroll-mt-32"
    >
      {/* Subtle Warm Luxury Ambient Backlight */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-b from-purple-900/10 via-purple-950/5 to-transparent blur-3xl opacity-30 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. SECTION HEADER — Editorial, Fashion-Forward
           ========================================================================= */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="mb-4">
            <Eyebrow>TRENDVOLT EDIT</Eyebrow>
          </div>

          <h2
            id="featured-products-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight"
          >
            FEATURED PRODUCTS
          </h2>

          <p className="mt-4 text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-lg">
            Curated pieces selected for the modern wardrobe.
          </p>
        </div>

        {/* =========================================================================
            2. LOADING SKELETON
           ========================================================================= */}
        {loading && (
          <div
            aria-busy="true"
            aria-label="Loading featured collection"
            className="flex items-center justify-center gap-3 sm:gap-4 overflow-hidden py-8 max-w-6xl mx-auto"
          >
            <div className="hidden min-[1180px]:block w-[185px] rounded-[2rem] border border-white/10 bg-neutral-900/40 p-4 animate-pulse opacity-40">
              <div className="aspect-[4/3] w-full rounded-2xl bg-white/5 mb-3" />
              <div className="h-4 w-3/4 rounded bg-white/10" />
            </div>
            <div className="hidden md:block w-[215px] rounded-[2rem] border border-white/10 bg-neutral-900/40 p-4 animate-pulse opacity-60">
              <div className="aspect-[4/3] w-full rounded-2xl bg-white/5 mb-3" />
              <div className="h-4 w-3/4 rounded bg-white/10" />
            </div>
            <div className="w-[280px] sm:w-[295px] rounded-[2rem] border border-white/15 bg-neutral-900/80 p-6 animate-pulse shadow-2xl">
              <div className="h-4 w-1/3 rounded bg-white/10 mb-3" />
              <div className="aspect-[4/3] w-full rounded-2xl bg-white/5 mb-3" />
              <div className="h-5 w-2/3 rounded bg-white/10 mb-4" />
              <div className="h-10 w-full rounded-full bg-white/10" />
            </div>
            <div className="hidden md:block w-[215px] rounded-[2rem] border border-white/10 bg-neutral-900/40 p-4 animate-pulse opacity-60">
              <div className="aspect-[4/3] w-full rounded-2xl bg-white/5 mb-3" />
              <div className="h-4 w-3/4 rounded bg-white/10" />
            </div>
            <div className="hidden min-[1180px]:block w-[185px] rounded-[2rem] border border-white/10 bg-neutral-900/40 p-4 animate-pulse opacity-40">
              <div className="aspect-[4/3] w-full rounded-2xl bg-white/5 mb-3" />
              <div className="h-4 w-3/4 rounded bg-white/10" />
            </div>
          </div>
        )}

        {/* =========================================================================
            3. ERROR STATE
           ========================================================================= */}
        {!loading && error && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-neutral-900/80 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl backdrop-blur-md"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4 border border-red-500/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Unable to load featured collection.</h3>
            <p className="text-sm text-neutral-400 mb-6">Please check your connection and try again.</p>
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
            4. EMPTY STATE
           ========================================================================= */}
        {!loading && !error && totalProducts === 0 && (
          <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-8 sm:p-14 text-center max-w-xl mx-auto my-8 shadow-2xl backdrop-blur-md">
            <h3 className="text-xl font-bold text-white mb-2">Featured collection is coming soon.</h3>
            <p className="text-sm text-neutral-400 mb-6">Explore our full catalog of luxury fashion apparel in the shop.</p>
            <Link
              to="/products"
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-white px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore Shop
            </Link>
          </div>
        )}

        {/* =========================================================================
            5. EDITORIAL 5-CARD FAN CAROUSEL STAGE
           ========================================================================= */}
        {!loading && !error && totalProducts > 0 && (
          <div
            className="relative"
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label="Featured Products Curated Collection"
          >
            {/* Flanking Circular Navigation Arrow (Left) */}
            {totalProducts > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous product"
                className="hidden sm:flex absolute left-0 xl:-left-6 top-1/2 -translate-y-1/2 z-30 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-white/15 bg-neutral-900/90 text-white backdrop-blur-xl transition-all duration-200 hover:bg-white hover:text-neutral-950 hover:border-white hover:scale-105 active:scale-95 cursor-pointer shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            {/* Stage: 5-Card Fan Layout on Desktop (min-[1180px]:), 3-Card on Tablet/Laptop (md:), 1-Card on Mobile */}
            <div className="flex items-center justify-center gap-3 sm:gap-3.5 xl:gap-4 w-full mx-auto py-4">
              {/* Position -2 (Outer Left, visible on screens >= 1180px) */}
              {totalProducts >= 5 && (
                <div className="hidden min-[1180px]:block shrink-0">
                  {(() => {
                    const item = getProductAtOffset(-2)
                    return item ? (
                      <ShowcaseCard
                        product={item.product}
                        isCenter={false}
                        positionOffset={-2}
                        onSelect={() => setCurrentIndex(item.targetIdx)}
                        isWishlisted={Boolean(wishlist[item.product._id])}
                        onToggleWishlist={toggleWishlist}
                      />
                    ) : null
                  })()}
                </div>
              )}

              {/* Position -1 (Inner Left, visible on md: and up) */}
              {totalProducts >= 3 && (
                <div className="hidden md:block shrink-0">
                  {(() => {
                    const item = getProductAtOffset(-1)
                    return item ? (
                      <ShowcaseCard
                        product={item.product}
                        isCenter={false}
                        positionOffset={-1}
                        onSelect={() => setCurrentIndex(item.targetIdx)}
                        isWishlisted={Boolean(wishlist[item.product._id])}
                        onToggleWishlist={toggleWishlist}
                      />
                    ) : null
                  })()}
                </div>
              )}

              {/* Position 0 (CENTER HERO CARD, always visible) */}
              <div className="shrink-0 z-20">
                <ShowcaseCard
                  product={curatedShowcase[safeCurrentIndex]}
                  isCenter={true}
                  positionOffset={0}
                  isWishlisted={Boolean(wishlist[curatedShowcase[safeCurrentIndex]._id])}
                  onToggleWishlist={toggleWishlist}
                />
              </div>

              {/* Position +1 (Inner Right, visible on md: and up) */}
              {totalProducts >= 3 && (
                <div className="hidden md:block shrink-0">
                  {(() => {
                    const item = getProductAtOffset(1)
                    return item ? (
                      <ShowcaseCard
                        product={item.product}
                        isCenter={false}
                        positionOffset={1}
                        onSelect={() => setCurrentIndex(item.targetIdx)}
                        isWishlisted={Boolean(wishlist[item.product._id])}
                        onToggleWishlist={toggleWishlist}
                      />
                    ) : null
                  })()}
                </div>
              )}

              {/* Position +2 (Outer Right, visible on screens >= 1180px) */}
              {totalProducts >= 5 && (
                <div className="hidden min-[1180px]:block shrink-0">
                  {(() => {
                    const item = getProductAtOffset(2)
                    return item ? (
                      <ShowcaseCard
                        product={item.product}
                        isCenter={false}
                        positionOffset={2}
                        onSelect={() => setCurrentIndex(item.targetIdx)}
                        isWishlisted={Boolean(wishlist[item.product._id])}
                        onToggleWishlist={toggleWishlist}
                      />
                    ) : null
                  })()}
                </div>
              )}
            </div>

            {/* Flanking Circular Navigation Arrow (Right) */}
            {totalProducts > 1 && (
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next product"
                className="hidden sm:flex absolute right-0 xl:-right-6 top-1/2 -translate-y-1/2 z-30 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-white/15 bg-neutral-900/90 text-white backdrop-blur-xl transition-all duration-200 hover:bg-white hover:text-neutral-950 hover:border-white hover:scale-105 active:scale-95 cursor-pointer shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}

            {/* Mobile-Only Arrow Buttons */}
            {totalProducts > 1 && (
              <div className="flex sm:hidden items-center justify-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous product"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-white/15 bg-neutral-900/90 text-white active:scale-95 transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white hover:bg-neutral-800"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next product"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-white/15 bg-neutral-900/90 text-white active:scale-95 transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white hover:bg-neutral-800"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}

            {/* Reference-Matching 5 Pagination Dots */}
            {totalProducts > 1 && (
              <div className="mt-8 sm:mt-10 flex items-center justify-center gap-2">
                {curatedShowcase.map((p, idx) => {
                  const isActive = idx === safeCurrentIndex
                  return (
                    <button
                      key={p._id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Select product ${idx + 1}: ${p.name}`}
                      onClick={() => setCurrentIndex(idx)}
                      className="min-h-[44px] min-w-[28px] flex items-center justify-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full"
                    >
                      <span
                        className={`block rounded-full transition-all duration-300 ${
                          isActive
                            ? 'h-2.5 w-2.5 bg-purple-400 ring-4 ring-purple-400/20'
                            : 'h-2 w-2 bg-white/25 hover:bg-white/50'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Section Footer: Editorial "Explore All" Discovery Link */}
            <div className="mt-8 flex items-center justify-center border-t border-white/5 pt-6 sm:pt-8">
              <Link
                to="/products?category=fashion"
                className="group inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-sm"
              >
                <span>Explore the Full Fashion Collection</span>
                <svg
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default FeaturedProducts
