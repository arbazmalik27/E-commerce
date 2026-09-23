import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { selectUser } from '../features/auth/authSlice'
import {
  fetchCart,
  resetCart,
  selectCart,
} from '../features/cart/cartSlice'
import api from '../services/api'
import { loadRazorpayScript } from '../utils/loadRazorpay'

function CheckoutPage() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const { items, totalItems, totalAmount, loading: cartLoading, initialized: cartInitialized } =
    useSelector(selectCart)

  // Controlled form state
  const [formData, setFormData] = useState(() => ({
    fullName: user?.name || '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  }))

  // Validation errors & touched tracking
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Submission & Payment state
  const [paymentState, setPaymentState] = useState('idle')
  // 'idle' | 'creating_order' | 'creating_payment' | 'opening_razorpay' | 'processing_payment' | 'verifying_payment' | 'payment_success' | 'payment_failed' | 'payment_cancelled'
  const [serverError, setServerError] = useState(null)
  const [createdOrder, setCreatedOrder] = useState(null)
  const [verifiedOrder, setVerifiedOrder] = useState(null)

  const isSubmitting =
    paymentState === 'creating_order' ||
    paymentState === 'creating_payment' ||
    paymentState === 'opening_razorpay' ||
    paymentState === 'verifying_payment'

  const buttonLoadingText =
    paymentState === 'creating_order'
      ? 'Creating Order...'
      : paymentState === 'creating_payment'
        ? 'Initializing Payment...'
        : paymentState === 'opening_razorpay'
          ? 'Opening Razorpay...'
          : paymentState === 'verifying_payment'
            ? 'Verifying Payment...'
            : 'Processing...'

  // Ensure cart data is loaded on mount
  useEffect(() => {
    if (!cartInitialized) {
      dispatch(fetchCart())
    }
  }, [dispatch, cartInitialized])

  // Fetch user's saved addresses to prefill or select
  const [savedAddresses, setSavedAddresses] = useState([])
  useEffect(() => {
    let isMounted = true
    api
      .get('/users/addresses')
      .then((res) => {
        if (isMounted && res.data?.success && Array.isArray(res.data.addresses)) {
          setSavedAddresses(res.data.addresses)
          const defaultAddr = res.data.addresses.find((a) => a.isDefault) || res.data.addresses[0]
          if (defaultAddr) {
            setFormData((prev) => ({
              ...prev,
              fullName: defaultAddr.fullName || prev.fullName,
              phone: defaultAddr.phone || prev.phone,
              addressLine: defaultAddr.addressLine || prev.addressLine,
              city: defaultAddr.city || prev.city,
              state: defaultAddr.state || prev.state,
              postalCode: defaultAddr.postalCode || prev.postalCode,
              country: defaultAddr.country || prev.country,
            }))
          }
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  // Form field change handler
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  // Mark field as touched on blur
  const handleBlur = (e) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    validateField(name, formData[name])
  }

  // Validate single field
  const validateField = (name, value) => {
    let error = null
    const val = (value || '').trim()

    switch (name) {
      case 'fullName':
        if (!val) error = 'Full name is required'
        break
      case 'phone':
        if (!val) {
          error = 'Phone number is required'
        } else if (val.length < 5 || val.length > 20) {
          error = 'Phone number must be between 5 and 20 characters'
        }
        break
      case 'addressLine':
        if (!val) error = 'Street address is required'
        break
      case 'city':
        if (!val) error = 'City is required'
        break
      case 'state':
        if (!val) error = 'State is required'
        break
      case 'postalCode':
        if (!val) error = 'Postal code is required'
        break
      case 'country':
        if (!val) error = 'Country is required'
        break
      default:
        break
    }

    setErrors((prev) => {
      const next = { ...prev }
      if (error) {
        next[name] = error
      } else {
        delete next[name]
      }
      return next
    })

    return !error
  }

  // Validate all fields prior to submit
  const validateForm = () => {
    const newErrors = {}
    const fields = ['fullName', 'phone', 'addressLine', 'city', 'state', 'postalCode', 'country']

    fields.forEach((field) => {
      const val = (formData[field] || '').trim()
      if (!val) {
        newErrors[field] = 'This field is required'
      } else if (field === 'phone' && (val.length < 5 || val.length > 20)) {
        newErrors[field] = 'Phone number must be between 5 and 20 characters'
      }
    })

    setErrors(newErrors)
    setTouched(
      fields.reduce((acc, f) => {
        acc[f] = true
        return acc
      }, {})
    )

    return Object.keys(newErrors).length === 0
  }

  // Verify payment with backend signature check
  const handleVerifyPayment = async (targetOrder, razorpayResponse) => {
    setPaymentState('verifying_payment')
    setServerError(null)

    try {
      const response = await api.post('/payments/verify', {
        orderId: targetOrder._id,
        razorpayOrderId: razorpayResponse.razorpay_order_id,
        razorpayPaymentId: razorpayResponse.razorpay_payment_id,
        razorpaySignature: razorpayResponse.razorpay_signature,
      })

      if (response.data?.success && response.data.order) {
        setVerifiedOrder(response.data.order)
        setPaymentState('payment_success')
      } else {
        throw new Error(response.data?.message || 'Payment signature verification failed.')
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Payment verification failed. If your account was debited, please contact support with your order number.'
      setServerError(message)
      setPaymentState('payment_failed')
    }
  }

  // Initiate Razorpay payment modal
  const initiateRazorpayPayment = async (targetOrder) => {
    if (!targetOrder || !targetOrder._id) return

    setPaymentState('creating_payment')
    setServerError(null)

    try {
      const response = await api.post('/payments/create-order', {
        orderId: targetOrder._id,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to create payment order.')
      }

      const { razorpayOrderId, amount, currency, keyId: backendKeyId } = response.data
      const resolvedKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || backendKeyId

      if (!resolvedKeyId) {
        throw new Error(
          'Razorpay Key ID is not configured. Please set VITE_RAZORPAY_KEY_ID in environment variables.'
        )
      }

      setPaymentState('opening_razorpay')
      const scriptLoaded = await loadRazorpayScript()

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          'Failed to load Razorpay payment gateway. Please check your internet connection and try again.'
        )
      }

      const options = {
        key: resolvedKeyId,
        amount: amount,
        currency: currency || 'INR',
        name: 'TrendVolt',
        description: `Order #${targetOrder.orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {
          name: formData.fullName.trim() || user?.name || '',
          email: user?.email || '',
          contact: formData.phone.trim() || '',
        },
        notes: {
          orderId: targetOrder._id,
          orderNumber: targetOrder.orderNumber,
        },
        theme: {
          color: '#7c3aed',
        },
        handler: async function (razorpayResponse) {
          await handleVerifyPayment(targetOrder, razorpayResponse)
        },
        modal: {
          ondismiss: function () {
            setPaymentState('payment_cancelled')
            setServerError(
              'Payment was cancelled. Your order has been saved and you can complete payment whenever you are ready.'
            )
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
          'Payment processing failed. Please try again or use another payment method.'
        setServerError(errorDesc)
        setPaymentState('payment_failed')
      })

      setPaymentState('processing_payment')
      rzpInstance.open()
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Unable to initialize payment. Please try again.'
      setServerError(message)
      setPaymentState('payment_failed')
    }
  }

  // Handle order submission & trigger payment
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setServerError(null)

    if (!validateForm()) {
      return
    }

    if (!items || items.length === 0) {
      setServerError('Your cart is empty. Cannot create an order.')
      return
    }

    setPaymentState('creating_order')

    try {
      const response = await api.post('/orders', {
        shippingAddress: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          addressLine: formData.addressLine.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim(),
        },
      })

      if (response.data?.success && response.data.order) {
        // Synchronize Redux cart state (backend empties cart on order creation)
        dispatch(resetCart())
        const newOrder = response.data.order
        setCreatedOrder(newOrder)
        await initiateRazorpayPayment(newOrder)
      } else {
        setServerError(response.data?.message || 'Failed to place order.')
        setPaymentState('idle')
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).join(', ')
          : 'Unable to place order. Please check your connection and try again.')
      setServerError(message)
      setPaymentState('idle')
    }
  }

  // Handle retry payment on existing saved order
  const handleRetryPayment = async () => {
    if (createdOrder) {
      await initiateRazorpayPayment(createdOrder)
    } else {
      await handleSubmit()
    }
  }

  // =========================================================================
  // VERIFYING PAYMENT LOADER OVERLAY / FULL SCREEN VIEW
  // =========================================================================
  if (paymentState === 'verifying_payment') {
    return (
      <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden flex items-center justify-center">
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-purple-600/20 via-purple-900/10 to-transparent blur-3xl opacity-75 -z-10"
          aria-hidden="true"
        />
        <div className="max-w-md mx-auto px-4 sm:px-6 w-full">
          <div className="rounded-3xl border border-purple-500/30 bg-neutral-900/90 p-8 sm:p-10 shadow-2xl backdrop-blur-xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/15 text-purple-400 mb-6 border border-purple-500/30">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-purple-400 border-t-transparent" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Verifying Payment
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-sm mx-auto">
              Please wait while we confirm your transaction with Razorpay. Do not refresh or close this window.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // SUCCESSFUL PAYMENT CONFIRMATION SCREEN
  // =========================================================================
  if (paymentState === 'payment_success' && (verifiedOrder || createdOrder)) {
    const activeOrder = verifiedOrder || createdOrder
    const shipping = activeOrder.shippingAddress || {}

    return (
      <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
        {/* Ambient Glow */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-emerald-600/20 via-purple-900/10 to-transparent blur-3xl opacity-75 -z-10"
          aria-hidden="true"
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/15 bg-neutral-900/85 p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl text-center">
            {/* Payment Verified Success Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 mb-6 border border-emerald-500/30">
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-3">
              Payment Verified
            </span>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              Payment Successful!
            </h1>
            <p className="text-sm sm:text-base text-neutral-300 mb-8 max-w-lg mx-auto">
              Thank you for your purchase. Your payment has been verified and your order is confirmed.
            </p>

            {/* Order Details Card */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5 sm:p-6 text-left space-y-4 mb-8">
              {/* Order Number & Total */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                <div>
                  <span className="text-xs text-neutral-400 block mb-0.5">Order Number</span>
                  <span className="text-sm sm:text-base font-mono font-bold text-purple-300">
                    {activeOrder.orderNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-400 block mb-0.5">Total Paid</span>
                  <span className="text-xl sm:text-2xl font-black text-white">
                    ₹{Number(activeOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status and Items Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-white/10">
                <div>
                  <span className="text-xs text-neutral-400 block mb-1">Payment Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    Paid
                  </span>
                </div>

                <div>
                  <span className="text-xs text-neutral-400 block mb-1">Order Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                    Confirmed
                  </span>
                </div>
              </div>

              {/* Shipping Destination */}
              <div>
                <span className="text-xs text-neutral-400 block mb-1">Delivery Address</span>
                <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
                  {shipping.fullName} • {shipping.phone}
                  <br />
                  {shipping.addressLine}
                  <br />
                  {shipping.city}, {shipping.state} - {shipping.postalCode}, {shipping.country}
                </p>
              </div>

              {/* Items List */}
              {Array.isArray(activeOrder.items) && activeOrder.items.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <span className="text-xs text-neutral-400 block mb-2">
                    Items ({activeOrder.items.length})
                  </span>
                  <div className="space-y-2">
                    {activeOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-neutral-300"
                      >
                        <span className="truncate max-w-[240px] sm:max-w-sm">
                          {item.name} <span className="text-neutral-500">× {item.quantity}</span>
                        </span>
                        <span className="font-semibold text-white">
                          ₹{Number(item.subtotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/orders"
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-950 hover:bg-neutral-200 active:scale-95 transition-all shadow-xl cursor-pointer"
              >
                <span>View My Orders</span>
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
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // ORDER CREATED / PAYMENT INCOMPLETE OR CANCELLED SCREEN
  // =========================================================================
  if (createdOrder) {
    const shipping = createdOrder.shippingAddress || {}
    const isCancelled = paymentState === 'payment_cancelled'
    const isFailed = paymentState === 'payment_failed'

    return (
      <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
        {/* Ambient Glow */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-amber-600/20 via-purple-900/10 to-transparent blur-3xl opacity-75 -z-10"
          aria-hidden="true"
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/15 bg-neutral-900/85 p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl text-center">
            {/* Status Icon */}
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-6 border ${
                isFailed
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {isFailed ? (
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              ) : (
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-3 border ${
                isFailed
                  ? 'bg-red-500/15 border-red-500/30 text-red-300'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}
            >
              {isCancelled ? 'Payment Cancelled' : isFailed ? 'Payment Failed' : 'Payment Pending'}
            </span>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
              {isCancelled ? 'Payment Window Closed' : isFailed ? 'Payment Not Completed' : 'Ready for Payment'}
            </h1>
            <p className="text-sm sm:text-base text-neutral-300 mb-6 max-w-lg mx-auto">
              {isCancelled
                ? 'You closed the Razorpay payment window. Your order has been saved and is ready for payment.'
                : isFailed
                  ? 'The transaction could not be completed. Your order has been saved and you can retry paying now.'
                  : 'Your order has been recorded in our system. Complete your payment below to confirm your purchase.'}
            </p>

            {/* Error Message Alert */}
            {serverError && (
              <div
                role="alert"
                className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm font-medium text-red-300 flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            {/* Order Details Card */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5 sm:p-6 text-left space-y-4 mb-8">
              {/* Order Number & Total */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                <div>
                  <span className="text-xs text-neutral-400 block mb-0.5">Order Number</span>
                  <span className="text-sm sm:text-base font-mono font-bold text-purple-300">
                    {createdOrder.orderNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-400 block mb-0.5">Total Amount</span>
                  <span className="text-xl sm:text-2xl font-black text-white">
                    ₹{Number(createdOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status and Items Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-white/10">
                <div>
                  <span className="text-xs text-neutral-400 block mb-1">Payment Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                    Pending Payment
                  </span>
                </div>

                <div>
                  <span className="text-xs text-neutral-400 block mb-1">Order Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                    Pending Processing
                  </span>
                </div>
              </div>

              {/* Shipping Destination */}
              <div>
                <span className="text-xs text-neutral-400 block mb-1">Delivery Address</span>
                <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed">
                  {shipping.fullName} • {shipping.phone}
                  <br />
                  {shipping.addressLine}
                  <br />
                  {shipping.city}, {shipping.state} - {shipping.postalCode}, {shipping.country}
                </p>
              </div>

              {/* Items List */}
              {Array.isArray(createdOrder.items) && createdOrder.items.length > 0 && (
                <div className="pt-3 border-t border-white/10">
                  <span className="text-xs text-neutral-400 block mb-2">
                    Items ({createdOrder.items.length})
                  </span>
                  <div className="space-y-2">
                    {createdOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-neutral-300"
                      >
                        <span className="truncate max-w-[240px] sm:max-w-sm">
                          {item.name} <span className="text-neutral-500">× {item.quantity}</span>
                        </span>
                        <span className="font-semibold text-white">
                          ₹{Number(item.subtotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-xl shadow-purple-900/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{buttonLoadingText}</span>
                  </>
                ) : (
                  <>
                    <span>Complete Payment Now</span>
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
                  </>
                )}
              </button>
              <Link
                to="/orders"
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                View My Orders
              </Link>
              <Link
                to="/products"
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // =========================================================================
  // LOADING CART STATE
  // =========================================================================
  if (cartLoading && !cartInitialized) {
    return (
      <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 w-48 rounded-xl bg-white/10" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-7 h-96 rounded-3xl bg-white/5 border border-white/10" />
              <div className="lg:col-span-5 h-80 rounded-3xl bg-white/5 border border-white/10" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // EMPTY CART STATE (CANNOT CHECKOUT)
  // =========================================================================
  if (cartInitialized && (!items || items.length === 0)) {
    return (
      <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-purple-600/15 via-purple-900/5 to-transparent blur-3xl opacity-70 -z-10"
          aria-hidden="true"
        />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl border border-white/10 bg-neutral-900/75 p-10 sm:p-14 shadow-2xl backdrop-blur-xl">
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
            <p className="text-sm text-neutral-400 mb-8 max-w-sm mx-auto leading-relaxed">
              You need to add items to your shopping cart before you can proceed with checkout.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/products"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 shadow-xl cursor-pointer"
              >
                <span>Browse Catalog</span>
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
                to="/cart"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                View Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // MAIN CHECKOUT FORM & SUMMARY
  // =========================================================================
  return (
    <div className="relative min-h-screen bg-neutral-950 text-white pt-28 sm:pt-32 lg:pt-36 pb-24 overflow-hidden">
      {/* Ambient Atmosphere Glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-purple-600/15 via-purple-900/5 to-transparent blur-3xl opacity-70 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-neutral-400"
        >
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/cart" className="hover:text-white transition-colors">
              Cart
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-neutral-200 font-medium">Checkout</span>
          </div>

          <Link
            to="/cart"
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
            <span>Back to Cart</span>
          </Link>
        </nav>

        {/* Header */}
        <div className="mb-10 pb-6 border-b border-white/10">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Checkout
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-neutral-400">
            Complete your shipping details to place your order.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm font-medium text-red-300 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-red-400"
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
              <span>{serverError}</span>
            </div>
            <button
              type="button"
              onClick={() => setServerError(null)}
              className="text-xs text-red-400 hover:text-white uppercase font-bold shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Grid: Left Form | Right Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* =================================================================
              LEFT COLUMN: SHIPPING FORM
             ================================================================= */}
          <div className="lg:col-span-7">
            <section
              aria-labelledby="shipping-heading"
              className="rounded-3xl border border-white/12 bg-neutral-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                  1
                </div>
                <h2
                  id="shipping-heading"
                  className="text-lg sm:text-xl font-bold uppercase tracking-wider text-white"
                >
                  Shipping Information
                </h2>
              </div>

              {savedAddresses.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl border border-purple-500/25 bg-purple-950/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
                        Saved Delivery Addresses
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Choose a saved destination to quickly prefill your shipping fields.
                      </span>
                    </div>
                    <select
                      aria-label="Select saved delivery address"
                      onChange={(e) => {
                        const selected = savedAddresses.find((a) => a._id === e.target.value)
                        if (selected) {
                          setFormData({
                            fullName: selected.fullName || '',
                            phone: selected.phone || '',
                            addressLine: selected.addressLine || '',
                            city: selected.city || '',
                            state: selected.state || '',
                            postalCode: selected.postalCode || '',
                            country: selected.country || 'India',
                          })
                          setErrors({})
                        }
                      }}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl border border-white/15 bg-neutral-950 text-xs text-white focus:outline-hidden focus:border-purple-400 cursor-pointer"
                    >
                      <option value="">Select an address...</option>
                      {savedAddresses.map((addr) => (
                        <option key={addr._id} value={addr._id}>
                          {addr.fullName} — {addr.city} ({addr.postalCode}) {addr.isDefault ? '★ Default' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
                  >
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g. Rahul Sharma"
                    className={`w-full rounded-xl border bg-neutral-950/80 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none focus:ring-2 ${
                      touched.fullName && errors.fullName
                        ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-white/15 focus:border-purple-400 focus:ring-purple-500/30'
                    }`}
                  />
                  {touched.fullName && errors.fullName && (
                    <p className="mt-1.5 text-xs text-red-400 font-medium" role="alert">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
                  >
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g. +91 98765 43210"
                    className={`w-full rounded-xl border bg-neutral-950/80 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none focus:ring-2 ${
                      touched.phone && errors.phone
                        ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-white/15 focus:border-purple-400 focus:ring-purple-500/30'
                    }`}
                  />
                  {touched.phone && errors.phone && (
                    <p className="mt-1.5 text-xs text-red-400 font-medium" role="alert">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Street Address */}
                <div>
                  <label
                    htmlFor="addressLine"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
                  >
                    Street Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="addressLine"
                    name="addressLine"
                    autoComplete="street-address"
                    value={formData.addressLine}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Apartment, suite, unit, building, floor, street"
                    className={`w-full rounded-xl border bg-neutral-950/80 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none focus:ring-2 ${
                      touched.addressLine && errors.addressLine
                        ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-white/15 focus:border-purple-400 focus:ring-purple-500/30'
                    }`}
                  />
                  {touched.addressLine && errors.addressLine && (
                    <p className="mt-1.5 text-xs text-red-400 font-medium" role="alert">
                      {errors.addressLine}
                    </p>
                  )}
                </div>

                {/* City & State (2 columns on desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
                    >
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. Mumbai"
                      className={`w-full rounded-xl border bg-neutral-950/80 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none focus:ring-2 ${
                        touched.city && errors.city
                          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-white/15 focus:border-purple-400 focus:ring-purple-500/30'
                      }`}
                    />
                    {touched.city && errors.city && (
                      <p className="mt-1.5 text-xs text-red-400 font-medium" role="alert">
                        {errors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="state"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
                    >
                      State <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      autoComplete="address-level1"
                      value={formData.state}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. Maharashtra"
                      className={`w-full rounded-xl border bg-neutral-950/80 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none focus:ring-2 ${
                        touched.state && errors.state
                          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-white/15 focus:border-purple-400 focus:ring-purple-500/30'
                      }`}
                    />
                    {touched.state && errors.state && (
                      <p className="mt-1.5 text-xs text-red-400 font-medium" role="alert">
                        {errors.state}
                      </p>
                    )}
                  </div>
                </div>

                {/* Postal Code & Country (2 columns on desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label
                      htmlFor="postalCode"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
                    >
                      Postal Code / PIN <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      name="postalCode"
                      autoComplete="postal-code"
                      value={formData.postalCode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. 400001"
                      className={`w-full rounded-xl border bg-neutral-950/80 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none focus:ring-2 ${
                        touched.postalCode && errors.postalCode
                          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-white/15 focus:border-purple-400 focus:ring-purple-500/30'
                      }`}
                    />
                    {touched.postalCode && errors.postalCode && (
                      <p className="mt-1.5 text-xs text-red-400 font-medium" role="alert">
                        {errors.postalCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="country"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
                    >
                      Country <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      autoComplete="country-name"
                      value={formData.country}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="e.g. India"
                      className={`w-full rounded-xl border bg-neutral-950/80 px-4 py-3 text-sm text-white placeholder-neutral-500 transition-colors focus:outline-none focus:ring-2 ${
                        touched.country && errors.country
                          ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                          : 'border-white/15 focus:border-purple-400 focus:ring-purple-500/30'
                      }`}
                    />
                    {touched.country && errors.country && (
                      <p className="mt-1.5 text-xs text-red-400 font-medium" role="alert">
                        {errors.country}
                      </p>
                    )}
                  </div>
                </div>

                {/* Primary Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-950 transition-all duration-300 hover:bg-neutral-200 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin text-neutral-950"
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>{buttonLoadingText}</span>
                      </>
                    ) : (
                      <>
                        <span>Pay with Razorpay</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                  <p className="mt-2.5 text-[11px] text-center text-neutral-400">
                    By placing your order, you agree to TrendVolt terms of service.
                  </p>
                </div>
              </form>
            </section>
          </div>

          {/* =================================================================
              RIGHT COLUMN: ORDER SUMMARY
             ================================================================= */}
          <div className="lg:col-span-5">
            <aside
              aria-labelledby="summary-heading"
              className="rounded-3xl border border-white/12 bg-neutral-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl sticky top-28 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h2
                  id="summary-heading"
                  className="text-base sm:text-lg font-bold uppercase tracking-wider text-white"
                >
                  Order Summary
                </h2>
                <span className="text-xs font-semibold text-purple-300">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items List Preview */}
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {items.map((item) => {
                  const product = item.product || {}
                  const imageUrl =
                    Array.isArray(product.images) && product.images.length > 0
                      ? product.images[0]
                      : null
                  return (
                    <div
                      key={item._id || product._id}
                      className="flex items-center gap-3.5 p-2 rounded-xl bg-neutral-950/50 border border-white/5"
                    >
                      <div className="h-14 w-14 shrink-0 rounded-lg border border-white/10 bg-neutral-950 overflow-hidden flex items-center justify-center p-1">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] uppercase font-bold text-neutral-600">
                            Item
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {product.name || 'Product'}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Qty: {item.quantity} × ₹{Number(product.price).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-white">
                          ₹{Number(item.itemTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-3 pt-4 border-t border-white/10 text-xs sm:text-sm text-neutral-300">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Cart Subtotal</span>
                  <span className="font-semibold text-white">
                    ₹{Number(totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Delivery / Shipping</span>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Free
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Estimated Taxes</span>
                  <span className="text-xs text-neutral-500">Included</span>
                </div>

                <hr className="my-4 border-t border-white/10" />

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-base font-bold text-white block">Order Total</span>
                    <span className="text-[11px] text-neutral-400">All taxes included</span>
                  </div>
                  <span className="text-2xl font-black text-white tracking-tight">
                    ₹{Number(totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-neutral-500 text-xs">
                <svg
                  className="h-3.5 w-3.5 text-purple-400 shrink-0"
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
                <span>Encrypted checkout information</span>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
