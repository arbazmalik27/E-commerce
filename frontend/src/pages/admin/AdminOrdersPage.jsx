import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'
import AdminNav from '../../components/AdminNav'
import { getProductImage } from '../../utils/productImageMap'

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
  pending:    { bg: 'bg-[#FAF7F0]',       border: 'border-[#DED7CA]',       text: 'text-[#A86B2D]', dot: 'bg-[#A86B2D]', label: 'Pending'     },
  confirmed:  { bg: 'bg-[#34452F]/10',    border: 'border-[#34452F]/20',    text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Confirmed'   },
  processing: { bg: 'bg-[#FAF7F0]',       border: 'border-[#DED7CA]',       text: 'text-[#5F6057]', dot: 'bg-[#5F6057]', label: 'Processing'  },
  shipped:    { bg: 'bg-[#34452F]/10',    border: 'border-[#34452F]/25',    text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Shipped'     },
  delivered:  { bg: 'bg-[#3F6B45]/15',    border: 'border-[#3F6B45]/30',    text: 'text-[#3F6B45]', dot: 'bg-[#3F6B45]', label: 'Delivered'   },
  cancelled:  { bg: 'bg-[#A65332]/10',    border: 'border-[#A65332]/25',    text: 'text-[#A65332]', dot: 'bg-[#A65332]', label: 'Cancelled'   },
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
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border ${
              toast.type === 'success'
                ? 'bg-[#34452F] border-[#263722] text-[#FFFDF8]'
                : 'bg-[#A65332] border-[#8D4428] text-[#FFFDF8]'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 text-[#FFFDF8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[#FFFDF8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-auto text-white/70 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* =========================================================================
            SUB-NAVIGATION BAR
           ========================================================================= */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <AdminNav />
          <div className="flex items-center gap-2 text-xs font-medium text-[#5F6057]">
            <span className="h-2 w-2 rounded-full bg-[#34452F]" />
            <span>Customer Purchase Log</span>
          </div>
        </div>

        {/* =========================================================================
            HEADER & BREADCRUMB
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#DED7CA]">
          <div>
            <div className="flex items-center gap-3">
              <Eyebrow variant="olive">ORDER OPERATIONS</Eyebrow>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20">
                Fulfillment Management
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#1F211C]">
              Customer Orders
            </h1>
            <p className="mt-2 text-sm text-[#5F6057] max-w-2xl leading-relaxed">
              Inspect verified luxury fashion purchases, oversee fulfillment progression, and update order lifecycle statuses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              title="Refresh Orders"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#1F211C] transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin text-[#34452F]' : 'text-[#5F6057]'}`}
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
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs">
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">Total Orders</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#1F211C]">{metrics.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs">
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">Pending / Processing</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#A86B2D]">{metrics.pendingCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs">
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">Delivered</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#3F6B45]">{metrics.deliveredCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs">
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">Paid Revenue</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#34452F]">
              {formatCurrency(metrics.revenue)}
            </p>
          </div>
        </div>

        {/* =========================================================================
            SEARCH & FILTER CONTROLS
           ========================================================================= */}
        <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#85857A]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order #, customer, email..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-xs font-medium text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Order Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="admin-filter-order-status" className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                Status:
              </label>
              <select
                id="admin-filter-order-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-all"
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
              <label htmlFor="admin-filter-payment-status" className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                Payment:
              </label>
              <select
                id="admin-filter-payment-status"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-all"
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
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-10 bg-[#EEE7DC] rounded-xl w-full" />
            </div>
            <div className="space-y-3 animate-pulse pt-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-[#EEE7DC] rounded-xl w-full" />
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            ERROR STATE
           ========================================================================= */}
        {!loading && error && (
          <div className="rounded-2xl border border-[#A65332]/30 bg-[#A65332]/10 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#A65332]/15 border border-[#A65332]/25 flex items-center justify-center mx-auto text-[#A65332]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-[#1F211C] uppercase tracking-wider">Failed to Load Orders</h3>
            <p className="mt-1 text-xs text-[#A65332]">{error}</p>
            <button
              type="button"
              onClick={loadOrders}
              className="mt-5 min-h-[44px] px-6 py-2 rounded-full bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* =========================================================================
            EMPTY STATE
           ========================================================================= */}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-12 text-center max-w-md mx-auto my-12 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#DED7CA] flex items-center justify-center mx-auto text-[#5F6057]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-serif font-bold text-[#1F211C]">No Orders Found</h3>
            <p className="mt-1 text-xs text-[#5F6057]">
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
                className="mt-5 min-h-[44px] px-5 py-2 rounded-full bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] border border-[#DED7CA] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
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
          <div className="hidden lg:block rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                  <th className="py-4 pl-6 pr-3 font-semibold">Order Number & Date</th>
                  <th className="py-4 px-3 font-semibold">Customer</th>
                  <th className="py-4 px-3 font-semibold">Items</th>
                  <th className="py-4 px-3 font-semibold">Total Amount</th>
                  <th className="py-4 px-3 font-semibold">Payment</th>
                  <th className="py-4 px-3 font-semibold">Order Status & Lifecycle</th>
                  <th className="py-4 pl-3 pr-6 text-right font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED7CA]/70 text-sm">
                {filteredOrders.map((order) => {
                  const itemCount = Array.isArray(order.items)
                    ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                    : 0
                  const isUpdating = updatingOrderId === order._id

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-[#FAF7F0] transition-colors duration-150 group"
                    >
                      {/* Order Number & Date */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="font-mono text-sm font-bold text-[#1F211C]">
                          {order.orderNumber}
                        </div>
                        <div className="text-xs text-[#5F6057] mt-0.5">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-3">
                        <div className="font-medium text-[#1F211C] truncate max-w-[180px]">
                          {order.user?.name || order.shippingAddress?.fullName || 'Customer'}
                        </div>
                        <div className="text-xs text-[#85857A] truncate max-w-[180px]">
                          {order.user?.email || '—'}
                        </div>
                      </td>

                      {/* Item Count */}
                      <td className="py-4 px-3">
                        <div className="text-xs font-semibold text-[#1F211C]">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </div>
                        <div className="text-[11px] text-[#85857A]">
                          {order.items?.length || 0} unique line{order.items?.length === 1 ? '' : 's'}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-3 font-mono font-bold text-[#1F211C]">
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
                              className="min-h-[36px] rounded-lg border border-[#DED7CA] bg-[#FAF7F0] px-2 py-1 text-xs font-medium text-[#1F211C] hover:border-[#34452F] focus:outline-hidden focus:border-[#34452F] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  className="w-3 h-3 text-[#34452F] animate-spin"
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
                          className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] text-xs font-semibold tracking-wider uppercase transition-colors active:scale-95 cursor-pointer border border-[#DED7CA]"
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
                  className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 shadow-xs space-y-4"
                >
                  {/* Card Header: Order # & Badges */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#DED7CA]/70 pb-3">
                    <div>
                      <h2 className="font-mono text-sm font-bold text-[#1F211C]">
                        {order.orderNumber}
                      </h2>
                      <p className="text-xs text-[#5F6057] mt-0.5">
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
                      <span className="text-[#85857A] font-mono uppercase tracking-wider block">Customer</span>
                      <span className="text-[#1F211C] font-medium block truncate">
                        {order.user?.name || order.shippingAddress?.fullName || 'Customer'}
                      </span>
                      <span className="text-[#5F6057] block truncate text-[11px]">
                        {order.user?.email || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#85857A] font-mono uppercase tracking-wider block">Total Amount</span>
                      <span className="text-[#1F211C] font-bold font-mono text-sm block">
                        {formatCurrency(order.totalAmount)}
                      </span>
                      <span className="text-[#5F6057] block text-[11px]">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>

                  {/* Status Updater Control & Details Button */}
                  <div className="pt-2 border-t border-[#DED7CA]/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <label
                        htmlFor={`mobile-status-${order._id}`}
                        className="text-xs font-mono uppercase tracking-wider text-[#5F6057] shrink-0"
                      >
                        Status:
                      </label>
                      <select
                        id={`mobile-status-${order._id}`}
                        aria-label={`Update status for order ${order.orderNumber}`}
                        value={order.orderStatus}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="min-h-[44px] flex-1 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 py-2 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-all cursor-pointer disabled:opacity-50"
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
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] text-xs font-semibold tracking-wider uppercase transition-colors active:scale-95 cursor-pointer border border-[#DED7CA] text-center"
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
            className="fixed inset-0 z-50 overflow-y-auto bg-[#1F211C]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          >
            <div className="relative w-full max-w-2xl rounded-3xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-[#1F211C]">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-[#DED7CA] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#34452F] font-semibold">
                      Order Details
                    </span>
                    <span className="text-[#DED7CA]">&bull;</span>
                    <span className="text-xs text-[#5F6057]">
                      {formatDate(selectedOrder.createdAt)}
                    </span>
                  </div>
                  <h2 id="order-details-title" className="text-xl font-serif font-bold text-[#1F211C] mt-1">
                    {selectedOrder.orderNumber}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  aria-label="Close modal"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] transition-colors cursor-pointer border border-[#DED7CA]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Controls inside Modal */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#5F6057] block mb-1">Payment</span>
                    <PaymentStatusBadge status={selectedOrder.paymentStatus} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#5F6057] block mb-1">Order Status</span>
                    <OrderStatusBadge status={selectedOrder.orderStatus} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="modal-order-status" className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                    Change Status:
                  </label>
                  <select
                    id="modal-order-status"
                    aria-label={`Change status for order ${selectedOrder.orderNumber}`}
                    value={selectedOrder.orderStatus}
                    disabled={updatingOrderId === selectedOrder._id}
                    onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value)}
                    className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FFFDF8] px-3 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-all cursor-pointer disabled:opacity-50"
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
                <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] space-y-1 text-xs">
                  <h3 className="font-mono uppercase tracking-wider text-[#34452F] text-[11px] mb-2 font-semibold">
                    Customer Details
                  </h3>
                  <p className="text-[#1F211C] font-semibold text-sm">{selectedOrder.user?.name || '—'}</p>
                  <p className="text-[#5F6057]">{selectedOrder.user?.email || '—'}</p>
                  <p className="text-[#85857A]">Account ID: {selectedOrder.user?._id || '—'}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] space-y-1 text-xs">
                  <h3 className="font-mono uppercase tracking-wider text-[#34452F] text-[11px] mb-2 font-semibold">
                    Delivery Address
                  </h3>
                  <p className="text-[#1F211C] font-semibold text-sm">{selectedOrder.shippingAddress?.fullName || '—'}</p>
                  <p className="text-[#5F6057]">{selectedOrder.shippingAddress?.addressLine || '—'}</p>
                  <p className="text-[#5F6057]">
                    {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}{' '}
                    {selectedOrder.shippingAddress?.postalCode}
                  </p>
                  <p className="text-[#85857A]">
                    Phone: {selectedOrder.shippingAddress?.phone || '—'}
                  </p>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-3">
                <h3 className="font-mono uppercase tracking-wider text-[#5F6057] text-[11px] font-semibold">
                  Items ({selectedOrder.items?.length || 0})
                </h3>
                <div className="divide-y divide-[#DED7CA]/70 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] overflow-hidden">
                  {selectedOrder.items?.map((item, idx) => {
                    const img = getProductImage(item)
                    return (
                      <div key={item._id || idx} className="p-3 sm:p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg bg-[#FFFDF8] border border-[#DED7CA] overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              <img src={img} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[9px] text-[#85857A] font-mono">No img</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1F211C]">{item.name}</p>
                            <p className="text-xs text-[#5F6057]">
                              Qty: {item.quantity} &times; {formatCurrency(item.price)}
                            </p>
                          </div>
                        </div>
                        <div className="font-mono text-sm font-bold text-[#1F211C] shrink-0">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] space-y-2 text-xs">
                <div className="flex justify-between text-[#5F6057]">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-[#3F6B45]">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#5F6057]">
                  <span>Shipping Fee</span>
                  <span className="font-mono">{formatCurrency(selectedOrder.shippingFee)}</span>
                </div>
                <div className="pt-2 border-t border-[#DED7CA] flex justify-between text-sm font-bold text-[#1F211C]">
                  <span>Total Amount</span>
                  <span className="font-serif font-bold text-base text-[#34452F]">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
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
