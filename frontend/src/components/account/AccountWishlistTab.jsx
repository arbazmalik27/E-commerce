import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Heart, RefreshCw, X } from 'lucide-react'
import ProductCard from '../ProductCard'
import WishlistRecommendations from '../WishlistRecommendations'
import {
  fetchWishlist,
  removeFromWishlist,
  selectWishlistError,
  selectWishlistInitialized,
  selectWishlistItems,
  selectWishlistLoading,
} from '../../features/wishlist/wishlistSlice'

function AccountWishlistTab() {
  const dispatch = useDispatch()
  const items = useSelector(selectWishlistItems)
  const loading = useSelector(selectWishlistLoading)
  const initialized = useSelector(selectWishlistInitialized)
  const error = useSelector(selectWishlistError)

  const handleRemove = (productId) => {
    dispatch(removeFromWishlist(productId))
  }

  return (
    <div className="space-y-8">
      {/* ── Tab Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DED7CA]/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl font-bold text-[#1F211C] tracking-tight">
              Curated Wardrobe &amp; Wishlist
            </h2>
            {initialized && !loading && (
              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-xs font-mono font-bold text-[#5F6057]">
                {items.length} {items.length === 1 ? 'piece' : 'pieces'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#5F6057] mt-0.5">
            Your personal lookbook of saved designs, garments, and accessories.
          </p>
        </div>

        <Link
          to="/products"
          className="text-xs font-semibold text-[#34452F] hover:text-[#263722] transition-colors self-start sm:self-auto"
        >
          Browse Full Catalog →
        </Link>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="p-6 text-center rounded-2xl bg-[#A65332]/10 border border-[#A65332]/20 text-[#A65332]">
          <p className="text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={() => dispatch(fetchWishlist())}
            className="mt-3 min-h-[40px] px-4 py-1.5 rounded-xl bg-[#A65332] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry Wishlist</span>
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ───────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
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

      {/* ── Empty State ─────────────────────────────────────────────────────── */}
      {!loading && !error && initialized && items.length === 0 && (
        <div className="py-16 px-6 text-center max-w-md mx-auto rounded-2xl border border-dashed border-[#DED7CA] bg-[#FFFDF8]">
          <div className="h-12 w-12 rounded-full bg-[#A65332]/10 text-[#A65332] flex items-center justify-center mx-auto mb-3">
            <Heart className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#1F211C]">Your Wishlist is Empty</h3>
          <p className="mt-1 text-xs text-[#5F6057] leading-relaxed">
            Save pieces you love by tapping the heart icon while exploring our fashion collections.
          </p>
          <Link
            to="/products"
            className="mt-5 min-h-[44px] inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
          >
            <span>Explore Collection</span>
          </Link>
        </div>
      )}

      {/* ── Product Grid ────────────────────────────────────────────────────── */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => (
            <div key={product._id} className="relative group/wishitem">
              <ProductCard product={product} showAddToCart variant="lookbook" />
              {/* Quick remove pill */}
              <button
                type="button"
                onClick={() => handleRemove(product._id)}
                aria-label={`Remove ${product.name} from wishlist`}
                className="absolute top-3 left-3 z-10 h-7 w-7 rounded-full bg-[#FFFDF8]/90 hover:bg-[#FFFDF8] border border-[#DED7CA] text-[#85857A] hover:text-[#A65332] flex items-center justify-center transition-all opacity-0 group-hover/wishitem:opacity-100 shadow-xs cursor-pointer focus-visible:opacity-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Complete Your Style: Recommendations ───────────────────────────── */}
      <div className="pt-6 border-t border-[#DED7CA]/70">
        <WishlistRecommendations />
      </div>
    </div>
  )
}

export default AccountWishlistTab
