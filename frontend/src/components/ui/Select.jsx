import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * TrendVolt Production Select
 * Dropdown select with custom indicator and warm earthy styling.
 */
const Select = forwardRef(function Select(
  {
    id,
    label,
    error,
    helperText,
    disabled = false,
    required = false,
    className = '',
    containerClassName = '',
    children,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const selectId = id || generatedId
  const errorId = `${selectId}-error`
  const helperId = `${selectId}-helper`

  const hasError = Boolean(error)

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-mono uppercase tracking-wider text-[#5F6057] select-none flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[#A65332] ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          className={`w-full min-h-[44px] appearance-none rounded-lg bg-[#FFFDF8] border text-sm text-[#1F211C] pl-3.5 pr-10 py-2.5 transition-all duration-200 ease-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#EEE7DC] cursor-pointer ${
            hasError
              ? 'border-red-500/70 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
              : 'border-[#DED7CA] hover:border-[#85857A] focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]'
          } ${className}`}
          {...props}
        >
          {children}
        </select>

        <div className="absolute right-3.5 flex items-center pointer-events-none text-[#85857A]">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      {hasError ? (
        <p id={errorId} className="text-xs text-[#B7473A] font-medium tracking-wide">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-[#85857A]">
          {helperText}
        </p>
      ) : null}
    </div>
  )
})

export default Select
