import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Heart, ShoppingBag, Check, RefreshCw } from 'lucide-react'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import { addToCart } from '../features/cart/cartSlice'
import api from '../services/api'
import { getHomepageProductImage } from '../utils/productImageMap'
import { FALLBACK_FEATURED_PRODUCTS } from '../data/fallbackProducts'
import Eyebrow from './Eyebrow'

// Editorial position labels — purely decorative UI convention, not fake product metadata
const POSITION_CONFIG = {
  '-2': { badge: 'EDIT', badgeColor: 'bg-[#EEE7DC] text-[#5F6057] border-[#DED7CA]' },
  '-1': { badge: 'LOOK', badgeColor: 'bg-[#34452F]/10 text-[#34452F] border-[#34452F]/20' },
  '0': { badge: 'FEATURED', badgeColor: 'bg-[#34452F] text-[#FFFDF8] border-[#34452F]' },
  '1': { badge: 'LOOK', badgeColor: 'bg-[#34452F]/10 text-[#34452F] border-[#34452F]/20' },
  '2': { badge: 'EDIT', badgeColor: 'bg-[#EEE7DC] text-[#5F6057] border-[#DED7CA]' },
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

  const displayImage = getHomepageProductImage(product)
  const hasImage = Boolean(displayImage) && !imageError

  const isAvailable = product.stock > 0
  const badgeInfo = POSITION_CONFIG[positionOffset] || {
    badge: 'FEATURED',
    badgeColor: 'bg-[#34452F] text-[#FFFDF8] border-[#34452F]',
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
          ? 'w-[280px] sm:w-[295px] 2xl:w-[320px] bg-[#FFFDF8] border-[#34452F] p-5 sm:p-6 shadow-[0_15px_35px_-10px_rgba(52,69,47,0.15)] ring-1 ring-[#34452F]/20 scale-105 z-20 cursor-default'
          : 'bg-[#FAF7F0] border-[#DED7CA] p-4 sm:p-5 shadow-xs cursor-pointer hover:border-[#34452F] hover:bg-[#FFFDF8] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] ' +
            (Math.abs(positionOffset) === 1
              ? 'w-[215px] 2xl:w-[245px] scale-98 z-10 opacity-85'
              : 'w-[185px] 2xl:w-[215px] scale-92 z-0 opacity-65')
      }`}
    >
      <div>
        {/* Top Bar: Editorial Badge (Left) + Wishlist Heart (Right) */}
        <div className="flex items-center justify-between gap-2 pb-2">
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${badgeInfo.badgeColor}`}
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
            className="h-8 w-8 rounded-full bg-[#FFFDF8] border border-[#DED7CA] text-[#5F6057] hover:text-[#A65332] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isWishlisted ? 'fill-[#A65332] text-[#A65332]' : 'stroke-current'
              }`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Product Image */}
        <Link
          to={`/products/${product._id}`}
          onClick={(e) => !isCenter && e.preventDefault()}
          tabIndex={!isCenter ? -1 : 0}
          aria-label={`View details for ${product.name}`}
          className="relative w-full my-2 overflow-hidden rounded-2xl bg-[#EEE7DC] block border border-[#DED7CA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          style={{ aspectRatio: '3/4' }}
        >
          {hasImage ? (
            <img
              src={displayImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              width={320}
              height={427}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover object-top transition-transform duration-600 ease-out group-hover:scale-[1.03] select-none"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#85857A] text-xs uppercase font-mono font-semibold tracking-wider">
              No Image
            </div>
          )}
        </Link>

        {/* Product Title */}
        <h3
          className={`font-bold text-[#1F211C] tracking-tight leading-snug line-clamp-2 transition-colors mt-2 ${
            isCenter
              ? 'text-base sm:text-lg group-hover:text-[#34452F]'
              : 'text-sm group-hover:text-[#34452F]'
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

        {/* Short Product Description */}
        {product.description && (
          <p className="mt-1 text-xs text-[#5F6057] line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Stock Status Indicator */}
        <div className="mt-2 flex items-center gap-1.5">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#3F6B45]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3F6B45]" />
              In Stock
            </span>
          ) : (
            <span className="text-[11px] font-medium text-[#B7473A]">
              Sold Out
            </span>
          )}
        </div>
      </div>

      {/* Price & Action Row */}
      <div className="mt-3 pt-3 border-t border-[#DED7CA] flex items-center justify-between gap-2">
        <span
          className={`font-black text-[#1F211C] tracking-tight ${
            isCenter ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
          }`}
        >
          ₹{Number(product.price).toLocaleString('en-IN')}
        </span>

        {/* Action Button */}
        {isCenter ? (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isAvailable || isAdding}
            aria-label={`Add ${product.name} to cart`}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] disabled:cursor-not-allowed disabled:opacity-40 shadow-xs ${
              addFeedback === 'success'
                ? 'bg-[#3F6B45] text-[#FFFDF8]'
                : addFeedback === 'error'
                  ? 'bg-red-500/10 text-[#B7473A] border border-red-500/25'
                  : 'bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8]'
            }`}
          >
            {isAdding ? (
              <span className="inline-flex items-center gap-1">Loading...</span>
            ) : addFeedback === 'success' ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>Added</span>
              </span>
            ) : !isAvailable ? (
              <span>Sold Out</span>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
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
            className={`min-h-[40px] min-w-[40px] rounded-full inline-flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] disabled:cursor-not-allowed disabled:opacity-40 ${
              addFeedback === 'success'
                ? 'bg-[#3F6B45] text-[#FFFDF8]'
                : addFeedback === 'error'
                  ? 'bg-red-500/20 text-[#B7473A]'
                  : 'bg-[#FAF7F0] hover:bg-[#34452F] text-[#34452F] hover:text-[#FFFDF8] border border-[#DED7CA]'
            }`}
          >
            {addFeedback === 'success' ? (
              <Check className="h-4 w-4 text-[#FFFDF8]" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </article>
  )
}

function FeaturedProducts() {
  const [allProducts, setAllProducts] = useState(FALLBACK_FEATURED_PRODUCTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [wishlist, setWishlist] = useState({})
  const touchStartX = useRef(null)

  const toggleWishlist = (productId) => {
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  useEffect(() => {
    let isMounted = true

    const fetchFeatured = async (retryCount = 0) => {
      try {
        const response = await api.get('/products', {
          params: { category: 'fashion', limit: 20 },
        })
        const rawProducts = Array.isArray(response.data?.products)
          ? response.data.products
          : Array.isArray(response.data)
          ? response.data
          : []

        if (isMounted) {
          const activeFashion = rawProducts.filter(
            (p) => p && p.isActive !== false && p.category === 'fashion'
          )
          if (activeFashion.length > 0) {
            setAllProducts(activeFashion)
          }
          setError(null)
          setLoading(false)
        }
      } catch (err) {
        if (retryCount < 1 && isMounted) {
          setTimeout(() => {
            if (isMounted) fetchFeatured(retryCount + 1)
          }, 1200)
          return
        }
        if (isMounted) {
          console.warn('FeaturedProducts: Backend API offline or unreachable, continuing with curated showcase:', err?.message || err)
          setLoading(false)
          // Keep FALLBACK_FEATURED_PRODUCTS active so the showcase renders flawlessly
        }
      }
    }

    fetchFeatured()

    return () => {
      isMounted = false
    }
  }, [])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    api
      .get('/products', { params: { category: 'fashion', limit: 20 } })
      .then((res) => {
        const raw = Array.isArray(res.data?.products)
          ? res.data.products
          : Array.isArray(res.data)
          ? res.data
          : []
        const activeFashion = raw.filter(
          (p) => p && p.isActive !== false && p.category === 'fashion'
        )
        if (activeFashion.length > 0) {
          setAllProducts(activeFashion)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.warn('Retry failed:', err?.message || err)
        setError('Unable to load live featured items.')
        setLoading(false)
      })
  }

  const curatedShowcase = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return []

    const prioritizedIds = [
      '6aae361ba139bd5a38bf90f0',
      '6aae361ba139bd5a38bf90ef',
      '6aae361ba139bd5a38bf90f4',
      '6aae361ba139bd5a38bf90ee',
      '6aae361aa139bd5a38bf90ed',
    ]

    const result = []
    const selectedIds = new Set()

    for (const targetId of prioritizedIds) {
      const item = allProducts.find((p) => p._id === targetId)
      if (item && !selectedIds.has(item._id)) {
        selectedIds.add(item._id)
        result.push(item)
      }
    }

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
      className="relative w-full bg-[#F5F0E8] py-16 sm:py-20 lg:py-24 text-[#1F211C] border-b border-[#DED7CA] overflow-hidden scroll-mt-32"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. SECTION HEADER: Label: FEATURED PRODUCTS | Heading: BEST SELLERS
           ========================================================================= */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="mb-4">
            <Eyebrow variant="olive">FEATURED PRODUCTS</Eyebrow>
          </div>

          <h2
            id="featured-products-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#1F211C] leading-tight"
          >
            BEST SELLERS
          </h2>

          <p className="mt-4 text-sm sm:text-base text-[#5F6057] font-normal leading-relaxed max-w-lg">
            Signature wardrobe essentials celebrated for their refined silhouette and lasting appeal.
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
            <div className="hidden min-[1180px]:block w-[185px] rounded-[2rem] border border-[#DED7CA] bg-[#EEE7DC] p-4 animate-pulse opacity-40">
              <div className="aspect-[4/3] w-full rounded-2xl bg-[#DED7CA] mb-3" />
              <div className="h-4 w-3/4 rounded bg-[#DED7CA]" />
            </div>
            <div className="hidden md:block w-[215px] rounded-[2rem] border border-[#DED7CA] bg-[#EEE7DC] p-4 animate-pulse opacity-60">
              <div className="aspect-[4/3] w-full rounded-2xl bg-[#DED7CA] mb-3" />
              <div className="h-4 w-3/4 rounded bg-[#DED7CA]" />
            </div>
            <div className="w-[280px] sm:w-[295px] rounded-[2rem] border border-[#DED7CA] bg-[#FFFDF8] p-6 animate-pulse shadow-md">
              <div className="h-4 w-1/3 rounded bg-[#DED7CA] mb-3" />
              <div className="aspect-[4/3] w-full rounded-2xl bg-[#EEE7DC] mb-3" />
              <div className="h-5 w-2/3 rounded bg-[#DED7CA] mb-4" />
              <div className="h-10 w-full rounded-full bg-[#EEE7DC]" />
            </div>
            <div className="hidden md:block w-[215px] rounded-[2rem] border border-[#DED7CA] bg-[#EEE7DC] p-4 animate-pulse opacity-60">
              <div className="aspect-[4/3] w-full rounded-2xl bg-[#DED7CA] mb-3" />
              <div className="h-4 w-3/4 rounded bg-[#DED7CA]" />
            </div>
            <div className="hidden min-[1180px]:block w-[185px] rounded-[2rem] border border-[#DED7CA] bg-[#EEE7DC] p-4 animate-pulse opacity-40">
              <div className="aspect-[4/3] w-full rounded-2xl bg-[#DED7CA] mb-3" />
              <div className="h-4 w-3/4 rounded bg-[#DED7CA]" />
            </div>
          </div>
        )}

        {/* =========================================================================
            3. ERROR STATE
           ========================================================================= */}
        {!loading && error && totalProducts === 0 && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-[#FFFDF8] p-8 sm:p-12 text-center max-w-xl mx-auto my-8 shadow-xs"
          >
            <h3 className="text-xl font-bold text-[#1F211C] mb-2">Unable to load featured collection.</h3>
            <p className="text-sm text-[#5F6057] mb-6">Please check your connection and try again.</p>
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
            4. EMPTY STATE
           ========================================================================= */}
        {!loading && !error && totalProducts === 0 && (
          <div className="rounded-3xl border border-[#DED7CA] bg-[#FFFDF8] p-8 sm:p-14 text-center max-w-xl mx-auto my-8 shadow-xs">
            <h3 className="text-xl font-bold text-[#1F211C] mb-2">Featured collection is coming soon.</h3>
            <p className="text-sm text-[#5F6057] mb-6">Explore our full catalog of fashion apparel in the shop.</p>
            <Link
              to="/products"
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#34452F] px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] transition-all hover:bg-[#263722] active:scale-95 cursor-pointer"
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
                className="hidden sm:flex absolute left-0 xl:-left-6 top-1/2 -translate-y-1/2 z-30 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-[#DED7CA] bg-[#FFFDF8] text-[#1F211C] transition-all duration-200 hover:bg-[#34452F] hover:text-[#FFFDF8] hover:border-[#34452F] hover:scale-105 active:scale-95 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            {/* Stage: 5-Card Fan Layout */}
            <div className="flex items-center justify-center gap-3 sm:gap-3.5 xl:gap-4 w-full mx-auto py-4">
              {/* Position -2 */}
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

              {/* Position -1 */}
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

              {/* Position 0 (CENTER HERO CARD) */}
              <div className="shrink-0 z-20">
                <ShowcaseCard
                  product={curatedShowcase[safeCurrentIndex]}
                  isCenter={true}
                  positionOffset={0}
                  isWishlisted={Boolean(wishlist[curatedShowcase[safeCurrentIndex]._id])}
                  onToggleWishlist={toggleWishlist}
                />
              </div>

              {/* Position +1 */}
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

              {/* Position +2 */}
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
                className="hidden sm:flex absolute right-0 xl:-right-6 top-1/2 -translate-y-1/2 z-30 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-[#DED7CA] bg-[#FFFDF8] text-[#1F211C] transition-all duration-200 hover:bg-[#34452F] hover:text-[#FFFDF8] hover:border-[#34452F] hover:scale-105 active:scale-95 cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}

            {/* Mobile Navigation Arrows */}
            {totalProducts > 1 && (
              <div className="flex sm:hidden items-center justify-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous product"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-[#DED7CA] bg-[#FFFDF8] text-[#1F211C] active:scale-95 transition-all shadow-xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next product"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-[#DED7CA] bg-[#FFFDF8] text-[#1F211C] active:scale-95 transition-all shadow-xs"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Pagination Dots */}
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
                      className="min-h-[44px] min-w-[28px] flex items-center justify-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] rounded-full"
                    >
                      <span
                        className={`block rounded-full transition-all duration-300 ${
                          isActive
                            ? 'h-2.5 w-2.5 bg-[#34452F] ring-4 ring-[#34452F]/20'
                            : 'h-2 w-2 bg-[#DED7CA] hover:bg-[#85857A]'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Section Footer: Editorial "Explore All" Discovery Link */}
            <div className="mt-8 flex items-center justify-center border-t border-[#DED7CA] pt-6 sm:pt-8">
              <Link
                to="/products?category=fashion"
                className="group inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#34452F] hover:text-[#A65332] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] rounded-sm"
              >
                <span>Explore the Full Fashion Collection</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default FeaturedProducts
