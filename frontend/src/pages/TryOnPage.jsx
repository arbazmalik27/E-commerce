import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  Sparkles,
  ShoppingBag,
  Check,
  ChevronLeft,
  AlertCircle,
  User,
  Sliders,
  ExternalLink,
} from 'lucide-react'
import api from '../services/api'
import avatarService from '../services/avatarService'
import { selectAuthInitialized, selectIsAuthenticated } from '../features/auth/authSlice'
import { addToCart } from '../features/cart/cartSlice'
import AvatarViewer from '../components/avatar/AvatarViewer'
import SEO from '../components/SEO'
import { recommendSize } from '../constants/sizeCharts'
import { getProductImage } from '../utils/productImageMap'
import { resolveGarmentRepresentation } from '../utils/garmentAssetResolver'

export default function TryOnPage() {
  const { productId } = useParams()
  const dispatch = useDispatch()
  const location = useLocation()

  const authInitialized = useSelector(selectAuthInitialized)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  // Product state
  const [product, setProduct] = useState(null)
  const [productLoading, setProductLoading] = useState(true)
  const [productError, setProductError] = useState(null)

  // AvatarProfile state
  const [avatarProfile, setAvatarProfile] = useState(null)
  const [avatarLoading, setAvatarLoading] = useState(true)
  const [avatarNotFound, setAvatarNotFound] = useState(false)
  const [avatarError, setAvatarError] = useState(null)

  // Sizing & Purchase state
  const [selectedSize, setSelectedSize] = useState(null)
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartSuccess, setCartSuccess] = useState(false)
  const [cartError, setCartError] = useState(null)
  const [garmentLoadError, setGarmentLoadError] = useState(false)

  // 1. Fetch Product
  useEffect(() => {
    let isMounted = true
    const fetchProduct = async () => {
      setProductLoading(true)
      setProductError(null)
      setGarmentLoadError(false)
      try {
        const res = await api.get(`/products/${productId}`)
        if (isMounted) {
          if (res.data?.success && res.data.product) {
            setProduct(res.data.product)
          } else {
            setProductError('Product not found')
          }
        }
      } catch (err) {
        if (isMounted) {
          setProductError(err.response?.data?.message || 'Failed to load product details')
        }
      } finally {
        if (isMounted) setProductLoading(false)
      }
    }

    if (productId) {
      fetchProduct()
    }

    return () => {
      isMounted = false
    }
  }, [productId])

  // 2. Fetch User AvatarProfile
  useEffect(() => {
    let isMounted = true
    const fetchAvatar = async () => {
      if (!isAuthenticated) {
        setAvatarLoading(false)
        return
      }

      setAvatarLoading(true)
      setAvatarNotFound(false)
      setAvatarError(null)

      try {
        const res = await avatarService.getAvatar()
        if (isMounted) {
          if (res.success && res.avatar) {
            setAvatarProfile(res.avatar)
          } else {
            setAvatarNotFound(true)
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err.response?.status === 404) {
            setAvatarNotFound(true)
          } else {
            setAvatarError('Unable to load your saved avatar profile')
          }
        }
      } finally {
        if (isMounted) setAvatarLoading(false)
      }
    }

    if (authInitialized) {
      fetchAvatar()
    }

    return () => {
      isMounted = false
    }
  }, [authInitialized, isAuthenticated])

  // 3. Compute Deterministic Size Recommendation
  const sizeRecommendation = useMemo(() => {
    if (!product || !avatarProfile) return null

    const measurements = {
      chest: avatarProfile.estimatedMeasurements?.chest,
      waist: avatarProfile.estimatedMeasurements?.waist,
      hip: avatarProfile.estimatedMeasurements?.hip,
      height: avatarProfile.heightCm,
      age: avatarProfile.age,
    }

    return recommendSize({
      department: product.department || 'men',
      subcategory: product.subcategory || 'shirts',
      productSizes: product.sizes || [],
      measurements,
      unit: avatarProfile.estimatedMeasurements?.unit || 'cm',
      fitPreference: avatarProfile.fitPreference || 'regular',
    })
  }, [product, avatarProfile])

  // Derive effective selected size (default to recommended size, or first in-stock size, or first size)
  const defaultSize = useMemo(() => {
    if (!product) return null
    const recSize = sizeRecommendation?.recommendedSize || sizeRecommendation?.size
    if (sizeRecommendation?.status === 'recommended' && recSize) {
      return recSize
    }
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      const available = product.sizes.find((s) => s.available !== false)
      return available ? available.label : product.sizes[0].label
    }
    return null
  }, [product, sizeRecommendation])

  const effectiveSize = selectedSize || defaultSize

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (!product?._id) return

    setAddingToCart(true)
    setCartSuccess(false)
    setCartError(null)

    try {
      const actionResult = await dispatch(
        addToCart({
          productId: product._id,
          quantity: 1,
          size: effectiveSize || undefined,
        })
      )

      if (addToCart.fulfilled.match(actionResult)) {
        setCartSuccess(true)
        setTimeout(() => setCartSuccess(false), 3500)
      } else {
        setCartError(actionResult.payload || 'Failed to add item to cart')
      }
    } catch {
      setCartError('Failed to add item to cart')
    } finally {
      setAddingToCart(false)
    }
  }

  // Active Garment Layer Representation & Definition
  const garmentRepresentation = useMemo(() => {
    return resolveGarmentRepresentation(product, { allowDevPlaceholder: false })
  }, [product])

  const garmentLayerProp = useMemo(() => {
    if (!garmentRepresentation.isSupported || !garmentRepresentation.hasRealAsset) return null
    return {
      type: garmentRepresentation.garmentType || 'top',
      label: product.name,
      color: garmentRepresentation.color,
      assetUrl: garmentRepresentation.assetUrl,
      isRealAsset: true,
      allowPlaceholder: false,
    }
  }, [garmentRepresentation, product])

  // Page Loading State
  if (!authInitialized || (productLoading && !product) || (isAuthenticated && avatarLoading && !avatarProfile && !avatarNotFound)) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#34452F] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono uppercase tracking-widest text-[#5F6057]">
          Loading 3D Try-On Experience...
        </p>
      </div>
    )
  }

  // 1. Unauthenticated State
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-28 sm:pt-36 pb-20 px-4">
        <SEO title="Sign In Required — 3D Try-On | TrendVolt" />
        <div className="max-w-md mx-auto text-center bg-[#FFFDF8] border border-[#DED7CA] rounded-3xl p-8 sm:p-10 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#34452F]/10 border border-[#34452F]/20 text-[#34452F] flex items-center justify-center mx-auto mb-5">
            <User className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1F211C] mb-2">
            Authentication Required
          </h1>
          <p className="text-sm text-[#5F6057] leading-relaxed mb-6">
            Sign in to your TrendVolt account to load your persistent 3D avatar profile and try on this piece.
          </p>
          <div className="space-y-3">
            <Link
              to="/login"
              state={{ from: location }}
              className="w-full min-h-[46px] inline-flex items-center justify-center rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
            >
              Sign In to Continue
            </Link>
            <Link
              to={product ? `/products/${product._id}` : '/products'}
              className="w-full min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[#DED7CA] hover:bg-[#FAF7F0] text-[#5F6057] font-semibold text-xs uppercase tracking-wider transition-all"
            >
              Back to Product
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 2. Product Not Found or Inactive State
  if (productError || !product) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-28 sm:pt-36 pb-20 px-4">
        <SEO title="Product Not Found — 3D Try-On | TrendVolt" />
        <div className="max-w-md mx-auto text-center bg-[#FFFDF8] border border-[#DED7CA] rounded-3xl p-8 sm:p-10 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#A65332]/10 border border-[#A65332]/20 text-[#A65332] flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#1F211C] mb-2">
            Product Unavailable
          </h1>
          <p className="text-sm text-[#5F6057] leading-relaxed mb-6">
            {productError || 'The requested product could not be found or is no longer active in the catalog.'}
          </p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-all"
          >
            Browse Catalog
          </Link>
        </div>
      </div>
    )
  }

  // 3. Product Does Not Support Active Try-On
  if (!product.tryOn?.enabled || !garmentRepresentation.isSupported) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-28 sm:pt-36 pb-20 px-4">
        <SEO title={`${product.name} — Try-On Unavailable | TrendVolt`} />
        <div className="max-w-lg mx-auto text-center bg-[#FFFDF8] border border-[#DED7CA] rounded-3xl p-8 sm:p-10 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#5F6057]/10 border border-[#5F6057]/20 text-[#5F6057] flex items-center justify-center mx-auto mb-5">
            <Sliders className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#85857A]">
            Product-Driven Capability Notice
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#1F211C] mt-1 mb-3">
            3D Try-On Not Available For This Piece
          </h1>
          <p className="text-sm text-[#5F6057] leading-relaxed mb-6">
            <strong className="text-[#1F211C]">{product.name}</strong> {product.tryOn?.enabled ? 'has Try-On enabled, but a production 3D garment asset is pending.' : 'is currently a standard catalog item without an enabled 3D garment visualization layer.'} You can purchase this product using standard size selection.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/products/${product._id}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-all"
            >
              View Standard Product Page
            </Link>
            <Link
              to="/products"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#DED7CA] hover:bg-[#FAF7F0] text-[#5F6057] font-semibold text-xs uppercase tracking-wider transition-all"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 4. Authenticated User Has No AvatarProfile
  if (avatarNotFound) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-28 sm:pt-36 pb-20 px-4">
        <SEO title={`Create Avatar — Try On ${product.name} | TrendVolt`} />
        <div className="max-w-lg mx-auto text-center bg-[#FFFDF8] border border-[#DED7CA] rounded-3xl p-8 sm:p-10 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#34452F]/10 border border-[#34452F]/20 text-[#34452F] flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-7 h-7 text-[#A65332]" />
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A65332]">
            Avatar Profile Required
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C] mt-1 mb-3">
            Create Your 3D Avatar
          </h1>
          <p className="text-sm text-[#5F6057] leading-relaxed mb-6">
            You have not set up your persistent avatar profile yet. Customize your demographic, body measurements, and appearance in Avatar Studio to try on <strong className="text-[#1F211C]">{product.name}</strong>.
          </p>
          <div className="space-y-3">
            <Link
              to="/avatar"
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#DDB088]" />
              <span>Open Avatar Studio</span>
            </Link>
            <Link
              to={`/products/${product._id}`}
              className="w-full min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[#DED7CA] hover:bg-[#FAF7F0] text-[#5F6057] font-semibold text-xs uppercase tracking-wider transition-all"
            >
              Back to Product Details
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 5. Successful State: Active Product-Driven Try-On Studio
  const displayImage = getProductImage(product)
  const availableSizes = Array.isArray(product.sizes) ? product.sizes : []
  const isOutOfStock = product.stock <= 0

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-24 sm:pt-28 pb-20">
      <SEO title={`3D Try-On: ${product.name} | TrendVolt Avatar Studio`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to={`/products/${product._id}`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5F6057] hover:text-[#1F211C] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to {product.name}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34452F]/10 border border-[#34452F]/20 text-[11px] font-mono font-bold text-[#34452F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34452F] animate-pulse" />
              Try-On Studio Active
            </span>
          </div>
        </div>

        {/* Studio Grid: Desktop 2-column layout; Mobile stacked layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* =========================================================================
              LEFT COLUMN: 3D AVATAR VIEWER + GARMENT LAYER (Col 7)
             ========================================================================= */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full aspect-3/4 sm:aspect-4/5 lg:aspect-auto lg:h-[620px] rounded-3xl overflow-hidden border border-[#DED7CA] bg-gradient-to-b from-[#FAF7F0] to-[#EAE3D6] shadow-sm">
              <AvatarViewer
                demographic={avatarProfile?.demographic || 'men'}
                morphWeights={avatarProfile?.morphWeights || {}}
                facialMorphs={avatarProfile?.facialSuggestions || {}}
                skinColor={avatarProfile?.appearance?.skinTone || null}
                eyeColor={avatarProfile?.appearance?.eyeColor || null}
                heightCm={avatarProfile?.heightCm || 178}
                garment={garmentLayerProp}
                onGarmentLoaded={() => setGarmentLoadError(false)}
                onGarmentError={() => setGarmentLoadError(true)}
                className="w-full h-full"
              />
            </div>

            {/* Customer-Safe Garment Load Failure Notice */}
            {garmentLoadError && (
              <div className="rounded-2xl border border-[#A65332]/30 bg-[#A65332]/10 p-4 text-xs text-[#A65332] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#A65332]" />
                <div className="space-y-1">
                  <p className="font-semibold text-[#1F211C]">
                    3D Garment Model Unavailable
                  </p>
                  <p className="text-[11px] text-[#5F6057] leading-relaxed">
                    The 3D model for this garment could not be loaded at this time. Standard sizing recommendation and store purchasing remain fully available.
                  </p>
                  <div className="pt-2">
                    <Link
                      to={`/products/${product._id}`}
                      className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-[#34452F] hover:underline"
                    >
                      <span>Return to Product Details →</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Architectural & Transparency Notice */}
            <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-4 text-xs text-[#5F6057] flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-[#34452F]/10 text-[#34452F] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[#1F211C]">
                  Product-Driven Garment Architecture (Phase 3D Foundation)
                </p>
                <p className="text-[11px] leading-relaxed">
                  The visual garment layer is an extensible architectural silhouette conforming to your avatar's dimensions. Physical cloth simulation, drape physics, and tailored fabric textures will activate in production 3D asset updates.
                </p>
              </div>
            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: PRODUCT CONTEXT, SIZING ENGINE & ACTIONS (Col 5)
             ========================================================================= */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Product Header Card */}
            <div className="rounded-3xl border border-[#DED7CA] bg-[#FFFDF8] p-6 shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                {displayImage && (
                  <div className="w-20 h-24 rounded-xl overflow-hidden border border-[#DED7CA] bg-[#FAF7F0] shrink-0">
                    <img
                      src={displayImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono font-medium uppercase tracking-[0.2em] text-[#85857A]">
                    {product.brand || 'TrendVolt Atelier'}
                  </span>
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C] leading-snug line-clamp-2 mt-0.5">
                    {product.name}
                  </h1>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-black text-[#1F211C]">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </span>
                    {product.isFlashSale && product.originalPrice && (
                      <span className="text-xs text-[#85857A] line-through">
                        ₹{Number(product.originalPrice).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Garment Capability Metadata */}
              <div className="pt-3 border-t border-[#DED7CA]/70 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#5F6057]">Garment Layer Type:</span>
                  <span className="font-mono font-bold uppercase text-[#34452F] bg-[#34452F]/10 px-2 py-0.5 rounded-md">
                    {product.tryOn?.garmentType || 'Top'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5F6057]">3D Representation:</span>
                  {garmentRepresentation.hasRealAsset ? (
                    <span className="font-mono text-[11px] font-bold text-[#3F6B45] bg-[#3F6B45]/10 px-2 py-0.5 rounded-md">
                      Production 3D Asset
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] font-bold text-[#A65332] bg-[#A65332]/10 px-2 py-0.5 rounded-md">
                      Architecture Silhouette Preview
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Authoritative Sizing Engine Card */}
            <div className="rounded-3xl border border-[#DED7CA] bg-[#FFFDF8] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-base font-bold text-[#1F211C]">
                    Sizing Engine Recommendation
                  </h2>
                  <p className="text-xs text-[#5F6057]">
                    Calculated authoritatively from your avatar profile inputs.
                  </p>
                </div>
                {sizeRecommendation?.status === 'recommended' && (
                  <div className="px-3 py-1 rounded-xl bg-[#3F6B45]/10 border border-[#3F6B45]/30 text-[#3F6B45] text-xs font-mono font-bold">
                    Rec: {sizeRecommendation.recommendedSize || sizeRecommendation.size}
                  </div>
                )}
              </div>

              {/* Recommendation Feedback / Explanation */}
              {sizeRecommendation?.message && (
                <div className="rounded-xl border border-[#DED7CA] bg-[#FAF7F0] p-3.5 text-xs text-[#5F6057] leading-relaxed">
                  {sizeRecommendation.message}
                </div>
              )}

              {/* Manual Size Selector */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase tracking-wider text-[#5F6057] font-semibold">
                    Select Size:
                  </label>
                  <span className="text-[11px] text-[#85857A]">
                    Manual override enabled
                  </span>
                </div>

                {availableSizes.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((s) => {
                      const isSelected = effectiveSize === s.label
                      const isSizeOOS = s.available === false
                      const isRecommended =
                        (sizeRecommendation?.recommendedSize || sizeRecommendation?.size) === s.label

                      return (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => setSelectedSize(s.label)}
                          className={`min-w-[48px] h-11 px-3.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border flex items-center justify-center gap-1.5 relative ${
                            isSelected
                              ? 'border-[#34452F] bg-[#34452F] text-[#FFFDF8] shadow-xs ring-2 ring-[#34452F]/30'
                              : isSizeOOS
                              ? 'border-[#DED7CA] bg-[#FAF7F0]/60 text-[#85857A]'
                              : 'border-[#DED7CA] bg-[#FAF7F0] text-[#1F211C] hover:border-[#85857A]'
                          }`}
                        >
                          <span>{s.label}</span>
                          {isRecommended && !isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B45]" title="Recommended size" />
                          )}
                          {isSizeOOS && (
                            <span className="text-[8px] uppercase px-1 rounded bg-black/10">
                              Out
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#85857A] italic">
                    Standard universal sizing applies to this product.
                  </p>
                )}
              </div>
            </div>

            {/* Add to Cart & Purchase Actions */}
            <div className="rounded-3xl border border-[#DED7CA] bg-[#FFFDF8] p-6 shadow-sm space-y-4">
              {avatarError && (
                <div className="rounded-xl border border-[#A65332]/30 bg-[#A65332]/10 p-3.5 text-xs font-medium text-[#A65332]">
                  {avatarError}
                </div>
              )}

              {cartSuccess && (
                <div className="rounded-xl border border-[#3F6B45]/30 bg-[#3F6B45]/10 p-3.5 text-xs font-medium text-[#3F6B45] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Added {effectiveSize ? `size ${effectiveSize}` : ''} to your cart</span>
                  </div>
                  <Link to="/cart" className="font-bold underline">
                    View Cart →
                  </Link>
                </div>
              )}

              {cartError && (
                <div className="rounded-xl border border-[#B7473A]/30 bg-[#B7473A]/10 p-3.5 text-xs font-medium text-[#B7473A]">
                  {cartError}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addingToCart}
                className="w-full min-h-[50px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {addingToCart
                    ? 'Adding to Cart...'
                    : isOutOfStock
                    ? 'Sold Out'
                    : `Add ${effectiveSize || ''} to Cart`}
                </span>
              </button>

              <div className="pt-2 flex items-center justify-between text-xs text-[#5F6057]">
                <Link
                  to={`/products/${product._id}`}
                  className="hover:underline text-[#34452F] font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Product Specifications</span>
                </Link>

                <Link
                  to="/avatar"
                  className="hover:underline text-[#A65332] font-semibold flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Edit Avatar</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
