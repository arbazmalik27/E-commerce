import { Sliders, RefreshCw, Sparkles } from 'lucide-react'

const MORPH_FIELDS = [
  {
    key: 'chestScale',
    label: 'Chest Scale',
    description: 'Expands upper torso & chest circumference',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'waistScale',
    label: 'Waist Scale',
    description: 'Expands midsection & natural waistline',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'hipScale',
    label: 'Hip Scale',
    description: 'Expands pelvic width & lower torso',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'legLength',
    label: 'Leg Length',
    description: 'Adjusts lower body proportions & inseam offset',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'torsoDepth',
    label: 'Torso Depth',
    description: 'Expands anterior/posterior chest and abdominal depth',
    min: 0,
    max: 1,
    step: 0.01,
  },
]

const PRESETS = [
  {
    name: 'Neutral Base',
    values: { chestScale: 0.0, waistScale: 0.0, hipScale: 0.0, legLength: 0.0, torsoDepth: 0.0 },
  },
  {
    name: 'Mid Balanced',
    values: { chestScale: 0.5, waistScale: 0.5, hipScale: 0.5, legLength: 0.5, torsoDepth: 0.5 },
  },
  {
    name: 'Athletic / Broad',
    values: { chestScale: 0.75, waistScale: 0.25, hipScale: 0.35, legLength: 0.65, torsoDepth: 0.5 },
  },
  {
    name: 'Slim Build',
    values: { chestScale: 0.15, waistScale: 0.15, hipScale: 0.15, legLength: 0.6, torsoDepth: 0.15 },
  },
  {
    name: 'Relaxed Full',
    values: { chestScale: 0.65, waistScale: 0.7, hipScale: 0.75, legLength: 0.35, torsoDepth: 0.65 },
  },
]

export default function MorphControls({
  morphWeights,
  onChange,
  detectedMorphs = [],
  className = '',
}) {
  const handleSliderChange = (key, value) => {
    onChange({
      ...morphWeights,
      [key]: parseFloat(value),
    })
  }

  const handleApplyPreset = (presetValues) => {
    onChange({
      ...morphWeights,
      ...presetValues,
    })
  }

  const handleReset = () => {
    onChange({
      chestScale: 0,
      waistScale: 0,
      hipScale: 0,
      legLength: 0,
      torsoDepth: 0,
    })
  }

  return (
    <div
      className={`p-6 rounded-2xl bg-[var(--tv-surface)] border border-[var(--tv-border)] shadow-xs ${className}`}
    >
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--tv-border)]">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[var(--tv-olive)]" />
          <h3 className="font-serif text-base text-[var(--tv-text-primary)]">
            Parametric Morph Targets (POC)
          </h3>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--tv-text-secondary)] hover:text-[var(--tv-text-primary)] hover:bg-[var(--tv-bg)] border border-[var(--tv-border)] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wider text-[var(--tv-text-muted)] font-medium mb-2">
          Test Morph Presets
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset.values)}
              className="px-2.5 py-1 text-xs rounded-md bg-[var(--tv-bg)] hover:bg-[var(--tv-olive)] hover:text-white text-[var(--tv-text-secondary)] border border-[var(--tv-border)] transition-colors cursor-pointer"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Morph Sliders */}
      <div className="space-y-4">
        {MORPH_FIELDS.map((field) => {
          const val = morphWeights[field.key] ?? 0
          const isDetected = detectedMorphs.includes(field.key)

          return (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--tv-text-primary)]">
                    {field.label}
                  </span>
                  {isDetected ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      Unmapped
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono font-medium text-[var(--tv-text-secondary)]">
                  {val.toFixed(2)}
                </span>
              </div>

              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={val}
                onChange={(e) => handleSliderChange(field.key, e.target.value)}
                className="w-full h-1.5 bg-[var(--tv-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--tv-olive)]"
              />

              <p className="text-[11px] text-[var(--tv-text-muted)]">{field.description}</p>
            </div>
          )
        })}
      </div>

      {/* Asset Morph Detection Status */}
      <div className="mt-6 pt-4 border-t border-[var(--tv-border)]">
        <div className="flex items-center gap-1.5 text-xs text-[var(--tv-text-muted)] mb-2">
          <Sparkles className="w-3.5 h-3.5 text-[var(--tv-olive)]" />
          <span>GLTF Verified Targets ({detectedMorphs.length}/5 detected)</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {MORPH_FIELDS.map((f) => (
            <span
              key={f.key}
              className={`text-[11px] px-2 py-0.5 rounded-sm font-mono ${
                detectedMorphs.includes(f.key)
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-500/10 text-red-700 dark:text-red-400'
              }`}
            >
              {f.key}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
