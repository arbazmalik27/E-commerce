import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, ShoppingBag, Check } from 'lucide-react'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import { addToCart } from '../features/cart/cartSlice'
import {
  addToWishlist,
  removeFromWishlist,
  selectIsInWishlist,
} from '../features/wishlist/wishlistSlice'
import { getHomepageProductImage } from '../utils/productImageMap'

function ProductCard({
  product,
  showAddToCart = false,
  isFeatured = false,
  showDescription = false,
  variant = 'default',
  className = '',
  useHomepageImageMapping = false,
}) {
  const [imageError, setImageError] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addFeedback, setAddFeedback] = useState(null) // 'success' | 'error' | null

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isInWishlist = useSelector(selectIsInWishlist(product._id))
  const [wishlistBusy, setWishlistBusy] = useState(false)

  const displayImage = useHomepageImageMapping
    ? getHomepageProductImage(product)
    : (Array.isArray(product.images) && product.images.length > 0 && typeof product.images[0] === 'string' && product.images[0].trim().length > 0 ? product.images[0] : null)

  const hasImage = Boolean(displayImage) && !imageError

  const isAvailable = product.stock > 0

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

  const handleWishlistToggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (wishlistBusy) return
    setWishlistBusy(true)
    try {
      if (isInWishlist) {
        await dispatch(removeFromWishlist(product._id))
      } else {
        await dispatch(addToWishlist(product._id))
      }
    } finally {
      setWishlistBusy(false)
    }
  }

  // Lookbook / Editorial Variant
  if (variant === 'lookbook') {
    return (
      <article
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-3 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#34452F] hover:shadow-md text-[#1F211C] ${className}`}
      >
        {/* Top Portrait Image Frame (4:5 Editorial Ratio) */}
        <Link
          to={`/products/${product._id}`}
          aria-label={`View details for ${product.name}`}
          className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#EEE7DC] block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
        >
          {hasImage ? (
            <img
              src={displayImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              width={280}
              height={350}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 select-none"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#85857A] text-xs font-mono uppercase">
              No Image
            </div>
          )}

          {/* Real Stock Status indicator */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-mono font-semibold tracking-wide backdrop-blur-xs border ${
                isAvailable
                  ? 'bg-[#FFFDF8]/90 text-[#3F6B45] border-[#3F6B45]/25'
                  : 'bg-[#FFFDF8]/90 text-[#B7473A] border-red-500/30'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-[#3F6B45]' : 'bg-[#B7473A]'}`}
                aria-hidden="true"
              />
              {isAvailable ? 'In Stock' : 'Sold Out'}
            </span>
          </div>

          {/* Editorial Tag or Category */}
          {(product.tag || product.category) && (
            <div className="absolute top-2.5 right-11 z-10">
              <span className="rounded-full bg-[#FFFDF8]/90 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#5F6057] backdrop-blur-xs border border-[#DED7CA]">
                {product.tag || product.category}
              </span>
            </div>
          )}

          {/* Wishlist Heart Button */}
          <button
            type="button"
            onClick={handleWishlistToggle}
            disabled={wishlistBusy}
            aria-label={isInWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            aria-pressed={isInWishlist}
            className={`absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-xs border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] disabled:opacity-50 ${
              isInWishlist
                ? 'bg-[#A65332] border-[#A65332] text-white'
                : 'bg-[#FFFDF8]/90 border-[#DED7CA] text-[#5F6057] hover:text-[#A65332] hover:border-[#A65332]/40'
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 ${isInWishlist ? 'fill-current' : ''}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
        </Link>

        {/* Editorial Details Bottom Area */}
        <div className="pt-3 pb-1 px-1 flex flex-col justify-between flex-1">
          <div>
            {product.brand && (
              <p className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-[#85857A] truncate mb-1">
                {product.brand}
              </p>
            )}
            <h3 className="text-xs sm:text-sm font-bold text-[#1F211C] leading-snug line-clamp-1 group-hover:text-[#34452F] transition-colors">
              <Link to={`/products/${product._id}`} className="hover:underline focus-visible:outline-none">
                {product.name}
              </Link>
            </h3>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#DED7CA] flex items-center justify-between gap-1.5">
            <span className="text-xs sm:text-sm font-black text-[#1F211C] tracking-tight">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>

            {showAddToCart ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isAvailable || isAdding}
                aria-label={`Add ${product.name} to cart`}
                className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] disabled:cursor-not-allowed disabled:opacity-40 shadow-xs ${
                  addFeedback === 'success'
                    ? 'bg-[#3F6B45] text-white'
                    : addFeedback === 'error'
                      ? 'bg-red-500/10 text-[#B7473A] border border-red-500/30'
                      : 'bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8]'
                }`}
              >
                {isAdding ? (
                  <span>Loading</span>
                ) : addFeedback === 'success' ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>Added</span>
                  </span>
                ) : !isAvailable ? (
                  <span className="text-[9px]">Sold Out</span>
                ) : (
                  <>
                    <ShoppingBag className="h-3 w-3" />
                    <span>Add</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </article>
    )
  }

  // Default Catalog Variant
  return (
    <article
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border transition-all duration-300 ${
        isFeatured
          ? 'border-[#34452F] bg-[#FFFDF8] shadow-md ring-1 ring-[#34452F]/15'
          : 'border-[#DED7CA] bg-[#FFFDF8] shadow-xs hover:border-[#34452F] hover:shadow-md'
      } ${className}`}
    >
      {/* Top Image Container */}
      <Link
        to={`/products/${product._id}`}
        aria-label={`View details for ${product.name}`}
        className="relative aspect-square w-full overflow-hidden bg-[#EEE7DC] block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
      >
        {hasImage ? (
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center p-6 text-[#85857A]"
            aria-label="No product image available"
          >
            <span className="text-xs font-mono uppercase tracking-wider text-[#85857A]">
              No Image
            </span>
          </div>
        )}

        {/* Real Stock Status Badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold tracking-wide backdrop-blur-xs border ${
              isAvailable
                ? 'bg-[#FFFDF8]/90 text-[#3F6B45] border-[#3F6B45]/25'
                : 'bg-[#FFFDF8]/90 text-[#B7473A] border-red-500/25'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isAvailable ? 'bg-[#3F6B45]' : 'bg-[#B7473A]'
              }`}
              aria-hidden="true"
            />
            {isAvailable ? 'In Stock' : 'Sold Out'}
          </span>
        </div>

        {/* Wishlist Heart Button */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          disabled={wishlistBusy}
          aria-label={isInWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isInWishlist}
          className={`absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-xs border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] disabled:opacity-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 ${
            isInWishlist
              ? '!opacity-100 bg-[#A65332] border-[#A65332] text-white'
              : 'bg-[#FFFDF8]/90 border-[#DED7CA] text-[#5F6057] hover:text-[#A65332] hover:border-[#A65332]/40'
          }`}
        >
          <Heart
            className={`h-3.5 w-3.5 ${isInWishlist ? 'fill-current' : ''}`}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </button>
      </Link>

      {/* Product Content Details */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 lg:p-5">
        <div>
          <p className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-[#85857A] mb-1 min-h-[1rem] truncate">
            {product.brand || ' '}
          </p>

          <h3 className="text-sm sm:text-base font-semibold text-[#1F211C] leading-snug line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
            <Link
              to={`/products/${product._id}`}
              className="hover:text-[#34452F] transition-colors focus-visible:outline-none"
            >
              {product.name}
            </Link>
          </h3>

          {showDescription && product.description && (
            <p className="mt-1.5 text-xs text-[#5F6057] line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price & Action Area */}
        <div className="mt-3 pt-3 border-t border-[#DED7CA] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#85857A] block">Price</span>
            <span className="text-base sm:text-lg font-bold text-[#1F211C] tracking-tight truncate block">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
          </div>

          {showAddToCart ? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isAvailable || isAdding}
              aria-label={`Add ${product.name} to cart`}
              className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] disabled:cursor-not-allowed disabled:opacity-40 shrink-0 shadow-xs ${
                addFeedback === 'success'
                  ? 'bg-[#3F6B45] text-white'
                  : addFeedback === 'error'
                    ? 'bg-red-500/10 text-[#B7473A] border border-red-500/30'
                    : 'bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8]'
              }`}
            >
              {isAdding ? (
                <span>Loading</span>
              ) : addFeedback === 'success' ? (
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-white" />
                  <span className="hidden sm:inline">Added</span>
                </span>
              ) : !isAvailable ? (
                <span className="text-[10px]">Sold Out</span>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          ) : (
            <Link
              to={`/products/${product._id}`}
              aria-label={`View details for ${product.name}`}
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#FAF7F0] hover:bg-[#34452F] text-[#34452F] hover:text-[#FFFDF8] px-3.5 py-2 text-xs font-semibold tracking-wider uppercase transition-all duration-200 border border-[#DED7CA] hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] active:scale-95 shrink-0"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

export default ProductCard
