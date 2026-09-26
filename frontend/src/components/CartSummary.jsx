import { Link } from 'react-router-dom'

function CartSummary({ totalItems, totalAmount, disabled }) {
  return (
    <aside
      aria-labelledby="summary-heading"
      className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 shadow-xs sticky top-28"
    >
      <h2
        id="summary-heading"
        className="font-serif text-lg sm:text-xl font-bold uppercase tracking-wider text-[#1F211C] mb-6"
      >
        Order Summary
      </h2>

      <div className="space-y-4 text-sm text-[#5F6057]">
        {/* Items Count & Subtotal */}
        <div className="flex items-center justify-between">
          <span>
            Items ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </span>
          <span className="font-serif font-bold text-[#1F211C]">
            ₹{Number(totalAmount).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Shipping notice */}
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          <span className="text-xs font-semibold text-[#3F6B45] uppercase tracking-wider">
            Calculated at checkout
          </span>
        </div>

        {/* Taxes */}
        <div className="flex items-center justify-between">
          <span>Estimated Taxes</span>
          <span className="text-xs text-[#85857A]">Included</span>
        </div>

        {/* Divider */}
        <hr className="my-6 border-t border-[#DED7CA]" />

        {/* Total Amount */}
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <span className="text-base font-serif font-bold text-[#1F211C] block">Total</span>
            <span className="text-[11px] text-[#85857A]">All taxes included</span>
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1F211C] tracking-tight">
            ₹{Number(totalAmount).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 space-y-3">
        <Link
          to="/checkout"
          className={`min-h-[48px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-6 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all duration-200 active:scale-98 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] ${
            disabled ? 'pointer-events-none opacity-40' : 'cursor-pointer'
          }`}
        >
          <span>Proceed to Checkout</span>
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

        <Link
          to="/products"
          className="min-h-[44px] w-full inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
        >
          Continue Shopping
        </Link>
      </div>

      {/* Trust & Safety Assurance */}
      <div className="mt-6 pt-6 border-t border-[#DED7CA] flex items-center justify-center gap-2 text-[#5F6057] text-xs">
        <svg
          className="h-3.5 w-3.5 text-[#34452F] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
        <span>Secure authentication & checkout</span>
      </div>
    </aside>
  )
}

export default CartSummary
