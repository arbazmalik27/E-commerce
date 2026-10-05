import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { selectUser } from '../features/auth/authSlice'
import {
  fetchCart,
  selectCart,
} from '../features/cart/cartSlice'
import api from '../services/api'
import { loadRazorpayScript } from '../utils/loadRazorpay'
import Eyebrow from '../components/Eyebrow'
import { getProductImage } from '../utils/productImageMap'
import useSEO from '../hooks/useSEO'

function formatOfferInfo(offer) {
  if (offer.type === 'buy_x_get_y') {
    const buy = offer.buyQuantity || 1
    const free = offer.freeQuantity || 1
    const minReq = Math.max(10000, offer.minimumOrderValue || 0)
    return {
      title: `Buy ${buy} Get ${free} Free`,
      subtitle: `Buy ${buy} → Get ${free} Free`,
      minOrder: minReq,
    }
  }
  if (offer.type === 'percentage') {
    return {
      title: `${offer.value}% OFF`,
      subtitle: offer.maximumDiscount
        ? `Up to ₹${Number(offer.maximumDiscount).toLocaleString('en-IN')} off`
        : 'On your entire cart',
      minOrder: offer.minimumOrderValue || 0,
    }
  }
  if (offer.type === 'fixed') {
    return {
      title: `₹${Number(offer.value).toLocaleString('en-IN')} OFF`,
      subtitle: 'Flat discount on your cart',
      minOrder: offer.minimumOrderValue || 0,
    }
  }
  return {
    title: 'Special Offer',
    subtitle: 'Exclusive checkout offer',
    minOrder: offer.minimumOrderValue || 0,
  }
}

