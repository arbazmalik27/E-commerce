import { Minus, Plus } from 'lucide-react'

/**
 * TrendVolt Production Quantity Control
 * Accessible numeric stepper with warm earthy styling.
 */
function QuantityControl({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  className = '',
  size = 'md',
}) {
  const isMin = value <= min
  const isMax = value >= max

  const handleDecrement = () => {
    if (!isMin && !disabled) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (!isMax && !disabled) {
      onChange(value + 1)
    }
  }

  const isSmall = size === 'sm'

  return (
    <div
      role="group"
      aria-label="Quantity selector"
      className={`inline-flex items-center rounded-lg border border-[#DED7CA] bg-[#FFFDF8] overflow-hidden ${
        isSmall ? 'h-9' : 'h-11'
      } ${className}`}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || isMin}
        aria-label="Decrease quantity"
        className={`flex items-center justify-center text-[#5F6057] hover:text-[#1F211C] hover:bg-[#EEE7DC] active:scale-95 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${
          isSmall ? 'w-9 h-9' : 'w-11 h-11'
        }`}
      >
        <Minus className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
      </button>

      <span
        aria-live="polite"
        className={`text-center font-mono font-semibold text-[#1F211C] select-none ${
          isSmall ? 'w-8 text-xs' : 'w-10 text-sm'
        }`}
      >
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || isMax}
        aria-label="Increase quantity"
        className={`flex items-center justify-center text-[#5F6057] hover:text-[#1F211C] hover:bg-[#EEE7DC] active:scale-95 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${
          isSmall ? 'w-9 h-9' : 'w-11 h-11'
        }`}
      >
        <Plus className={isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
      </button>
    </div>
  )
}

export default QuantityControl
