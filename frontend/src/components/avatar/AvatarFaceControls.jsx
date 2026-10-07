import { Smile, Info, Lock } from 'lucide-react'
import { FACIAL_BLENDSHAPES } from '../../constants/avatarStudioConstants'

export default function AvatarFaceControls({
  isAvailable = false,
  isModelSupported = false,
  facialMorphs = {},
  onChange,
  className = '',
}) {
  const isEnabled = isAvailable || isModelSupported
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--tv-text-primary)] flex items-center gap-2">
            <Smile className="w-4 h-4 text-[var(--tv-olive)]" />
            <span>Stylized Facial Resemblance (8 Blendshapes)</span>
          </h3>
          <p className="text-xs text-[var(--tv-text-secondary)] mt-0.5">
            Calibrates stylized facial proportions (Snapchat/Bitmoji aesthetic benchmark).
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
            isEnabled
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
          }`}
        >
          <Lock className="w-3 h-3" />
          <span>
            {isEnabled
              ? 'Applied to avatar'
              : 'Saved to profile — visual support unavailable (Production Gate Asset)'}
          </span>
        </span>
      </div>

      {/* Production Gate Notice */}
      {!isEnabled && (
        <div className="p-4 rounded-xl bg-[var(--tv-bg-warm)] border border-[var(--tv-border)] space-y-2">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[var(--tv-terracotta)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--tv-text-secondary)] space-y-1">
              <span className="font-semibold text-[var(--tv-text-primary)] block">
                POC Mannequin Asset Boundary
              </span>
              <p>
                The temporary Phase 2 development mannequin contains the 5 body shape keys only.
                The 8 stylized facial blendshapes below will activate upon integration of the
                commissioned canonical base avatar (<code className="font-mono text-[11px]">BaseAvatar_Adult_Male/Female.glb</code>).
              </p>
              <p className="text-[11px] text-[var(--tv-text-muted)] italic pt-1">
                Controls below illustrate the locked component interface ready for production mesh ingestion.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 8 Facial Blendshape Sliders (Disabled/Preview on POC base) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-75">
        {FACIAL_BLENDSHAPES.map((morph) => {
          const currentValue = facialMorphs[morph.id] ?? 0.0

          return (
            <div
              key={morph.id}
              className="p-3 rounded-xl bg-[var(--tv-surface)] border border-[var(--tv-border)] space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div>
                  <label
                    htmlFor={`face-slider-${morph.id}`}
                    className="font-medium text-[var(--tv-text-primary)]"
                  >
                    {morph.label}
                  </label>
                  <p className="text-[10px] text-[var(--tv-text-muted)]">{morph.desc}</p>
                </div>
                <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--tv-surface-elevated)] text-[var(--tv-text-muted)] border border-[var(--tv-border)]">
                  {currentValue.toFixed(2)}
                </span>
              </div>

              <input
                id={`face-slider-${morph.id}`}
                type="range"
                min={0.0}
                max={1.0}
                step={0.01}
                value={currentValue}
                disabled={!isEnabled}
                onChange={(e) => onChange?.(morph.id, Number.parseFloat(e.target.value) || 0.0)}
                className={`w-full h-1.5 bg-[var(--tv-border)] rounded-lg appearance-none ${
                  isEnabled ? 'cursor-pointer accent-[var(--tv-olive)]' : 'cursor-not-allowed opacity-50'
                }`}
                aria-label={morph.label}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
