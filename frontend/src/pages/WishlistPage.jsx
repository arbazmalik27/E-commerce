import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import Eyebrow from '../components/Eyebrow'
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
    window.scrollTo(0, 0)
    dispatch(fetchWishlist())
  }, [dispatch])

  const handleRemove = (productId) => {
    dispatch(removeFromWishlist(productId))
  }

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Breadcrumbs & Back Link ──────────────────────────────────────── */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#5F6057]"
        >
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#1F211C] transition-colors">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#DED7CA]">/</span>
            <span className="text-[#1F211C] font-semibold">Wishlist</span>
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
            <span>Continue Shopping</span>
          </Link>
        </nav>

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="mb-8 sm:mb-10">
          <Eyebrow variant="terracotta" className="mb-3">CURATED SELECTIONS</Eyebrow>
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1F211C] tracking-tight mb-2">
                My Wishlist
              </h1>
              <p className="text-sm sm:text-base text-[#5F6057]">
                Saved pieces and personal favorites from the TrendVolt collection.
              </p>
            </div>
            {initialized && !loading && items.length > 0 && (
              <span className="text-xs font-mono uppercase tracking-wider text-[#85857A]">
                {items.length} {items.length === 1 ? 'piece' : 'pieces'} saved
              </span>
            )}
          </div>
        </div>

        {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div
            aria-busy="true"
            aria-label="Loading wishlist"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse"
          >
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
        )}

        {/* ── Error State ──────────────────────────────────────────────────── */}
        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-[#A65332]/30 bg-[#FFFDF8] p-8 sm:p-12 text-center max-w-md mx-auto shadow-xs"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#A65332]/10 text-[#A65332] mb-4 border border-[#A65332]/30">
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
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C] mb-2">
              Unable to Load Wishlist
            </h2>
            <p className="text-sm text-[#5F6057] mb-6">{error}</p>
            <button
              type="button"
              onClick={() => dispatch(fetchWishlist())}
              className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-[#34452F] hover:bg-[#263722] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] transition-all active:scale-95 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────────────── */}
        {!loading && !error && initialized && items.length === 0 && (
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-10 sm:p-16 text-center max-w-xl mx-auto shadow-xs my-4">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#A65332]/10 border border-[#A65332]/20 text-[#A65332]">
              <svg
                className="h-8 w-8"
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
            <Eyebrow variant="terracotta" className="mb-3">YOUR WISHLIST</Eyebrow>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] tracking-tight mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-sm text-[#5F6057] max-w-sm mx-auto mb-8 leading-relaxed">
              Save products you love by clicking the heart icon on any product card or editorial collection.
            </p>
            <Link
              to="/products"
              className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-[#34452F] hover:bg-[#263722] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
            >
              Explore Products
            </Link>
          </div>
        )}

        {/* ── Product Grid ─────────────────────────────────────────────────── */}
        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFDF8]/90 border border-[#DED7CA] text-[#A65332] hover:bg-[#A65332] hover:text-[#FFFDF8] hover:border-[#A65332] transition-all shadow-xs opacity-0 group-hover/wishitem:opacity-100 focus:opacity-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A65332]"
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