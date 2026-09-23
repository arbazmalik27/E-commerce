import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'

// ─── Helpers & Formatters ───────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

const ALLOWED_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

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

// ─── Main Admin Orders Component ────────────────────────────────────────────

function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [toast, setToast] = useState(null) // { type: 'success' | 'error', message: string }

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/orders/admin')
      if (res.data?.success) {
        setOrders(res.data.orders || [])
      } else {
        setError(res.data?.message || 'Failed to fetch admin orders.')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load customer orders. Please check your connection and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // Handle Order Status Update
  const handleStatusChange = async (orderId, newStatus) => {
    if (updatingOrderId === orderId) return
    setUpdatingOrderId(orderId)

    try {
      const res = await api.patch(`/orders/${orderId}/status`, { status: newStatus })
      if (res.data?.success && res.data.order) {
        const updated = res.data.order
        // Safely update state preserving populated user info
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId
              ? { ...o, orderStatus: updated.orderStatus, updatedAt: updated.updatedAt }
              : o
          )
        )
        // If details modal is open for this order, update it too
        setSelectedOrder((prev) =>
          prev && prev._id === orderId
            ? { ...prev, orderStatus: updated.orderStatus, updatedAt: updated.updatedAt }
            : prev
        )
        setToast({
          type: 'success',
          message: `Order status updated to "${updated.orderStatus}".`,
        })
      } else {
        setToast({
          type: 'error',
          message: res.data?.message || 'Failed to update order status.',
        })
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update order status.',
      })
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== 'all' && order.orderStatus !== statusFilter) {
        return false
      }
      // Payment filter
      if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter) {
        return false
      }
      // Search query filter (Order #, customer name, email, or shipping name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const orderNum = (order.orderNumber || '').toLowerCase()
        const userName = (order.user?.name || '').toLowerCase()
        const userEmail = (order.user?.email || '').toLowerCase()
        const shippingName = (order.shippingAddress?.fullName || '').toLowerCase()
        const matches =
          orderNum.includes(q) ||
          userName.includes(q) ||
          userEmail.includes(q) ||
          shippingName.includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [orders, statusFilter, paymentFilter, searchQuery])

  // Metrics Counters
  const metrics = useMemo(() => {
    const total = orders.length
    const pendingCount = orders.filter(
      (o) => o.orderStatus === 'pending' || o.orderStatus === 'processing'
    ).length
    const deliveredCount = orders.filter((o) => o.orderStatus === 'delivered').length
    const revenue = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    return { total, pendingCount, deliveredCount, revenue }
  }, [orders])

  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in max-w-md">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/90 border-red-500/40 text-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-white/60 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* =========================================================================
            HEADER & BREADCRUMB
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="text-xs uppercase font-mono tracking-wider text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Admin Hub
              </Link>
              <span className="text-white/20">/</span>
              <Eyebrow>ORDER OPERATIONS</Eyebrow>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
              Customer Orders
            </h1>
            <p className="mt-2 text-sm text-neutral-400 max-w-2xl">
              Inspect verified luxury fashion purchases, oversee fulfillment progression, and update order statuses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              title="Refresh Orders"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-neutral-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-200 hover:text-white hover:border-white/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            METRICS STRIP
           ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">Total Orders</p>
            <p className="mt-1 text-2xl font-black text-white">{metrics.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">Pending / Processing</p>
            <p className="mt-1 text-2xl font-black text-amber-300">{metrics.pendingCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">Delivered</p>
            <p className="mt-1 text-2xl font-black text-emerald-400">{metrics.deliveredCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
            <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">Paid Revenue</p>
            <p className="mt-1 text-2xl font-black text-purple-300">
              {formatCurrency(metrics.revenue)}
            </p>
          </div>
        </div>

        {/* =========================================================================
            SEARCH & FILTER CONTROLS
           ========================================================================= */}
        <div className="p-4 rounded-2xl bg-neutral-900/70 border border-white/10 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, customer, email..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-white/10 bg-neutral-950/80 text-xs font-medium text-white placeholder-neutral-500 focus:outline-hidden focus:border-purple-400 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Order Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="admin-filter-order-status" className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Status:
              </label>
              <select
                id="admin-filter-order-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-white/10 bg-neutral-950/80 px-3 text-xs font-medium text-white focus:outline-hidden focus:border-purple-400 transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="admin-filter-payment-status" className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Payment:
              </label>
              <select
                id="admin-filter-payment-status"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-white/10 bg-neutral-950/80 px-3 text-xs font-medium text-white focus:outline-hidden focus:border-purple-400 transition-all"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================================
            LOADING SKELETON
           ========================================================================= */}
        {loading && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-8 space-y-4">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-10 bg-white/5 rounded-xl w-full" />
            </div>
            <div className="space-y-3 animate-pulse pt-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-xl w-full" />
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            ERROR STATE
           ========================================================================= */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-8 text-center max-w-lg mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-white uppercase tracking-wider">Failed to Load Orders</h3>
            <p className="mt-1 text-xs text-red-300">{error}</p>
            <button
              type="button"
              onClick={loadOrders}
              className="mt-5 min-h-[44px] px-6 py-2 rounded-full bg-white text-neutral-950 font-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* =========================================================================
            EMPTY STATE
           ========================================================================= */}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-12 text-center max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-white uppercase tracking-wider">No Orders Found</h3>
            <p className="mt-1 text-xs text-neutral-400">
              {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
                ? 'No customer orders match your search and filter criteria.'
                : 'No customer orders have been placed in the store yet.'}
            </p>
            {(searchQuery || statusFilter !== 'all' || paymentFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter('all')
                  setPaymentFilter('all')
                }}
                className="mt-5 min-h-[44px] px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* =========================================================================
            DESKTOP DATA TABLE (Screens >= 1024px)
           ========================================================================= */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="hidden lg:block rounded-2xl border border-white/10 bg-neutral-900/70 shadow-2xl overflow-hidden backdrop-blur-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  <th className="py-4 pl-6 pr-3">Order Number & Date</th>
                  <th className="py-4 px-3">Customer</th>
                  <th className="py-4 px-3">Items</th>
                  <th className="py-4 px-3">Total Amount</th>
                  <th className="py-4 px-3">Payment</th>
                  <th className="py-4 px-3">Order Status & Lifecycle</th>
                  <th className="py-4 pl-3 pr-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredOrders.map((order) => {
                  const itemCount = Array.isArray(order.items)
                    ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                    : 0
                  const isUpdating = updatingOrderId === order._id

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-white/5 transition-colors duration-150 group"
                    >
                      {/* Order Number & Date */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="font-mono text-sm font-bold text-white">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-3">
                        <div className="font-medium text-white truncate max-w-[180px]">
                          {order.user?.name || order.shippingAddress?.fullName || 'Customer'}
                        </div>
                        <div className="text-xs text-neutral-400 truncate max-w-[180px]">
                          {order.user?.email || '—'}
                        </div>
                      </td>

                      {/* Item Count */}
                      <td className="py-4 px-3">
                        <div className="text-xs font-semibold text-neutral-300">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {order.items?.length || 0} unique line{order.items?.length === 1 ? '' : 's'}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-3 font-mono font-bold text-white">
                        {formatCurrency(order.totalAmount)}
                      </td>

                      {/* Payment Status */}
                      <td className="py-4 px-3">
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </td>

                      {/* Order Status & Admin Status Updater */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2.5">
                          <OrderStatusBadge status={order.orderStatus} />
                          <div className="relative">
                            <select
                              aria-label={`Update status for order ${order.orderNumber}`}
                              value={order.orderStatus}
                              disabled={isUpdating}
                              onChange={(e) => handleStatusChange(order._id, e.target.value)}
                              className="min-h-[36px] rounded-lg border border-white/10 bg-neutral-950/80 px-2 py-1 text-xs font-medium text-neutral-300 hover:text-white focus:outline-hidden focus:border-purple-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {ALLOWED_ORDER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  Set: {ORDER_STATUS_STYLES[status]?.label || status}
                                </option>
                              ))}
                            </select>
                            {isUpdating && (
                              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                <svg
                                  className="w-3 h-3 text-purple-400 animate-spin"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* View Details Action */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-200 hover:text-white text-xs font-semibold tracking-wider uppercase transition-colors active:scale-95 cursor-pointer border border-white/10"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================================================
            TABLET & MOBILE RESPONSIVE CARDS (Screens < 1024px)
           ========================================================================= */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="lg:hidden space-y-4">
            {filteredOrders.map((order) => {
              const itemCount = Array.isArray(order.items)
                ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                : 0
              const isUpdating = updatingOrderId === order._id

              return (
                <article
                  key={order._id}
                  className="rounded-2xl border border-white/10 bg-neutral-900/80 p-5 shadow-xl backdrop-blur-md space-y-4"
                >
                  {/* Card Header: Order # & Badges */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/5 pb-3">
                    <div>
                      <h2 className="font-mono text-sm font-bold text-white">
                        {order.orderNumber}
                      </h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PaymentStatusBadge status={order.paymentStatus} />
                      <OrderStatusBadge status={order.orderStatus} />
                    </div>
                  </div>

                  {/* Customer & Order Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-500 font-mono uppercase tracking-wider block">Customer</span>
                      <span className="text-white font-medium block truncate">
                        {order.user?.name || order.shippingAddress?.fullName || 'Customer'}
                      </span>
                      <span className="text-neutral-400 block truncate text-[11px]">
                        {order.user?.email || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-mono uppercase tracking-wider block">Total Amount</span>
                      <span className="text-white font-bold font-mono text-sm block">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <span className="text-neutral-400 block text-[11px]">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>

                  {/* Status Updater Control & Details Button */}
                  <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <label
                        htmlFor={`mobile-status-${order._id}`}
                        className="text-xs font-mono uppercase tracking-wider text-neutral-400 shrink-0"
                      >
                        Status:
                      </label>
                      <select
                        id={`mobile-status-${order._id}`}
                        aria-label={`Update status for order ${order.orderNumber}`}
                        value={order.orderStatus}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs font-medium text-white focus:outline-hidden focus:border-purple-400 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {ALLOWED_ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            Set: {ORDER_STATUS_STYLES[status]?.label || status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-neutral-200 hover:text-white text-xs font-semibold tracking-wider uppercase transition-colors active:scale-95 cursor-pointer border border-white/10 text-center"
                    >
                      View Details
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* =========================================================================
            ORDER DETAILS MODAL
           ========================================================================= */}
        {selectedOrder && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-neutral-900 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-purple-400">
                      Order Details
                    </span>
                    <span className="text-white/20">&bull;</span>
                    <span className="text-xs text-neutral-400">
                      {formatDate(selectedOrder.createdAt)}
                    </span>
                  </div>
                  <h2 id="order-details-title" className="text-xl font-mono font-bold text-white mt-1">
                    {selectedOrder.orderNumber}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close modal"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Controls inside Modal */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-neutral-950/60 border border-white/5">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block">Payment</span>
                    <PaymentStatusBadge status={selectedOrder.paymentStatus} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-neutral-400 block">Order Status</span>
                    <OrderStatusBadge status={selectedOrder.orderStatus} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="modal-order-status" className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                    Change Status:
                  </label>
                  <select
                    id="modal-order-status"
                    aria-label={`Change status for order ${selectedOrder.orderNumber}`}
                    value={selectedOrder.orderStatus}
                    disabled={updatingOrderId === selectedOrder._id}
                    onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value)}
                    className="min-h-[44px] rounded-xl border border-white/10 bg-neutral-900 px-3 text-xs font-medium text-white focus:outline-hidden focus:border-purple-400 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {ALLOWED_ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {ORDER_STATUS_STYLES[status]?.label || status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer & Shipping Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-neutral-950/40 border border-white/5 space-y-1 text-xs">
                  <h3 className="font-mono uppercase tracking-wider text-neutral-400 text-[11px] mb-2 font-semibold">
                    Customer Details
                  </h3>
                  <p className="text-white font-medium">{selectedOrder.user?.name || '—'}</p>
                  <p className="text-neutral-300">{selectedOrder.user?.email || '—'}</p>
                  <p className="text-neutral-400">Account ID: {selectedOrder.user?._id || '—'}</p>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950/40 border border-white/5 space-y-1 text-xs">
                  <h3 className="font-mono uppercase tracking-wider text-neutral-400 text-[11px] mb-2 font-semibold">
                    Delivery Address
                  </h3>
                  <p className="text-white font-medium">{selectedOrder.shippingAddress?.fullName || '—'}</p>
                  <p className="text-neutral-300">{selectedOrder.shippingAddress?.addressLine || '—'}</p>
                  <p className="text-neutral-300">
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}{' '}
                    {selectedOrder.shippingAddress?.postalCode}
                  </p>
                  <p className="text-neutral-400">
                    Phone: {selectedOrder.shippingAddress?.phone || '—'}
                  </p>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-3">
                <h3 className="font-mono uppercase tracking-wider text-neutral-400 text-[11px] font-semibold">
                  Items ({selectedOrder.items?.length || 0})
                </h3>
                <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-neutral-950/40 overflow-hidden">
                  {selectedOrder.items?.map((item, idx) => {
                    const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null
                    return (
                      <div key={item._id || idx} className="p-3 sm:p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-neutral-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              <img src={img} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-neutral-500 font-mono">No img</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{item.name}</p>
                            <p className="text-xs text-neutral-400">
                              Qty: {item.quantity} &times; {formatCurrency(item.price)}
                            </p>
                          </div>
                        </div>
                        <div className="font-mono text-sm font-bold text-white shrink-0">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-xl bg-neutral-950/60 border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-400">
                  <span>Shipping Fee</span>
                  <span className="font-mono">{formatCurrency(selectedOrder.shippingFee)}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold text-white">
                  <span>Total Amount</span>
                  <span className="font-mono text-base text-purple-300">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminOrdersPage
