import { ShieldAlert, Ruler, Sparkles } from 'lucide-react'

const FIT_PREFERENCES = [
  { id: 'Slim', label: 'Slim Fit', desc: 'Closer silhouette' },
  { id: 'Regular', label: 'Regular Fit', desc: 'Balanced classic' },
  { id: 'Relaxed', label: 'Relaxed Fit', desc: 'Generous comfort' },
]

export default function AvatarMeasurementForm({
  demographic = 'Men',
  measurements,
  onChange,
  className = '',
}) {
  const isYouth = ['Boys', 'Girls', 'Kids'].includes(demographic)

  const handleNumberChange = (field, value, min, max) => {
    const num = Number(value)
    if (Number.isNaN(num)) return
    const clamped = Math.min(Math.max(num, min), max)
    onChange?.(field, clamped)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--tv-text-primary)] flex items-center gap-2">
            <Ruler className="w-4 h-4 text-[var(--tv-olive)]" />
            <span>{isYouth ? 'Youth Anthropometrics' : 'Tailoring Ground Truth'}</span>
          </h3>
          <p className="text-xs text-[var(--tv-text-secondary)] mt-0.5">
            {isYouth
              ? 'Age and height determine youth sizing and proportional scaling.'
              : 'Manual tape measurements serve as the authoritative sizing authority.'}
          </p>
        </div>
      </div>

      {/* YOUTH INPUT WORKFLOW */}
      {isYouth ? (
        <div className="space-y-5" data-testid="youth-measurement-form">
          {/* Strict Zero Photo Notice */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider">
                  Zero Photo Policy Active
                </div>
                <p className="text-xs text-[var(--tv-text-secondary)] leading-relaxed">
                  To protect minor privacy, photo upload and facial scanning are strictly
                  prohibited for youth profiles. Avatar proportions are generated entirely from age
                  and stature.
                </p>
              </div>
            </div>
          </div>

          {/* Age (2 - 13 Years) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-youth-age" className="font-medium text-[var(--tv-text-primary)]">
                Child Age
              </label>
              <span className="font-mono text-xs font-semibold text-[var(--tv-olive)]">
                {measurements.age || 7} Years
              </span>
            </div>
            <input
              id="input-youth-age"
              type="range"
              min={2}
              max={13}
              step={1}
              value={measurements.age || 7}
              onChange={(e) => handleNumberChange('age', e.target.value, 2, 13)}
              className="w-full accent-[var(--tv-olive)] cursor-pointer"
              aria-label="Child age in years"
            />
            <div className="flex justify-between text-[10px] text-[var(--tv-text-muted)] font-mono">
              <span>2 yrs (Toddler)</span>
              <span>7 yrs (Mid-child)</span>
              <span>13 yrs (Pre-teen)</span>
            </div>
          </div>

          {/* Height (85 - 165 cm) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-youth-height" className="font-medium text-[var(--tv-text-primary)]">
                Height
              </label>
              <span className="font-mono text-xs font-semibold text-[var(--tv-olive)]">
                {measurements.height || 122} cm
              </span>
            </div>
            <input
              id="input-youth-height"
              type="range"
              min={85}
              max={165}
              step={1}
              value={measurements.height || 122}
              onChange={(e) => handleNumberChange('height', e.target.value, 85, 165)}
              className="w-full accent-[var(--tv-olive)] cursor-pointer"
              aria-label="Child height in centimeters"
            />
            <div className="flex justify-between text-[10px] text-[var(--tv-text-muted)] font-mono">
              <span>85 cm</span>
              <span>125 cm</span>
              <span>165 cm</span>
            </div>
          </div>
        </div>
      ) : (
        /* ADULT INPUT WORKFLOW */
        <div className="space-y-5" data-testid="adult-measurement-form">
          {/* Height */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-adult-height" className="font-medium text-[var(--tv-text-primary)]">
                Stature / Height
              </label>
              <span className="font-mono text-xs font-semibold text-[var(--tv-olive)]">
                {measurements.height || 175} cm
              </span>
            </div>
            <input
              id="input-adult-height"
              type="range"
              min={140}
              max={215}
              step={1}
              value={measurements.height || 175}
              onChange={(e) => handleNumberChange('height', e.target.value, 140, 215)}
              className="w-full accent-[var(--tv-olive)] cursor-pointer"
              aria-label="Adult height in centimeters"
            />
            <div className="flex justify-between text-[10px] text-[var(--tv-text-muted)] font-mono">
              <span>140 cm</span>
              <span>175 cm</span>
              <span>215 cm</span>
            </div>
          </div>

          {/* Chest Circumference */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-adult-chest" className="font-medium text-[var(--tv-text-primary)]">
                Chest Circumference
              </label>
              <span className="font-mono text-xs font-semibold text-[var(--tv-olive)]">
                {measurements.chest || 96} cm
              </span>
            </div>
            <input
              id="input-adult-chest"
              type="range"
              min={70}
              max={140}
              step={1}
              value={measurements.chest || 96}
              onChange={(e) => handleNumberChange('chest', e.target.value, 70, 140)}
              className="w-full accent-[var(--tv-olive)] cursor-pointer"
              aria-label="Adult chest circumference in centimeters"
            />
          </div>

          {/* Waist Circumference */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-adult-waist" className="font-medium text-[var(--tv-text-primary)]">
                Natural Waist
              </label>
              <span className="font-mono text-xs font-semibold text-[var(--tv-olive)]">
                {measurements.waist || 82} cm
              </span>
            </div>
            <input
              id="input-adult-waist"
              type="range"
              min={55}
              max={130}
              step={1}
              value={measurements.waist || 82}
              onChange={(e) => handleNumberChange('waist', e.target.value, 55, 130)}
              className="w-full accent-[var(--tv-olive)] cursor-pointer"
              aria-label="Adult waist circumference in centimeters"
            />
          </div>

          {/* Hip Circumference */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-adult-hip" className="font-medium text-[var(--tv-text-primary)]">
                Hip / Pelvic Circumference
              </label>
              <span className="font-mono text-xs font-semibold text-[var(--tv-olive)]">
                {measurements.hip || 98} cm
              </span>
            </div>
            <input
              id="input-adult-hip"
              type="range"
              min={75}
              max={145}
              step={1}
              value={measurements.hip || 98}
              onChange={(e) => handleNumberChange('hip', e.target.value, 75, 145)}
              className="w-full accent-[var(--tv-olive)] cursor-pointer"
              aria-label="Adult hip circumference in centimeters"
            />
          </div>

          {/* Fit Preference */}
          <div className="space-y-2 pt-2 border-t border-[var(--tv-border)]">
            <label className="text-xs font-medium text-[var(--tv-text-primary)] flex items-center justify-between">
              <span>Fit Preference</span>
              <span className="text-[11px] text-[var(--tv-text-muted)] font-normal">
                Garment ease adjustment
              </span>
            </label>
            <div
              role="radiogroup"
              aria-label="Garment fit preference"
              className="grid grid-cols-3 gap-2"
            >
              {FIT_PREFERENCES.map((fit) => {
                const isSelected = (measurements.fitPreference || 'Regular') === fit.id
                return (
                  <button
                    key={fit.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => onChange?.('fitPreference', fit.id)}
                    className={`py-2 px-2 rounded-xl text-center border text-xs transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)] ${
                      isSelected
                        ? 'bg-[var(--tv-surface)] border-[var(--tv-olive)] text-[var(--tv-olive)] shadow-xs font-semibold'
                        : 'bg-[var(--tv-surface-elevated)] border-[var(--tv-border)] text-[var(--tv-text-secondary)] hover:bg-[var(--tv-surface)]'
                    }`}
                  >
                    <div className="font-medium">{fit.label}</div>
                    <div className="text-[10px] text-[var(--tv-text-muted)] mt-0.5">{fit.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--tv-bg-warm)] border border-[var(--tv-border)] flex items-center gap-2 text-xs text-[var(--tv-text-secondary)]">
            <Sparkles className="w-4 h-4 text-[var(--tv-terracotta)] shrink-0" />
            <span>
              Authoritative size recommendations remain powered by TrendVolt&apos;s sizing engine.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
