import { useState, useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ShoppingBag,
  X,
  Search,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react'
import api from '../../services/api'
import {
  WARDROBE_SLOTS,
  WARDROBE_CATEGORY_FILTERS,
  determineProductWardrobeSlot,
} from '../../constants/wardrobeConstants'
import { isProductTryOnActive } from '../../utils/garmentAssetResolver'
import { getProductImage } from '../../utils/productImageMap'
import { addToCart } from '../../features/cart/cartSlice'
import OutfitMatchPanel from './OutfitMatchPanel'
import { analyzeOutfitColorMatch } from '../../utils/outfitColorMatcher'

export default function VirtualWardrobe({
  outfit = { top: null, bottom: null, shoes: null, accessories: [] },
  garmentStatuses = { top: null, bottom: null },
  onSelectProduct,
  onRemoveItem,
  onClearOutfit,
  onAnalysisChange,
  className = '',
}) {
  const dispatch = useDispatch()
  const [activeFilter, setActiveFilter] = useState('all')
  const [tryOnOnly, setTryOnOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [cartFeedback, setCartFeedback] = useState(null)

  // Handle adding all selected outfit items to cart
  const handleAddToCartOutfit = async () => {
    const itemsToAdd = []
    if (outfit.top) itemsToAdd.push(outfit.top)
    if (outfit.bottom) itemsToAdd.push(outfit.bottom)
    if (outfit.shoes) itemsToAdd.push(outfit.shoes)
    if (Array.isArray(outfit.accessories)) {
      itemsToAdd.push(...outfit.accessories)
    }
    if (itemsToAdd.length === 0) return

    setIsAddingToCart(true)
    setCartFeedback(null)

    let addedCount = 0
    let lastError = null

    for (const item of itemsToAdd) {
      let chosenSize = undefined
      if (Array.isArray(item.sizes) && item.sizes.length > 0) {
        const avail = item.sizes.find((s) => s.available !== false)
        chosenSize = avail ? avail.label : item.sizes[0].label
      }

      try {
        const result = await dispatch(
          addToCart({
            productId: item._id,
            quantity: 1,
            size: chosenSize,
          })
        )
        if (addToCart.fulfilled.match(result)) {
          addedCount++
        } else {
          lastError = result.payload || `Unable to add ${item.name} to cart.`
        }
      } catch (err) {
        lastError = err.message || 'Error adding item to cart.'
      }
    }

    setIsAddingToCart(false)

    if (addedCount > 0) {
      setCartFeedback({
        type: 'success',
        message: `Added ${addedCount} ${addedCount === 1 ? 'item' : 'items'} to cart!`,
        addedCount,
      })
      setTimeout(() => setCartFeedback(null), 4000)
    } else if (lastError) {
      setCartFeedback({
        type: 'error',
        message: lastError,
      })
    }
  }

  // Fetch TrendVolt catalog products
  useEffect(() => {
    let isMounted = true

    const fetchCatalog = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = {
          limit: 36,
          category: 'fashion',
        }
        if (tryOnOnly) {
          params.tryOn = 'true'
        }

        const res = await api.get('/products', { params })
        if (isMounted) {
          if (res.data?.success && Array.isArray(res.data.products)) {
            setProducts(res.data.products)
          } else {
            setProducts([])
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load catalog products')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchCatalog()

    return () => {
      isMounted = false
    }
  }, [tryOnOnly])

  // Filter products by wardrobe category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Category tab filter
      if (activeFilter !== 'all') {
        const slot = determineProductWardrobeSlot(product)
        const targetFilter = WARDROBE_CATEGORY_FILTERS.find((f) => f.id === activeFilter)
        if (targetFilter?.slot && slot !== targetFilter.slot) {
          return false
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = product.name?.toLowerCase().includes(q)
        const matchBrand = product.brand?.toLowerCase().includes(q)
        const matchSubcat = product.subcategory?.toLowerCase().includes(q)
        if (!matchName && !matchBrand && !matchSubcat) {
          return false
        }
      }

      return true
    })
  }, [products, activeFilter, searchQuery])

  // Helper to check if a product is selected in any slot
  const isSelectedInOutfit = (product) => {
    if (!product || !outfit) return false
    if (outfit.top?._id === product._id) return true
    if (outfit.bottom?._id === product._id) return true
    if (outfit.shoes?._id === product._id) return true
    return Array.isArray(outfit.accessories) && outfit.accessories.some((a) => a._id === product._id)
  }

  // Calculate total outfit value
  const totalOutfitPrice = useMemo(() => {
    let sum = 0
    if (outfit.top?.price) sum += Number(outfit.top.price)
    if (outfit.bottom?.price) sum += Number(outfit.bottom.price)
    if (outfit.shoes?.price) sum += Number(outfit.shoes.price)
    if (Array.isArray(outfit.accessories)) {
      outfit.accessories.forEach((a) => {
        if (a.price) sum += Number(a.price)
      })
    }
    return sum
  }, [outfit])

  const totalOutfitItems = useMemo(() => {
    let count = 0
    if (outfit.top) count++
    if (outfit.bottom) count++
    if (outfit.shoes) count++
    if (Array.isArray(outfit.accessories)) count += outfit.accessories.length
    return count
  }, [outfit])

  // Deterministic Outfit Color & Style Match Analysis
  const colorMatchAnalysis = useMemo(() => {
    return analyzeOutfitColorMatch(outfit, products)
  }, [outfit, products])

  useEffect(() => {
    if (onAnalysisChange) {
      onAnalysisChange(colorMatchAnalysis)
    }
  }, [colorMatchAnalysis, onAnalysisChange])

  return (
    <div className={`flex flex-col space-y-6 ${className}`}>
      {/* =========================================================================
          1. SELECTED OUTFIT SUMMARY DOCK
         ========================================================================= */}
      <section
        aria-label="Current Selected Outfit"
        className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 shadow-xs transition-all"
      >
        <div className="flex items-center justify-between border-b border-[#DED7CA] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#34452F]" />
            <h2 className="font-serif text-sm font-bold text-[#1F211C] uppercase tracking-wider">
              Selected Outfit
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#34452F]/10 text-[#34452F] font-bold">
              {totalOutfitItems} {totalOutfitItems === 1 ? 'Piece' : 'Pieces'}
            </span>
          </div>
          {totalOutfitItems > 0 && (
            <button
              type="button"
              onClick={onClearOutfit}
              aria-label="Clear all outfit items"
              className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[#A65332] hover:text-[#8b4226] cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Outfit</span>
            </button>
          )}
        </div>

        {/* Outfit Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* TOP SLOT */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] relative group">
            <span className="text-[10px] font-mono uppercase font-bold text-[#85857A] absolute top-2 right-2">
              Top
            </span>
            {outfit.top ? (
              <>
                <img
                  src={getProductImage(outfit.top)}
                  alt={outfit.top.name}
                  className="w-12 h-14 object-cover rounded-lg bg-white border border-[#DED7CA] shrink-0"
                />
                <div className="min-w-0 flex-1 pr-6">
                  <p className="text-xs font-bold text-[#1F211C] truncate">{outfit.top.name}</p>
                  <p className="text-xs text-[#A65332] font-semibold mt-0.5">
                    ₹{Number(outfit.top.price).toLocaleString('en-IN')}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {garmentStatuses?.top === 'loading' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#34452F] font-bold">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-[#34452F]" />
                        Loading 3D garment…
                      </span>
                    ) : garmentStatuses?.top === 'error' ? (
                      <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 font-medium">
                        Unable to load this 3D preview.
                      </span>
                    ) : isProductTryOnActive(outfit.top) ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#34452F] font-bold">
                        <Sparkles className="w-2.5 h-2.5 text-[#DDB088]" />
                        3D Active
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-[#85857A]">
                        3D preview unavailable for this product.
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem?.(WARDROBE_SLOTS.TOP)}
                  title="Remove top from outfit"
                  aria-label="Remove top from outfit"
                  className="absolute bottom-2 right-2 p-1 text-[#85857A] hover:text-[#A65332] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFilter('tops')}
                aria-label="Add a top"
                className="flex items-center justify-center w-full py-3 text-center text-xs text-[#85857A] hover:text-[#34452F] transition-colors cursor-pointer group"
              >
                <span className="font-medium group-hover:underline">+ Add a top</span>
              </button>
            )}
          </div>

          {/* BOTTOM SLOT */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] relative group">
            <span className="text-[10px] font-mono uppercase font-bold text-[#85857A] absolute top-2 right-2">
              Bottom
            </span>
            {outfit.bottom ? (
              <>
                <img
                  src={getProductImage(outfit.bottom)}
                  alt={outfit.bottom.name}
                  className="w-12 h-14 object-cover rounded-lg bg-white border border-[#DED7CA] shrink-0"
                />
                <div className="min-w-0 flex-1 pr-6">
                  <p className="text-xs font-bold text-[#1F211C] truncate">{outfit.bottom.name}</p>
                  <p className="text-xs text-[#A65332] font-semibold mt-0.5">
                    ₹{Number(outfit.bottom.price).toLocaleString('en-IN')}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {garmentStatuses?.bottom === 'loading' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#34452F] font-bold">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-[#34452F]" />
                        Loading 3D garment…
                      </span>
                    ) : garmentStatuses?.bottom === 'error' ? (
                      <span className="text-[9px] font-mono text-amber-700 dark:text-amber-400 font-medium">
                        Unable to load this 3D preview.
                      </span>
                    ) : isProductTryOnActive(outfit.bottom) ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#34452F] font-bold">
                        <Sparkles className="w-2.5 h-2.5 text-[#DDB088]" />
                        3D Active
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-[#85857A]">
                        3D preview unavailable for this product.
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem?.(WARDROBE_SLOTS.BOTTOM)}
                  title="Remove bottom from outfit"
                  aria-label="Remove bottom from outfit"
                  className="absolute bottom-2 right-2 p-1 text-[#85857A] hover:text-[#A65332] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFilter('bottoms')}
                aria-label="Add bottoms"
                className="flex items-center justify-center w-full py-3 text-center text-xs text-[#85857A] hover:text-[#34452F] transition-colors cursor-pointer group"
              >
                <span className="font-medium group-hover:underline">+ Add bottoms</span>
              </button>
            )}
          </div>

          {/* SHOES SLOT */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] relative group">
            <span className="text-[10px] font-mono uppercase font-bold text-[#85857A] absolute top-2 right-2">
              Shoes
            </span>
            {outfit.shoes ? (
              <>
                <img
                  src={getProductImage(outfit.shoes)}
                  alt={outfit.shoes.name}
                  className="w-12 h-14 object-cover rounded-lg bg-white border border-[#DED7CA] shrink-0"
                />
                <div className="min-w-0 flex-1 pr-6">
                  <p className="text-xs font-bold text-[#1F211C] truncate">{outfit.shoes.name}</p>
                  <p className="text-xs text-[#A65332] font-semibold mt-0.5">
                    ₹{Number(outfit.shoes.price).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[9px] font-mono text-[#85857A] mt-1">Catalog Piece</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem?.(WARDROBE_SLOTS.SHOES)}
                  title="Remove shoes from outfit"
                  aria-label="Remove shoes from outfit"
                  className="absolute bottom-2 right-2 p-1 text-[#85857A] hover:text-[#A65332] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFilter('shoes')}
                aria-label="Add shoes"
                className="flex items-center justify-center w-full py-3 text-center text-xs text-[#85857A] hover:text-[#34452F] transition-colors cursor-pointer group"
              >
                <span className="font-medium group-hover:underline">+ Add shoes</span>
              </button>
            )}
          </div>

          {/* ACCESSORIES SLOT */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] relative group">
            <span className="text-[10px] font-mono uppercase font-bold text-[#85857A] absolute top-2 right-2">
              Acc.
            </span>
            {Array.isArray(outfit.accessories) && outfit.accessories.length > 0 ? (
              <div className="w-full space-y-1.5 pr-2">
                {outfit.accessories.map((acc) => (
                  <div key={acc._id} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[120px] font-medium text-[#1F211C]">
                      {acc.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem?.(WARDROBE_SLOTS.ACCESSORIES, acc._id)}
                      title={`Remove ${acc.name} from accessories`}
                      aria-label={`Remove ${acc.name} from accessories`}
                      className="text-[#85857A] hover:text-[#A65332] p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFilter('accessories')}
                aria-label="Add accessories"
                className="flex items-center justify-center w-full py-3 text-center text-xs text-[#85857A] hover:text-[#34452F] transition-colors cursor-pointer group"
              >
                <span className="font-medium group-hover:underline">+ Add accessories</span>
              </button>
            )}
          </div>
        </div>

        {/* Outfit Price Footer & Add Outfit to Cart Action */}
        {totalOutfitItems > 0 && (
          <div className="mt-4 pt-3 border-t border-[#DED7CA] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-wider text-[#5F6057]">
                Total Outfit Estimation
              </span>
              <span className="font-serif text-sm font-bold text-[#1F211C]">
                ₹{totalOutfitPrice.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Cart Feedback Notification */}
            {cartFeedback && (
              <div
                role={cartFeedback.type === 'error' ? 'alert' : 'status'}
                className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 animate-fade-in ${
                  cartFeedback.type === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                <span>{cartFeedback.message}</span>
                {cartFeedback.type === 'success' && (
                  <Link
                    to="/cart"
                    className="font-mono font-bold underline uppercase tracking-wider text-emerald-900 hover:opacity-80 shrink-0"
                  >
                    View Cart →
                  </Link>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={isAddingToCart}
              onClick={handleAddToCartOutfit}
              aria-label={`Add ${totalOutfitItems} outfit ${totalOutfitItems === 1 ? 'item' : 'items'} to cart`}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-mono uppercase tracking-wider font-bold bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAddingToCart ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding to Cart…</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add Outfit to Cart ({totalOutfitItems})</span>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* =========================================================================
          1.5. OUTFIT COLOR & STYLE MATCH PANEL
         ========================================================================= */}
      <OutfitMatchPanel
        analysis={colorMatchAnalysis}
        onApplySuggestion={(sugg) => {
          const targetProduct = products.find((p) => p._id === sugg.productId)
          if (targetProduct) {
            onSelectProduct?.(targetProduct)
          }
        }}
      />

      {/* =========================================================================
          2. CATALOG BROWSER & WARDROBE FILTER CONTROLS
         ========================================================================= */}
      <section aria-label="TrendVolt Wardrobe Catalog" className="space-y-4">
        {/* Category Tabs & Quick Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Wardrobe Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {WARDROBE_CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                  activeFilter === cat.id
                    ? 'bg-[#34452F] text-[#FFFDF8] border-[#34452F] shadow-2xs'
                    : 'bg-[#FFFDF8] text-[#5F6057] border-[#DED7CA] hover:border-[#34452F]/40 hover:text-[#1F211C]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search input & Try-On toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#85857A]" />
              <input
                type="text"
                placeholder="Search pieces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-[#FFFDF8] border border-[#DED7CA] text-[#1F211C] placeholder:text-[#85857A] focus:outline-none focus:border-[#34452F]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#85857A] hover:text-[#1F211C]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setTryOnOnly((prev) => !prev)}
              title="Show only pieces with 3D Try-On ready"
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                tryOnOnly
                  ? 'bg-[#A65332] text-white border-[#A65332]'
                  : 'bg-[#FFFDF8] text-[#5F6057] border-[#DED7CA] hover:border-[#A65332]/40'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#DDB088]" />
              <span>3D Ready</span>
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8]">
            <Loader2 className="w-7 h-7 text-[#34452F] animate-spin mb-3" />
            <p className="text-xs font-mono uppercase tracking-widest text-[#85857A]">
              Loading Wardrobe Catalog...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-center">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="p-10 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-[#85857A] mx-auto opacity-50" />
            <h3 className="font-serif text-sm font-bold text-[#1F211C]">No Pieces Found</h3>
            <p className="text-xs text-[#5F6057] max-w-sm mx-auto">
              No TrendVolt products matched your current filter. Try selecting &quot;All Catalog&quot; or clearing your search.
            </p>
          </div>
        )}

        {/* Product Grid */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const selected = isSelectedInOutfit(product)
              const has3D = isProductTryOnActive(product)
              const slot = determineProductWardrobeSlot(product)

              return (
                <article
                  key={product._id}
                  className={`flex flex-col justify-between rounded-xl border bg-[#FFFDF8] p-3 transition-all duration-200 ${
                    selected
                      ? 'border-[#34452F] ring-2 ring-[#34452F]/20 shadow-xs'
                      : 'border-[#DED7CA] hover:border-[#85857A] hover:shadow-xs'
                  }`}
                >
                  {/* Top Thumbnail Image */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-[#FAF7F0] mb-2.5">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
                    />

                    {/* 3D Capability Badge */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                      {has3D ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#34452F] text-[#FFFDF8] shadow-xs">
                          <Sparkles className="w-2.5 h-2.5 text-[#DDB088]" />
                          <span>3D</span>
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#FFFDF8]/90 px-1.5 py-0.5 text-[8px] font-mono font-medium text-[#85857A] border border-[#DED7CA]">
                          Catalog
                        </span>
                      )}
                    </div>

                    {/* Slot indicator */}
                    {slot && (
                      <span className="absolute top-2 right-2 rounded-full bg-[#FFFDF8]/90 px-2 py-0.5 text-[9px] font-mono uppercase font-bold text-[#5F6057] border border-[#DED7CA]">
                        {slot}
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {product.brand && (
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[#85857A] truncate">
                          {product.brand}
                        </p>
                      )}
                      <h4 className="text-xs font-bold text-[#1F211C] leading-snug line-clamp-1 mt-0.5">
                        {product.name}
                      </h4>

                      {/* Sizes preview where provided */}
                      {Array.isArray(product.sizes) && product.sizes.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
                          {product.sizes.slice(0, 4).map((s) => (
                            <span
                              key={s.label}
                              className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                                s.available !== false
                                  ? 'bg-[#FAF7F0] text-[#5F6057] border border-[#DED7CA]'
                                  : 'text-[#85857A] line-through opacity-50'
                              }`}
                            >
                              {s.label}
                            </span>
                          ))}
                          {product.sizes.length > 4 && (
                            <span className="text-[8px] font-mono text-[#85857A]">
                              +{product.sizes.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#DED7CA] flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#1F211C]">
                        ₹{Number(product.price).toLocaleString('en-IN')}
                      </span>

                      {/* Action Button: Wear / Selected */}
                      <button
                        type="button"
                        onClick={() => onSelectProduct?.(product)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#34452F] text-white shadow-2xs'
                            : 'bg-[#FAF7F0] text-[#1F211C] border border-[#DED7CA] hover:border-[#34452F]'
                        }`}
                      >
                        {selected ? (
                          <>
                            <Check className="w-2.5 h-2.5" />
                            <span>In Outfit</span>
                          </>
                        ) : (
                          <span>Wear</span>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
