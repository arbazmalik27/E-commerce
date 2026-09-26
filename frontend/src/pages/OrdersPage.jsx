import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Eyebrow from '../components/Eyebrow'
import { getProductImage } from '../utils/productImageMap'

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

// ─── Status Badges (TrendVolt Editorial Palette) ──────────────────────────────

const ORDER_STATUS_STYLES = {
  pending:    { bg: 'bg-[#FAF7F0]',       border: 'border-[#DED7CA]',       text: 'text-[#A86B2D]', dot: 'bg-[#A86B2D]', label: 'Pending'    },
  confirmed:  { bg: 'bg-[#34452F]/10',    border: 'border-[#34452F]/20',    text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Confirmed'  },
  processing: { bg: 'bg-[#FAF7F0]',       border: 'border-[#DED7CA]',       text: 'text-[#5F6057]', dot: 'bg-[#5F6057]', label: 'Processing' },
  shipped:    { bg: 'bg-[#34452F]/10',    border: 'border-[#34452F]/25',    text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Shipped'    },
  delivered:  { bg: 'bg-[#3F6B45]/15',    border: 'border-[#3F6B45]/30',    text: 'text-[#3F6B45]', dot: 'bg-[#3F6B45]', label: 'Delivered'  },
  cancelled:  { bg: 'bg-[#A65332]/10',    border: 'border-[#A65332]/25',    text: 'text-[#A65332]', dot: 'bg-[#A65332]', label: 'Cancelled'  },
}

const PAYMENT_STATUS_STYLES = {
  pending: { bg: 'bg-[#FAF7F0]',    border: 'border-[#DED7CA]',    text: 'text-[#A86B2D]', label: 'Pending' },
  paid:    { bg: 'bg-[#34452F]/10', border: 'border-[#34452F]/20', text: 'text-[#34452F]', label: 'Paid'    },
  failed:  { bg: 'bg-[#A65332]/10', border: 'border-[#A65332]/20', text: 'text-[#A65332]', label: 'Failed'  },
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
  const [imgError, setImgError] = useState(false)
  const imgSrc = !imgError ? getProductImage(item) : null

  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-[#DED7CA] bg-[#FAF7F0] p-1 flex items-center justify-center">
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={item.name}
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <svg className="h-5 w-5 text-[#85857A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1F211C] font-medium truncate">{item.name}</p>
        <p className="text-xs text-[#5F6057]">{formatCurrency(item.price)} × {item.quantity}</p>
      </div>
      <p className="font-serif text-sm font-bold text-[#1F211C] shrink-0">{formatCurrency(item.subtotal)}</p>
    </div>
  )
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order }) {
  const allItems = order.items || []
  const previewItems = allItems.slice(0, 3)
  const remainingCount = allItems.length - previewItems.length

  return (
    <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden transition-all duration-300 hover:border-[#85857A]">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 sm:py-5 flex flex-wrap items-start justify-between gap-3 border-b border-[#DED7CA]/70">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#85857A] mb-0.5">Order Number</p>
            <p className="font-mono text-sm font-bold text-[#34452F]">{order.orderNumber}</p>
          </div>
          <div className="hidden sm:block h-8 w-px bg-[#DED7CA]" aria-hidden="true" />
          <div className="hidden sm:block">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#85857A] mb-0.5">Placed On</p>
            <p className="text-sm font-medium text-[#5F6057]">{formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <OrderStatusBadge status={order.orderStatus} />
          <PaymentStatusBadge status={order.paymentStatus} />
          <span className="font-serif text-base sm:text-lg font-bold text-[#1F211C]">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>

      {/* Date (mobile only) */}
      <div className="sm:hidden px-5 py-2 bg-[#FAF7F0] border-b border-[#DED7CA]/50">
        <p className="text-xs text-[#5F6057]">
          Placed on <span className="text-[#1F211C] font-medium">{formatDate(order.createdAt)}</span>
        </p>
      </div>

      {/* Items preview */}
      <div className="px-5 sm:px-6 py-4 space-y-3">
        {previewItems.map((item, idx) => (
          <ItemRow key={item._id || idx} item={item} />
        ))}

        {remainingCount > 0 && (
          <p className="text-xs text-[#85857A] pt-1">
            +{remainingCount} more item{remainingCount > 1 ? 's' : ''} — view order for full list
          </p>
        )}
      </div>

      {/* Card footer */}
      <div className="px-5 sm:px-6 py-3.5 border-t border-[#DED7CA]/70 bg-[#FAF7F0] flex items-center justify-between gap-3">
        <p className="text-xs text-[#5F6057] hidden sm:block">
          {allItems.length} item{allItems.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-3 ml-auto">
          {order.paymentStatus !== 'paid' && !['cancelled', 'delivered', 'shipped'].includes(order.orderStatus) && (
            <Link
              to={`/orders/${order._id}`}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
            >
              Pay Now →
            </Link>
          )}
          <Link
            to={`/orders/${order._id}`}
            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#EEE7DC] text-[#1F211C] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          >
            <span>View details</span>
            <svg
              className="h-3.5 w-3.5"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] overflow-hidden animate-pulse">
      <div className="px-5 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3 border-b border-[#DED7CA]/70">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full bg-[#EEE7DC]" />
          <div className="h-4 w-36 rounded-full bg-[#EEE7DC]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-16 rounded-full bg-[#EEE7DC]" />
          <div className="h-5 w-14 rounded-full bg-[#EEE7DC]" />
          <div className="h-6 w-20 rounded-full bg-[#EEE7DC]" />
        </div>
      </div>
      <div className="px-5 sm:px-6 py-4 space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#EEE7DC] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-48 rounded-full bg-[#EEE7DC]" />
              <div className="h-3 w-24 rounded-full bg-[#EEE7DC]" />
            </div>
            <div className="h-4 w-16 rounded-full bg-[#EEE7DC]" />
          </div>
        ))}
      </div>
      <div className="px-5 sm:px-6 py-3 border-t border-[#DED7CA]/70 bg-[#FAF7F0]">
        <div className="h-3 w-20 rounded-full bg-[#EEE7DC]" />
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
    window.scrollTo(0, 0)
    fetchOrders()
  }, [])

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#5F6057]"
        >
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#1F211C] transition-colors">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#DED7CA]">/</span>
            <span className="text-[#1F211C] font-semibold">My Orders</span>
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

        {/* Page Header */}
        <div className="mb-8 sm:mb-10">
          <Eyebrow variant="olive" className="mb-3">YOUR JOURNEY</Eyebrow>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1F211C] tracking-tight mb-2">
            My Orders
          </h1>
          <p className="text-sm sm:text-base text-[#5F6057]">
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
          <div role="alert" className="rounded-2xl border border-[#A65332]/30 bg-[#FFFDF8] p-8 sm:p-12 text-center shadow-xs">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#A65332]/10 border border-[#A65332]/30 text-[#A65332]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C] mb-2">Could Not Load Orders</h2>
            <p className="text-sm text-[#5F6057] mb-6 max-w-sm mx-auto">{error}</p>
            <button
              type="button"
              onClick={fetchOrders}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
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
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-10 sm:p-16 shadow-xs text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#34452F]/10 border border-[#34452F]/20 text-[#34452F]">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <Eyebrow variant="neutral" className="mb-3">YOUR JOURNEY</Eyebrow>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] tracking-tight mb-3">No Orders Yet</h2>
            <p className="text-sm text-[#5F6057] mb-8 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t placed any orders yet. Start exploring our fashion collection and make your first purchase.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/products"
                id="orders-shop-now-btn"
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <span>Shop Now</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#1F211C] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
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
              <p className="text-xs font-mono uppercase tracking-wider text-[#85857A]">
                {orders.length} order{orders.length !== 1 ? 's' : ''} found
              </p>
              <Link
                to="/products"
                className="text-xs font-semibold text-[#34452F] hover:text-[#263722] transition-colors cursor-pointer"
              >
                Continue Shopping →
              </Link>
            </div>

            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order._id} order={order} />
              ))}
            </div>

            <div className="mt-12 text-center p-8 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8]">
              <p className="font-serif text-lg font-bold text-[#1F211C] mb-2">Looking for something new?</p>
              <p className="text-xs text-[#5F6057] mb-5">Explore our latest seasonal collections and curated styles.</p>
              <Link
                to="/products"
                id="orders-browse-catalog-btn"
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] active:scale-95 text-[#FFFDF8] px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <span>Browse Catalog</span>
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
