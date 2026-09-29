import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, RefreshCw } from 'lucide-react'
import { OrderCard, OrderSkeleton } from '../../pages/OrdersPage'

function AccountOrdersTab({
  orders = [],
  loading = false,
  error = null,
  onRetry,
}) {
  const [filter, setFilter] = useState('all')

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true
    if (filter === 'active') {
      return ['pending', 'confirmed', 'processing', 'shipped'].includes(order.orderStatus)
    }
    if (filter === 'delivered') return order.orderStatus === 'delivered'
    if (filter === 'cancelled') return order.orderStatus === 'cancelled'
    return true
  })

  return (
    <div className="space-y-6">
      {/* ── Tab Subheader & Status Filter ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DED7CA]/70">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#1F211C] tracking-tight">
            Order History
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6057] mt-0.5">
            Review your purchase history, shipment tracking, and download invoices.
          </p>
        </div>

        {/* Filter Pills */}
        {!loading && orders.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Orders', count: orders.length },
              {
                id: 'active',
                label: 'In Transit',
                count: orders.filter((o) =>
                  ['pending', 'confirmed', 'processing', 'shipped'].includes(o.orderStatus)
                ).length,
              },
              {
                id: 'delivered',
                label: 'Delivered',
                count: orders.filter((o) => o.orderStatus === 'delivered').length,
              },
              {
                id: 'cancelled',
                label: 'Cancelled',
                count: orders.filter((o) => o.orderStatus === 'cancelled').length,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-h-[38px] px-3.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer select-none ${
                  filter === f.id
                    ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                    : 'bg-[#FAF7F0] border border-[#DED7CA] text-[#5F6057] hover:text-[#1F211C] hover:bg-[#EEE7DC]'
                }`}
              >
                <span>{f.label}</span>
                {f.count > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      filter === f.id ? 'bg-[#FFFDF8]/20 text-[#FFFDF8]' : 'bg-[#DED7CA] text-[#1F211C]'
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Error State ────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="p-6 text-center rounded-2xl bg-[#A65332]/10 border border-[#A65332]/20 text-[#A65332]">
          <p className="text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-[40px] px-4 py-1.5 rounded-xl bg-[#A65332] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry Loading Orders</span>
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ────────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          <OrderSkeleton />
          <OrderSkeleton />
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────────────────────── */}
      {!loading && !error && orders.length === 0 && (
        <div className="py-16 px-6 text-center max-w-md mx-auto rounded-2xl border border-dashed border-[#DED7CA] bg-[#FFFDF8]">
          <div className="h-12 w-12 rounded-full bg-[#34452F]/10 text-[#34452F] flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#1F211C]">No orders placed yet</h3>
          <p className="mt-1 text-xs text-[#5F6057] leading-relaxed">
            When you purchase items from TrendVolt, your complete receipt, tracking details, and invoice downloads will be cataloged here.
          </p>
          <Link
            to="/products"
            className="mt-5 min-h-[44px] inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
          >
            <span>Explore The Collection</span>
          </Link>
        </div>
      )}

      {/* ── Filtered Empty State ───────────────────────────────────────────── */}
      {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
        <div className="py-12 px-6 text-center rounded-2xl border border-[#DED7CA] bg-[#FFFDF8]">
          <p className="text-sm font-semibold text-[#1F211C]">
            No orders found under &quot;{filter}&quot; filter
          </p>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="mt-3 text-xs font-bold text-[#34452F] hover:underline cursor-pointer"
          >
            Reset to All Orders
          </button>
        </div>
      )}

      {/* ── Order List ──────────────────────────────────────────────────────── */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

export default AccountOrdersTab
