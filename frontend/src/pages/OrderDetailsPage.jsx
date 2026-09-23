import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

// ─── Status Badges ────────────────────────────────────────────────────────────

const ORDER_STATUS_STYLES = {
  pending:    { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Pending'    },
  confirmed:  { bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-300',    dot: 'bg-blue-400',    label: 'Confirmed'  },
  processing: { bg: 'bg-purple-500/15',  border: 'border-purple-500/30',  text: 'text-purple-300',  dot: 'bg-purple-400',  label: 'Processing' },
  shipped:    { bg: 'bg-cyan-500/15',    border: 'border-cyan-500/30',    text: 'text-cyan-300',    dot: 'bg-cyan-400',    label: 'Shipped'    },
  delivered:  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Delivered'  },
  cancelled:  { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-300',     dot: 'bg-red-400',     label: 'Cancelled'  },
}

const PAYMENT_STATUS_STYLES = {
  pending: { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Pending' },
  paid:    { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Paid'    },
  failed:  { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-300',     dot: 'bg-red-400',     label: 'Failed'  },
}

function OrderStatusBadge({ status }) {
  const s = ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  )
}

function PaymentStatusBadge({ status }) {
  const s = PAYMENT_STATUS_STYLES[status] || PAYMENT_STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header skeleton */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5 sm:p-6 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="h-5 w-44 rounded-full bg-white/10" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-white/10" />
            <div className="h-6 w-16 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="h-3 w-36 rounded-full bg-white/5" />
      </div>
      {/* Items skeleton */}
      <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5 sm:p-6 space-y-4">
        <div className="h-4 w-20 rounded-full bg-white/10" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-48 rounded-full bg-white/10" />
              <div className="h-3 w-28 rounded-full bg-white/5" />
            </div>
            <div className="h-4 w-20 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
      {/* Bottom two panels skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5 h-32" />
        <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5 h-32" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function OrderDetailsPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setError(null)
    setNotFound(false)

    api.get(`/orders/${id}`)
      .then((response) => {
        if (response.data?.success && response.data.order) {
          setOrder(response.data.order)
        } else {
          setError('Order could not be loaded.')
        }
      })
      .catch((err) => {
        const status = err.response?.status
        if (status === 404) {
          setNotFound(true)
        } else if (status === 401 || status === 403) {
          setNotFound(true)
        } else {
          setError(
            err.response?.data?.message ||
            'Unable to load order details. Please check your connection and try again.'
          )
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  const shipping = order?.shippingAddress || {}
  const items = order?.items || []

  return (
    <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-purple-600/15 via-purple-900/5 to-transparent blur-3xl opacity-70 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back link */}
        <div className="mb-6">
          <Link
            to="/orders"
            id="order-details-back-btn"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer group"
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Orders
          </Link>
        </div>

        {/* Loading */}
        {loading && <DetailSkeleton />}

        {/* Not Found / Unauthorized */}
        {!loading && notFound && (
          <div
            role="alert"
            className="rounded-2xl border border-white/10 bg-neutral-900/75 p-10 sm:p-14 text-center"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 border border-white/10 text-neutral-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-white mb-2">Order Not Found</h1>
            <p className="text-sm text-neutral-400 mb-8 max-w-sm mx-auto">
              This order does not exist or you don&apos;t have permission to view it.
            </p>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              ← Back to Orders
            </Link>
          </div>
        )}

        {/* API Error */}
        {!loading && error && (
          <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Could Not Load Order</h2>
            <p className="text-sm text-red-300 mb-6 max-w-sm mx-auto">{error}</p>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              ← Back to Orders
            </Link>
          </div>
        )}

        {/* Order content */}
        {!loading && !error && !notFound && order && (
          <div className="space-y-4">

            {/* ── Order Header Card ── */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-sm shadow-xl overflow-hidden">
              <div className="px-5 sm:px-6 py-5 sm:py-6">
                {/* Order number + date row */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Order Number</p>
                    <p className="font-mono text-base sm:text-lg font-bold text-purple-300">{order.orderNumber}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {formatDate(order.createdAt)}
                      {order.createdAt && (
                        <span className="ml-1 text-neutral-600">at {formatTime(order.createdAt)}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 mb-1">Order Total</p>
                    <p className="text-2xl sm:text-3xl font-black text-white">{formatCurrency(order.totalAmount)}</p>
                  </div>
                </div>

                {/* Status row */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Order Status</span>
                    <OrderStatusBadge status={order.orderStatus} />
                  </div>
                  <div className="hidden sm:block h-4 w-px bg-white/10" aria-hidden="true" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">Payment</span>
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Order Items Card ── */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-sm shadow-xl overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-white/10">
                <h2 className="text-sm font-semibold text-neutral-200">
                  Items ({items.length})
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {items.map((item, idx) => {
                  const imgSrc = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null
                  return (
                    <div
                      key={item._id || idx}
                      className="flex items-center gap-4 px-5 sm:px-6 py-4"
                    >
                      {/* Product image */}
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-neutral-800 flex items-center justify-center">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <svg className="h-7 w-7 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-100 truncate">{item.name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>

                      {/* Item subtotal */}
                      <p className="text-sm font-bold text-white shrink-0">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Bottom: Shipping + Price Breakdown ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Shipping Address */}
              <div className="rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-sm shadow-xl p-5 sm:p-6">
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                  Delivery Address
                </h2>
                <address className="not-italic text-sm text-neutral-300 leading-relaxed space-y-0.5">
                  <p className="font-semibold text-neutral-100">{shipping.fullName}</p>
                  <p className="text-neutral-400">{shipping.phone}</p>
                  <p>{shipping.addressLine}</p>
                  <p>{shipping.city}, {shipping.state} – {shipping.postalCode}</p>
                  <p>{shipping.country}</p>
                </address>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-sm shadow-xl p-5 sm:p-6">
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                  Price Breakdown
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span>− {formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400">
                    <span>Shipping</span>
                    <span>{Number(order.shippingFee) === 0 ? 'Free' : formatCurrency(order.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-white/10 pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Back to Orders CTA */}
            <div className="pt-2">
              <Link
                to="/orders"
                className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors cursor-pointer group"
              >
                <svg
                  className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Orders
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default OrderDetailsPage
