import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import CartItem from '../components/CartItem'
import CartSummary from '../components/CartSummary'
import {
  clearCart,
  fetchCart,
  removeCartItem,
  selectCart,
  updateCartItemQuantity,
} from '../features/cart/cartSlice'

function CartPage() {
  const dispatch = useDispatch()
  const { items, totalItems, totalAmount, loading, error, initialized } =
    useSelector(selectCart)

  const [updatingItemIds, setUpdatingItemIds] = useState({})
  const [itemErrors, setItemErrors] = useState({})
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearingCart, setClearingCart] = useState(false)

  // Fetch cart if not initialized
  useEffect(() => {
    if (!initialized) {
      dispatch(fetchCart())
    }
  }, [dispatch, initialized])

  // Handle quantity modification
  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (!productId || newQuantity < 1) return

    setUpdatingItemIds((prev) => ({ ...prev, [productId]: true }))
    setItemErrors((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })

    try {
      const resultAction = await dispatch(
        updateCartItemQuantity({ productId, quantity: newQuantity })
      )
      if (updateCartItemQuantity.rejected.match(resultAction)) {
        setItemErrors((prev) => ({
          ...prev,
          [productId]: resultAction.payload || 'Failed to update quantity.',
        }))
      }
    } catch {
      setItemErrors((prev) => ({
        ...prev,
        [productId]: 'Failed to update quantity. Please try again.',
      }))
    } finally {
      setUpdatingItemIds((prev) => {
        const next = { ...prev }
        delete next[productId]
        return next
      })
    }
  }

  // Handle removing a single item
  const handleRemoveItem = async (productId) => {
    if (!productId) return

    setUpdatingItemIds((prev) => ({ ...prev, [productId]: true }))
    setItemErrors((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })

    try {
      const resultAction = await dispatch(removeCartItem(productId))
      if (removeCartItem.rejected.match(resultAction)) {
        setItemErrors((prev) => ({
          ...prev,
          [productId]: resultAction.payload || 'Failed to remove item.',
        }))
      }
    } catch {
      setItemErrors((prev) => ({
        ...prev,
        [productId]: 'Failed to remove item. Please try again.',
      }))
    } finally {
      setUpdatingItemIds((prev) => {
        const next = { ...prev }
        delete next[productId]
        return next
      })
    }
  }

  // Handle clearing entire cart
  const handleClearCart = async () => {
    setClearingCart(true)
    try {
      await dispatch(clearCart()).unwrap()
      setShowClearConfirm(false)
    } catch {
      // Error handled by Redux state
    } finally {
      setClearingCart(false)
    }
  }

  // Handle error retry
  const handleRetry = () => {
    dispatch(fetchCart())
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
      {/* Soft Purple/Lilac Ambient Atmosphere Glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-purple-600/15 via-purple-900/5 to-transparent blur-3xl opacity-70 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            BREADCRUMBS & BACK TO SHOP
           ========================================================================= */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-neutral-400"
        >
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/products" className="hover:text-white transition-colors">
              Shop
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-neutral-200 font-medium">Cart</span>
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
            LOADING SKELETON
           ========================================================================= */}
        {loading && !initialized && (
          <div
            aria-busy="true"
            aria-label="Loading cart"
            className="space-y-8 animate-pulse"
          >
            <div className="h-10 w-48 rounded-xl bg-white/10" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-8 space-y-4">
                <div className="h-32 rounded-2xl bg-white/5 border border-white/10" />
                <div className="h-32 rounded-2xl bg-white/5 border border-white/10" />
              </div>
              <div className="lg:col-span-4">
                <div className="h-72 rounded-3xl bg-white/5 border border-white/10" />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ERROR STATE
           ========================================================================= */}
        {!loading && error && (
          <div
            role="alert"
            className="rounded-3xl border border-red-500/20 bg-neutral-900/90 p-8 sm:p-14 text-center max-w-xl mx-auto my-12 shadow-2xl backdrop-blur-xl"
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
            <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Cart</h1>
            <p className="text-sm text-neutral-400 mb-8">{error}</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleRetry}
                className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-white px-7 py-2.5 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Retry
              </button>
              <Link
                to="/products"
                className="min-h-[44px] inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {/* =========================================================================
            EMPTY CART STATE
           ========================================================================= */}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-neutral-900/70 p-10 sm:p-16 text-center max-w-2xl mx-auto my-8 shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 mb-6 border border-purple-500/20">
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
                  d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
              Your Cart is Empty
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 mb-8 max-w-md mx-auto leading-relaxed">
              Looks like you haven&apos;t added anything to your cart yet. Discover our latest
              collection of curated luxury fashion apparel.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 shadow-xl cursor-pointer"
            >
              <span>Explore Products</span>
              <svg
                className="h-4 w-4"
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
        )}

        {/* =========================================================================
            POPULATED CART
           ========================================================================= */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-8">
            {/* Header with Title and Clear Cart */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Your Cart
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-neutral-400">
                  You have{' '}
                  <span className="font-semibold text-purple-300">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </span>{' '}
                  in your shopping cart
                </p>
              </div>

              {/* Clear Cart Button / Confirm State */}
              <div>
                {!showClearConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs font-semibold text-neutral-400 hover:text-red-400 transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    Clear Cart
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-neutral-900 border border-red-500/30 rounded-full px-3 py-1.5 text-xs">
                    <span className="text-neutral-300">Clear all items?</span>
                    <button
                      type="button"
                      disabled={clearingCart}
                      onClick={handleClearCart}
                      className="font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {clearingCart ? 'Clearing...' : 'Yes, Clear'}
                    </button>
                    <span className="text-neutral-600">|</span>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Left Column: Cart Items List */}
              <div className="lg:col-span-8 space-y-4">
                {items.map((item) => {
                  const productId = item.product?._id || item._id
                  return (
                    <CartItem
                      key={item._id || productId}
                      item={item}
                      isUpdating={Boolean(updatingItemIds[productId])}
                      itemError={itemErrors[productId]}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveItem}
                    />
                  )
                })}
              </div>

              {/* Right Column: Order Summary */}
              <div className="lg:col-span-4">
                <CartSummary
                  totalItems={totalItems}
                  totalAmount={totalAmount}
                  disabled={items.length === 0}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CartPage
