import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import RecentlyViewed from '../components/RecentlyViewed'
import ProductReviews from '../components/ProductReviews'
import Eyebrow from '../components/Eyebrow'
import SEO from '../components/SEO'
import CountdownTimer from '../components/CountdownTimer'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import { addToCart } from '../features/cart/cartSlice'
import {
  addToWishlist,
  removeFromWishlist,
  selectIsInWishlist,
} from '../features/wishlist/wishlistSlice'
import { Sparkles, ShoppingBag } from 'lucide-react'
import api from '../services/api'
import {
  getCategoryLabel,
  getDepartmentLabel,
  getSubcategoryLabel,
} from '../constants/taxonomy'
import { determineProductWardrobeSlot } from '../constants/wardrobeConstants'
import { getProductImage } from '../utils/productImageMap'
import { isProductTryOnActive } from '../utils/garmentAssetResolver'
import { addRecentlyViewedId } from '../utils/recentlyViewed'
import SizeGuideModal from '../components/SizeGuideModal'
import SizeRecommendationModal from '../components/SizeRecommendationModal'
import { getProductSizeCategory } from '../constants/sizeCharts'

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

  // Image error state
  const [imageError, setImageError] = useState(false)

  // Purchase states
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartSuccessMessage, setCartSuccessMessage] = useState(null)
  const [cartErrorMessage, setCartErrorMessage] = useState(null)

  // Size Guide & Recommendation states
  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [sizeRecommendOpen, setSizeRecommendOpen] = useState(false)
  const [sizeError, setSizeError] = useState(null)

  // Back-in-Stock Alert states
  const [alertSubscribed, setAlertSubscribed] = useState(false)
  const [alertId, setAlertId] = useState(null)
  const [alertLoading, setAlertLoading] = useState(false)
  const [alertFeedback, setAlertFeedback] = useState(null)
  const [alertError, setAlertError] = useState(null)

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
      setImageError(false)
      setQuantity(1)
      setSelectedSize(null)
      setSizeError(null)
      setCartSuccessMessage(null)
      setCartErrorMessage(null)
      setAlertSubscribed(false)
      setAlertId(null)
      setAlertLoading(false)
      setAlertFeedback(null)
      setAlertError(null)

      try {
        const response = await api.get(`/products/${id}`)
        if (isMounted) {
          if (response.data?.success && response.data.product) {
            setProduct(response.data.product)
            addRecentlyViewedId(response.data.product._id)
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

  // Check alert subscription status for currently selected product / size
  useEffect(() => {
    let isMounted = true

    const checkAlertStatus = async () => {
      if (!isAuthenticated || !product?._id) {
        setAlertSubscribed(false)
        setAlertId(null)
        return
      }

      const currentSelectedSizeObj = Array.isArray(product.sizes) && selectedSize
        ? product.sizes.find((s) => s.label.toLowerCase() === selectedSize.toLowerCase())
        : null

      const isSizeOut = Boolean(currentSelectedSizeObj && currentSelectedSizeObj.available === false)
      const isProductOut = (!product.sizes || product.sizes.length === 0) && (product.stock ?? 0) <= 0

      if (!isSizeOut && !isProductOut) {
        setAlertSubscribed(false)
        setAlertId(null)
        return
      }

      try {
        const params = { productId: product._id }
        if (selectedSize) {
          params.size = selectedSize
        }
        const response = await api.get('/stock-alerts/status', { params })
        if (isMounted && response.data?.success) {
          setAlertSubscribed(Boolean(response.data.isSubscribed))
          setAlertId(response.data.alertId || null)
          if (response.data.isSubscribed) {
            setAlertFeedback(
              selectedSize
                ? `You'll be notified when size ${selectedSize} is back in stock.`
                : "You're on the alert list."
            )
          }
        }
      } catch {
        if (isMounted) {
          setAlertSubscribed(false)
          setAlertId(null)
        }
      }
    }

    checkAlertStatus()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, product?._id, product?.stock, product?.sizes, selectedSize])

  // Canonical product image via getProductImage
  const displayImage = getProductImage(product)
  const isAvailable = (product?.stock ?? 0) > 0
  const maxAllowedQuantity = Math.max(1, product?.stock ?? 1)

  const sizeCategory = getProductSizeCategory(product?.department, product?.subcategory)
  const hasConfiguredSizes = Array.isArray(product?.sizes) && product.sizes.length > 0
  const supportsSizing = Boolean(sizeCategory || hasConfiguredSizes)

  // Derived stock & alert eligibility
  const selectedSizeObj = hasConfiguredSizes && selectedSize
    ? product.sizes.find((s) => s.label.toLowerCase() === selectedSize.toLowerCase())
    : null
  const isSelectedSizeOutOfStock = Boolean(selectedSizeObj && selectedSizeObj.available === false)
  const isProductOutOfStock = Boolean(product) && !hasConfiguredSizes && (product?.stock ?? 0) <= 0
  const isCurrentSelectionOutOfStock = Boolean(product) && (isSelectedSizeOutOfStock || isProductOutOfStock)

  // Quantity controls
  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(maxAllowedQuantity, prev + 1))
  }

  // Subscribe to Back-in-Stock Alert
  const handleSubscribeAlert = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!product?._id) return

    setAlertLoading(true)
    setAlertError(null)
    setAlertFeedback(null)

    try {
      const payload = { productId: product._id }
      if (selectedSize) {
        payload.size = selectedSize
      }

      const response = await api.post('/stock-alerts', payload)
      if (response.data?.success) {
        setAlertSubscribed(true)
        if (response.data.alert?._id) {
          setAlertId(response.data.alert._id)
        }
        const msg = selectedSize
          ? `You'll be notified when size ${selectedSize} is back in stock.`
          : "You're on the alert list."
        setAlertFeedback(msg)
      } else {
        setAlertError(response.data?.message || 'Could not subscribe to alerts.')
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Could not subscribe to alerts. Please try again.'
      setAlertError(errMsg)
    } finally {
      setAlertLoading(false)
    }
  }

  // Cancel active Back-in-Stock Alert
  const handleCancelAlert = async () => {
    if (!isAuthenticated || !alertId) return

    setAlertLoading(true)
    setAlertError(null)
    setAlertFeedback(null)

    try {
      const response = await api.delete(`/stock-alerts/${alertId}`)
      if (response.data?.success) {
        setAlertSubscribed(false)
        setAlertId(null)
        setAlertFeedback('Alert cancelled.')
        setTimeout(() => setAlertFeedback(null), 3000)
      } else {
        setAlertError(response.data?.message || 'Could not cancel alert.')
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Could not cancel alert. Please try again.'
      setAlertError(errMsg)
    } finally {
      setAlertLoading(false)
    }
  }

  // Add to Cart workflow
  const handleAddToCart = async () => {
    setCartSuccessMessage(null)
    setCartErrorMessage(null)
    setSizeError(null)

    if (!isAvailable || isCurrentSelectionOutOfStock) {
      setCartErrorMessage(
        isSelectedSizeOutOfStock
          ? `Size ${selectedSize} is currently out of stock.`
          : 'This item is currently out of stock.'
      )
      return
    }

    const hasSizes = Array.isArray(product?.sizes) && product.sizes.length > 0
    if (hasSizes && !selectedSize) {
      setSizeError('Please select a size before adding to your bag.')
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
          size: selectedSize || null,
        })
      )

      if (addToCart.fulfilled.match(actionResult)) {
        setCartSuccessMessage(
          `Added ${quantity} ${quantity === 1 ? 'item' : 'items'} ${selectedSize ? `(Size ${selectedSize}) ` : ''}to your cart.`
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
    if (!isAvailable || isCurrentSelectionOutOfStock) return
    setSizeError(null)

    const hasSizes = Array.isArray(product?.sizes) && product.sizes.length > 0
    if (hasSizes && !selectedSize) {
      setSizeError('Please select a size before proceeding to checkout.')
      return
    }

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
          size: selectedSize || null,
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
    setImageError(false)
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

  const seoConfig = useMemo(() => {
    if (isNotFound) {
      return {
        title: 'Product Not Found',
        description: 'The requested fashion piece could not be found in our catalog.',
        noindex: true,
      }
    }
    if (error) {
      return {
        title: 'Product Unavailable',
        description: 'Unable to load product details from the TrendVolt catalog.',
        noindex: true,
      }
    }
    if (loading && !product) {
      return {
        title: 'Loading Product...',
        description: 'Loading curated product details from TrendVolt atelier.',
        noindex: true,
      }
    }
    if (product) {
      return {
        title: product.name,
        description: product.description || `Discover ${product.name} at TrendVolt.`,
        canonical: `/products/${product._id || id}`,
        ogTitle: product.name,
        ogDescription: product.description || `Discover ${product.name} at TrendVolt.`,
        ogType: 'product',
        ogImage: displayImage,
        twitterImage: displayImage,
        noindex: false,
      }
    }
    return {
      title: 'Product',
      noindex: true,
    }
  }, [isNotFound, error, loading, product, id, displayImage])

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
      <SEO {...seoConfig} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. BREADCRUMBS & BACK LINK
           ========================================================================= */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#5F6057]"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-[#1F211C] transition-colors">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#DED7CA]">/</span>
            <Link to="/products" className="hover:text-[#1F211C] transition-colors">
              Shop
            </Link>
            {product?.category && (
              <>
                <span aria-hidden="true" className="text-[#DED7CA]">/</span>
                <Link
                  to={`/products?category=${product.category.toLowerCase()}`}
                  className="hover:text-[#1F211C] capitalize transition-colors"
                >
                  {getCategoryLabel(product.category)}
                </Link>
              </>
            )}
            {product?.department && (
              <>
                <span aria-hidden="true" className="text-[#DED7CA]">/</span>
                <Link
                  to={`/products?category=${product.category.toLowerCase()}&department=${product.department.toLowerCase()}`}
                  className="hover:text-[#1F211C] capitalize transition-colors"
                >
                  {getDepartmentLabel(product.category, product.department)}
                </Link>
              </>
            )}
            {product?.subcategory && (
              <>
                <span aria-hidden="true" className="text-[#DED7CA]">/</span>
                <Link
                  to={`/products?category=${product.category.toLowerCase()}&department=${product.department.toLowerCase()}&subcategory=${product.subcategory.toLowerCase()}`}
                  className="hover:text-[#1F211C] capitalize transition-colors text-[#A65332]"
                >
                  {getSubcategoryLabel(product.category, product.department, product.subcategory)}
                </Link>
              </>
            )}
            {product?.name && (
              <>
                <span aria-hidden="true" className="text-[#DED7CA]">/</span>
                <span className="text-[#1F211C] font-semibold truncate max-w-[200px] sm:max-w-xs">
                  {product.name}
                </span>
              </>
            )}
          </div>

          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34452F] hover:text-[#263722] transition-colors"
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
            className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 lg:p-12 shadow-xs animate-pulse"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              {/* Product Image Skeleton */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="aspect-[4/5] sm:aspect-square w-full rounded-xl bg-[#EEE7DC]" />
              </div>

              {/* Information Skeleton */}
              <div className="lg:col-span-6 flex flex-col py-2">
                <div className="h-4 w-24 rounded bg-[#EEE7DC] mb-4" />
                <div className="h-8 w-4/5 rounded bg-[#EEE7DC] mb-4" />
                <div className="h-6 w-32 rounded bg-[#EEE7DC] mb-6" />
                <div className="space-y-2 mb-8">
                  <div className="h-4 w-full rounded bg-[#EEE7DC]" />
                  <div className="h-4 w-5/6 rounded bg-[#EEE7DC]" />
                  <div className="h-4 w-4/6 rounded bg-[#EEE7DC]" />
                </div>
                <div className="space-y-4 pt-6 border-t border-[#DED7CA]">
                  <div className="h-11 w-32 rounded-lg bg-[#EEE7DC]" />
                  <div className="flex gap-3">
                    <div className="h-12 flex-1 rounded-xl bg-[#EEE7DC]" />
                    <div className="h-12 flex-1 rounded-xl bg-[#EEE7DC]" />
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
            className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-8 sm:p-14 text-center max-w-xl mx-auto my-12 shadow-xs"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#34452F]/10 text-[#34452F] mb-4 border border-[#34452F]/20">
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
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] mb-2">Product Not Found</h1>
            <p className="text-sm text-[#5F6057] mb-8 max-w-sm mx-auto">
              The product you are searching for might have been moved, is currently inactive, or
              does not exist in our catalog.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-xl bg-[#34452F] px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] transition-all hover:bg-[#263722] active:scale-95 shadow-xs"
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
            className="rounded-2xl border border-[#A65332]/30 bg-[#FFFDF8] p-8 sm:p-14 text-center max-w-xl mx-auto my-12 shadow-xs"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#A65332]/10 text-[#A65332] mb-4 border border-[#A65332]/30">
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
            <h2 className="font-serif text-2xl font-bold text-[#1F211C] mb-2">Unable to Load Product</h2>
            <p className="text-sm text-[#5F6057] mb-8">{error}</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleRetry}
                className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-[#34452F] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] transition-all hover:bg-[#263722] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                Retry
              </button>
              <Link
                to="/products"
                className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#1F211C] transition-all hover:bg-[#EEE7DC]"
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
            <article className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 lg:p-12 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
                {/* -------------------------------------------------------------------
                    LEFT: SINGLE CANONICAL PRODUCT IMAGE
                   ------------------------------------------------------------------- */}
                <div className="lg:col-span-6 flex flex-col">
                  {/* Main Display Surface */}
                  <div className="relative aspect-[4/5] sm:aspect-square w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] overflow-hidden flex items-center justify-center p-6 sm:p-8">
                    {displayImage && !imageError ? (
                      <img
                        src={displayImage}
                        alt={product.name}
                        onError={() => setImageError(true)}
                        className="h-full w-full object-contain select-none transition-transform duration-500 ease-out hover:scale-105"
                      />
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center text-[#85857A]"
                        aria-label="No image available"
                      >
                        <svg
                          className="h-16 w-16 text-[#85857A] mb-2"
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
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#85857A]">
                          No Image Available
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* -------------------------------------------------------------------
                    RIGHT: PRODUCT INFORMATION & PURCHASE
                   ------------------------------------------------------------------- */}
                <div className="lg:col-span-6 flex flex-col py-1">
                  {/* Top Bar: Brand, Category, Actions */}
                  <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      {product.brand && (
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#A65332]">
                          {product.brand}
                        </span>
                      )}
                      {product.brand && product.category && (
                        <span className="text-[#DED7CA] text-xs">•</span>
                      )}
                      {product.category && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/products?category=${product.category.toLowerCase()}`}
                            className="rounded-full border border-[#DED7CA] bg-[#FAF7F0] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F6057] hover:text-[#1F211C] hover:border-[#85857A] transition-colors"
                          >
                            {getCategoryLabel(product.category)}
                          </Link>
                          {product.department && (
                            <>
                              <span className="text-[#DED7CA] text-xs">/</span>
                              <Link
                                to={`/products?category=${product.category.toLowerCase()}&department=${product.department.toLowerCase()}`}
                                className="rounded-full border border-[#DED7CA] bg-[#FAF7F0] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F6057] hover:text-[#1F211C] hover:border-[#85857A] transition-colors"
                              >
                                {getDepartmentLabel(product.category, product.department)}
                              </Link>
                            </>
                          )}
                          {product.subcategory && (
                            <>
                              <span className="text-[#DED7CA] text-xs">/</span>
                              <Link
                                to={`/products?category=${product.category.toLowerCase()}&department=${product.department.toLowerCase()}&subcategory=${product.subcategory.toLowerCase()}`}
                                className="rounded-full border border-[#34452F]/25 bg-[#34452F]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#34452F] hover:bg-[#34452F]/20 transition-colors"
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
                        className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A65332] ${
                          isInWishlist
                            ? 'bg-[#A65332] border-[#A65332] text-white shadow-xs'
                            : 'border-[#DED7CA] bg-[#FAF7F0] text-[#5F6057] hover:text-[#A65332] hover:border-[#A65332]/40'
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
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border border-[#DED7CA] bg-[#FAF7F0] text-[#5F6057] hover:text-[#1F211C] hover:border-[#85857A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
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
                    <div className="mb-4 rounded-xl border border-[#34452F]/25 bg-[#34452F]/10 px-3.5 py-2 text-xs font-medium text-[#34452F] animate-fade-in">
                      {shareFeedback || wishlistFeedback}
                    </div>
                  )}

                  {/* Product Title */}
                  <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1F211C] tracking-tight leading-tight">
                    {product.name}
                  </h1>

                  {/* Rating Indicator */}
                  {product.numReviews > 0 ? (
                    <a
                      href="#reviews"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-[#5F6057] hover:text-[#34452F] transition-colors"
                    >
                      <span className="text-[#D97706]" aria-hidden="true">★</span>
                      <span className="font-semibold text-[#1F211C]">{Number(product.averageRating).toFixed(1)}</span>
                      <span className="underline">({product.numReviews} review{product.numReviews > 1 ? 's' : ''})</span>
                    </a>
                  ) : (
                    <a
                      href="#reviews"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-[#85857A] hover:text-[#34452F] transition-colors"
                    >
                      <span>No reviews yet</span>
                      <span className="text-[#DED7CA]">·</span>
                      <span className="underline">Write a review</span>
                    </a>
                  )}

                  {/* Flash Sale Banner & Countdown */}
                  {product.isFlashSale && product.flashSale && (
                    <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-linear-to-r from-[#A65332]/10 via-[#FFFDF8] to-[#A65332]/10 border border-[#A65332]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A65332] text-white text-xs font-bold shadow-xs">
                          ⚡
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[#A65332]">
                            {product.flashSale.name || 'Flash Sale'}
                          </p>
                          <p className="text-[11px] text-[#5F6057]">Limited time offer on select pieces</p>
                        </div>
                      </div>
                      {product.flashSale.endAt && (
                        <CountdownTimer
                          targetDate={product.flashSale.endAt}
                          label="Ends in"
                          onExpire={handleRetry}
                        />
                      )}
                    </div>
                  )}

                  {/* Upcoming Flash Sale Notice */}
                  {!product.isFlashSale && product.upcomingFlashSale && (
                    <div className="mt-4 p-3 sm:p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[#85857A] font-bold">Upcoming Sale:</span>
                        <span className="font-semibold text-[#1F211C]">{product.upcomingFlashSale.name}</span>
                        <span className="bg-[#A65332]/10 text-[#A65332] px-2 py-0.5 rounded-full font-bold font-mono">
                          {product.upcomingFlashSale.discountPercentage}% OFF
                        </span>
                      </div>
                      <CountdownTimer
                        targetDate={product.upcomingFlashSale.startAt}
                        label="Starts in"
                        onExpire={handleRetry}
                        compact
                      />
                    </div>
                  )}

                  {/* Price & Stock Status Bar */}
                  <div className="mt-5 flex flex-wrap items-baseline gap-4">
                    {product.isFlashSale && product.originalPrice ? (
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="font-serif text-3xl sm:text-4xl font-extrabold text-[#A65332] tracking-tight">
                          ₹{Number(product.price).toLocaleString('en-IN')}
                        </span>
                        <span className="font-serif text-xl sm:text-2xl text-[#85857A] line-through font-normal">
                          ₹{Number(product.originalPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[#A65332]/10 border border-[#A65332]/25 px-2.5 py-0.5 text-xs font-bold text-[#A65332] font-mono">
                          {product.discountPercentage}% OFF
                        </span>
                      </div>
                    ) : (
                      <span className="font-serif text-3xl sm:text-4xl font-extrabold text-[#1F211C] tracking-tight">
                        ₹{Number(product.price).toLocaleString('en-IN')}
                      </span>
                    )}

                    {/* Stock Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
                        isAvailable
                          ? 'bg-[#3F6B45]/10 text-[#3F6B45] border border-[#3F6B45]/30'
                          : 'bg-[#B7473A]/10 text-[#B7473A] border border-[#B7473A]/30'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isAvailable ? 'bg-[#3F6B45]' : 'bg-[#B7473A]'
                        }`}
                        aria-hidden="true"
                      />
                      {isAvailable ? 'In Stock' : 'Out of Stock'}
                    </span>

                    {/* Low Stock Warning if useful */}
                    {isAvailable && product.stock <= 5 && (
                      <span className="text-xs text-[#A86B2D] font-medium">
                        Only {product.stock} left in stock
                      </span>
                    )}
                  </div>

                  {/* Short Product Description (Directly beneath Price & Stock) */}
                  {product.description && product.description.trim().length > 0 && (
                    <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[#5F6057] leading-relaxed max-w-prose">
                      {product.description}
                    </p>
                  )}

                  {/* Clean Visual Separator */}
                  <hr className="my-6 sm:my-7 border-t border-[#DED7CA]" />

                  {/* -----------------------------------------------------------------
                      PURCHASE CONTROLS
                     ----------------------------------------------------------------- */}
                  <div className="space-y-6">
                    {/* Size Selector & Size Guide */}
                    {supportsSizing && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#5F6057]">
                              Select Size
                            </span>
                            {selectedSize && (
                              <span
                                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                                  isSelectedSizeOutOfStock
                                    ? 'text-[#B7473A] bg-[#B7473A]/10 border border-[#B7473A]/30'
                                    : 'text-[#34452F] bg-[#34452F]/10'
                                }`}
                              >
                                {selectedSize} {isSelectedSizeOutOfStock ? '(Out of Stock)' : ''}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => setSizeGuideOpen(true)}
                              className="inline-flex items-center gap-1.5 font-semibold text-[#34452F] hover:text-[#263722] hover:underline transition-colors cursor-pointer"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                              </svg>
                              <span>Size Guide</span>
                            </button>

                            <span className="text-[#DED7CA]">|</span>

                            <button
                              type="button"
                              onClick={() => setSizeRecommendOpen(true)}
                              className="inline-flex items-center gap-1.5 font-semibold text-[#A65332] hover:text-[#8b4226] hover:underline transition-colors cursor-pointer"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                              </svg>
                              <span>Find My Size</span>
                            </button>

                            {product?.tryOn?.enabled && isProductTryOnActive(product) && (
                              <>
                                <span className="text-[#DED7CA]">|</span>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/try-on/${product._id}`)}
                                  className="inline-flex items-center gap-1.5 font-semibold text-[#34452F] hover:text-[#263722] hover:underline transition-colors cursor-pointer"
                                >
                                  <Sparkles className="h-3.5 w-3.5 text-[#A65332]" />
                                  <span>3D Try-On</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Size pills if product has configured sizes */}
                        {hasConfiguredSizes ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {product.sizes.map((s) => {
                              const isOutOfStock = s.available === false
                              const isSelected = selectedSize === s.label
                              return (
                                <button
                                  key={s.label}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSize(s.label)
                                    setSizeError(null)
                                    setAlertFeedback(null)
                                    setAlertError(null)
                                  }}
                                  className={`min-w-[44px] h-10 px-3.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border flex items-center justify-center gap-1.5 relative ${
                                    isSelected
                                      ? isOutOfStock
                                        ? 'border-[#A65332] bg-[#A65332] text-[#FFFDF8] shadow-2xs ring-2 ring-[#A65332]/30'
                                        : 'border-[#34452F] bg-[#34452F] text-[#FFFDF8] shadow-2xs ring-2 ring-[#34452F]/30'
                                      : isOutOfStock
                                      ? 'border-[#DED7CA] bg-[#FAF7F0]/80 text-[#85857A] hover:border-[#A65332]/60 hover:text-[#1F211C]'
                                      : 'border-[#DED7CA] bg-[#FAF7F0] text-[#1F211C] hover:border-[#85857A] hover:bg-[#EEE7DC]'
                                  }`}
                                  title={isOutOfStock ? `${s.label} - Out of stock (Click to request alert)` : `${s.label} - In stock`}
                                >
                                  <span>{s.label}</span>
                                  {isOutOfStock && (
                                    <span
                                      className={`text-[9px] font-sans font-semibold uppercase px-1 py-0.5 rounded leading-none ${
                                        isSelected
                                          ? 'bg-white/25 text-[#FFFDF8]'
                                          : 'bg-[#B7473A]/10 text-[#B7473A]'
                                      }`}
                                    >
                                      Out
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[#5F6057] italic">
                            Standard sizing reference available in Size Guide above.
                          </p>
                        )}

                        {sizeError && (
                          <p className="text-xs font-medium text-[#A65332]" role="alert">
                            {sizeError}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Back-in-Stock Alert UI for Out of Stock Selection */}
                    {isCurrentSelectionOutOfStock ? (
                      <div className="rounded-2xl border border-[#DED7CA] bg-[#FAF7F0] p-5 sm:p-6 space-y-4 shadow-xs">
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#A65332]/10 text-[#A65332] border border-[#A65332]/20">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-serif text-base font-bold text-[#1F211C]">
                              Back-in-Stock Alert
                            </h3>
                            <p className="mt-0.5 text-xs text-[#5F6057] leading-relaxed">
                              {isSelectedSizeOutOfStock
                                ? `Size ${selectedSize} is currently unavailable. Request an alert to know when it restocks.`
                                : 'This piece is currently out of stock. Subscribe to receive an alert the moment it returns.'}
                            </p>
                          </div>
                        </div>

                        {/* Alert Feedback Banner */}
                        {alertFeedback && (
                          <div
                            role="status"
                            className="rounded-xl border border-[#3F6B45]/30 bg-[#3F6B45]/10 p-3.5 text-xs font-medium text-[#3F6B45] flex items-center gap-2"
                          >
                            <svg className="h-4 w-4 shrink-0 text-[#3F6B45]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>{alertFeedback}</span>
                          </div>
                        )}

                        {/* Alert Error Banner */}
                        {alertError && (
                          <div
                            role="alert"
                            className="rounded-xl border border-[#B7473A]/30 bg-[#B7473A]/10 p-3.5 text-xs font-medium text-[#B7473A] flex items-center gap-2"
                          >
                            <svg className="h-4 w-4 shrink-0 text-[#B7473A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <span>{alertError}</span>
                          </div>
                        )}

                        {/* Actions */}
                        {isAuthenticated ? (
                          alertSubscribed ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                              <div className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#3F6B45]/30 bg-[#3F6B45]/10 px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#3F6B45]">
                                <span className="h-2 w-2 rounded-full bg-[#3F6B45] animate-pulse" aria-hidden="true" />
                                <span>Alert Active</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleCancelAlert}
                                disabled={alertLoading}
                                className="min-h-[46px] inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#EEE7DC] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#5F6057] hover:text-[#1F211C] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {alertLoading ? 'Cancelling...' : 'Cancel Alert'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSubscribeAlert}
                              disabled={alertLoading}
                              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#34452F] hover:bg-[#263722] px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all duration-300 active:scale-97 disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                              </svg>
                              <span>
                                {alertLoading
                                  ? 'Subscribing...'
                                  : isSelectedSizeOutOfStock
                                  ? `Notify Me When Size ${selectedSize} Is Back`
                                  : 'Notify Me When Available'}
                              </span>
                            </button>
                          )
                        ) : (
                          <div className="pt-1">
                            <Link
                              to="/login"
                              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all duration-300 shadow-xs"
                            >
                              <span>
                                {isSelectedSizeOutOfStock
                                  ? `Sign In to Get Notified for Size ${selectedSize}`
                                  : 'Sign In to Get Notified When Available'}
                              </span>
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Quantity Selector */}
                        <div>
                          <label
                            htmlFor="quantity-input"
                            className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-2.5"
                          >
                            Quantity
                          </label>
                          <div className="inline-flex items-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] p-1">
                            <button
                              type="button"
                              onClick={handleDecrement}
                              disabled={!isAvailable || quantity <= 1}
                              aria-label="Decrease quantity"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1F211C] hover:bg-[#EEE7DC] transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
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
                              className="w-12 text-center text-sm font-bold text-[#1F211C] select-none"
                            >
                              {quantity}
                            </span>

                            <button
                              type="button"
                              onClick={handleIncrement}
                              disabled={!isAvailable || quantity >= maxAllowedQuantity}
                              aria-label="Increase quantity"
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#1F211C] hover:bg-[#EEE7DC] transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
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
                            className="rounded-xl border border-[#3F6B45]/30 bg-[#3F6B45]/10 p-4 text-xs font-medium text-[#3F6B45] flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 shrink-0 text-[#3F6B45]"
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
                              className="font-bold underline underline-offset-2 hover:text-[#263722] shrink-0"
                            >
                              View Cart →
                            </Link>
                          </div>
                        )}

                        {cartErrorMessage && (
                          <div
                            role="alert"
                            className="rounded-xl border border-[#B7473A]/30 bg-[#B7473A]/10 p-4 text-xs font-medium text-[#B7473A] flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 shrink-0 text-[#B7473A]"
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
                                className="font-bold underline underline-offset-2 hover:text-[#1F211C] shrink-0"
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
                            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#34452F] hover:bg-[#263722] px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all duration-300 active:scale-97 disabled:opacity-40 disabled:hover:bg-[#34452F] disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] shadow-xs"
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
                            className="flex-1 min-h-[48px] inline-flex items-center justify-center rounded-xl border border-[#34452F] bg-transparent hover:bg-[#34452F]/10 text-[#34452F] px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 active:scale-97 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                          >
                            Buy Now
                          </button>
                        </div>

                        {/* 3D Avatar Try-On & Virtual Wardrobe CTAs */}
                        {((product?.tryOn?.enabled && isProductTryOnActive(product)) || determineProductWardrobeSlot(product)) && (
                          <div className="pt-2 space-y-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/try-on/${product._id}`)}
                              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 rounded-xl border-2 border-[#34452F] bg-[#34452F]/5 hover:bg-[#34452F] text-[#34452F] hover:text-[#FFFDF8] px-6 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-xs group"
                            >
                              <Sparkles className="h-4 w-4 text-[#A65332] group-hover:text-[#FFFDF8] transition-colors" />
                              <span>Try On Your 3D Avatar</span>
                              <span className="text-[10px] font-mono font-bold lowercase px-2 py-0.5 rounded-full bg-[#34452F]/10 group-hover:bg-white/20 text-[#34452F] group-hover:text-white transition-colors">
                                preview
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/avatar/wardrobe?selectProduct=${product._id}`)}
                              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              <ShoppingBag className="h-3.5 w-3.5 text-[#34452F]" />
                              <span>Style in Virtual Wardrobe</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>

            {/* =====================================================================
                6.5. PRODUCT REVIEWS & RATINGS
               ===================================================================== */}
            <ProductReviews productId={product._id} productName={product.name} />

            {/* =====================================================================
                7. RELATED PRODUCTS
               ===================================================================== */}
            {!relatedLoading && relatedProducts.length > 0 && (
              <section aria-labelledby="related-heading" className="pt-6">
                <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <Eyebrow variant="olive">CURATED SUGGESTIONS</Eyebrow>
                    <h2
                      id="related-heading"
                      className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#1F211C] mt-1"
                    >
                      Related Products
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5F6057] mt-1">
                      More curated items from our {product.category || 'catalog'} collection.
                    </p>
                  </div>
                  <Link
                    to={`/products?category=${product.category?.toLowerCase() || ''}`}
                    className="text-xs font-bold uppercase tracking-wider text-[#34452F] hover:text-[#263722] transition-colors shrink-0"
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

            {/* =====================================================================
                8. RECENTLY VIEWED PRODUCTS
               ===================================================================== */}
            <RecentlyViewed currentProductId={product._id} />
          </div>
        )}
      </div>

      {/* Modals for Size Guide & Deterministic Recommendation */}
      <SizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        initialDepartment={product?.department}
        initialSubcategory={product?.subcategory}
      />
      <SizeRecommendationModal
        isOpen={sizeRecommendOpen}
        onClose={() => setSizeRecommendOpen(false)}
        product={product}
        onSelectSize={(size) => {
          setSelectedSize(size)
          setSizeError(null)
        }}
        onOpenSizeGuide={() => setSizeGuideOpen(true)}
      />
    </div>
  )
}

export default ProductDetailsPage
