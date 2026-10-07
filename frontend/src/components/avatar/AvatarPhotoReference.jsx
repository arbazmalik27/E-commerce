import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Info,
  Sliders,
  Palette,
  Smile,
  Loader2,
} from 'lucide-react'
import {
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  FACIAL_BLENDSHAPES,
} from '../../constants/avatarStudioConstants'
import {
  validatePhotoFile,
  validatePhotoDimensions,
  createSafePreviewUrl,
  revokeSafePreviewUrl,
  analyzePhotoReference,
  generatePersonalizationSuggestions,
} from '../../utils/avatarPhotoAnalysis'

export default function AvatarPhotoReference({
  demographic = 'Men',
  onApplySuggestions,
  onKeepCurrent,
  className = '',
}) {
  const isYouth = ['Boys', 'Girls', 'Kids'].includes(demographic)

  // Temporary browser memory state for photos (never persisted)
  const [frontPhotoFile, setFrontPhotoFile] = useState(null)
  const [frontPreviewUrl, setFrontPreviewUrl] = useState(null)
  const [sidePreviewUrl, setSidePreviewUrl] = useState(null)

  // Validation & analysis state
  const [validationError, setValidationError] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [rawSuggestions, setRawSuggestions] = useState(null)
  const [editableSuggestions, setEditableSuggestions] = useState(null)
  const [appliedFeedback, setAppliedFeedback] = useState(null)

  const frontInputRef = useRef(null)
  const sideInputRef = useRef(null)
  const frontImgRef = useRef(null)

  // Cleanup all temporary object URLs on unmount or demographic change
  useEffect(() => {
    return () => {
      if (frontPreviewUrl) revokeSafePreviewUrl(frontPreviewUrl)
      if (sidePreviewUrl) revokeSafePreviewUrl(sidePreviewUrl)
    }
  }, [frontPreviewUrl, sidePreviewUrl])

  // Revoke object URLs when demographic switches to youth for child privacy
  useEffect(() => {
    if (isYouth) {
      if (frontPreviewUrl) revokeSafePreviewUrl(frontPreviewUrl)
      if (sidePreviewUrl) revokeSafePreviewUrl(sidePreviewUrl)
    }
  }, [isYouth, frontPreviewUrl, sidePreviewUrl])

  // Handle front photo selection with thorough client-side validation
  const handleFrontPhotoSelect = useCallback((file) => {
    setValidationError(null)
    setAppliedFeedback(null)

    if (!file) return

    // 1. File type and size validation
    const fileValidation = validatePhotoFile(file)
    if (!fileValidation.isValid) {
      setValidationError(fileValidation.error)
      return
    }

    // Revoke any previous front preview URL
    if (frontPreviewUrl) {
      revokeSafePreviewUrl(frontPreviewUrl)
    }

    const previewUrl = createSafePreviewUrl(file)

    // 2. Client-side dimension validation via temporary Image element
    const testImg = new Image()
    testImg.onload = () => {
      const dimValidation = validatePhotoDimensions(testImg.naturalWidth, testImg.naturalHeight)
      if (!dimValidation.isValid) {
        revokeSafePreviewUrl(previewUrl)
        setValidationError(dimValidation.error)
        setFrontPhotoFile(null)
        setFrontPreviewUrl(null)
      } else {
        setFrontPhotoFile(file)
        setFrontPreviewUrl(previewUrl)
        setRawSuggestions(null)
        setEditableSuggestions(null)
      }
    }
    testImg.onerror = () => {
      revokeSafePreviewUrl(previewUrl)
      setValidationError('Unable to load image file. Please verify the file is not corrupted.')
      setFrontPhotoFile(null)
      setFrontPreviewUrl(null)
    }
    testImg.src = previewUrl
  }, [frontPreviewUrl])

  // Handle side/back photo selection
  const handleSidePhotoSelect = useCallback((file) => {
    setValidationError(null)
    if (!file) return

    const fileValidation = validatePhotoFile(file)
    if (!fileValidation.isValid) {
      setValidationError(fileValidation.error)
      return
    }

    if (sidePreviewUrl) {
      revokeSafePreviewUrl(sidePreviewUrl)
    }

    const previewUrl = createSafePreviewUrl(file)
    const testImg = new Image()
    testImg.onload = () => {
      const dimValidation = validatePhotoDimensions(testImg.naturalWidth, testImg.naturalHeight)
      if (!dimValidation.isValid) {
        revokeSafePreviewUrl(previewUrl)
        setValidationError(dimValidation.error)
        setSidePreviewUrl(null)
      } else {
        setSidePreviewUrl(previewUrl)
      }
    }
    testImg.onerror = () => {
      revokeSafePreviewUrl(previewUrl)
      setValidationError('Unable to load side reference photo.')
      setSidePreviewUrl(null)
    }
    testImg.src = previewUrl
  }, [sidePreviewUrl])

  // Remove front photo
  const handleRemoveFrontPhoto = useCallback(() => {
    if (frontPreviewUrl) revokeSafePreviewUrl(frontPreviewUrl)
    setFrontPhotoFile(null)
    setFrontPreviewUrl(null)
    setRawSuggestions(null)
    setEditableSuggestions(null)
    setValidationError(null)
    setAppliedFeedback(null)
    if (frontInputRef.current) frontInputRef.current.value = ''
  }, [frontPreviewUrl])

  // Remove side photo
  const handleRemoveSidePhoto = useCallback(() => {
    if (sidePreviewUrl) revokeSafePreviewUrl(sidePreviewUrl)
    setSidePreviewUrl(null)
    if (sideInputRef.current) sideInputRef.current.value = ''
  }, [sidePreviewUrl])

  // Run client-side analysis
  const handleAnalyzePhoto = async () => {
    if (!frontPhotoFile || !frontPreviewUrl) return

    setIsAnalyzing(true)
    setValidationError(null)

    try {
      let suggestions
      if (frontImgRef.current && frontImgRef.current.complete) {
        suggestions = await analyzePhotoReference(frontImgRef.current)
      } else {
        // Fallback for immediate processing
        suggestions = generatePersonalizationSuggestions()
      }

      setRawSuggestions(suggestions)
      // Clone into editable working copy
      setEditableSuggestions(JSON.parse(JSON.stringify(suggestions)))
    } catch (err) {
      setValidationError(`Visual analysis could not complete: ${err.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Update an editable appearance suggestion
  const handleSuggestionAppearanceChange = (field, value) => {
    setEditableSuggestions((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [field]: value,
      },
    }))
  }

  // Update an editable facial suggestion
  const handleSuggestionFacialChange = (key, value) => {
    setEditableSuggestions((prev) => ({
      ...prev,
      facialSuggestions: {
        ...prev.facialSuggestions,
        [key]: value,
      },
    }))
  }

  // Update an editable body suggestion
  const handleSuggestionBodyChange = (key, value) => {
    setEditableSuggestions((prev) => ({
      ...prev,
      bodySuggestions: {
        ...prev.bodySuggestions,
        [key]: value,
      },
    }))
  }

  // Reset editable suggestions back to initial analyzed values
  const handleResetSuggestions = () => {
    if (rawSuggestions) {
      setEditableSuggestions(JSON.parse(JSON.stringify(rawSuggestions)))
      setAppliedFeedback('Suggestions reset to initial analyzed values.')
      setTimeout(() => setAppliedFeedback(null), 3000)
    }
  }

  // Apply suggestions to the avatar studio
  const handleApply = () => {
    if (!editableSuggestions) return
    onApplySuggestions?.(editableSuggestions)
    setAppliedFeedback('Photo-assisted suggestions successfully applied to avatar.')
    setTimeout(() => setAppliedFeedback(null), 4000)
  }

  // Keep current avatar and dismiss suggestions
  const handleKeepCurrent = () => {
    onKeepCurrent?.()
    setAppliedFeedback('Current avatar configuration preserved without changes.')
    setTimeout(() => setAppliedFeedback(null), 3000)
  }

  // ==========================================
  // YOUTH DEMOGRAPHIC: STRICT ZERO PHOTO POLICY
  // ==========================================
  if (isYouth) {
    return (
      <div className={`space-y-6 ${className}`} data-testid="youth-photo-policy-container">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--tv-text-primary)] flex items-center gap-2">
              <Camera className="w-4 h-4 text-[var(--tv-olive)]" />
              <span>Photo-Assisted Personalization</span>
            </h3>
            <p className="text-xs text-[var(--tv-text-secondary)] mt-0.5">
              Child privacy and data minimization boundaries.
            </p>
          </div>
        </div>

        {/* Strict Zero Photo Notice Banner */}
        <div
          role="region"
          aria-label="Zero Photo Policy"
          className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 space-y-3"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Zero Photo Policy Active
              </div>
              <p className="leading-relaxed">
                To rigorously safeguard minor privacy, photo upload and facial analysis are
                strictly prohibited for youth profiles ({demographic}).
              </p>
              <p className="text-[11px] text-[var(--tv-text-muted)]">
                TrendVolt generates youth avatar proportions deterministically using age and stature
                alone. No image capture or face scanning is permitted.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==========================================
  // ADULT DEMOGRAPHIC: CLIENT-SIDE PHOTO FLOW
  // ==========================================
  return (
    <div className={`space-y-6 ${className}`} data-testid="adult-photo-reference-container">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--tv-text-primary)] flex items-center gap-2">
            <Camera className="w-4 h-4 text-[var(--tv-olive)]" />
            <span>Photo-Assisted Personalization</span>
          </h3>
          <p className="text-xs text-[var(--tv-text-secondary)] mt-0.5">
            Client-side visual guidance for approximate tone and proportion suggestions.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-[var(--tv-olive)]/10 text-[var(--tv-olive)] dark:text-emerald-400 border border-[var(--tv-olive)]/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Client-Side Only</span>
        </span>
      </div>

      {/* Privacy & Methodology Guarantee */}
      <div className="p-4 rounded-2xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[var(--tv-olive)] shrink-0 mt-0.5" />
        <div className="text-xs text-[var(--tv-text-secondary)] space-y-1">
          <span className="font-semibold text-[var(--tv-text-primary)] block">
            Client-Side Privacy Guarantee
          </span>
          <p>
            Your reference photo remains strictly in temporary browser memory. TrendVolt never
            uploads raw photos, never stores biometric templates, and never transmits facial data to
            any backend server or third party.
          </p>
        </div>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-900 dark:text-red-200 flex items-start gap-2.5 text-xs animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-semibold">Validation Notice:</strong>
            <span>{validationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-red-600 dark:text-red-400 hover:opacity-80 p-0.5 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Applied Feedback Banner */}
      {appliedFeedback && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 text-xs"
        >
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{appliedFeedback}</span>
        </div>
      )}

      {/* Photo Input Slots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Slot 1: Front Photo (Primary) */}
        <div className="p-4 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--tv-text-primary)] flex items-center gap-1.5">
              <span>Front Reference Photo</span>
              <span className="text-[10px] text-[var(--tv-terracotta)] font-normal font-mono">
                (Primary)
              </span>
            </span>
            {frontPreviewUrl && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Ready</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--tv-text-muted)]">
            A standard portrait in neutral lighting for tone and facial balance cues.
          </p>

          {/* Hidden file input */}
          <input
            ref={frontInputRef}
            type="file"
            id="avatar-front-photo-input"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFrontPhotoSelect(e.target.files[0])
            }}
          />

          {!frontPreviewUrl ? (
            <label
              htmlFor="avatar-front-photo-input"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--tv-border)] hover:border-[var(--tv-olive)] rounded-xl cursor-pointer bg-[var(--tv-surface-elevated)]/50 hover:bg-[var(--tv-surface-elevated)] transition-colors text-center group"
            >
              <Upload className="w-6 h-6 text-[var(--tv-text-muted)] group-hover:text-[var(--tv-olive)] transition-colors mb-2" />
              <span className="text-xs font-medium text-[var(--tv-text-primary)]">
                Select Front Photo
              </span>
              <span className="text-[10px] text-[var(--tv-text-muted)] mt-1">
                JPG, PNG, or WebP &bull; Max 10 MB
              </span>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative aspect-square max-h-48 mx-auto rounded-xl overflow-hidden border border-[var(--tv-border)] bg-black/5 dark:bg-white/5">
                <img
                  ref={frontImgRef}
                  src={frontPreviewUrl}
                  alt="Temporary front reference photo preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="avatar-front-photo-input"
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-[var(--tv-surface-elevated)] hover:bg-[var(--tv-surface)] border border-[var(--tv-border)] text-[var(--tv-text-primary)] text-center cursor-pointer transition-colors"
                >
                  Replace
                </label>
                <button
                  type="button"
                  onClick={handleRemoveFrontPhoto}
                  className="py-1.5 px-3 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 cursor-pointer transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Slot 2: Side / Profile Photo (Optional) */}
        <div className="p-4 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--tv-text-primary)] flex items-center gap-1.5">
              <span>Side / Profile Photo</span>
              <span className="text-[10px] text-[var(--tv-text-muted)] font-normal font-mono">
                (Optional)
              </span>
            </span>
            {sidePreviewUrl && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Ready</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--tv-text-muted)]">
            Provides additional visual context for torso depth and posture proportions.
          </p>

          {/* Hidden file input */}
          <input
            ref={sideInputRef}
            type="file"
            id="avatar-side-photo-input"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.[0]) handleSidePhotoSelect(e.target.files[0])
            }}
          />

          {!sidePreviewUrl ? (
            <label
              htmlFor="avatar-side-photo-input"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--tv-border)] hover:border-[var(--tv-olive)] rounded-xl cursor-pointer bg-[var(--tv-surface-elevated)]/50 hover:bg-[var(--tv-surface-elevated)] transition-colors text-center group"
            >
              <Upload className="w-6 h-6 text-[var(--tv-text-muted)] group-hover:text-[var(--tv-olive)] transition-colors mb-2" />
              <span className="text-xs font-medium text-[var(--tv-text-primary)]">
                Select Side Photo
              </span>
              <span className="text-[10px] text-[var(--tv-text-muted)] mt-1">
                Optional &bull; Max 10 MB
              </span>
            </label>
          ) : (
            <div className="space-y-3">
              <div className="relative aspect-square max-h-48 mx-auto rounded-xl overflow-hidden border border-[var(--tv-border)] bg-black/5 dark:bg-white/5">
                <img
                  src={sidePreviewUrl}
                  alt="Temporary side reference photo preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="avatar-side-photo-input"
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-[var(--tv-surface-elevated)] hover:bg-[var(--tv-surface)] border border-[var(--tv-border)] text-[var(--tv-text-primary)] text-center cursor-pointer transition-colors"
                >
                  Replace
                </label>
                <button
                  type="button"
                  onClick={handleRemoveSidePhoto}
                  className="py-1.5 px-3 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 cursor-pointer transition-colors flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Action Bar */}
      {frontPreviewUrl && (
        <div className="p-4 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[var(--tv-text-secondary)]">
            <span className="font-semibold text-[var(--tv-text-primary)] block">
              Generate Approximate Suggestions
            </span>
            <span>
              Samples visual tones and proportions locally in browser memory.
            </span>
          </div>

          <button
            type="button"
            disabled={isAnalyzing}
            onClick={handleAnalyzePhoto}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--tv-olive)] text-white hover:bg-[var(--tv-olive-dark,#364639)] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Photo...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Generate Personalization Suggestions</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* REVIEW UI: PHOTO ANALYSIS & EDITABLE SUGGESTIONS               */}
      {/* ============================================================== */}
      {editableSuggestions && (
        <div
          role="region"
          aria-label="Photo Analysis Suggestions Review"
          className="p-6 rounded-3xl bg-[var(--tv-surface)] border border-[var(--tv-olive)]/30 space-y-6 animate-fade-in shadow-xs"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--tv-border)]">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-[var(--tv-olive)]/10 text-[var(--tv-olive)] dark:text-emerald-400 border border-[var(--tv-olive)]/20 mb-1">
                PHOTO ANALYSIS
              </div>
              <h4 className="text-sm font-serif font-semibold text-[var(--tv-text-primary)]">
                Photo-based suggestion — review before applying
              </h4>
              <p className="text-xs text-[var(--tv-text-secondary)]">
                Review and fine-tune approximate recommendations before applying them to your avatar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetSuggestions}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--tv-surface-elevated)] hover:bg-[var(--tv-surface)] border border-[var(--tv-border)] text-[var(--tv-text-secondary)] transition-colors cursor-pointer"
                title="Reset suggestions back to initial photo analysis"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* 1. Appearance Suggestions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--tv-text-primary)] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[var(--tv-olive)]" />
                <span>Appearance Suggestions</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--tv-text-muted)]">
                Confidence: {editableSuggestions.confidence?.appearance || 'Medium'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Skin Tone Selector */}
              <div className="p-3 rounded-xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] space-y-2">
                <label
                  htmlFor="photo-suggest-skintone"
                  className="text-xs font-medium text-[var(--tv-text-primary)] flex items-center justify-between"
                >
                  <span>Suggested Skin Tone</span>
                  <span
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: editableSuggestions.appearance.skinTone }}
                  />
                </label>
                <select
                  id="photo-suggest-skintone"
                  value={editableSuggestions.appearance.skinTone}
                  onChange={(e) => handleSuggestionAppearanceChange('skinTone', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-[var(--tv-surface)] border border-[var(--tv-border)] text-[var(--tv-text-primary)]"
                >
                  {SKIN_TONES.map((tone) => (
                    <option key={tone.id} value={tone.hex}>
                      {tone.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hair Color Selector */}
              <div className="p-3 rounded-xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] space-y-2">
                <label
                  htmlFor="photo-suggest-haircolor"
                  className="text-xs font-medium text-[var(--tv-text-primary)] flex items-center justify-between"
                >
                  <span>Suggested Hair Color</span>
                  <span
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: editableSuggestions.appearance.hairColor }}
                  />
                </label>
                <select
                  id="photo-suggest-haircolor"
                  value={editableSuggestions.appearance.hairColor}
                  onChange={(e) => handleSuggestionAppearanceChange('hairColor', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-[var(--tv-surface)] border border-[var(--tv-border)] text-[var(--tv-text-primary)]"
                >
                  {HAIR_COLORS.map((hair) => (
                    <option key={hair.id} value={hair.hex}>
                      {hair.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Eye Color Selector */}
              <div className="p-3 rounded-xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] space-y-2">
                <label
                  htmlFor="photo-suggest-eyecolor"
                  className="text-xs font-medium text-[var(--tv-text-primary)] flex items-center justify-between"
                >
                  <span>Suggested Eye Color</span>
                  <span
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: editableSuggestions.appearance.eyeColor }}
                  />
                </label>
                <select
                  id="photo-suggest-eyecolor"
                  value={editableSuggestions.appearance.eyeColor}
                  onChange={(e) => handleSuggestionAppearanceChange('eyeColor', e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-[var(--tv-surface)] border border-[var(--tv-border)] text-[var(--tv-text-primary)]"
                >
                  {EYE_COLORS.map((eye) => (
                    <option key={eye.id} value={eye.hex}>
                      {eye.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Facial Suggestions */}
          <div className="space-y-4 pt-3 border-t border-[var(--tv-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--tv-text-primary)] flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-[var(--tv-olive)]" />
                <span>Facial Suggestions (8 Canonical Parameters)</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--tv-text-muted)]">
                Confidence: {editableSuggestions.confidence?.face || 'Approximate'}
              </span>
            </div>

            {/* POC Asset Boundary Notice */}
            <div className="p-3.5 rounded-xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] flex items-start gap-2.5 text-xs text-[var(--tv-text-secondary)]">
              <Info className="w-4 h-4 text-[var(--tv-terracotta)] shrink-0 mt-0.5" />
              <p>
                <strong>POC Mannequin Asset Boundary:</strong> The temporary mannequin contains 5 body
                shape keys only. Facial suggestions are stored cleanly in your session state and will
                activate visually upon production base avatar integration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FACIAL_BLENDSHAPES.map((morph) => {
                const val = editableSuggestions.facialSuggestions?.[morph.id] ?? 0.0

                return (
                  <div
                    key={morph.id}
                    className="p-3 rounded-xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <label
                          htmlFor={`suggest-face-${morph.id}`}
                          className="font-medium text-[var(--tv-text-primary)]"
                        >
                          {morph.label}
                        </label>
                        <span className="text-[10px] text-[var(--tv-text-muted)] ml-1.5">
                          {morph.desc}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[var(--tv-surface)] border border-[var(--tv-border)]">
                        {val.toFixed(2)}
                      </span>
                    </div>

                    <input
                      id={`suggest-face-${morph.id}`}
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.01}
                      value={val}
                      onChange={(e) =>
                        handleSuggestionFacialChange(
                          morph.id,
                          Number.parseFloat(e.target.value) || 0.0
                        )
                      }
                      className="w-full h-1.5 bg-[var(--tv-border)] rounded-lg appearance-none cursor-pointer accent-[var(--tv-olive)]"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. Body Proportion Suggestions */}
          <div className="space-y-4 pt-3 border-t border-[var(--tv-border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--tv-text-primary)] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[var(--tv-olive)]" />
                <span>Body Proportion Suggestions (Visual Cues Only)</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--tv-text-muted)]">
                Confidence: {editableSuggestions.confidence?.body || 'Visual cues only'}
              </span>
            </div>

            {/* Authoritative Measurements Notice */}
            <div className="p-3.5 rounded-xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] flex items-start gap-2.5 text-xs text-[var(--tv-text-secondary)]">
              <Info className="w-4 h-4 text-[var(--tv-olive)] shrink-0 mt-0.5" />
              <p>
                <strong>Manual Measurements Authoritative:</strong> Photographs cannot reliably extract
                circumferences (chest, waist, hip). Photo assistance suggests visual proportions
                (leg length and torso depth) only and will not overwrite your manual tape measurements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Leg Length */}
              <div className="p-3 rounded-xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <label
                      htmlFor="suggest-body-legLength"
                      className="font-medium text-[var(--tv-text-primary)]"
                    >
                      Leg Length Proportion
                    </label>
                    <span className="text-[10px] text-[var(--tv-text-muted)] ml-1.5">
                      Vertical lower-limb balance
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[var(--tv-surface)] border border-[var(--tv-border)]">
                    {(editableSuggestions.bodySuggestions?.legLength ?? 0.0).toFixed(2)}
                  </span>
                </div>

                <input
                  id="suggest-body-legLength"
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={editableSuggestions.bodySuggestions?.legLength ?? 0.0}
                  onChange={(e) =>
                    handleSuggestionBodyChange(
                      'legLength',
                      Number.parseFloat(e.target.value) || 0.0
                    )
                  }
                  className="w-full h-1.5 bg-[var(--tv-border)] rounded-lg appearance-none cursor-pointer accent-[var(--tv-olive)]"
                />
              </div>

              {/* Torso Depth */}
              <div className="p-3 rounded-xl bg-[var(--tv-surface-elevated)] border border-[var(--tv-border)] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <label
                      htmlFor="suggest-body-torsoDepth"
                      className="font-medium text-[var(--tv-text-primary)]"
                    >
                      Torso Depth
                    </label>
                    <span className="text-[10px] text-[var(--tv-text-muted)] ml-1.5">
                      Anterior-posterior rib cage thickness
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[var(--tv-surface)] border border-[var(--tv-border)]">
                    {(editableSuggestions.bodySuggestions?.torsoDepth ?? 0.0).toFixed(2)}
                  </span>
                </div>

                <input
                  id="suggest-body-torsoDepth"
                  type="range"
                  min={0.0}
                  max={1.0}
                  step={0.01}
                  value={editableSuggestions.bodySuggestions?.torsoDepth ?? 0.0}
                  onChange={(e) =>
                    handleSuggestionBodyChange(
                      'torsoDepth',
                      Number.parseFloat(e.target.value) || 0.0
                    )
                  }
                  className="w-full h-1.5 bg-[var(--tv-border)] rounded-lg appearance-none cursor-pointer accent-[var(--tv-olive)]"
                />
              </div>
            </div>
          </div>

          {/* Action Confirmation Buttons */}
          <div className="pt-4 border-t border-[var(--tv-border)] flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleResetSuggestions}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--tv-surface-elevated)] hover:bg-[var(--tv-surface)] text-[var(--tv-text-secondary)] hover:text-[var(--tv-text-primary)] border border-[var(--tv-border)] transition-colors cursor-pointer"
            >
              Reset Suggestions
            </button>

            <button
              type="button"
              onClick={handleKeepCurrent}
              title="Keep My Current Avatar"
              aria-label="Keep Current Avatar"
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--tv-surface-elevated)] hover:bg-[var(--tv-surface)] text-[var(--tv-text-secondary)] hover:text-[var(--tv-text-primary)] border border-[var(--tv-border)] transition-colors cursor-pointer"
            >
              Keep Current Avatar
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--tv-olive)] text-white hover:bg-[var(--tv-olive-dark,#364639)] transition-colors shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Suggestions</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
