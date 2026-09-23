import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import { addToCart } from '../features/cart/cartSlice'

function ProductCard({
  product,
  showAddToCart = false,
  isFeatured = false,
  showDescription = false,
  variant = 'default',
  className = '',
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

  // Lookbook / Polaroid Variant (Refined Dark Luxury Editorial Theme)
  if (variant === 'lookbook') {
    return (
      <article
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 p-2.5 sm:p-3 shadow-2xl shadow-black/80 ring-1 ring-white/5 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-black text-white ${className}`}
      >
        {/* Top Portrait Image Frame (4:5 Editorial Fashion Ratio) */}
        <Link
          to={`/products/${product._id}`}
          aria-label={`View details for ${product.name}`}
          className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-neutral-950 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {hasImage ? (
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 select-none"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-500 text-xs font-medium uppercase">
              No Image
            </div>
          )}

          {/* Real Stock Status indicator */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-semibold tracking-wide backdrop-blur-md border border-white/10 ${
                isAvailable
                  ? 'bg-neutral-950/80 text-white'
                  : 'bg-red-950/80 text-red-200 border-red-500/30'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-red-400'}`}
                aria-hidden="true"
              />
              {isAvailable ? 'In Stock' : 'Sold Out'}
            </span>
          </div>

          {/* Editorial Tag or Category */}
          {(product.tag || product.category) && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <span className="rounded-full bg-neutral-950/80 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-300 backdrop-blur-md border border-white/10">
                {product.tag || product.category}
              </span>
            </div>
          )}
        </Link>

        {/* Editorial Details Bottom Area */}
        <div className="pt-3 pb-1 px-1 flex flex-col justify-between flex-1">
          <div>
            {product.brand && (
              <p className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-neutral-400 truncate mb-1">
                {product.brand}
              </p>
            )}
            <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-1 group-hover:text-neutral-200 transition-colors">
              <Link to={`/products/${product._id}`} className="hover:underline focus-visible:outline-none">
                {product.name}
              </Link>
            </h3>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-1.5">
            <span className="text-xs sm:text-sm font-black text-white tracking-tight">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>

            {showAddToCart ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isAvailable || isAdding}
                aria-label={`Add ${product.name} to cart`}
                className={`min-h-[38px] inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 shadow-sm ${
                  addFeedback === 'success'
                    ? 'bg-emerald-500 text-white'
                    : addFeedback === 'error'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-white hover:bg-neutral-200 text-neutral-950'
                }`}
              >
                {isAdding ? (
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : addFeedback === 'success' ? (
                  <span>Added</span>
                ) : !isAvailable ? (
                  <span className="text-[9px]">Sold Out</span>
                ) : (
                  <>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
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
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${
        isFeatured
          ? 'border-white/20 bg-neutral-900/95 shadow-2xl ring-1 ring-white/10'
          : 'border-white/10 bg-neutral-900/90 shadow-md hover:border-white/20 hover:shadow-xl'
      } ${className}`}
    >
      {/* Top Image Container: Direct link to product details */}
      <Link
        to={`/products/${product._id}`}
        aria-label={`View details for ${product.name}`}
        className="relative aspect-square w-full overflow-hidden bg-neutral-950 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {hasImage ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center p-6 text-neutral-500"
            aria-label="No product image available"
          >
            <svg
              className="h-12 w-12 text-neutral-600 mb-2"
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
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              No Image
            </span>
          </div>
        )}

        {/* Real Stock Status Badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-md ${
              isAvailable
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-300 border border-red-500/20'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isAvailable ? 'bg-emerald-400' : 'bg-red-400'
              }`}
              aria-hidden="true"
            />
            {isAvailable ? 'In Stock' : 'Sold Out'}
          </span>
        </div>

        {/* Real Department / Category Tag in Upper Right */}
        {product.category && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="rounded-full border border-white/10 bg-neutral-950/75 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-300 backdrop-blur-md">
              {product.category}
            </span>
          </div>
        )}
      </Link>

      {/* Product Content Details */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 lg:p-5">
        <div>
          {/* Brand Metadata (with min-h for desktop alignment) */}
          <p className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-neutral-400 mb-1 min-h-[1rem] truncate">
            {product.brand || ' '}
          </p>

          {/* Product Title: 2-line clamp with min-h for consistent card heights */}
          <h3 className="text-sm sm:text-base font-semibold text-white leading-snug line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
            <Link
              to={`/products/${product._id}`}
              className="hover:text-neutral-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
            >
              {product.name}
            </Link>
          </h3>

          {/* Optional Short Description */}
          {showDescription && product.description && (
            <p className="mt-1.5 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Price & Action Area: Clean single action button to eliminate mobile button clutter */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">Price</span>
            <span className="text-base sm:text-lg font-bold text-white tracking-tight truncate block">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Dedicated Single Action Button (>=44px touch target) */}
          {showAddToCart ? (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isAvailable || isAdding}
              aria-label={`Add ${product.name} to cart`}
              className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40 shrink-0 shadow-md ${
                addFeedback === 'success'
                  ? 'bg-emerald-500 text-white'
                  : addFeedback === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-white hover:bg-neutral-200 text-neutral-950'
              }`}
            >
              {isAdding ? (
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : addFeedback === 'success' ? (
                <span className="inline-flex items-center gap-1">
                  <svg
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="hidden sm:inline">Added</span>
                </span>
              ) : addFeedback === 'error' ? (
                <span>Failed</span>
              ) : !isAvailable ? (
                <span className="text-[10px]">Sold Out</span>
              ) : (
                <>
                  <svg
                    className="h-3.5 w-3.5"
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
                  <span>Add</span>
                </>
              )}
            </button>
          ) : (
            <Link
              to={`/products/${product._id}`}
              aria-label={`View details for ${product.name}`}
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white text-white hover:text-neutral-950 px-3.5 py-2 text-xs font-semibold tracking-wider uppercase transition-all duration-200 border border-white/15 hover:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 shrink-0"
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
