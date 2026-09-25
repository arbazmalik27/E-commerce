import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import {
  fetchWishlist,
  removeFromWishlist,
  selectWishlistError,
  selectWishlistInitialized,
  selectWishlistItems,
  selectWishlistLoading,
} from '../features/wishlist/wishlistSlice'

function WishlistPage() {
  const dispatch = useDispatch()
  const items = useSelector(selectWishlistItems)
  const loading = useSelector(selectWishlistLoading)
  const initialized = useSelector(selectWishlistInitialized)
  const error = useSelector(selectWishlistError)

  useEffect(() => {
    dispatch(fetchWishlist())
  }, [dispatch])

  const handleRemove = (productId) => {
    dispatch(removeFromWishlist(productId))
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-rose-600/10 via-purple-900/5 to-transparent blur-3xl opacity-60 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              My Wishlist
            </h1>
            {initialized && !loading && items.length > 0 && (
              <p className="mt-1 text-sm text-neutral-400">
                {items.length} {items.length === 1 ? 'item' : 'items'} saved
              </p>
            )}
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all"
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
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
            Continue Shopping
          </Link>
        </div>

        {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div
            aria-busy="true"
            aria-label="Loading wishlist"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-pulse"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-neutral-900/70 overflow-hidden"
              >
                <div className="aspect-[4/5] bg-white/5" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-4 w-1/2 rounded bg-white/5" />
                  <div className="h-8 w-full rounded-full bg-white/10 mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error State ──────────────────────────────────────────────────── */}
        {!loading && error && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-neutral-900/90 p-8 text-center max-w-md mx-auto shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4 border border-red-500/30">
              <svg
                className="h-7 w-7"
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
            <h2 className="text-xl font-bold text-white mb-2">
              Unable to Load Wishlist
            </h2>
            <p className="text-sm text-neutral-400 mb-6">{error}</p>
            <button
              type="button"
              onClick={() => dispatch(fetchWishlist())}
              className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────────────── */}
        {!loading && !error && initialized && items.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-24">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500">
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-sm text-neutral-400 max-w-xs mb-8">
              Save products you love by clicking the heart icon on any product card or product page.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 shadow-xl"
            >
              Explore Products
            </Link>
          </div>
        )}

        {/* ── Product Grid ─────────────────────────────────────────────────── */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((product) => (
              <div key={product._id} className="relative group/wishitem">
                <ProductCard
                  product={product}
                  showAddToCart
                  variant="lookbook"
                />
                {/* Remove from wishlist overlay button */}
                <button
                  type="button"
                  aria-label={`Remove ${product.name} from wishlist`}
                  onClick={() => handleRemove(product._id)}
                  className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950/80 border border-white/15 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-400 transition-all shadow-lg backdrop-blur-sm opacity-0 group-hover/wishitem:opacity-100 focus:opacity-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
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
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WishlistPage