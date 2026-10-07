import { Sliders, RotateCcw } from 'lucide-react'
import {
  clampWeight,
  MORPH_SLIDERS,
  ANATOMICAL_PRESETS,
} from '../../constants/avatarStudioConstants'

export default function AvatarBodyControls({
  morphWeights,
  onChange,
  onReset,
  className = '',
}) {
  const handleSliderChange = (id, rawValue) => {
    const clamped = clampWeight(rawValue)
    onChange?.(id, clamped)
  }

  const applyPreset = (presetValues) => {
    for (const [key, val] of Object.entries(presetValues)) {
      onChange?.(key, val)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Reset Action */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--tv-text-primary)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--tv-olive)]" />
              <span>Body Shape Keys (5 Canonical Morphs)</span>
            </h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              Applied to avatar
            </span>
          </div>
          <p className="text-xs text-[var(--tv-text-secondary)] mt-0.5">
            Calibrate physical body proportions across continuous morph targets.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-[var(--tv-text-muted)] hover:text-[var(--tv-text-primary)] hover:bg-[var(--tv-surface-elevated)] transition-colors cursor-pointer"
          title="Reset body morphs to 0.0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Body</span>
        </button>
      </div>

      {/* Quick Anatomical Presets */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--tv-text-muted)]">
          Anatomical Silhouette Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ANATOMICAL_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset.values)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--tv-surface-elevated)] hover:bg-[var(--tv-surface)] text-[var(--tv-text-secondary)] hover:text-[var(--tv-text-primary)] border border-[var(--tv-border)] transition-all text-center truncate cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)]"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders for 5 Morph Targets */}
      <div className="space-y-4">
        {MORPH_SLIDERS.map((morph) => {
          const currentValue = morphWeights[morph.id] ?? 0.0

          return (
            <div
              key={morph.id}
              className="p-3.5 rounded-xl bg-[var(--tv-surface)] border border-[var(--tv-border)] space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs">
                <div>
                  <label
                    htmlFor={`slider-${morph.id}`}
                    className="font-medium text-[var(--tv-text-primary)] cursor-pointer"
                  >
                    {morph.label}
                  </label>
                  <p className="text-[11px] text-[var(--tv-text-muted)]">{morph.description}</p>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--tv-surface-elevated)] text-[var(--tv-olive)] border border-[var(--tv-border)]">
                  {currentValue.toFixed(2)}
                </span>
              </div>

              <input
                id={`slider-${morph.id}`}
                type="range"
                min={morph.min}
                max={morph.max}
                step={morph.step}
                value={currentValue}
                onChange={(e) => handleSliderChange(morph.id, e.target.value)}
                className="w-full h-1.5 bg-[var(--tv-border)] rounded-lg appearance-none cursor-pointer accent-[var(--tv-olive)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)]"
                aria-label={morph.label}
                aria-valuemin={morph.min}
                aria-valuemax={morph.max}
                aria-valuenow={currentValue}
              />

              <div className="flex justify-between text-[10px] text-[var(--tv-text-muted)] font-mono">
                <span>0.00 (Neutral Base)</span>
                <span>0.50</span>
                <span>1.00 (Max Volume)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
