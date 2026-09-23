import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

// ─── Status Badges ────────────────────────────────────────────────────────────

const ORDER_STATUS_STYLES = {
  pending:    { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Pending'     },
  confirmed:  { bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-300',    dot: 'bg-blue-400',    label: 'Confirmed'   },
  processing: { bg: 'bg-purple-500/15',  border: 'border-purple-500/30',  text: 'text-purple-300',  dot: 'bg-purple-400',  label: 'Processing'  },
  shipped:    { bg: 'bg-cyan-500/15',    border: 'border-cyan-500/30',    text: 'text-cyan-300',    dot: 'bg-cyan-400',    label: 'Shipped'     },
  delivered:  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Delivered'   },
  cancelled:  { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-300',     dot: 'bg-red-400',     label: 'Cancelled'   },
}

const PAYMENT_STATUS_STYLES = {
  pending: { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-300',   label: 'Pending' },
  paid:    { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', label: 'Paid'    },
  failed:  { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-300',     label: 'Failed'  },
}

function OrderStatusBadge({ status }) {
  const s = ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  )
}

function PaymentStatusBadge({ status }) {
  const s = PAYMENT_STATUS_STYLES[status] || PAYMENT_STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      {s.label}
    </span>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({ item }) {
  const imgSrc = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-neutral-800 flex items-center justify-center">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.name}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <svg className="h-5 w-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-200 font-medium truncate">{item.name}</p>
        <p className="text-xs text-neutral-500">{formatCurrency(item.price)} × {item.quantity}</p>
      </div>
      <p className="text-sm font-semibold text-white shrink-0">{formatCurrency(item.subtotal)}</p>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }) {
  const allItems = order.items || []
  const previewItems = allItems.slice(0, 3)
  const remainingCount = allItems.length - previewItems.length

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-sm shadow-xl overflow-hidden transition-all duration-300 hover:border-white/20">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 sm:py-5 flex flex-wrap items-start justify-between gap-3 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Order Number</p>
            <p className="font-mono text-sm font-bold text-purple-300">{order.orderNumber}</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-white/10" aria-hidden="true" />
          <div className="hidden sm:block">
            <p className="text-xs text-neutral-500 mb-0.5">Placed On</p>
            <p className="text-sm font-medium text-neutral-300">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <OrderStatusBadge status={order.orderStatus} />
          <PaymentStatusBadge status={order.paymentStatus} />
          <span className="text-base sm:text-lg font-black text-white">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>

      {/* Date (mobile only) */}
      <div className="sm:hidden px-5 py-2 bg-neutral-950/40 border-b border-white/5">
        <p className="text-xs text-neutral-500">
          Placed on <span className="text-neutral-300 font-medium">{formatDate(order.createdAt)}</span>
        </p>
      </div>

      {/* Items preview */}
      <div className="px-5 sm:px-6 py-4 space-y-2.5">
        {previewItems.map((item, idx) => (
          <ItemRow key={item._id || idx} item={item} />
        ))}

        {remainingCount > 0 && (
          <p className="text-xs text-neutral-500">
            +{remainingCount} more item{remainingCount > 1 ? 's' : ''} — view order for full list
          </p>
        )}
      </div>

      {/* Card footer */}
      <div className="px-5 sm:px-6 py-3 border-t border-white/10 bg-neutral-950/40 flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-600 hidden sm:block">
          {allItems.length} item{allItems.length !== 1 ? 's' : ''}
        </p>
        <Link
          to={`/orders/${order._id}`}
          className="text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer flex items-center gap-1"
        >
          View details
          <svg
            className="h-3.5 w-3.5"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  )
}


// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/70 overflow-hidden animate-pulse">
      <div className="px-5 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3 border-b border-white/10">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-4 w-36 rounded-full bg-white/10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 rounded-full bg-white/10" />
          <div className="h-5 w-14 rounded-full bg-white/10" />
          <div className="h-6 w-20 rounded-full bg-white/15" />
        </div>
      </div>
      <div className="px-5 sm:px-6 py-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-48 rounded-full bg-white/10" />
              <div className="h-3 w-24 rounded-full bg-white/5" />
            </div>
            <div className="h-4 w-16 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
      <div className="px-5 sm:px-6 py-3 border-t border-white/10 bg-neutral-950/40">
        <div className="h-3 w-20 rounded-full bg-white/5" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrders = () => {
    setLoading(true)
    setError(null)
    api.get('/orders')
      .then((response) => {
        if (response.data?.success) {
          setOrders(response.data.orders || [])
        } else {
          setError(response.data?.message || 'Failed to load orders.')
        }
      })
      .catch((err) => {
        const message =
          err.response?.data?.message ||
          err.message ||
          'Unable to load your orders. Please check your connection and try again.'
        setError(message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-purple-600/15 via-purple-900/5 to-transparent blur-3xl opacity-70 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-3 mb-1">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30">
              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">My Orders</h1>
          </div>
          <p className="text-sm text-neutral-500 ml-11">
            Your complete purchase history on TrendVolt
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4" role="status" aria-label="Loading orders">
            <OrderSkeleton />
            <OrderSkeleton />
            <OrderSkeleton />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Could Not Load Orders</h2>
            <p className="text-sm text-red-300 mb-6 max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={fetchOrders}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-neutral-900/75 p-10 sm:p-14 shadow-2xl backdrop-blur-xl text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">No Orders Yet</h2>
            <p className="text-sm text-neutral-400 mb-8 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t placed any orders yet. Start exploring our fashion collection and make your first purchase.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/products"
                id="orders-shop-now-btn"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 shadow-xl cursor-pointer"
              >
                <span>Shop Now</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {/* Orders list */}
        {!loading && !error && orders.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-neutral-500">
                {orders.length} order{orders.length !== 1 ? 's' : ''} found
              </p>
              <Link
                to="/products"
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium cursor-pointer"
              >
                Continue Shopping →
              </Link>
            </div>

            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-sm text-neutral-500 mb-4">Looking for something new?</p>
              <Link
                to="/products"
                id="orders-browse-catalog-btn"
                className="inline-flex items-center gap-2 rounded-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-xl shadow-purple-900/40 cursor-pointer"
              >
                Browse Catalog
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default OrdersPage
