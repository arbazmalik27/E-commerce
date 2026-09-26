import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api from '../services/api'
import { selectUser } from '../features/auth/authSlice'
import { fetchCart } from '../features/cart/cartSlice'
import { loadRazorpayScript } from '../utils/loadRazorpay'
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
  pending: { bg: 'bg-[#FAF7F0]',       border: 'border-[#DED7CA]',       text: 'text-[#A86B2D]', dot: 'bg-[#A86B2D]', label: 'Pending' },
  paid:    { bg: 'bg-[#34452F]/10',    border: 'border-[#34452F]/20',    text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Paid'    },
  failed:  { bg: 'bg-[#A65332]/10',    border: 'border-[#A65332]/20',    text: 'text-[#A65332]', dot: 'bg-[#A65332]', label: 'Failed'  },
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
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading order details">
      {/* Header skeleton */}
      <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-6 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-[#EEE7DC]" />
            <div className="h-5 w-44 rounded-full bg-[#EEE7DC]" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-[#EEE7DC]" />
            <div className="h-6 w-16 rounded-full bg-[#EEE7DC]" />
          </div>
        </div>
        <div className="h-3 w-36 rounded-full bg-[#EEE7DC]" />
      </div>
      {/* Items skeleton */}
      <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-6 space-y-4">
        <div className="h-4 w-20 rounded-full bg-[#EEE7DC]" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-[#EEE7DC] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-48 rounded-full bg-[#EEE7DC]" />
              <div className="h-3 w-28 rounded-full bg-[#EEE7DC]" />
            </div>
            <div className="h-4 w-20 rounded-full bg-[#EEE7DC]" />
          </div>
        ))}
      </div>
      {/* Bottom two panels skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 h-36" />
        <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 h-36" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const isPaymentEligible = (order) => {
  if (!order) return false
  if (order.paymentStatus === 'paid') return false
  if (['cancelled', 'delivered', 'shipped'].includes(order.orderStatus)) return false
  return true
}

function OrderDetailsPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [retryLoading, setRetryLoading] = useState(false)
  const [paymentState, setPaymentState] = useState('idle')
  // 'idle' | 'opening_razorpay' | 'verifying' | 'success' | 'failed' | 'cancelled'
  const [paymentMessage, setPaymentMessage] = useState(null)

  const fetchOrder = useCallback(() => {
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
        if (status === 404 || status === 401 || status === 403) {
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

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchOrder()
  }, [fetchOrder])

  // Handle Razorpay Payment Retry for Existing Pending Order
  const handleRetryPayment = async () => {
    if (!order || retryLoading) return
    if (!isPaymentEligible(order)) return

    setRetryLoading(true)
    setPaymentState('opening_razorpay')
    setPaymentMessage(null)

    try {
      // 1. Create/reuse Razorpay order for this exact application order
      const response = await api.post('/payments/create-order', {
        orderId: order._id,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to initiate payment.')
      }

      const { razorpayOrderId, amount, currency, keyId: backendKeyId } = response.data
      const resolvedKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || backendKeyId

      if (!resolvedKeyId) {
        throw new Error('Razorpay Key ID is not configured.')
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Failed to load Razorpay payment gateway. Please check your connection.')
      }

      // 3. Open Razorpay modal with existing order snapshot details
      const options = {
        key: resolvedKeyId,
        amount: amount,
        currency: currency || 'INR',
        name: 'TrendVolt',
        description: `Order #${order.orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {
          name: order.shippingAddress?.fullName || user?.name || '',
          email: user?.email || '',
          contact: order.shippingAddress?.phone || '',
        },
        notes: {
          orderId: order._id,
          orderNumber: order.orderNumber,
        },
        theme: {
          color: '#34452F', // TrendVolt luxury brand olive
        },
        handler: async function (razorpayResponse) {
          setPaymentState('verifying')
          setPaymentMessage('Verifying payment with bank...')
          try {
            const verifyRes = await api.post('/payments/verify', {
              orderId: order._id,
              razorpayOrderId: razorpayResponse.razorpay_order_id,
              razorpayPaymentId: razorpayResponse.razorpay_payment_id,
              razorpaySignature: razorpayResponse.razorpay_signature,
            })

            if (verifyRes.data?.success && verifyRes.data.order) {
              setOrder(verifyRes.data.order)
              setPaymentState('success')
              setPaymentMessage('Payment successful! Your order has been confirmed.')
              dispatch(fetchCart())
            } else {
              throw new Error(verifyRes.data?.message || 'Payment verification failed.')
            }
          } catch (verifyErr) {
            const msg =
              verifyErr.response?.data?.message ||
              verifyErr.message ||
              'Payment verification failed. If your account was debited, please contact support.'
            setPaymentState('failed')
            setPaymentMessage(msg)
          } finally {
            setRetryLoading(false)
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentState('cancelled')
            setPaymentMessage('Payment attempt was cancelled. Your order remains saved and pending.')
            setRetryLoading(false)
          },
          escape: true,
          backdropclose: false,
        },
      }

      const rzpInstance = new window.Razorpay(options)

      rzpInstance.on('payment.failed', function (failureResponse) {
        const errorDesc =
          failureResponse?.error?.description ||
          failureResponse?.error?.reason ||
          'Payment failed. Please try again or use another payment method.'
        setPaymentState('failed')
        setPaymentMessage(errorDesc)
        setRetryLoading(false)
      })

      rzpInstance.open()
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Unable to initialize payment retry. Please try again.'
      setPaymentState('failed')
      setPaymentMessage(msg)
      setRetryLoading(false)
    }
  }

  const shipping = order?.shippingAddress || {}
  const items = order?.items || []

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb & Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#5F6057]"
        >
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#1F211C] transition-colors">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#DED7CA]">/</span>
            <Link to="/orders" className="hover:text-[#1F211C] transition-colors">
              My Orders
            </Link>
            {order && (
              <>
                <span aria-hidden="true" className="text-[#DED7CA]">/</span>
                <span className="text-[#1F211C] font-mono font-semibold truncate max-w-[180px] sm:max-w-none">
                  {order.orderNumber}
                </span>
              </>
            )}
          </div>

          <Link
            to="/orders"
            id="order-details-back-btn"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34452F] hover:text-[#263722] transition-colors group"
          >
            <svg
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Orders</span>
          </Link>
        </nav>

        {/* Loading */}
        {loading && <DetailSkeleton />}

        {/* Not Found / Unauthorized */}
        {!loading && notFound && (
          <div
            role="alert"
            className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-10 sm:p-14 text-center shadow-xs"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-[#5F6057]">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
              </svg>
            </div>
            <Eyebrow variant="neutral" className="mb-3">STATUS</Eyebrow>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] mb-2">Order Not Found</h1>
            <p className="text-sm text-[#5F6057] mb-8 max-w-sm mx-auto">
              This order does not exist or you don&apos;t have permission to view it.
            </p>
            <Link
              to="/orders"
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
            >
              ← Back to Orders
            </Link>
          </div>
        )}

        {/* API Error */}
        {!loading && error && (
          <div role="alert" className="rounded-2xl border border-[#A65332]/30 bg-[#FFFDF8] p-8 sm:p-12 text-center shadow-xs">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#A65332]/10 border border-[#A65332]/30 text-[#A65332]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C] mb-2">Could Not Load Order</h2>
            <p className="text-sm text-[#5F6057] mb-6 max-w-sm mx-auto">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={fetchOrder}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                Try Again
              </button>
              <Link
                to="/orders"
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#1F211C] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        )}

        {/* Order content */}
        {!loading && !error && !notFound && order && (
          <div className="space-y-6">

            {/* ── Order Header Card ── */}
            <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden">
              <div className="px-5 sm:px-8 py-6 sm:py-7">
                <Eyebrow variant="olive" className="mb-3">ORDER DETAILS</Eyebrow>

                {/* Order number + date + total row */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-[#85857A] mb-1">Order Identifier</p>
                    <h1 className="font-mono text-lg sm:text-2xl font-bold text-[#34452F]">{order.orderNumber}</h1>
                    <p className="text-xs sm:text-sm text-[#5F6057] mt-1.5">
                      Placed on {formatDate(order.createdAt)}
                      {order.createdAt && (
                        <span className="text-[#85857A]"> at {formatTime(order.createdAt)}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-[#85857A] mb-1">Order Total</p>
                    <p className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C]">{formatCurrency(order.totalAmount)}</p>
                  </div>
                </div>

                {/* Status row + Retry Payment */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-[#DED7CA]/70">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#5F6057]">Order:</span>
                      <OrderStatusBadge status={order.orderStatus} />
                    </div>
                    <div className="hidden sm:block h-4 w-px bg-[#DED7CA]" aria-hidden="true" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#5F6057]">Payment:</span>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </div>

                  {isPaymentEligible(order) && (
                    <button
                      id="retry-payment-btn"
                      onClick={handleRetryPayment}
                      disabled={retryLoading}
                      className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] disabled:bg-[#34452F]/60 disabled:cursor-not-allowed text-[#FFFDF8] text-xs font-bold uppercase tracking-wider px-6 py-2.5 transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                    >
                      {retryLoading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                          </svg>
                          <span>Retry Payment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Notification / Alert Banner */}
            {paymentMessage && (
              <div
                role="alert"
                id="payment-status-banner"
                className={`rounded-xl border p-4 sm:p-5 flex items-start gap-3 transition-all ${
                  paymentState === 'success'
                    ? 'border-[#3F6B45]/30 bg-[#3F6B45]/10 text-[#2B4B2F]'
                    : paymentState === 'verifying'
                    ? 'border-[#34452F]/30 bg-[#34452F]/10 text-[#34452F]'
                    : paymentState === 'cancelled'
                    ? 'border-[#A86B2D]/30 bg-[#FAF7F0] text-[#85521C]'
                    : 'border-[#A65332]/30 bg-[#FFFDF8] text-[#A65332]'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {paymentState === 'success' && (
                    <svg className="h-5 w-5 text-[#3F6B45]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {paymentState === 'verifying' && (
                    <svg className="animate-spin h-5 w-5 text-[#34452F]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {paymentState === 'cancelled' && (
                    <svg className="h-5 w-5 text-[#A86B2D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  )}
                  {paymentState === 'failed' && (
                    <svg className="h-5 w-5 text-[#A65332]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-sm leading-relaxed">
                  <p className="font-serif font-bold text-[#1F211C] mb-0.5">
                    {paymentState === 'success'
                      ? 'Payment Successful'
                      : paymentState === 'verifying'
                      ? 'Verifying Payment'
                      : paymentState === 'cancelled'
                      ? 'Payment Cancelled'
                      : 'Payment Failed'}
                  </p>
                  <p className="text-xs sm:text-sm text-[#5F6057]">{paymentMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentMessage(null)}
                  className="text-[#85857A] hover:text-[#1F211C] transition-colors cursor-pointer text-xs p-1"
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ── Order Items Card ── */}
            <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-[#DED7CA]/70 flex items-center justify-between">
                <h2 className="font-serif text-base font-bold text-[#1F211C]">
                  Purchased Items ({items.length})
                </h2>
                <span className="text-xs font-mono uppercase tracking-wider text-[#85857A]">
                  Historical Snapshot
                </span>
              </div>
              <div className="divide-y divide-[#DED7CA]/50">
                {items.map((item, idx) => {
                  const imgSrc = getProductImage(item)
                  return (
                    <div
                      key={item._id || idx}
                      className="flex items-center gap-4 px-5 sm:px-6 py-4 transition-colors hover:bg-[#FAF7F0]/50"
                    >
                      {/* Product image */}
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-[#DED7CA] bg-[#FAF7F0] p-1 flex items-center justify-center">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={item.name}
                            className="h-full w-full object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none' }}
                          />
                        ) : (
                          <svg className="h-7 w-7 text-[#85857A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1F211C] truncate">{item.name}</p>
                        <p className="text-xs text-[#5F6057] mt-0.5">
                          {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>

                      {/* Item subtotal */}
                      <p className="font-serif text-sm font-bold text-[#1F211C] shrink-0">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Bottom: Shipping + Price Breakdown ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Shipping Address */}
              <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34452F]" aria-hidden="true" />
                  <h2 className="text-[11px] font-mono font-bold text-[#5F6057] uppercase tracking-wider">
                    Delivery Address
                  </h2>
                </div>
                <address className="not-italic text-sm text-[#5F6057] leading-relaxed space-y-1">
                  <p className="font-semibold text-[#1F211C]">{shipping.fullName}</p>
                  <p className="text-xs font-mono text-[#85857A]">{shipping.phone}</p>
                  <p className="pt-1">{shipping.addressLine}</p>
                  <p>{shipping.city}, {shipping.state} – {shipping.postalCode}</p>
                  <p className="text-xs text-[#85857A]">{shipping.country}</p>
                </address>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#34452F]" aria-hidden="true" />
                  <h2 className="text-[11px] font-mono font-bold text-[#5F6057] uppercase tracking-wider">
                    Price Breakdown
                  </h2>
                </div>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between text-[#5F6057]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#1F211C]">{formatCurrency(order.subtotal)}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between text-[#3F6B45]">
                      <span>Discount</span>
                      <span className="font-medium">− {formatCurrency(order.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#5F6057]">
                    <span>Shipping</span>
                    <span className="font-medium text-[#1F211C]">
                      {Number(order.shippingFee) === 0 ? 'Free' : formatCurrency(order.shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline font-bold text-[#1F211C] border-t border-[#DED7CA] pt-3 mt-3">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="font-serif text-xl sm:text-2xl text-[#1F211C]">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Back to Orders CTA */}
            <div className="pt-4 flex items-center justify-between">
              <Link
                to="/orders"
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#EEE7DC] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#1F211C] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] group"
              >
                <svg
                  className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>Back to Orders</span>
              </Link>

              <Link
                to="/products"
                className="text-xs font-semibold text-[#34452F] hover:text-[#263722] transition-colors"
              >
                Continue Shopping →
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

export default OrderDetailsPage
