import { User, Users, Baby } from 'lucide-react'

export const DEMOGRAPHICS = [
  { id: 'Men', label: 'Men', group: 'Adult', icon: User },
  { id: 'Women', label: 'Women', group: 'Adult', icon: User },
  { id: 'Boys', label: 'Boys', group: 'Youth', icon: Users },
  { id: 'Girls', label: 'Girls', group: 'Youth', icon: Users },
  { id: 'Kids', label: 'Kids', group: 'Youth', icon: Baby },
]

export default function AvatarDemographicSelector({
  selectedDemographic = 'Men',
  onChange,
  onSelectDemographic,
  className = '',
}) {
  const handleSelect = (id) => {
    onChange?.(id)
    onSelectDemographic?.(id)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--tv-text-muted)]">
          Target Demographic
        </label>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--tv-surface-elevated)] text-[var(--tv-text-secondary)] border border-[var(--tv-border)]">
          {['Boys', 'Girls', 'Kids'].includes(selectedDemographic)
            ? 'Youth Sizing (Zero Photo)'
            : 'Adult Sizing & Likeness'}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Avatar demographic selection"
        className="grid grid-cols-5 gap-1.5 p-1 rounded-xl bg-[var(--tv-bg-warm)] border border-[var(--tv-border)]"
      >
        {DEMOGRAPHICS.map((dem) => {
          const isSelected = selectedDemographic === dem.id
          const IconComponent = dem.icon

          return (
            <button
              key={dem.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(dem.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--tv-olive)] ${
                isSelected
                  ? 'bg-[var(--tv-surface)] text-[var(--tv-olive)] shadow-xs font-semibold border border-[var(--tv-border)]'
                  : 'text-[var(--tv-text-secondary)] hover:text-[var(--tv-text-primary)] hover:bg-[var(--tv-surface)]/50'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5 mb-1" />
              <span className="text-[11px] truncate w-full text-center">{dem.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
