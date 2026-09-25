import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import { addToCart } from '../features/cart/cartSlice'
import {
  addToWishlist,
  removeFromWishlist,
  selectIsInWishlist,
} from '../features/wishlist/wishlistSlice'
import api from '../services/api'
import {
  getCategoryLabel,
  getDepartmentLabel,
  getSubcategoryLabel,
} from '../constants/taxonomy'

function ProductDetailsPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAuthenticated = useSelector(selectIsAuthenticated)

  // Product data & loading states
  const [product, setProduct] = useState(null)
  const isInWishlist = useSelector(selectIsInWishlist(product?._id || id || ''))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isNotFound, setIsNotFound] = useState(false)

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState({})

  // Purchase states
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartSuccessMessage, setCartSuccessMessage] = useState(null)
  const [cartErrorMessage, setCartErrorMessage] = useState(null)

  // Share & wishlist feedback states
  const [shareFeedback, setShareFeedback] = useState(null)
  const [wishlistFeedback, setWishlistFeedback] = useState(null)

  // Related products state
  const [relatedProducts, setRelatedProducts] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  // Load product details
  useEffect(() => {
    let isMounted = true

    const fetchProduct = async () => {
      setLoading(true)
      setError(null)
      setIsNotFound(false)
      setActiveImageIndex(0)
      setQuantity(1)
      setCartSuccessMessage(null)
      setCartErrorMessage(null)

      try {
        const response = await api.get(`/products/${id}`)
        if (isMounted) {
          if (response.data?.success && response.data.product) {
            setProduct(response.data.product)
          } else {
            setIsNotFound(true)
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err.response?.status === 404 || err.response?.status === 400) {
            setIsNotFound(true)
          } else {
            setError('Unable to load product details. Please check your connection and try again.')
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProduct()

    return () => {
      isMounted = false
    }
  }, [id])

  // Fetch related products based on product category
  useEffect(() => {
    let isMounted = true

    if (!product?._id) return

    const fetchRelated = async () => {
      setRelatedLoading(true)
      try {
        const response = await api.get('/products')
        if (isMounted && response.data?.success && Array.isArray(response.data.products)) {
          const others = response.data.products.filter((p) => p._id !== product._id)
          // Prioritize same category, limit to 4
          const sameCategory = others.filter(
            (p) => p.category && p.category.toLowerCase() === product.category?.toLowerCase()
          )
          const remaining = others.filter(
            (p) => !p.category || p.category.toLowerCase() !== product.category?.toLowerCase()
          )
          const curated = [...sameCategory, ...remaining].slice(0, 4)
          setRelatedProducts(curated)
        }
      } catch {
        if (isMounted) {
          setRelatedProducts([])
        }
      } finally {
        if (isMounted) {
          setRelatedLoading(false)
        }
      }
    }

    fetchRelated()

    return () => {
      isMounted = false
    }
  }, [product])

  // Images list sanitization
  const validImages =
    product?.images && Array.isArray(product.images)
      ? product.images.filter((img) => typeof img === 'string' && img.trim().length > 0)
      : []

  const activeImage = validImages[activeImageIndex] || null
  const isAvailable = (product?.stock ?? 0) > 0
  const maxAllowedQuantity = Math.max(1, product?.stock ?? 1)

  // Quantity controls
  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(maxAllowedQuantity, prev + 1))
  }

  // Add to Cart workflow
  const handleAddToCart = async () => {
    setCartSuccessMessage(null)
    setCartErrorMessage(null)

    if (!isAvailable) {
      setCartErrorMessage('This item is currently out of stock.')
      return
    }

    if (!isAuthenticated) {
      setCartErrorMessage('Please sign in to add items to your cart.')
      return
    }

    setAddingToCart(true)
    try {
      const actionResult = await dispatch(
        addToCart({
          productId: product._id,
          quantity,
        })
      )

      if (addToCart.fulfilled.match(actionResult)) {
        setCartSuccessMessage(
          `Added ${quantity} ${quantity === 1 ? 'item' : 'items'} to your cart.`
        )
      } else {
        setCartErrorMessage(actionResult.payload || 'Failed to add item to cart.')
      }
    } catch {
      setCartErrorMessage(
        'Failed to add item to cart. Please check your connection and try again.'
      )
    } finally {
      setAddingToCart(false)
    }
  }

  // Buy Now workflow
  const handleBuyNow = async () => {
    if (!isAvailable) return

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setAddingToCart(true)
    try {
      const actionResult = await dispatch(
        addToCart({
          productId: product._id,
          quantity,
        })
      )

      if (addToCart.fulfilled.match(actionResult)) {
        navigate('/checkout')
      } else {
        setCartErrorMessage(actionResult.payload || 'Could not proceed to checkout.')
      }
    } catch {
      setCartErrorMessage(
        'Could not proceed to checkout. Please try again.'
      )
    } finally {
      setAddingToCart(false)
    }
  }

  // Share workflow
  const handleShare = async () => {
    const shareData = {
      title: product?.name || 'TrendVolt Product',
      text: `Check out ${product?.name || 'this product'} on TrendVolt!`,
      url: window.location.href,
    }

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareFeedback('Link copied to clipboard!')
      setTimeout(() => setShareFeedback(null), 3000)
    } catch {
      setShareFeedback('Copy URL: ' + window.location.href)
      setTimeout(() => setShareFeedback(null), 4000)
    }
  }

  // Wishlist toggle – dispatches real Redux actions, shows feedback
  const handleWishlist = async () => {
    if (!isAuthenticated) {
      setWishlistFeedback('Please sign in to save items to your wishlist.')
      setTimeout(() => setWishlistFeedback(null), 3000)
      return
    }
    if (!product?._id) return

    try {
      if (isInWishlist) {
        await dispatch(removeFromWishlist(product._id))
        setWishlistFeedback('Removed from wishlist.')
      } else {
        await dispatch(addToWishlist(product._id))
        setWishlistFeedback('Added to wishlist!')
      }
    } catch {
      setWishlistFeedback('Unable to update wishlist. Please try again.')
    }
    setTimeout(() => setWishlistFeedback(null), 3000)
  }

  // Retry handler
  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get(`/products/${id}`)
      if (response.data?.success && response.data.product) {
        setProduct(response.data.product)
      } else {
        setIsNotFound(true)
      }
    } catch {
      setError('Unable to load product details. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
      {/* Soft Purple/Lilac Ambient Atmosphere Glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-purple-600/15 via-purple-900/5 to-transparent blur-3xl opacity-70 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. BREADCRUMBS & BACK LINK
           ========================================================================= */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-neutral-400"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/products" className="hover:text-white transition-colors">
              Shop
            </Link>
            {product?.category && (
              <>
                <span aria-hidden="true">/</span>
                <Link
                  to={`/products?category=${product.category.toLowerCase()}`}
                  className="hover:text-white capitalize transition-colors"
                >
                  {getCategoryLabel(product.category)}
                </Link>
              </>
            )}
            {product?.department && (
              <>
                <span aria-hidden="true">/</span>
                <Link
                  to={`/products?category=${product.category.toLowerCase()}&department=${product.department.toLowerCase()}`}
                  className="hover:text-white capitalize transition-colors"
                >
                  {getDepartmentLabel(product.category, product.department)}
                </Link>
              </>
            )}
            {product?.subcategory && (
              <>
                <span aria-hidden="true">/</span>
                <Link
                  to={`/products?category=${product.category.toLowerCase()}&department=${product.department.toLowerCase()}&subcategory=${product.subcategory.toLowerCase()}`}
                  className="hover:text-white capitalize transition-colors"
                >
                  {getSubcategoryLabel(product.category, product.department, product.subcategory)}
                </Link>
              </>
            )}
            {product?.name && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-neutral-200 font-medium truncate max-w-[200px] sm:max-w-xs">
                  {product.name}
                </span>
              </>
            )}
          </div>

          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Shop</span>
          </Link>
        </nav>

        {/* =========================================================================
            2. LOADING SKELETON
           ========================================================================= */}
        {loading && (
          <div
            aria-busy="true"
            aria-label="Loading product details"
            className="rounded-3xl border border-white/10 bg-neutral-900/70 p-6 sm:p-8 lg:p-12 shadow-2xl backdrop-blur-xl animate-pulse"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              {/* Gallery Skeleton */}
              <div className="lg:col-span-6 flex flex-col gap-4">
                <div className="aspect-square w-full rounded-2xl bg-white/5" />
                <div className="flex gap-3">
                  <div className="h-16 w-16 rounded-xl bg-white/5" />
                  <div className="h-16 w-16 rounded-xl bg-white/5" />
                  <div className="h-16 w-16 rounded-xl bg-white/5" />
                </div>
              </div>

              {/* Information Skeleton */}
              <div className="lg:col-span-6 flex flex-col py-2">
                <div className="h-4 w-24 rounded bg-white/10 mb-4" />
                <div className="h-8 w-4/5 rounded bg-white/10 mb-4" />
                <div className="h-6 w-32 rounded bg-white/10 mb-6" />
                <div className="space-y-2 mb-8">
                  <div className="h-4 w-full rounded bg-white/5" />
                  <div className="h-4 w-5/6 rounded bg-white/5" />
                  <div className="h-4 w-4/6 rounded bg-white/5" />
                </div>
                <div className="space-y-4 pt-6 border-t border-white/10">
                  <div className="h-11 w-32 rounded-xl bg-white/10" />
                  <div className="flex gap-3">
                    <div className="h-12 flex-1 rounded-full bg-white/15" />
                    <div className="h-12 flex-1 rounded-full bg-white/5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            3. NOT FOUND STATE
           ========================================================================= */}
        {!loading && isNotFound && (
          <div
            role="alert"
            className="rounded-3xl border border-white/10 bg-neutral-900/80 p-8 sm:p-14 text-center max-w-xl mx-auto my-12 shadow-2xl backdrop-blur-xl"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Product Not Found</h1>
            <p className="text-sm text-neutral-400 mb-8 max-w-sm mx-auto">
              The product you are searching for might have been moved, is currently inactive, or
              does not exist in our catalog.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 shadow-xl"
            >
              Back to Shop
            </Link>
          </div>
        )}

        {/* =========================================================================
            4. ERROR STATE (NETWORK / API FAILURE)
           ========================================================================= */}
        {!loading && !isNotFound && error && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-neutral-900/90 p-8 sm:p-14 text-center max-w-xl mx-auto my-12 shadow-2xl"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4 border border-red-500/30">
              <svg
                className="h-8 w-8"
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
            <h2 className="text-2xl font-bold text-white mb-2">Unable to Load Product</h2>
            <p className="text-sm text-neutral-400 mb-8">{error}</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleRetry}
                className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Retry
              </button>
              <Link
                to="/products"
                className="min-h-[44px] inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10"
              >
                Back to Shop
              </Link>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. MAIN PRODUCT DETAILS CARD
           ========================================================================= */}
        {!loading && !isNotFound && product && (
          <div className="space-y-12">
            {/* Primary Product Card Showcase Container */}
            <article className="rounded-3xl border border-white/12 bg-neutral-900/85 p-6 sm:p-8 lg:p-12 shadow-2xl backdrop-blur-xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
                {/* -------------------------------------------------------------------
                    LEFT: PRODUCT GALLERY
                   ------------------------------------------------------------------- */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                  {/* Main Display Surface */}
                  <div className="relative aspect-square w-full rounded-2xl border border-white/10 bg-neutral-950/90 overflow-hidden flex items-center justify-center p-6 sm:p-8">
                    {/* Image Counter Indicator */}
                    {validImages.length > 1 && (
                      <div className="absolute top-4 right-4 z-10 rounded-full border border-white/15 bg-neutral-950/70 px-3 py-1 text-xs font-semibold text-neutral-300 backdrop-blur-md">
                        {activeImageIndex + 1} / {validImages.length}
                      </div>
                    )}

                    {activeImage && !imageErrors[activeImageIndex] ? (
                      <img
                        src={activeImage}
                        alt={`${product.name} - View ${activeImageIndex + 1}`}
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [activeImageIndex]: true }))
                        }
                        className="h-full w-full object-contain select-none transition-transform duration-500 ease-out hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center text-neutral-500"
                        aria-label="No image available"
                      >
                        <svg
                          className="h-16 w-16 text-neutral-600 mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          No Image Available
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Row */}
                  {validImages.length > 1 && (
                    <div
                      role="tablist"
                      aria-label="Product image thumbnails"
                      className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none"
                    >
                      {validImages.map((img, idx) => {
                        const isCurrent = idx === activeImageIndex
                        return (
                          <button
                            key={idx}
                            type="button"
                            role="tab"
                            aria-selected={isCurrent}
                            aria-label={`Show image ${idx + 1}`}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden border p-1 bg-neutral-950 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                              isCurrent
                                ? 'border-purple-400 ring-2 ring-purple-500/50 scale-105'
                                : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-contain rounded-lg"
                            />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* -------------------------------------------------------------------
                    RIGHT: PRODUCT INFORMATION & PURCHASE
                   ------------------------------------------------------------------- */}
                <div className="lg:col-span-6 flex flex-col py-1">
                  {/* Top Bar: Brand, Category, Actions */}
                  <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      {product.brand && (
                        <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
                          {product.brand}
                        </span>
                      )}
                      {product.brand && product.category && (
                        <span className="text-neutral-500 text-xs">•</span>
                      )}
                      {product.category && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/products?category=${product.category.toLowerCase()}`}
                            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-300 hover:text-white hover:border-white/30 transition-colors"
                          >
                            {getCategoryLabel(product.category)}
                          </Link>
                          {product.department && (
                            <>
                              <span className="text-neutral-500 text-xs">/</span>
                              <Link
                                to={`/products?category=${product.category.toLowerCase()}&department=${product.department.toLowerCase()}`}
                                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-300 hover:text-white hover:border-white/30 transition-colors"
                              >
                                {getDepartmentLabel(product.category, product.department)}
                              </Link>
                            </>
                          )}
                          {product.subcategory && (
                            <>
                              <span className="text-neutral-500 text-xs">/</span>
                              <Link
                                to={`/products?category=${product.category.toLowerCase()}&department=${product.department.toLowerCase()}&subcategory=${product.subcategory.toLowerCase()}`}
                                className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-purple-200 hover:text-white hover:border-purple-500/50 transition-colors"
                              >
                                {getSubcategoryLabel(product.category, product.department, product.subcategory)}
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Wishlist & Share Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Wishlist Action */}
                      <button
                        type="button"
                        onClick={handleWishlist}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-pressed={isInWishlist}
                        className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                          isInWishlist
                            ? 'bg-rose-500/15 border-rose-400/40 text-rose-400'
                            : 'border-white/15 bg-white/5 text-neutral-300 hover:text-rose-400 hover:border-rose-400/30'
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          fill={isInWishlist ? 'currentColor' : 'none'}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                          />
                        </svg>
                      </button>

                      {/* Share Action */}
                      <button
                        type="button"
                        onClick={handleShare}
                        aria-label="Share product"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-neutral-300 hover:text-white hover:border-white/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Temporary Notification Banner for Wishlist / Share */}
                  {(shareFeedback || wishlistFeedback) && (
                    <div className="mb-4 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-medium text-purple-200 animate-fade-in">
                      {shareFeedback || wishlistFeedback}
                    </div>
                  )}

                  {/* Product Title */}
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                    {product.name}
                  </h1>

                  {/* Price & Stock Status Bar */}
                  <div className="mt-5 flex flex-wrap items-baseline gap-4">
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </span>

                    {/* Stock Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-md ${
                        isAvailable
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-300 border border-red-500/30'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAvailable ? 'bg-emerald-400' : 'bg-red-400'
                        }`}
                        aria-hidden="true"
                      />
                      {isAvailable ? 'In Stock' : 'Out of Stock'}
                    </span>

                    {/* Low Stock Warning if useful */}
                    {isAvailable && product.stock <= 5 && (
                      <span className="text-xs text-amber-400 font-medium">
                        Only {product.stock} left in stock
                      </span>
                    )}
                  </div>

                  {/* Short Product Description (Directly beneath Price & Stock) */}
                  {product.description && product.description.trim().length > 0 && (
                    <p className="mt-4 sm:mt-5 text-sm sm:text-base text-neutral-300 leading-relaxed max-w-prose">
                      {product.description}
                    </p>
                  )}

                  {/* Clean Visual Separator */}
                  <hr className="my-6 sm:my-7 border-t border-white/10" />

                  {/* -----------------------------------------------------------------
                      PURCHASE CONTROLS
                     ----------------------------------------------------------------- */}
                  <div className="space-y-6">
                    {/* Quantity Selector */}
                    <div>
                      <label
                        htmlFor="quantity-input"
                        className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5"
                      >
                        Quantity
                      </label>
                      <div className="inline-flex items-center rounded-full border border-white/20 bg-neutral-950 p-1">
                        <button
                          type="button"
                          onClick={handleDecrement}
                          disabled={!isAvailable || quantity <= 1}
                          aria-label="Decrease quantity"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                          </svg>
                        </button>

                        <span
                          id="quantity-input"
                          aria-live="polite"
                          className="w-12 text-center text-sm font-bold text-white select-none"
                        >
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={handleIncrement}
                          disabled={!isAvailable || quantity >= maxAllowedQuantity}
                          aria-label="Increase quantity"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4.5v15m7.5-7.5h-15"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Cart Feedback Alerts */}
                    {cartSuccessMessage && (
                      <div
                        role="status"
                        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-300 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 shrink-0 text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                          <span>{cartSuccessMessage}</span>
                        </div>
                        <Link
                          to="/cart"
                          className="font-bold underline underline-offset-2 hover:text-white shrink-0"
                        >
                          View Cart →
                        </Link>
                      </div>
                    )}

                    {cartErrorMessage && (
                      <div
                        role="alert"
                        className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-300 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4 shrink-0 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                            />
                          </svg>
                          <span>{cartErrorMessage}</span>
                        </div>
                        {!isAuthenticated && (
                          <Link
                            to="/login"
                            className="font-bold underline underline-offset-2 hover:text-white shrink-0"
                          >
                            Sign In →
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Action Buttons: Add to Cart (Primary) & Buy Now (Secondary) */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                      {/* Add to Cart - Primary Action */}
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!isAvailable || addingToCart}
                        className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-950 transition-all duration-300 hover:bg-neutral-200 active:scale-97 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-xl hover:shadow-white/10"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                          />
                        </svg>
                        <span>{addingToCart ? 'Adding...' : 'Add to Cart'}</span>
                      </button>

                      {/* Buy Now - Secondary Action */}
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        disabled={!isAvailable || addingToCart}
                        className="flex-1 min-h-[48px] inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 hover:bg-white/15 text-white px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 active:scale-97 disabled:opacity-40 disabled:hover:bg-white/10 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* =====================================================================
                7. RELATED PRODUCTS
               ===================================================================== */}
            {!relatedLoading && relatedProducts.length > 0 && (
              <section aria-labelledby="related-heading" className="pt-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2
                      id="related-heading"
                      className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white"
                    >
                      Related Products
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                      More curated items from our {product.category || 'catalog'} collection.
                    </p>
                  </div>
                  <Link
                    to={`/products?category=${product.category?.toLowerCase() || ''}`}
                    className="text-xs font-semibold text-purple-300 hover:text-white transition-colors"
                  >
                    View Department →
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  {relatedProducts.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductDetailsPage
