import { forwardRef, useId } from 'react'

/**
 * TrendVolt Production Input
 * Warm earthy editorial input with accessible labels, error/helper text, and focus states.
 */
const Input = forwardRef(function Input(
  {
    id,
    label,
    error,
    helperText,
    leftElement,
    rightElement,
    disabled = false,
    required = false,
    className = '',
    containerClassName = '',
    type = 'text',
    ...props
  },
  ref
) {
  const generatedId = useId()
  const inputId = id || generatedId
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  const hasError = Boolean(error)

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-mono uppercase tracking-wider text-[#5F6057] select-none flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[#A65332] ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftElement && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#85857A]">
            {leftElement}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          className={`w-full min-h-[44px] rounded-lg bg-[#FFFDF8] border text-sm text-[#1F211C] placeholder-[#85857A] transition-all duration-200 ease-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#EEE7DC] ${
            leftElement ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            hasError
              ? 'border-red-500/70 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
              : 'border-[#DED7CA] hover:border-[#85857A] focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]'
          } ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3.5 flex items-center text-[#85857A]">
            {rightElement}
          </div>
        )}
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

export default Input