function CheckoutPage() {
  useSEO({
    title: 'Checkout',
    description: 'Complete your TrendVolt order securely with encrypted checkout and order verification.',
    canonical: '/checkout',
    noindex: true,
  })

  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const {
    items,
    totalItems,
    totalAmount,
    loading: cartLoading,
    initialized: cartInitialized,
    error: cartError,
  } = useSelector(selectCart)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

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

  // Coupon State
  const [couponInput, setCouponInput] = useState('')
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [applyingCode, setApplyingCode] = useState(null)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponFinalAmount, setCouponFinalAmount] = useState(null)
  const [couponFreeItems, setCouponFreeItems] = useState(0)
  const [couponEligibleQuantity, setCouponEligibleQuantity] = useState(0)
  const [couponError, setCouponError] = useState(null)
  const [bogoShortfall, setBogoShortfall] = useState(null)
  const [availableOffers, setAvailableOffers] = useState([])
  const [loadingOffers, setLoadingOffers] = useState(true)

  // Fetch active customer-visible offers from backend
  useEffect(() => {
    let isMounted = true
    api
      .get('/coupons/offers')
      .then((res) => {
        if (isMounted && res.data?.success && Array.isArray(res.data.offers)) {
          setAvailableOffers(res.data.offers)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingOffers(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Auto scroll to top on state transitions so headers and alerts are always visible
  useEffect(() => {
    if (createdOrder || paymentState === 'payment_cancelled' || paymentState === 'payment_failed') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [createdOrder, paymentState])

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
        dispatch(fetchCart())
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
          color: '#34452F',
        },
        handler: async function (razorpayResponse) {
          await handleVerifyPayment(targetOrder, razorpayResponse)
        },
        modal: {
          ondismiss: function () {
            setPaymentState('payment_cancelled')
            const msg =
              resolvedKeyId === 'rzp_test_placeholder_key'
                ? 'Razorpay was unable to initialize live transactions with placeholder credentials (rzp_test_placeholder_key). Please set valid Razorpay test keys in backend/.env to complete test payments.'
                : 'Payment was cancelled. Your order has been saved and you can complete payment whenever you are ready.'
            setServerError(msg)
          },
          escape: true,
          backdropclose: false,
        },
      }

      const rzpInstance = new window.Razorpay(options)

      rzpInstance.on('payment.failed', function (failureResponse) {
        let errorDesc =
          failureResponse?.error?.description ||
          failureResponse?.error?.reason ||
          'Payment processing failed. Please try again or use another payment method.'
        if (resolvedKeyId === 'rzp_test_placeholder_key') {
          errorDesc =
            'Razorpay test credentials are not configured (using placeholder key). To test real payment transactions, please set valid Razorpay credentials in backend/.env.'
        }
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

  // Apply coupon handler (unified for manual input and one-click offers)
  const handleApplyCoupon = async (eOrCode) => {
    let code = ''
    if (typeof eOrCode === 'string') {
      code = eOrCode
    } else {
      if (eOrCode && eOrCode.preventDefault) eOrCode.preventDefault()
      code = couponInput
    }

    const cleanCode = (code || '').trim().toUpperCase()
    if (!cleanCode) {
      setCouponError('Please enter a coupon code')
      return
    }

    setApplyingCoupon(true)
    setApplyingCode(cleanCode)
    setCouponError(null)
    setBogoShortfall(null)

    try {
      const res = await api.post('/coupons/validate', {
        code: cleanCode,
      })

      if (res.data?.success) {
        setAppliedCoupon(res.data.coupon)
        setCouponDiscount(res.data.discountAmount || 0)
        setCouponFinalAmount(res.data.finalAmount)
        setCouponFreeItems(res.data.freeItems || 0)
        setCouponEligibleQuantity(res.data.eligibleQuantity || 0)
        setCouponInput('')
        setCouponError(null)
        setBogoShortfall(null)
      } else {
        throw new Error(res.data?.message || 'Unable to apply coupon')
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid coupon code'
      setCouponError(message)
      if (err.response?.data?.details?.shortfall) {
        setBogoShortfall(err.response.data.details.shortfall)
      }
    } finally {
      setApplyingCoupon(false)
      setApplyingCode(null)
    }
  }

  // Remove coupon handler
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponDiscount(0)
    setCouponFinalAmount(null)
    setCouponFreeItems(0)
    setCouponEligibleQuantity(0)
    setCouponError(null)
    setBogoShortfall(null)
  }

  // Revalidate coupon when cart contents or subtotal change
  useEffect(() => {
    let isMounted = true
    if (!appliedCoupon) return
    if (!items || items.length === 0) {
      queueMicrotask(() => {
        if (isMounted) {
          handleRemoveCoupon()
        }
      })
      return
    }

    api
      .post('/coupons/validate', { code: appliedCoupon.code })
      .then((res) => {
        if (!isMounted) return
        if (res.data?.success) {
          setCouponDiscount(res.data.discountAmount || 0)
          setCouponFinalAmount(res.data.finalAmount)
          setCouponFreeItems(res.data.freeItems || 0)
          setCouponEligibleQuantity(res.data.eligibleQuantity || 0)
          setCouponError(null)
          setBogoShortfall(null)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        const msg = err.response?.data?.message || 'Coupon is no longer applicable to your cart'
        setCouponError(msg)
        handleRemoveCoupon()
      })

    return () => {
      isMounted = false
    }
  }, [items, totalAmount, appliedCoupon])

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
      const orderPayload = {
        shippingAddress: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          addressLine: formData.addressLine.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim(),
        },
      }

      if (appliedCoupon && appliedCoupon.code) {
        orderPayload.couponCode = appliedCoupon.code
      }

      const response = await api.post('/orders', orderPayload)

      if (response.data?.success && response.data.order) {
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
      <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 sm:px-6 w-full">
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-8 sm:p-10 shadow-xs text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#34452F]/10 text-[#34452F] mb-6 border border-[#34452F]/20">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#34452F] border-t-transparent" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] tracking-tight mb-2">
              Verifying Payment
            </h1>
            <p className="text-sm text-[#5F6057] leading-relaxed max-w-sm mx-auto">
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
      <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-10 lg:p-12 shadow-xs text-center">
            {/* Payment Verified Success Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#3F6B45]/10 text-[#3F6B45] mb-6 border border-[#3F6B45]/30">
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

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3F6B45]/10 border border-[#3F6B45]/30 px-3 py-1 text-xs font-semibold text-[#3F6B45] uppercase tracking-widest mb-3">
              Payment Verified
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F211C] tracking-tight mb-2">
              Payment Successful!
            </h1>
            <p className="text-sm sm:text-base text-[#5F6057] mb-8 max-w-lg mx-auto">
              Thank you for your purchase. Your payment has been verified and your order is confirmed.
            </p>

            {/* Order Details Card */}
            <div className="rounded-xl border border-[#DED7CA] bg-[#FAF7F0] p-5 sm:p-6 text-left space-y-4 mb-8">
              {/* Order Number & Total */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#DED7CA]">
                <div>
                  <span className="text-xs text-[#5F6057] block mb-0.5">Order Number</span>
                  <span className="text-sm sm:text-base font-mono font-bold text-[#A65332]">
                    {activeOrder.orderNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#5F6057] block mb-0.5">Total Paid</span>
                  <span className="font-serif text-xl sm:text-2xl font-black text-[#1F211C]">
                    ₹{Number(activeOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status and Items Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#DED7CA]">
                <div>
                  <span className="text-xs text-[#5F6057] block mb-1">Payment Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3F6B45]/10 border border-[#3F6B45]/30 px-2.5 py-0.5 text-xs font-semibold text-[#3F6B45]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#3F6B45]" aria-hidden="true" />
                    Paid
                  </span>
                </div>

                <div>
                  <span className="text-xs text-[#5F6057] block mb-1">Order Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34452F]/10 border border-[#34452F]/30 px-2.5 py-0.5 text-xs font-semibold text-[#34452F]">
                    Confirmed
                  </span>
                </div>
              </div>

              {/* Shipping Destination */}
              <div>
                <span className="text-xs text-[#5F6057] block mb-1">Delivery Address</span>
                <p className="text-xs sm:text-sm text-[#1F211C] font-medium leading-relaxed">
                  {shipping.fullName} • {shipping.phone}
                  <br />
                  {shipping.addressLine}
                  <br />
                  {shipping.city}, {shipping.state} - {shipping.postalCode}, {shipping.country}
                </p>
              </div>

              {/* Items List */}
              {Array.isArray(activeOrder.items) && activeOrder.items.length > 0 && (
                <div className="pt-3 border-t border-[#DED7CA]">
                  <span className="text-xs text-[#5F6057] block mb-2">
                    Items ({activeOrder.items.length})
                  </span>
                  <div className="space-y-2">
                    {activeOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-[#5F6057]"
                      >
                        <span className="truncate max-w-[240px] sm:max-w-sm text-[#1F211C]">
                          {item.name} <span className="text-[#85857A]">× {item.quantity}</span>
                        </span>
                        <span className="font-serif font-bold text-[#1F211C]">
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
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] active:scale-95 transition-all shadow-xs cursor-pointer"
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
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
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
      <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-10 lg:p-12 shadow-xs text-center">
            {/* Status Icon */}
            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-6 border ${
                isFailed
                  ? 'bg-[#A65332]/10 text-[#A65332] border-[#A65332]/30'
                  : 'bg-[#A86B2D]/10 text-[#A86B2D] border-[#A86B2D]/30'
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
                  ? 'bg-[#A65332]/10 border-[#A65332]/30 text-[#A65332]'
                  : 'bg-[#A86B2D]/10 border-[#A86B2D]/30 text-[#A86B2D]'
              }`}
            >
              {isCancelled ? 'Payment Cancelled' : isFailed ? 'Payment Failed' : 'Payment Pending'}
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F211C] tracking-tight mb-2">
              {isCancelled ? 'Payment Window Closed' : isFailed ? 'Payment Not Completed' : 'Ready for Payment'}
            </h1>
            <p className="text-sm sm:text-base text-[#5F6057] mb-6 max-w-lg mx-auto">
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
                className="mb-8 rounded-xl border border-[#A65332]/30 bg-[#A65332]/10 p-4 text-xs sm:text-sm font-medium text-[#A65332] flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 shrink-0 text-[#A65332]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            {/* Order Details Card */}
            <div className="rounded-xl border border-[#DED7CA] bg-[#FAF7F0] p-5 sm:p-6 text-left space-y-4 mb-8">
              {/* Order Number & Total */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#DED7CA]">
                <div>
                  <span className="text-xs text-[#5F6057] block mb-0.5">Order Number</span>
                  <span className="text-sm sm:text-base font-mono font-bold text-[#A65332]">
                    {createdOrder.orderNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#5F6057] block mb-0.5">Total Amount</span>
                  <span className="font-serif text-xl sm:text-2xl font-black text-[#1F211C]">
                    ₹{Number(createdOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status and Items Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#DED7CA]">
                <div>
                  <span className="text-xs text-[#5F6057] block mb-1">Payment Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#A86B2D]/10 border border-[#A86B2D]/30 px-2.5 py-0.5 text-xs font-semibold text-[#A86B2D]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#A86B2D]" aria-hidden="true" />
                    Pending Payment
                  </span>
                </div>

                <div>
                  <span className="text-xs text-[#5F6057] block mb-1">Order Status</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34452F]/10 border border-[#34452F]/30 px-2.5 py-0.5 text-xs font-semibold text-[#34452F]">
                    Pending Processing
                  </span>
                </div>
              </div>

              {/* Shipping Destination */}
              <div>
                <span className="text-xs text-[#5F6057] block mb-1">Delivery Address</span>
                <p className="text-xs sm:text-sm text-[#1F211C] font-medium leading-relaxed">
                  {shipping.fullName} • {shipping.phone}
                  <br />
                  {shipping.addressLine}
                  <br />
                  {shipping.city}, {shipping.state} - {shipping.postalCode}, {shipping.country}
                </p>
              </div>

              {/* Items List */}
              {Array.isArray(createdOrder.items) && createdOrder.items.length > 0 && (
                <div className="pt-3 border-t border-[#DED7CA]">
                  <span className="text-xs text-[#5F6057] block mb-2">
                    Items ({createdOrder.items.length})
                  </span>
                  <div className="space-y-2">
                    {createdOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-[#5F6057]"
                      >
                        <span className="truncate max-w-[240px] sm:max-w-sm text-[#1F211C]">
                          {item.name} <span className="text-[#85857A]">× {item.quantity}</span>
                        </span>
                        <span className="font-serif font-bold text-[#1F211C]">
                          ₹{Number(item.subtotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prominent Bottom Alert if Payment Error Occurred */}
            {serverError && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xl border border-[#A65332]/30 bg-[#A65332]/10 text-xs sm:text-sm text-[#A65332] text-center font-medium max-w-lg mx-auto"
              >
                {serverError}
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] active:scale-95 text-[#FFFDF8] px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
              <button
                type="button"
                onClick={() => {
                  setCreatedOrder(null)
                  setPaymentState('idle')
                  setServerError(null)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Edit Shipping Address
              </button>
              <Link
                to="/cart"
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back to Cart
              </Link>
              <Link
                to="/orders"
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                View My Orders
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
  if (!cartInitialized || (cartLoading && (!items || items.length === 0))) {
    return (
      <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 w-48 rounded-xl bg-[#EEE7DC]" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-7 h-96 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA]" />
              <div className="lg:col-span-5 h-80 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // CART ERROR STATE
  // =========================================================================
  if (!cartLoading && cartError && (!items || items.length === 0)) {
    return (
      <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl border border-[#A65332]/30 bg-[#FFFDF8] p-8 sm:p-14 shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#A65332]/10 text-[#A65332] mb-4 border border-[#A65332]/30">
              <svg
                className="h-8 w-8"
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
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] tracking-tight mb-2">
              Unable to Load Cart
            </h1>
            <p className="text-sm text-[#5F6057] mb-8 max-w-sm mx-auto">
              {cartError}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => dispatch(fetchCart())}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <span>Retry</span>
              </button>
              <Link
                to="/cart"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#1F211C] transition-colors cursor-pointer"
              >
                Return to Cart
              </Link>
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
      <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-28 sm:pt-32 lg:pt-36 pb-20 overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-10 sm:p-14 shadow-xs">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#34452F]/10 text-[#34452F] mb-6 border border-[#34452F]/20">
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
            <div className="flex justify-center mb-3">
              <Eyebrow variant="olive">CHECKOUT</Eyebrow>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] tracking-tight mb-3">
              Your Cart is Empty
            </h1>
            <p className="text-sm text-[#5F6057] mb-8 max-w-sm mx-auto leading-relaxed">
              You need to add items to your shopping cart before you can proceed with checkout.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/products"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all active:scale-95 shadow-xs cursor-pointer"
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
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#1F211C] transition-colors cursor-pointer"
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
    <div className="min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-28 sm:pt-32 lg:pt-36 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#5F6057]"
        >
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#34452F] transition-colors">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#DED7CA]">/</span>
            <Link to="/cart" className="hover:text-[#34452F] transition-colors">
              Cart
            </Link>
            <span aria-hidden="true" className="text-[#DED7CA]">/</span>
            <span className="text-[#1F211C] font-semibold">Checkout</span>
          </div>

          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#34452F] hover:text-[#263722] transition-colors"
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
        <div className="mb-10 pb-6 border-b border-[#DED7CA]">
          <Eyebrow variant="olive">CHECKOUT</Eyebrow>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1F211C] tracking-tight mt-1">
            Complete Your Order
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#5F6057]">
            Review your shopping bag and enter your delivery details below.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            role="alert"
            className="mb-8 rounded-2xl border border-[#A65332]/30 bg-[#A65332]/10 p-4 text-xs sm:text-sm font-medium text-[#A65332] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-[#A65332]"
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
              className="text-xs text-[#A65332] hover:text-[#78361E] uppercase font-bold shrink-0 cursor-pointer"
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
          <div className="lg:col-span-7 min-w-0">
            <section
              aria-labelledby="shipping-heading"
              className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-7 lg:p-8 shadow-xs"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#34452F] text-[#FFFDF8] text-xs font-bold font-mono">
                  1
                </div>
                <h2
                  id="shipping-heading"
                  className="font-serif text-lg sm:text-xl font-bold uppercase tracking-wider text-[#1F211C]"
                >
                  Shipping Information
                </h2>
              </div>

              {savedAddresses.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-[#DED7CA] bg-[#FAF7F0]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[#34452F] uppercase tracking-wider block">
                        Saved Delivery Addresses
                      </span>
                      <span className="text-[11px] text-[#5F6057]">
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
                      className="w-full sm:w-auto max-w-full truncate min-h-[40px] px-3 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] text-xs text-[#1F211C] focus:outline-none focus:border-[#34452F] cursor-pointer"
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
                    className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5"
                  >
                    Full Name <span className="text-[#A65332]">*</span>
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
                    className={`w-full rounded-xl border bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] transition-colors focus:outline-none focus:ring-2 scroll-mt-32 ${
                      touched.fullName && errors.fullName
                        ? 'border-[#A65332]/60 focus:border-[#A65332] focus:ring-[#A65332]/20'
                        : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-[#34452F]/20'
                    }`}
                  />
                  {touched.fullName && errors.fullName && (
                    <p className="mt-1.5 text-xs text-[#A65332] font-medium" role="alert">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5"
                  >
                    Phone Number <span className="text-[#A65332]">*</span>
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
                    className={`w-full rounded-xl border bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] transition-colors focus:outline-none focus:ring-2 scroll-mt-32 ${
                      touched.phone && errors.phone
                        ? 'border-[#A65332]/60 focus:border-[#A65332] focus:ring-[#A65332]/20'
                        : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-[#34452F]/20'
                    }`}
                  />
                  {touched.phone && errors.phone && (
                    <p className="mt-1.5 text-xs text-[#A65332] font-medium" role="alert">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Street Address */}
                <div>
                  <label
                    htmlFor="addressLine"
                    className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5"
                  >
                    Street Address <span className="text-[#A65332]">*</span>
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
                    className={`w-full rounded-xl border bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] transition-colors focus:outline-none focus:ring-2 scroll-mt-32 ${
                      touched.addressLine && errors.addressLine
                        ? 'border-[#A65332]/60 focus:border-[#A65332] focus:ring-[#A65332]/20'
                        : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-[#34452F]/20'
                    }`}
                  />
                  {touched.addressLine && errors.addressLine && (
                    <p className="mt-1.5 text-xs text-[#A65332] font-medium" role="alert">
                      {errors.addressLine}
                    </p>
                  )}
                </div>

                {/* City & State (2 columns on desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5"
                    >
                      City <span className="text-[#A65332]">*</span>
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
                      className={`w-full rounded-xl border bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] transition-colors focus:outline-none focus:ring-2 scroll-mt-32 ${
                        touched.city && errors.city
                          ? 'border-[#A65332]/60 focus:border-[#A65332] focus:ring-[#A65332]/20'
                          : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-[#34452F]/20'
                      }`}
                    />
                    {touched.city && errors.city && (
                      <p className="mt-1.5 text-xs text-[#A65332] font-medium" role="alert">
                        {errors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="state"
                      className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5"
                    >
                      State <span className="text-[#A65332]">*</span>
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
                      className={`w-full rounded-xl border bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] transition-colors focus:outline-none focus:ring-2 scroll-mt-32 ${
                        touched.state && errors.state
                          ? 'border-[#A65332]/60 focus:border-[#A65332] focus:ring-[#A65332]/20'
                          : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-[#34452F]/20'
                      }`}
                    />
                    {touched.state && errors.state && (
                      <p className="mt-1.5 text-xs text-[#A65332] font-medium" role="alert">
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
                      className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5"
                    >
                      Postal Code / PIN <span className="text-[#A65332]">*</span>
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
                      className={`w-full rounded-xl border bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] transition-colors focus:outline-none focus:ring-2 scroll-mt-32 ${
                        touched.postalCode && errors.postalCode
                          ? 'border-[#A65332]/60 focus:border-[#A65332] focus:ring-[#A65332]/20'
                          : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-[#34452F]/20'
                      }`}
                    />
                    {touched.postalCode && errors.postalCode && (
                      <p className="mt-1.5 text-xs text-[#A65332] font-medium" role="alert">
                        {errors.postalCode}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="country"
                      className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5"
                    >
                      Country <span className="text-[#A65332]">*</span>
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
                      className={`w-full rounded-xl border bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] transition-colors focus:outline-none focus:ring-2 scroll-mt-32 ${
                        touched.country && errors.country
                          ? 'border-[#A65332]/60 focus:border-[#A65332] focus:ring-[#A65332]/20'
                          : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-[#34452F]/20'
                      }`}
                    />
                    {touched.country && errors.country && (
                      <p className="mt-1.5 text-xs text-[#A65332] font-medium" role="alert">
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
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all duration-200 hover:bg-[#263722] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin text-[#FFFDF8]"
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
                  <p className="mt-2.5 text-[11px] text-center text-[#5F6057]">
                    By placing your order, you agree to TrendVolt terms of service.
                  </p>
                </div>
              </form>
            </section>
          </div>

          {/* =================================================================
              RIGHT COLUMN: ORDER SUMMARY
             ================================================================= */}
          <div className="lg:col-span-5 min-w-0">
            <aside
              aria-labelledby="summary-heading"
              className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-7 lg:p-8 shadow-xs lg:sticky lg:top-28 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]">
                <h2
                  id="summary-heading"
                  className="font-serif text-base sm:text-lg font-bold uppercase tracking-wider text-[#1F211C]"
                >
                  Order Summary
                </h2>
                <span className="text-xs font-mono font-bold text-[#A65332]">
                  {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items List Preview */}
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => {
                  const product = item.product || {}
                  const imageUrl = getProductImage(product || item)
                  const price = typeof product.price === 'number' ? product.price : 0
                  const itemTotal =
                    typeof item.itemTotal === 'number' ? item.itemTotal : price * item.quantity
                  return (
                    <div
                      key={item._id || product._id}
                      className="flex items-center gap-3.5 p-2 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]"
                    >
                      <div className="h-14 w-14 shrink-0 rounded-lg border border-[#DED7CA] bg-[#FFFDF8] overflow-hidden flex items-center justify-center p-1">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name || 'Product'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] uppercase font-bold text-[#85857A]">
                            Item
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-serif text-xs font-bold text-[#1F211C] truncate">
                            {product.name || 'Product'}
                          </p>
                          {product.isFlashSale && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#A65332] text-white">
                              ⚡ SALE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5F6057] mt-0.5">
                          Qty: {item.quantity} × ₹{price.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="font-serif text-xs font-bold text-[#1F211C] whitespace-nowrap">
                          ₹{Number(itemTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Special Offers / Available Coupons Section */}
              <div className="pt-4 border-t border-[#DED7CA] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1F211C]">
                      Special Offers
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[#A65332]/10 px-2 py-0.5 text-[10px] font-semibold text-[#A65332]">
                      Available
                    </span>
                  </div>
                  {loadingOffers && (
                    <span className="text-[11px] text-[#85857A] animate-pulse">Loading offers…</span>
                  )}
                </div>

                {availableOffers.length > 0 ? (
                  <div className="space-y-2.5">
                    {availableOffers.map((offer) => {
                      const { title, subtitle, minOrder } = formatOfferInfo(offer)
                      const isApplied = appliedCoupon?.code === offer.code
                      const isAnyOtherApplied = appliedCoupon && !isApplied
                      const meetsMin = minOrder === 0 || totalAmount >= minOrder
                      const shortfall = !meetsMin ? minOrder - totalAmount : 0
                      const isThisApplying = applyingCoupon && applyingCode === offer.code

                      return (
                        <div
                          key={offer.code}
                          className={`rounded-xl border p-3.5 transition-all ${
                            isApplied
                              ? 'border-[#3F6B45]/50 bg-[#3F6B45]/10 shadow-xs'
                              : 'border-[#DED7CA] bg-[#FAF7F0] hover:border-[#34452F]/40'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-[#FFFDF8] border border-[#DED7CA] text-[#1F211C]">
                                  {offer.code}
                                </span>
                                <span className="font-serif text-sm font-bold text-[#1F211C]">
                                  {title}
                                </span>
                                {isApplied && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D5032] bg-[#3F6B45]/15 px-2 py-0.5 rounded-full">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                    APPLIED
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#5F6057]">
                                {subtitle}
                              </p>

                              {/* Minimum cart / shortfall */}
                              {minOrder > 0 && (
                                <div className="pt-0.5 text-[11px]">
                                  {!meetsMin ? (
                                    <span className="text-[#A65332] font-semibold flex items-center gap-1">
                                      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                      </svg>
                                      <span>Minimum cart ₹{minOrder.toLocaleString('en-IN')} • Add ₹{shortfall.toLocaleString('en-IN')} more to unlock</span>
                                    </span>
                                  ) : (
                                    <span className="text-[#5F6057]">
                                      Minimum cart: ₹{minOrder.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* When applied, show authoritative backend discount */}
                              {isApplied && couponDiscount > 0 && (
                                <p className="text-xs font-bold text-[#2D5032] pt-0.5">
                                  Coupon discount: −₹{Number(couponDiscount).toLocaleString('en-IN')}
                                  {offer.type === 'buy_x_get_y' && couponFreeItems > 0 && (
                                    <span className="font-medium text-[#5F6057] ml-2">
                                      ({couponFreeItems} free item{couponFreeItems > 1 ? 's' : ''})
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>

                            {/* Apply / Remove Button */}
                            <div className="shrink-0 self-start sm:self-center">
                              {isApplied ? (
                                <button
                                  type="button"
                                  onClick={handleRemoveCoupon}
                                  className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[#A65332]/40 bg-[#FFFDF8] hover:bg-[#A65332]/10 text-[#A65332] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  Remove
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!meetsMin || isAnyOtherApplied || applyingCoupon}
                                  onClick={() => handleApplyCoupon(offer.code)}
                                  className="min-h-[38px] min-w-[84px] px-4 py-1.5 rounded-lg bg-[#34452F] hover:bg-[#263722] active:scale-95 text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                                >
                                  {isThisApplying ? (
                                    <span className="flex items-center gap-1.5 justify-center">
                                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      <span>Applying…</span>
                                    </span>
                                  ) : isAnyOtherApplied ? (
                                    'Apply'
                                  ) : !meetsMin ? (
                                    'Locked'
                                  ) : (
                                    'Apply'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : !loadingOffers ? (
                  <p className="text-xs text-[#85857A] italic">No promotional offers currently active.</p>
                ) : null}
              </div>

              {/* Coupon / Discount Code Section */}
              <div className="pt-4 border-t border-[#DED7CA]">
                {appliedCoupon ? (
                  <div className="rounded-xl border border-[#3F6B45]/40 bg-[#3F6B45]/10 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Checkmark icon */}
                        <svg className="h-4 w-4 text-[#2D5032] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-mono text-xs font-bold uppercase tracking-wider bg-[#FFFDF8] border border-[#3F6B45]/30 text-[#2D5032] px-2.5 py-0.5 rounded-md truncate">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-[11px] font-semibold text-[#2D5032] shrink-0">
                          Applied
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="ml-2 shrink-0 min-h-[36px] px-2 py-1 rounded-lg border border-[#A65332]/30 bg-[#FFFDF8] text-xs font-semibold text-[#A65332] hover:bg-[#A65332]/10 transition-colors cursor-pointer"
                        aria-label="Remove coupon"
                      >
                        Remove Coupon
                      </button>
                    </div>

                    {appliedCoupon.type === 'buy_x_get_y' ? (
                      <div className="text-xs text-[#2D5032] space-y-0.5 pt-1">
                        <p className="font-medium">
                          Offer: Buy {appliedCoupon.buyQuantity} Get {appliedCoupon.freeQuantity} Free
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-[#5F6057]">
                          <span>Eligible qty: {couponEligibleQuantity}</span>
                          <span>•</span>
                          <span className="font-semibold text-[#2D5032]">Free items: {couponFreeItems}</span>
                        </div>
                        {couponDiscount > 0 && (
                          <p className="text-[11px] font-bold text-[#2D5032] pt-0.5">
                            Coupon discount: −₹{Number(couponDiscount).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    ) : appliedCoupon.type === 'percentage' ? (
                      <div className="text-xs text-[#2D5032] space-y-0.5">
                        <p className="font-medium">{appliedCoupon.value}% off</p>
                        {couponDiscount > 0 && (
                          <p className="font-bold">Coupon discount: −₹{Number(couponDiscount).toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-[#2D5032] space-y-0.5">
                        <p className="font-medium">₹{appliedCoupon.value} flat discount</p>
                        {couponDiscount > 0 && (
                          <p className="font-bold">Coupon discount: −₹{Number(couponDiscount).toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label
                      htmlFor="couponCodeInput"
                      className="block text-xs font-bold uppercase tracking-wider text-[#5F6057]"
                    >
                      Have a coupon code?
                    </label>
                    <form
                      onSubmit={handleApplyCoupon}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="text"
                        id="couponCodeInput"
                        name="couponCodeInput"
                        placeholder="Enter coupon code"
                        autoComplete="off"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase())
                          if (couponError) setCouponError(null)
                          if (bogoShortfall) setBogoShortfall(null)
                        }}
                        className="flex-1 min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3.5 py-2.5 text-sm font-mono uppercase text-[#1F211C] placeholder-[#85857A] placeholder:normal-case placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={applyingCoupon || !couponInput.trim()}
                        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#34452F] hover:bg-[#263722] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] transition-all cursor-pointer shrink-0 shadow-xs"
                      >
                        {applyingCoupon && !applyingCode ? (
                          <>
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Applying…</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>Apply Coupon</span>
                          </>
                        )}
                      </button>
                    </form>
                    {couponError && (
                      <p className="text-xs text-[#A65332] font-medium flex items-start gap-1.5" role="alert">
                        <svg className="h-3.5 w-3.5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <span>{couponError}</span>
                      </p>
                    )}
                    {bogoShortfall && (
                      <p className="text-[11px] text-[#D97706] font-semibold flex items-start gap-1">
                        <svg className="h-3.5 w-3.5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>Add ₹{Number(bogoShortfall).toLocaleString('en-IN')} more to unlock this offer.</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-3 pt-4 border-t border-[#DED7CA] text-xs sm:text-sm text-[#5F6057]">
                <div className="flex items-center justify-between">
                  <span>Cart Subtotal</span>
                  <span className="font-semibold text-[#1F211C]">
                    ₹{Number(totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>

                {appliedCoupon && couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-[#3F6B45]">
                    <span className="font-medium">
                      Coupon Discount ({appliedCoupon.code})
                    </span>
                    <span className="font-semibold">
                      − ₹{Number(couponDiscount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span>Delivery / Shipping</span>
                  <span className="text-xs font-semibold text-[#3F6B45] uppercase tracking-wider">
                    Free
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Estimated Taxes</span>
                  <span className="text-xs text-[#85857A]">Included</span>
                </div>

                <hr className="my-4 border-t border-[#DED7CA]" />

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="font-serif text-base font-bold text-[#1F211C] block">Order Total</span>
                    <span className="text-[11px] text-[#5F6057]">All taxes included</span>
                  </div>
                  <span className="font-serif text-2xl font-black text-[#1F211C] tracking-tight">
                    ₹{Number(appliedCoupon && couponFinalAmount != null ? couponFinalAmount : totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="pt-4 border-t border-[#DED7CA] flex items-center justify-center gap-2 text-[#5F6057] text-xs">
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
