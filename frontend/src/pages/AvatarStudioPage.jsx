import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import AvatarViewer from '../components/avatar/AvatarViewer'
import AvatarDemographicSelector from '../components/avatar/AvatarDemographicSelector'
import AvatarMeasurementForm from '../components/avatar/AvatarMeasurementForm'
import AvatarBodyControls from '../components/avatar/AvatarBodyControls'
import AvatarAppearanceControls from '../components/avatar/AvatarAppearanceControls'
import AvatarFaceControls from '../components/avatar/AvatarFaceControls'
import AvatarPhotoReference from '../components/avatar/AvatarPhotoReference'
import { DEFAULT_MORPH_WEIGHTS, SKIN_TONES } from '../constants/avatarStudioConstants'
import { resolveAvatarAsset } from '../utils/avatarAssetResolver'
import {
  Sparkles,
  RotateCcw,
  Save,
  CheckCircle2,
  Compass,
  Sliders,
  Palette,
  Smile,
  Ruler,
  ShoppingBag,
  Info,
  Camera,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react'

// Default studio state values
const DEFAULT_APPEARANCE = {
  skinTone: SKIN_TONES[2].hex, // Golden Sand default
  hairStyle: 'style-buzz',
  hairColor: '#2B1B15',
  eyeColor: '#2D1F17',
  facialHair: 'clean',
}

const DEFAULT_ADULT_MEASUREMENTS = {
  height: '178',
  chest: '98',
  waist: '82',
  hip: '96',
  fitPreference: 'Regular',
  youthAge: '8',
}

const DEFAULT_YOUTH_MEASUREMENTS = {
  height: '128',
  chest: '',
  waist: '',
  hip: '',
  fitPreference: 'Regular',
  youthAge: '8',
}

const DEFAULT_FACIAL_WEIGHTS = {
  faceWidth: 0.0,
  jawWidth: 0.0,
  chinLength: 0.0,
  noseWidth: 0.0,
  eyeSpacing: 0.0,
  cheekFullness: 0.0,
  lipFullness: 0.0,
  eyeSize: 0.0,
}

// Canonical avatar profile state serializer for dirty / save state tracking
function serializeAvatarState(demographic, measurements, morphWeights, appearance, facialMorphs) {
  return JSON.stringify({
    demographic: demographic || 'Men',
    measurements: {
      height: String(measurements?.height || ''),
      chest: String(measurements?.chest || ''),
      waist: String(measurements?.waist || ''),
      hip: String(measurements?.hip || ''),
      fitPreference: String(measurements?.fitPreference || ''),
      youthAge: String(measurements?.youthAge || ''),
    },
    morphWeights: morphWeights || {},
    appearance: appearance || {},
    facialMorphs: facialMorphs || {},
  })
}

export default function AvatarStudioPage() {
  const viewerRef = useRef(null)
  const { isAuthenticated } = useSelector((state) => state.auth || {})

  // Studio local state
  const [activeTab, setActiveTab] = useState('body') // 'body' | 'appearance' | 'face' | 'measurements'
  const [demographic, setDemographic] = useState('Men')
  const [measurements, setMeasurements] = useState(DEFAULT_ADULT_MEASUREMENTS)
  const [morphWeights, setMorphWeights] = useState(DEFAULT_MORPH_WEIGHTS)
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE)
  const [facialMorphs, setFacialMorphs] = useState(DEFAULT_FACIAL_WEIGHTS)
  const [savedSnapshot, setSavedSnapshot] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saved' | 'photo-applied'
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [hasExistingProfile, setHasExistingProfile] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const isYouth = ['Boys', 'Girls', 'Kids'].includes(demographic)
  const avatarAsset = resolveAvatarAsset(demographic)
  const isModelSupported = Boolean(avatarAsset.isProduction && avatarAsset.capabilities?.facialMorphs?.faceWidth)

  // Current serialized state of editable avatar profile
  const currentSnapshot = useMemo(() => {
    return serializeAvatarState(demographic, measurements, morphWeights, appearance, facialMorphs)
  }, [demographic, measurements, morphWeights, appearance, facialMorphs])

  // Determine if avatar profile state is dirty (unsaved changes)
  const isDirty = useMemo(() => {
    if (!hasExistingProfile || savedSnapshot === null) {
      const defaultSnapshot = serializeAvatarState(
        'Men',
        DEFAULT_ADULT_MEASUREMENTS,
        DEFAULT_MORPH_WEIGHTS,
        DEFAULT_APPEARANCE,
        DEFAULT_FACIAL_WEIGHTS
      )
      return currentSnapshot !== defaultSnapshot
    }
    return currentSnapshot !== savedSnapshot
  }, [hasExistingProfile, savedSnapshot, currentSnapshot])

  // Hydrate authenticated user's avatar profile on mount / auth change
  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      if (!isAuthenticated) return
      setIsLoadingProfile(true)
      try {
        const res = await getAvatar()
        if (isMounted && res?.avatar) {
          const av = res.avatar
          setHasExistingProfile(true)

          // Demographic hydration
          const rawDemo = av.demographic || 'men'
          const formattedDemo = rawDemo.charAt(0).toUpperCase() + rawDemo.slice(1).toLowerCase()
          setDemographic(formattedDemo)
          const isYouthDemo = ['Boys', 'Girls', 'Kids'].includes(formattedDemo)

          // Measurements hydration
          const loadedMeasurements = {
            height: av.heightCm ? String(av.heightCm) : (isYouthDemo ? '128' : '178'),
            chest: av.estimatedMeasurements?.chest ? String(av.estimatedMeasurements.chest) : '',
            waist: av.estimatedMeasurements?.waist ? String(av.estimatedMeasurements.waist) : '',
            hip: av.estimatedMeasurements?.hip ? String(av.estimatedMeasurements.hip) : '',
            fitPreference: av.fitPreference
              ? av.fitPreference.charAt(0).toUpperCase() + av.fitPreference.slice(1).toLowerCase()
              : 'Regular',
            youthAge: av.age ? String(av.age) : '8',
          }
          setMeasurements(loadedMeasurements)

          // Morph weights hydration
          const loadedMorphWeights = av.morphWeights
            ? {
                chestScale: av.morphWeights.chestScale ?? 0.0,
                waistScale: av.morphWeights.waistScale ?? 0.0,
                hipScale: av.morphWeights.hipScale ?? 0.0,
                legLength: av.morphWeights.legLength ?? 0.0,
                torsoDepth: av.morphWeights.torsoDepth ?? 0.0,
              }
            : DEFAULT_MORPH_WEIGHTS
          setMorphWeights(loadedMorphWeights)

          // Appearance hydration
          const loadedAppearance = av.appearance
            ? {
                ...DEFAULT_APPEARANCE,
                skinTone: av.appearance.skinTone || DEFAULT_APPEARANCE.skinTone,
                hairStyle: av.appearance.hairStyle || DEFAULT_APPEARANCE.hairStyle,
                hairColor: av.appearance.hairColor || DEFAULT_APPEARANCE.hairColor,
                eyeColor: av.appearance.eyeColor || DEFAULT_APPEARANCE.eyeColor,
                facialHair: av.appearance.facialHair || DEFAULT_APPEARANCE.facialHair,
              }
            : DEFAULT_APPEARANCE
          setAppearance(loadedAppearance)

          // Facial blendshapes hydration
          const loadedFacialMorphs = av.facialSuggestions
            ? {
                ...DEFAULT_FACIAL_WEIGHTS,
                ...av.facialSuggestions,
              }
            : DEFAULT_FACIAL_WEIGHTS
          setFacialMorphs(loadedFacialMorphs)

          // Save hydrated snapshot as clean reference
          setSavedSnapshot(
            serializeAvatarState(
              formattedDemo,
              loadedMeasurements,
              loadedMorphWeights,
              loadedAppearance,
              loadedFacialMorphs
            )
          )
        }
      } catch {
        // 404 is expected when user has no avatar profile yet
        if (isMounted) {
          setHasExistingProfile(false)
          setSavedSnapshot(null)
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  // Handle demographic switch with appropriate default measurement presets
  const handleDemographicChange = useCallback((newDemographic) => {
    setSaveStatus(null)
    setSaveError(null)
    setDemographic(newDemographic)
    const newIsYouth = ['Boys', 'Girls', 'Kids'].includes(newDemographic)
    if (newIsYouth) {
      setMeasurements((prev) => ({
        ...prev,
        ...DEFAULT_YOUTH_MEASUREMENTS,
      }))
    } else if (newDemographic === 'Women') {
      setMeasurements({
        height: '168',
        chest: '90',
        waist: '72',
        hip: '96',
        fitPreference: 'Regular',
        youthAge: '8',
      })
    } else {
      setMeasurements(DEFAULT_ADULT_MEASUREMENTS)
    }
  }, [])

  // Handle individual measurement change
  const handleMeasurementChange = useCallback((field, value) => {
    setSaveStatus(null)
    setSaveError(null)
    setMeasurements((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  // Handle individual body morph change
  const handleMorphChange = useCallback((morphName, value) => {
    setSaveStatus(null)
    setSaveError(null)
    setMorphWeights((prev) => ({
      ...prev,
      [morphName]: value,
    }))
  }, [])

  // Handle appearance change
  const handleAppearanceChange = useCallback((field, value) => {
    setSaveStatus(null)
    setSaveError(null)
    setAppearance((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  // Handle facial morph change
  const handleFacialMorphChange = useCallback((featureKey, value) => {
    setSaveStatus(null)
    setSaveError(null)
    setFacialMorphs((prev) => ({
      ...prev,
      [featureKey]: value,
    }))
  }, [])

  // Reset 3D camera only (orbit target, position, framing)
  const handleResetCamera = useCallback(() => {
    if (viewerRef.current?.resetView) {
      viewerRef.current.resetView()
    }
  }, [])

  // Reset entire avatar configuration (frontend state only, does not delete backend profile or cart)
  const handleResetAvatar = useCallback(() => {
    setMorphWeights(DEFAULT_MORPH_WEIGHTS)
    setAppearance(DEFAULT_APPEARANCE)
    setFacialMorphs(DEFAULT_FACIAL_WEIGHTS)
    if (isYouth) {
      setMeasurements(DEFAULT_YOUTH_MEASUREMENTS)
    } else {
      setMeasurements(DEFAULT_ADULT_MEASUREMENTS)
    }
    setSaveStatus(null)
    setSaveError(null)
  }, [isYouth])

  // Save Avatar to authoritative backend
  const handleSaveAvatar = async () => {
    if (isSavingAvatar) return
    setSaveError(null)

    if (!isAuthenticated) {
      setSaveError('Please sign in to your TrendVolt account to save your avatar profile.')
      return
    }

    setIsSavingAvatar(true)

    const payload = {
      demographic: demographic.toLowerCase(),
      age: isYouth ? (Number(measurements.youthAge) || 8) : null,
      heightCm: Number(measurements.height) || (isYouth ? 128 : 178),
      fitPreference: (measurements.fitPreference || 'regular').toLowerCase(),
      estimatedMeasurements: isYouth
        ? null
        : {
            chest: measurements.chest ? Number(measurements.chest) : null,
            waist: measurements.waist ? Number(measurements.waist) : null,
            hip: measurements.hip ? Number(measurements.hip) : null,
            unit: 'cm',
          },
      morphWeights,
      appearance,
      facialSuggestions: facialMorphs,
    }

    try {
      if (hasExistingProfile) {
        await updateAvatar(payload)
      } else {
        await createAvatar(payload)
        setHasExistingProfile(true)
      }

      setSavedSnapshot(currentSnapshot)
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus(null)
      }, 4000)
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).join(', ')
          : 'Unable to save avatar. Please try again.')
      setSaveError(msg || 'Unable to save avatar. Please try again.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  // Apply photo-assisted recommendations safely (local state only, does NOT auto-save)
  const handleApplyPhotoSuggestions = useCallback((suggestions) => {
    if (!suggestions) return
    setSaveStatus(null)
    setSaveError(null)

    // 1. Appearance (skin tone, hair color, eye color)
    if (suggestions.appearance) {
      setAppearance((prev) => ({
        ...prev,
        skinTone: suggestions.appearance.skinTone || prev.skinTone,
        hairColor: suggestions.appearance.hairColor || prev.hairColor,
        eyeColor: suggestions.appearance.eyeColor || prev.eyeColor,
      }))
    }

    // 2. Normalized facial blendshapes (stored in state for canonical base avatar)
    if (suggestions.facialSuggestions) {
      setFacialMorphs((prev) => ({
        ...prev,
        ...suggestions.facialSuggestions,
      }))
    }

    // 3. Approximate visual proportions only (legLength, torsoDepth)
    // CRITICAL: Chest, waist, hip measurements remain authoritative manual tape ground truth.
    if (suggestions.bodySuggestions) {
      setMorphWeights((prev) => ({
        ...prev,
        legLength: suggestions.bodySuggestions.legLength ?? prev.legLength,
        torsoDepth: suggestions.bodySuggestions.torsoDepth ?? prev.torsoDepth,
      }))
    }

    setSaveStatus('photo-applied')
    setTimeout(() => {
      setSaveStatus(null)
    }, 4000)
  }, [])

  const TABS = [
    { id: 'body', label: 'Body Silhouette', icon: Sliders },
    { id: 'appearance', label: 'Appearance & Style', icon: Palette },
    { id: 'face', label: 'Facial Features', icon: Smile },
    { id: 'measurements', label: 'Measurements & Fit', icon: Ruler },
    { id: 'photo', label: 'Photo Guidance', icon: Camera },
  ]

  return (
    <>
      <SEO
        title="Personalized Avatar Studio | TrendVolt"
        description="Craft and customize your personal 3D consumer avatar for tailored sizing, silhouette visualization, and virtual fitting on TrendVolt."
      />

      <div className="min-h-screen bg-[var(--tv-bg)] text-[var(--tv-text-primary)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header Banner — Luxury Editorial Aesthetic */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[var(--tv-border)]">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--tv-olive)]/10 text-[var(--tv-olive)] dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="tracking-wide uppercase text-[10px] font-semibold">
                  Personalized Avatar Studio &bull; Phase 4E
                </span>
                {hasExistingProfile ? (
                  isDirty ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>Unsaved changes</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase bg-[var(--tv-olive)]/20 px-2 py-0.5 rounded-full text-[var(--tv-olive)] dark:text-emerald-300">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Avatar saved</span>
                    </span>
                  )
                ) : isDirty ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Unsaved changes</span>
                  </span>
                ) : null}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[var(--tv-text-primary)]">
                Your Personal Avatar
              </h1>
              <p className="text-sm text-[var(--tv-text-secondary)] max-w-2xl leading-relaxed">
                Stylized consumer avatar tuned to your personal silhouette, tone, and fit
                preferences. Designed for recognizable proportions and elevated digital dressing
                without biometric or photorealistic capture.
              </p>
            </div>

            {/* Quick Actions Header */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleResetCamera}
                aria-label="Reset 3D camera to default orbit angle"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--tv-surface)] text-[var(--tv-text-secondary)] hover:text-[var(--tv-text-primary)] border border-[var(--tv-border)] hover:bg-[var(--tv-surface-elevated)] transition-colors cursor-pointer"
                title="Reset 3D camera to default orbit angle"
              >
                <Compass className="w-4 h-4 text-[var(--tv-olive)]" />
                <span>Reset Camera</span>
              </button>

              <button
                type="button"
                onClick={handleResetAvatar}
                aria-label="Reset all body morphs and appearance to defaults"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--tv-surface)] text-[var(--tv-text-secondary)] hover:text-[var(--tv-text-primary)] border border-[var(--tv-border)] hover:bg-[var(--tv-surface-elevated)] transition-colors cursor-pointer"
                title="Reset all body morphs and appearance to defaults"
              >
                <RotateCcw className="w-4 h-4 text-[var(--tv-terracotta)]" />
                <span>Reset Avatar</span>
              </button>

              <button
                type="button"
                disabled={isSavingAvatar}
                onClick={handleSaveAvatar}
                aria-label={isSavingAvatar ? 'Saving avatar' : saveStatus === 'saved' ? 'Avatar saved' : 'Save Avatar'}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[var(--tv-olive)] text-white hover:bg-[var(--tv-olive-hover)]'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isSavingAvatar ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Avatar saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Avatar</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* 4-Step Journey Guide Strip */}
          <section aria-label="Avatar Studio Workflow" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] text-xs">
              <span className="w-6 h-6 rounded-full bg-[var(--tv-olive)]/15 text-[var(--tv-olive)] font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                1
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--tv-text-primary)] truncate">Customize</p>
                <p className="text-[10px] text-[var(--tv-text-muted)] truncate">Silhouette & Tone</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] text-xs">
              <span className="w-6 h-6 rounded-full bg-[var(--tv-olive)]/15 text-[var(--tv-olive)] font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                2
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--tv-text-primary)] truncate">Preview</p>
                <p className="text-[10px] text-[var(--tv-text-muted)] truncate">360° Orbit View</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] text-xs">
              <span className="w-6 h-6 rounded-full bg-[var(--tv-olive)]/15 text-[var(--tv-olive)] font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                3
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--tv-text-primary)] truncate">Save Avatar</p>
                <p className="text-[10px] text-[var(--tv-text-muted)] truncate">{hasExistingProfile ? 'Sync to Account' : 'Persist Profile'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] text-xs">
              <span className="w-6 h-6 rounded-full bg-[var(--tv-olive)]/15 text-[var(--tv-olive)] font-mono font-bold flex items-center justify-center text-[11px] shrink-0">
                4
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--tv-text-primary)] truncate">Wardrobe</p>
                <p className="text-[10px] text-[var(--tv-text-muted)] truncate">Style Real Outfits</p>
              </div>
            </div>
          </section>

          {/* Loading Profile Banner */}
          {isLoadingProfile && (
            <div
              role="status"
              className="p-3.5 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] flex items-center gap-3 text-xs text-[var(--tv-text-secondary)] animate-fade-in"
            >
              <Loader2 className="w-4 h-4 animate-spin text-[var(--tv-olive)] shrink-0" />
              <span>Loading your saved avatar configuration from your account...</span>
            </div>
          )}

          {/* Save Error Alert Banner */}
          {saveError && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 flex items-center justify-between gap-3 text-sm animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                <span>
                  <strong>Save Notice:</strong> {saveError}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="text-xs uppercase font-mono tracking-wider text-red-700 dark:text-red-400 hover:opacity-75 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Save Confirmation Toast Banner */}
          {saveStatus === 'saved' && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 text-sm animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Avatar Profile Saved to Account.</strong> Your personalized proportions,
                  skin tone, and measurements are securely synchronized with the backend.
                </span>
              </div>
              <span className="text-xs uppercase font-mono tracking-wider text-emerald-700 dark:text-emerald-400">
                Backend Authoritative
              </span>
            </div>
          )}

          {saveStatus === 'photo-applied' && (
            <div
              role="status"
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 text-sm animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Photo-Assisted Suggestions Applied.</strong> Personalized tone, facial
                  blendshapes, and visual proportions updated. Manual measurements remain authoritative.
                </span>
              </div>
              <span className="text-xs uppercase font-mono tracking-wider text-emerald-700 dark:text-emerald-400">
                Photo-Assisted Active
              </span>
            </div>
          )}

          {/* Demographic Selector Strip */}
          <section
            aria-label="Target Demographic Selection"
            className="p-4 sm:p-5 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)]"
          >
            <AvatarDemographicSelector
              selectedDemographic={demographic}
              onChange={handleDemographicChange}
            />
          </section>

          {/* Main Studio Two-Column Layout */}
          {/* Desktop: Left 7 cols (3D canvas), Right 5 cols (Controls panel) */}
          {/* Mobile: 3D canvas on top, controls below */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: 3D Avatar Viewer */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative rounded-3xl overflow-hidden border border-[var(--tv-border)] bg-[var(--tv-surface-elevated)] shadow-sm">
                {/* 3D WebGL Canvas */}
                <div className="h-[440px] sm:h-[540px] lg:h-[620px] w-full">
                  <AvatarViewer
                    ref={viewerRef}
                    modelUrl="/models/base_avatar_poc.glb"
                    demographic={demographic}
                    morphWeights={morphWeights}
                    facialMorphs={facialMorphs}
                    skinColor={appearance.skinTone}
                    eyeColor={appearance.eyeColor}
                    heightCm={Number(measurements.height) || (isYouth ? 128 : 178)}
                  />
                </div>

                {/* Canvas Floating Overlay: Demographic & Mode Badge */}
                <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/80 dark:bg-stone-900/80 backdrop-blur-md text-[var(--tv-text-primary)] border border-black/5 dark:border-white/10 shadow-xs">
                    {demographic} Avatar Silhouette
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-[var(--tv-olive)]/15 text-[var(--tv-olive)] dark:text-emerald-400 backdrop-blur-md border border-[var(--tv-olive)]/20">
                    360&deg; Orbit View
                  </span>
                </div>

                {/* Canvas Floating Overlay: Quick Preset Pills on Desktop */}
                <div className="absolute bottom-4 left-4 right-4 hidden sm:flex items-center justify-between text-xs pointer-events-none">
                  <div className="px-3 py-1.5 rounded-xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-md text-[var(--tv-text-secondary)] border border-black/5 dark:border-white/10">
                    Drag to rotate &bull; Scroll to zoom
                  </div>
                  <button
                    type="button"
                    onClick={handleResetCamera}
                    className="pointer-events-auto px-3 py-1.5 rounded-xl bg-white/90 dark:bg-stone-900/90 hover:bg-white dark:hover:bg-stone-800 text-[var(--tv-text-primary)] border border-black/10 dark:border-white/15 transition-all text-xs font-medium cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5 text-[var(--tv-olive)]" />
                    <span>Reset View</span>
                  </button>
                </div>
              </div>

              {/* Editorial Philosophy Strip */}
              <div className="p-4 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] flex items-start gap-3">
                <Info className="w-5 h-5 text-[var(--tv-olive)] shrink-0 mt-0.5" />
                <div className="text-xs text-[var(--tv-text-secondary)] space-y-1">
                  <span className="font-semibold text-[var(--tv-text-primary)]">
                    Stylized Representation Guarantee:
                  </span>
                  <p>
                    TrendVolt avatars are engineered for consumer fashion confidence, not biometric
                    identification. Proportions mirror personal fit measurements without storing
                    biometric facial templates or private facial landmarks.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Customization Controls Panel */}
            <div className="lg:col-span-5 space-y-6">
              {/* Studio Navigation Tabs */}
              <div
                role="tablist"
                aria-label="Avatar Studio Customization Categories"
                className="grid grid-cols-2 sm:grid-cols-5 p-1 rounded-2xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] gap-1"
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id

                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      id={`tab-${tab.id}`}
                      aria-controls={`panel-${tab.id}`}
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)] ${
                        isActive
                          ? 'bg-[var(--tv-surface)] text-[var(--tv-text-primary)] shadow-xs font-semibold border border-[var(--tv-border)]'
                          : 'text-[var(--tv-text-muted)] hover:text-[var(--tv-text-primary)] hover:bg-[var(--tv-surface)]/50'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[var(--tv-olive)]' : 'text-current'
                        }`}
                      />
                      <span className="truncate">{tab.label.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Panel Content Box */}
              <div className="p-6 rounded-3xl bg-[var(--tv-surface)] border border-[var(--tv-border)] shadow-xs">
                {/* 1. Body Silhouette Tab */}
                {activeTab === 'body' && (
                  <div
                    role="tabpanel"
                    id="panel-body"
                    aria-labelledby="tab-body"
                    className="space-y-6"
                  >
                    <AvatarBodyControls
                      morphWeights={morphWeights}
                      onChange={handleMorphChange}
                      onReset={() => setMorphWeights(DEFAULT_MORPH_WEIGHTS)}
                    />
                  </div>
                )}

                {/* 2. Appearance & Style Tab */}
                {activeTab === 'appearance' && (
                  <div
                    role="tabpanel"
                    id="panel-appearance"
                    aria-labelledby="tab-appearance"
                    className="space-y-6"
                  >
                    <AvatarAppearanceControls
                      appearance={appearance}
                      onChange={handleAppearanceChange}
                      demographic={demographic}
                    />
                  </div>
                )}

                {/* 3. Facial Blendshapes Tab */}
                {activeTab === 'face' && (
                  <div
                    role="tabpanel"
                    id="panel-face"
                    aria-labelledby="tab-face"
                    className="space-y-6"
                  >
                    <AvatarFaceControls
                      facialMorphs={facialMorphs}
                      onChange={handleFacialMorphChange}
                      isModelSupported={isModelSupported}
                    />
                  </div>
                )}

                {/* 4. Measurements & Fit Tab */}
                {activeTab === 'measurements' && (
                  <div
                    role="tabpanel"
                    id="panel-measurements"
                    aria-labelledby="tab-measurements"
                    className="space-y-6"
                  >
                    <AvatarMeasurementForm
                      demographic={demographic}
                      measurements={measurements}
                      onChange={handleMeasurementChange}
                    />
                  </div>
                )}

                {/* 5. Photo Guidance Tab */}
                {activeTab === 'photo' && (
                  <div
                    role="tabpanel"
                    id="panel-photo"
                    aria-labelledby="tab-photo"
                    className="space-y-6"
                  >
                    <AvatarPhotoReference
                      demographic={demographic}
                      currentAppearance={appearance}
                      onApplySuggestions={handleApplyPhotoSuggestions}
                      onKeepCurrent={() => setActiveTab('body')}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Next-Step Section: Virtual Wardrobe Architecture */}
              <div className="p-5 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[var(--tv-text-muted)]">
                    Next Stage
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isDirty
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        : 'bg-[var(--tv-olive)]/10 text-[var(--tv-olive)] dark:text-emerald-400 border-[var(--tv-olive)]/20'
                    }`}
                  >
                    {isDirty ? 'Unsaved changes' : 'Avatar saved'}
                  </span>
                </div>

                {isDirty && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      You have unsaved changes. Save your avatar above to ensure your personalized
                      silhouette carries over to the Virtual Wardrobe.
                    </span>
                  </div>
                )}

                <Link
                  to="/avatar/wardrobe"
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider bg-[var(--tv-surface-elevated)] hover:bg-[var(--tv-olive)] text-[var(--tv-text-secondary)] hover:text-white border border-[var(--tv-border)] flex items-center justify-center gap-2 transition-colors cursor-pointer group shadow-2xs"
                >
                  <ShoppingBag className="w-4 h-4 text-[var(--tv-olive)] group-hover:text-white transition-colors" />
                  <span>Enter Virtual Wardrobe & Outfit Studio →</span>
                </Link>
                <p className="text-[11px] text-[var(--tv-text-muted)] text-center leading-normal">
                  {hasExistingProfile && !isDirty
                    ? 'Your saved avatar profile will load automatically in Virtual Wardrobe for real product fitting and outfit visualization.'
                    : 'Save your avatar above to preserve your customized silhouette, proportions, and fit preferences across the Virtual Wardrobe.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
