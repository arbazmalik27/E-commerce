import { useState, useEffect, useRef, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  RotateCcw,
  Sparkles,
  ShoppingBag,
  User,
  AlertCircle,
  Compass,
} from 'lucide-react'
import SEO from '../components/SEO'
import AvatarViewer from '../components/avatar/AvatarViewer'
import VirtualWardrobe from '../components/avatar/VirtualWardrobe'
import avatarService from '../services/avatarService'
import api from '../services/api'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import {
  INITIAL_OUTFIT,
  WARDROBE_SLOTS,
  determineProductWardrobeSlot,
} from '../constants/wardrobeConstants'
import { isProductTryOnActive, resolveGarmentRepresentation } from '../utils/garmentAssetResolver'

export default function AvatarWardrobePage() {
  const viewerRef = useRef(null)
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const isAuthenticated = useSelector(selectIsAuthenticated)

  // AvatarProfile state
  const [avatarProfile, setAvatarProfile] = useState(null)
  const [avatarLoading, setAvatarLoading] = useState(true)
  const [avatarNotFound, setAvatarNotFound] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const [outfitAnalysis, setOutfitAnalysis] = useState(null)

  // Modular Garment Runtime loading & error tracking per slot
  const [garmentLoading, setGarmentLoading] = useState({ top: false, bottom: false })
  const [garmentErrors, setGarmentErrors] = useState({ top: null, bottom: null })

  // Client-side wardrobe session outfit state
  const [outfit, setOutfit] = useState(INITIAL_OUTFIT)
  const [preselectNotice, setPreselectNotice] = useState(null)

  // 1. Fetch user's saved AvatarProfile
  useEffect(() => {
    let isMounted = true

    const fetchProfile = async () => {
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
          if (res?.success && res.avatar) {
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
            setAvatarError(err.response?.data?.message || 'Failed to load avatar profile')
          }
        }
      } finally {
        if (isMounted) setAvatarLoading(false)
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  // 2. Preselect product from query param (?selectProduct=XYZ) with continuity feedback
  useEffect(() => {
    const targetProductId = searchParams.get('selectProduct')
    if (!targetProductId) return

    let isMounted = true
    const loadTargetProduct = async () => {
      try {
        const res = await api.get(`/products/${targetProductId}`)
        if (isMounted && res.data?.success && res.data.product) {
          const prod = res.data.product
          const slot = determineProductWardrobeSlot(prod)
          const is3DActive = isProductTryOnActive(prod)
          const previewStatus = is3DActive
            ? '3D preview active.'
            : '3D preview unavailable for this product.'

          if (slot === WARDROBE_SLOTS.TOP) {
            setOutfit((prev) => ({ ...prev, top: prod }))
            setPreselectNotice(`Added "${prod.name}" as your top. ${previewStatus}`)
          } else if (slot === WARDROBE_SLOTS.BOTTOM) {
            setOutfit((prev) => ({ ...prev, bottom: prod }))
            setPreselectNotice(`Added "${prod.name}" as your bottom. ${previewStatus}`)
          } else if (slot === WARDROBE_SLOTS.SHOES) {
            setOutfit((prev) => ({ ...prev, shoes: prod }))
            setPreselectNotice(`Added "${prod.name}" as your shoes. 3D preview unavailable for this product.`)
          } else if (slot === WARDROBE_SLOTS.ACCESSORIES) {
            setOutfit((prev) => {
              const exists = prev.accessories.some((a) => a._id === prod._id)
              return exists ? prev : { ...prev, accessories: [...prev.accessories, prod] }
            })
            setPreselectNotice(`Added "${prod.name}" to accessories. 3D preview unavailable for this product.`)
          }
        }
      } catch (err) {
        console.warn('[AvatarWardrobePage] Failed to preselect target product', err)
      }
    }

    loadTargetProduct()

    return () => {
      isMounted = false
    }
  }, [searchParams])

  // 3. Selection Handlers
  const handleSelectProduct = (product) => {
    if (!product) return
    const slot = determineProductWardrobeSlot(product)

    setOutfit((prev) => {
      if (slot === WARDROBE_SLOTS.TOP) {
        const next = prev.top?._id === product._id ? null : product
        setGarmentLoading((l) => ({ ...l, top: false }))
        setGarmentErrors((e) => ({ ...e, top: null }))
        return { ...prev, top: next }
      }
      if (slot === WARDROBE_SLOTS.BOTTOM) {
        const next = prev.bottom?._id === product._id ? null : product
        setGarmentLoading((l) => ({ ...l, bottom: false }))
        setGarmentErrors((e) => ({ ...e, bottom: null }))
        return { ...prev, bottom: next }
      }
      if (slot === WARDROBE_SLOTS.SHOES) {
        return { ...prev, shoes: prev.shoes?._id === product._id ? null : product }
      }
      if (slot === WARDROBE_SLOTS.ACCESSORIES) {
        const exists = prev.accessories.some((a) => a._id === product._id)
        if (exists) {
          return { ...prev, accessories: prev.accessories.filter((a) => a._id !== product._id) }
        }
        return { ...prev, accessories: [...prev.accessories, product] }
      }
      return { ...prev, top: product }
    })
  }

  const handleRemoveItem = (slotKey, productId) => {
    setOutfit((prev) => {
      if (slotKey === WARDROBE_SLOTS.TOP) {
        setGarmentLoading((l) => ({ ...l, top: false }))
        setGarmentErrors((e) => ({ ...e, top: null }))
        return { ...prev, top: null }
      }
      if (slotKey === WARDROBE_SLOTS.BOTTOM) {
        setGarmentLoading((l) => ({ ...l, bottom: false }))
        setGarmentErrors((e) => ({ ...e, bottom: null }))
        return { ...prev, bottom: null }
      }
      if (slotKey === WARDROBE_SLOTS.SHOES) return { ...prev, shoes: null }
      if (slotKey === WARDROBE_SLOTS.ACCESSORIES && productId) {
        return { ...prev, accessories: prev.accessories.filter((a) => a._id !== productId) }
      }
      return prev
    })
  }

  const handleClearOutfit = () => {
    setOutfit(INITIAL_OUTFIT)
    setGarmentLoading({ top: false, bottom: false })
    setGarmentErrors({ top: null, bottom: null })
  }

  // Restore preset into canonical outfit state
  const handleApplyOutfit = (newOutfit) => {
    if (!newOutfit) return
    setOutfit({
      top: newOutfit.top || null,
      bottom: newOutfit.bottom || null,
      shoes: newOutfit.shoes || null,
      accessories: Array.isArray(newOutfit.accessories) ? [...newOutfit.accessories] : [],
    })
    setGarmentLoading({ top: false, bottom: false })
    setGarmentErrors({ top: null, bottom: null })
  }

  // Runtime callbacks from AvatarViewer GarmentLayer
  const handleGarmentStartLoad = (slot) => {
    setGarmentLoading((prev) => ({ ...prev, [slot]: true }))
    setGarmentErrors((prev) => ({ ...prev, [slot]: null }))
  }

  const handleGarmentLoaded = (_mesh, slot) => {
    setGarmentLoading((prev) => ({ ...prev, [slot]: false }))
    setGarmentErrors((prev) => ({ ...prev, [slot]: null }))
  }

  const handleGarmentError = (_err, slot) => {
    setGarmentLoading((prev) => ({ ...prev, [slot]: false }))
    setGarmentErrors((prev) => ({ ...prev, [slot]: 'Unable to load this 3D preview.' }))
  }

  // 4. Phase 4D Modular Garment Runtime Architecture: Top & Bottom Coexistence
  // Only resolves products with ACTIVE production 3D assets.
  // Dev placeholders are strictly forbidden for customer wardrobe visualization.
  const active3DGarments = useMemo(() => {
    const garments = { top: null, bottom: null }

    if (outfit.top && isProductTryOnActive(outfit.top)) {
      const topRep = resolveGarmentRepresentation(outfit.top, { allowDevPlaceholder: false })
      if (topRep.isSupported && topRep.hasRealAsset && topRep.assetUrl) {
        garments.top = {
          type: 'top',
          assetUrl: topRep.assetUrl,
          label: outfit.top.name,
          color: topRep.color,
          isRealAsset: true,
          allowPlaceholder: false,
        }
      }
    }

    if (outfit.bottom && isProductTryOnActive(outfit.bottom)) {
      const bottomRep = resolveGarmentRepresentation(outfit.bottom, { allowDevPlaceholder: false })
      if (bottomRep.isSupported && bottomRep.hasRealAsset && bottomRep.assetUrl) {
        garments.bottom = {
          type: 'bottom',
          assetUrl: bottomRep.assetUrl,
          label: outfit.bottom.name,
          color: bottomRep.color,
          isRealAsset: true,
          allowPlaceholder: false,
        }
      }
    }

    return garments
  }, [outfit.top, outfit.bottom])

  // Morph weights and appearance derived from saved avatar profile
  const avatarMorphWeights = avatarProfile?.morphWeights || {}
  const avatarSkinColor = avatarProfile?.appearance?.skinTone || null

  return (
    <>
      <SEO
        title="Virtual Wardrobe & 3D Outfit Studio | TrendVolt"
        description="Curate and visualize modular outfits on your personalized 3D fashion avatar. Select tops, bottoms, footwear, and accessories from the TrendVolt collection."
      />

      <div className="min-h-screen bg-[var(--tv-bg)] text-[var(--tv-text-primary)] pb-24">
        {/* Header Breadcrumbs / Title */}
        <header className="border-b border-[var(--tv-border)] bg-[var(--tv-surface)]/80 backdrop-blur-xs sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--tv-text-muted)] uppercase tracking-widest mb-1">
                <Link to="/avatar" className="hover:text-[var(--tv-olive)] transition-colors">
                  3D Avatar
                </Link>
                <span>/</span>
                <span className="text-[var(--tv-text-primary)] font-semibold">Virtual Wardrobe</span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--tv-text-primary)]">
                Virtual Wardrobe & Outfit Studio
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/avatar"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--tv-border)] bg-[var(--tv-surface)] text-xs font-mono font-semibold uppercase tracking-wider text-[var(--tv-text-secondary)] hover:border-[var(--tv-olive)] hover:text-[var(--tv-olive)] transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Edit Avatar</span>
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--tv-olive)] text-white text-xs font-mono font-semibold uppercase tracking-wider hover:bg-[var(--tv-olive-hover)] transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Shop Catalog</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Showcase Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
          {/* Preselect Notice Banner */}
          {preselectNotice && (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#34452F]/30 bg-[#34452F]/10 text-xs text-[#34452F] animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#DDB088]" />
                <span className="font-medium">{preselectNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreselectNotice(null)}
                className="font-mono text-[11px] underline uppercase tracking-wider cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Authentication & Profile Guards */}
          {!isAuthenticated && (
            <div className="p-6 rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-surface)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold text-[var(--tv-text-primary)]">
                    Sign In to Link Your Personalized Avatar
                  </h3>
                  <p className="text-xs text-[var(--tv-text-secondary)]">
                    You can browse and curate outfits freely. Sign in to project them onto your saved 3D avatar profile.
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                state={{ from: location }}
                className="px-5 py-2.5 rounded-xl bg-[var(--tv-olive)] text-white text-xs font-bold uppercase tracking-wider hover:bg-[var(--tv-olive-hover)] transition-colors whitespace-nowrap"
              >
                Sign In Required
              </Link>
            </div>
          )}

          {isAuthenticated && avatarNotFound && !avatarLoading && (
            <div className="p-6 rounded-2xl border border-[var(--tv-border)] bg-[var(--tv-surface)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-[var(--tv-olive)]/10 text-[var(--tv-olive)]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold text-[var(--tv-text-primary)]">
                    No Saved Avatar Profile Found
                  </h3>
                  <p className="text-xs text-[var(--tv-text-secondary)]">
                    Create your personalized 3D avatar in the Avatar Studio to enable 360-degree outfit viewing.
                  </p>
                </div>
              </div>
              <Link
                to="/avatar"
                className="px-5 py-2.5 rounded-xl bg-[var(--tv-olive)] text-white text-xs font-bold uppercase tracking-wider hover:bg-[var(--tv-olive-hover)] transition-colors whitespace-nowrap"
              >
                Create 3D Avatar
              </Link>
            </div>
          )}

          {isAuthenticated && avatarError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{avatarError}</span>
            </div>
          )}

          {/* Integrated Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* -------------------------------------------------------------------
                LEFT / MAIN (lg:col-span-5): 3D AVATAR VIEWER & 360 ROTATION
               ------------------------------------------------------------------- */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              <div className="relative aspect-[3/4] sm:aspect-square lg:aspect-[4/5] w-full rounded-2xl overflow-hidden border border-[var(--tv-border)] bg-[var(--tv-surface)] shadow-xs">
                <AvatarViewer
                  ref={viewerRef}
                  demographic={avatarProfile?.demographic || 'men'}
                  morphWeights={avatarMorphWeights}
                  facialMorphs={avatarProfile?.facialSuggestions || {}}
                  skinColor={avatarSkinColor}
                  eyeColor={avatarProfile?.appearance?.eyeColor || null}
                  heightCm={avatarProfile?.heightCm || 178}
                  garments={active3DGarments}
                  onGarmentStartLoad={handleGarmentStartLoad}
                  onGarmentLoaded={handleGarmentLoaded}
                  onGarmentError={handleGarmentError}
                  className="w-full h-full"
                />

                {/* 360 Rotation Guidance Hint */}
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--tv-surface)]/80 backdrop-blur-xs border border-[var(--tv-border)] text-[10px] font-mono text-[var(--tv-text-muted)] pointer-events-none">
                  <Compass className="w-3 h-3 text-[var(--tv-olive)]" />
                  <span>Drag to rotate 360°</span>
                </div>

                {/* Reset Camera View Button */}
                <button
                  type="button"
                  onClick={() => viewerRef.current?.resetView?.()}
                  title="Reset Camera View"
                  aria-label="Reset Camera View"
                  className="absolute bottom-3 right-3 z-10 p-2 rounded-xl bg-[var(--tv-surface)]/80 backdrop-blur-xs border border-[var(--tv-border)] text-[var(--tv-text-secondary)] hover:text-[var(--tv-text-primary)] hover:border-[var(--tv-olive)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Garment Error Banner if runtime error occurs */}
              {(garmentErrors.top || garmentErrors.bottom) && (
                <div className="p-3.5 rounded-xl border border-amber-300/60 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Unable to load this 3D preview.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGarmentErrors({ top: null, bottom: null })}
                    className="font-mono text-[10px] uppercase underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Avatar Metadata Card */}
              <div className="p-4 rounded-xl border border-[var(--tv-border)] bg-[var(--tv-surface)] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono uppercase tracking-wider text-[var(--tv-text-muted)]">
                    Model Demographic
                  </span>
                  <span className="font-bold text-[var(--tv-text-primary)]">
                    {avatarProfile?.demographic || 'Default POC Model'}
                  </span>
                </div>
                {avatarProfile?.heightCm && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono uppercase tracking-wider text-[var(--tv-text-muted)]">
                      Height Representation
                    </span>
                    <span className="font-bold text-[var(--tv-text-primary)]">
                      {avatarProfile.heightCm} cm
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-mono uppercase tracking-wider text-[var(--tv-text-muted)]">
                    3D Garment Status
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[var(--tv-olive)]">
                    {garmentLoading.top || garmentLoading.bottom
                      ? 'Loading 3D garment…'
                      : garmentErrors.top || garmentErrors.bottom
                      ? 'Unable to load this 3D preview.'
                      : active3DGarments.top && active3DGarments.bottom
                      ? 'Top & Bottom 3D Layers Active'
                      : active3DGarments.top
                      ? 'Top 3D Layer Active'
                      : active3DGarments.bottom
                      ? 'Bottom 3D Layer Active'
                      : (outfit.top || outfit.bottom)
                      ? '3D preview unavailable for this product.'
                      : 'Base Avatar Foundation'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[var(--tv-border)]">
                  <span className="font-mono uppercase tracking-wider text-[var(--tv-text-muted)]">
                    Palette Harmony
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[var(--tv-olive)]">
                    {outfitAnalysis?.label || 'Incomplete'}
                  </span>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------------
                RIGHT / SECONDARY (lg:col-span-7): VIRTUAL WARDROBE COMPONENT
               ------------------------------------------------------------------- */}
            <div className="lg:col-span-7">
              <VirtualWardrobe
                outfit={outfit}
                garmentStatuses={{
                  top: garmentLoading.top
                    ? 'loading'
                    : garmentErrors.top
                    ? 'error'
                    : null,
                  bottom: garmentLoading.bottom
                    ? 'loading'
                    : garmentErrors.bottom
                    ? 'error'
                    : null,
                }}
                onSelectProduct={handleSelectProduct}
                onRemoveItem={handleRemoveItem}
                onClearOutfit={handleClearOutfit}
                onApplyOutfit={handleApplyOutfit}
                onAnalysisChange={setOutfitAnalysis}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
