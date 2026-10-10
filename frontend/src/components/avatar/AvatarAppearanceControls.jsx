import { Palette, Scissors, Eye, Check, Sparkles } from 'lucide-react'
import {
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  EYE_COLORS,
  FACIAL_HAIR_STYLES,
} from '../../constants/avatarStudioConstants'

export default function AvatarAppearanceControls({
  appearance,
  onChange,
  demographic = 'Men',
  capabilities = null,
  className = '',
}) {
  const showFacialHair = demographic === 'Men'
  const hasHairSupport = Boolean(capabilities?.hair)
  const hasFacialHairSupport = Boolean(capabilities?.facialHair)
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Info */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--tv-text-primary)] flex items-center gap-2">
          <Palette className="w-4 h-4 text-[var(--tv-olive)]" />
          <span>Appearance & Styling (Curated Palette)</span>
        </h3>
        <p className="text-xs text-[var(--tv-text-secondary)] mt-0.5">
          Select personalized tones and modular styling from TrendVolt&apos;s curated catalog.
        </p>
      </div>

      {/* 1. Skin Tone Swatches */}
      <div className="space-y-2.5">
        <label className="text-xs font-medium text-[var(--tv-text-primary)] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span>Skin Tone</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              Applied to avatar
            </span>
          </div>
          <span className="text-[11px] text-[var(--tv-text-muted)] font-mono">
            {SKIN_TONES.find((t) => t.hex === appearance.skinTone)?.label || 'Custom'}
          </span>
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {SKIN_TONES.map((tone) => {
            const isSelected = appearance.skinTone === tone.hex

            return (
              <button
                key={tone.id}
                type="button"
                title={tone.label}
                aria-label={`Select ${tone.label} skin tone`}
                aria-pressed={isSelected}
                onClick={() => onChange?.('skinTone', tone.hex)}
                className={`relative aspect-square rounded-xl transition-all cursor-pointer border flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)] ${
                  isSelected
                    ? 'ring-2 ring-[var(--tv-olive)] ring-offset-2 ring-offset-[var(--tv-bg)] scale-105 border-white/50'
                    : 'border-black/10 hover:scale-102 hover:border-black/25'
                }`}
                style={{ backgroundColor: tone.hex }}
              >
                {isSelected && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      ['ivory', 'fair-warm'].includes(tone.id) ? 'text-stone-800' : 'text-white'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Modular Hairstyles Catalog */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--tv-border)]">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--tv-text-primary)] flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-[var(--tv-olive)]" />
            <span>Modular Hairstyle Catalog</span>
          </label>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--tv-surface-elevated)] text-[var(--tv-text-muted)] border border-[var(--tv-border)] font-mono">
            {hasHairSupport
              ? 'Applied to avatar'
              : 'Saved to profile — visual support unavailable (Profile Stored / Head_Socket Gate)'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HAIR_STYLES.map((hair) => {
            const isSelected = appearance.hairStyle === hair.id

            return (
              <button
                key={hair.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onChange?.('hairStyle', hair.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)] ${
                  isSelected
                    ? 'bg-[var(--tv-surface)] border-[var(--tv-olive)] text-[var(--tv-text-primary)] shadow-xs ring-1 ring-[var(--tv-olive)]'
                    : 'bg-[var(--tv-surface-elevated)] border-[var(--tv-border)] text-[var(--tv-text-secondary)] hover:bg-[var(--tv-surface)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--tv-text-primary)]">
                    {hair.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--tv-olive)]" />}
                </div>
                <p className="text-[11px] text-[var(--tv-text-muted)] mt-0.5 leading-snug">
                  {hair.desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Hair Color */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--tv-border)]">
        <label className="text-xs font-medium text-[var(--tv-text-primary)] flex justify-between items-center">
          <span>Hair Color</span>
          <span className="text-[11px] text-[var(--tv-text-muted)] font-mono">
            {HAIR_COLORS.find((c) => c.hex === appearance.hairColor)?.label || 'Custom'}
          </span>
        </label>
        <div className="grid grid-cols-6 gap-2">
          {HAIR_COLORS.map((color) => {
            const isSelected = appearance.hairColor === color.hex

            return (
              <button
                key={color.id}
                type="button"
                title={color.label}
                aria-label={`Select ${color.label} hair color`}
                aria-pressed={isSelected}
                onClick={() => onChange?.('hairColor', color.hex)}
                className={`relative aspect-square rounded-xl transition-all cursor-pointer border flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)] ${
                  isSelected
                    ? 'ring-2 ring-[var(--tv-olive)] ring-offset-2 ring-offset-[var(--tv-bg)] scale-105 border-white/50'
                    : 'border-black/10 hover:scale-102 hover:border-black/25'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {isSelected && (
                  <Check
                    className={`w-3.5 h-3.5 ${
                      ['nordic-platinum'].includes(color.id) ? 'text-stone-800' : 'text-white'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. Eye Color */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--tv-border)]">
        <label className="text-xs font-medium text-[var(--tv-text-primary)] flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[var(--tv-olive)]" />
            <span>Eye Color</span>
          </span>
          <span className="text-[11px] text-[var(--tv-text-muted)] font-mono">
            {EYE_COLORS.find((c) => c.hex === appearance.eyeColor)?.label || 'Custom'}
          </span>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {EYE_COLORS.map((eye) => {
            const isSelected = appearance.eyeColor === eye.hex

            return (
              <button
                key={eye.id}
                type="button"
                title={eye.label}
                aria-label={`Select ${eye.label} eye color`}
                aria-pressed={isSelected}
                onClick={() => onChange?.('eyeColor', eye.hex)}
                className={`relative aspect-square rounded-xl transition-all cursor-pointer border flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)] ${
                  isSelected
                    ? 'ring-2 ring-[var(--tv-olive)] ring-offset-2 ring-offset-[var(--tv-bg)] scale-105 border-white/50'
                    : 'border-black/10 hover:scale-102 hover:border-black/25'
                }`}
                style={{ backgroundColor: eye.hex }}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. Beard & Facial Hair Styling (Adult Men) */}
      {showFacialHair && (
        <div className="space-y-2.5 pt-2 border-t border-[var(--tv-border)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--tv-text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--tv-olive)]" />
              <span>Beard & Facial Hair Styling</span>
            </label>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--tv-surface-elevated)] text-[var(--tv-text-muted)] border border-[var(--tv-border)] font-mono">
              {hasFacialHairSupport
                ? 'Applied to avatar'
                : 'Saved to profile — visual support unavailable • Profile Stored (Production Gate)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FACIAL_HAIR_STYLES.map((style) => {
              const isSelected = (appearance.facialHair || 'clean') === style.id

              return (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onChange?.('facialHair', style.id)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)] ${
                    isSelected
                      ? 'bg-[var(--tv-surface)] border-[var(--tv-olive)] text-[var(--tv-text-primary)] shadow-xs ring-1 ring-[var(--tv-olive)]'
                      : 'bg-[var(--tv-surface-elevated)] border-[var(--tv-border)] text-[var(--tv-text-secondary)] hover:bg-[var(--tv-surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--tv-text-primary)]">
                      {style.name}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[var(--tv-olive)]" />}
                  </div>
                  <p className="text-[11px] text-[var(--tv-text-muted)] mt-0.5 leading-snug">
                    {style.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
