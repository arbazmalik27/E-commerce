import { useState } from 'react'
import { Link } from 'react-router-dom'

function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating,
  itemError,
}) {
  const [imageError, setImageError] = useState(false)

  const product = item.product || {}
  const productId = product._id
  const name = product.name || 'Product'
  const brand = product.brand || product.category
  const price = typeof product.price === 'number' ? product.price : 0
  const stock = typeof product.stock === 'number' ? product.stock : 999
  const quantity = item.quantity || 1
  const itemTotal =
    typeof item.itemTotal === 'number' ? item.itemTotal : price * quantity
  const imageUrl =
    !imageError && Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null

  const handleDecrement = () => {
    if (quantity > 1 && !isUpdating) {
      onUpdateQuantity(productId, quantity - 1)
    }
  }

  const handleIncrement = () => {
    if (quantity < stock && !isUpdating) {
      onUpdateQuantity(productId, quantity + 1)
    }
  }

  const handleRemove = () => {
    if (!isUpdating) {
      onRemove(productId)
    }
  }

  return (
    <article className="relative rounded-2xl border border-white/10 bg-neutral-900/60 p-4 sm:p-6 backdrop-blur-md transition-all duration-300 hover:border-white/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {/* Product Image */}
        <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-950 p-2 flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              onError={() => setImageError(true)}
              className="h-full w-full object-contain select-none transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div
              className="flex flex-col items-center justify-center text-neutral-600"
              aria-label="No image preview"
            >
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
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
              <span className="text-[10px] uppercase font-semibold text-neutral-500 mt-1">
                No Image
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0 w-full sm:w-auto">
          {brand && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 block mb-1">
              {brand}
            </span>
          )}

          {productId ? (
            <Link
              to={`/products/${productId}`}
              className="text-base sm:text-lg font-bold text-white tracking-tight hover:text-purple-300 transition-colors line-clamp-2 block"
            >
              {name}
            </Link>
          ) : (
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight line-clamp-2">
              {name}
            </h3>
          )}

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-neutral-400">Unit Price:</span>
            <span className="text-sm font-bold text-neutral-200">
              ₹{Number(price).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Stock availability indicator if low */}
          {stock <= 5 && stock > 0 && (
            <p className="mt-1 text-xs text-amber-400">
              Only {stock} available in stock
            </p>
          )}

          {/* Item Error Feedback */}
          {itemError && (
            <p className="mt-2 text-xs font-medium text-red-400" role="alert">
              {itemError}
            </p>
          )}
        </div>

        {/* Controls & Subtotal */}
        <div className="flex w-full sm:w-auto items-center justify-between sm:flex-col sm:items-end gap-3 sm:gap-4 shrink-0 pt-3 sm:pt-0 border-t border-white/5 sm:border-t-0">
          {/* Item Subtotal */}
          <div className="text-left sm:text-right">
            <span className="text-xs text-neutral-400 block mb-0.5 sm:mb-1">Subtotal</span>
            <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              ₹{Number(itemTotal).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Actions Container */}
          <div className="flex items-center gap-3">
            {/* Quantity Selector */}
            <div className="inline-flex items-center rounded-full border border-white/20 bg-neutral-950 p-0.5 sm:p-1">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1 || isUpdating}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                aria-live="polite"
                className="w-8 sm:w-10 text-center text-xs sm:text-sm font-bold text-white select-none"
              >
                {isUpdating ? '...' : quantity}
              </span>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= stock || isUpdating}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>

            {/* Remove Button */}
            <button
              type="button"
              onClick={handleRemove}
              disabled={isUpdating}
              aria-label="Remove product"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-neutral-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default CartItem
