import { forwardRef, useId } from 'react'

/**
 * TrendVolt Production Textarea
 * Warm earthy multi-line input with accessible labels, error/helper text, and focus states.
 */
const Textarea = forwardRef(function Textarea(
  {
    id,
    label,
    error,
    helperText,
    disabled = false,
    required = false,
    rows = 4,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const generatedId = useId()
  const textareaId = id || generatedId
  const errorId = `${textareaId}-error`
  const helperId = `${textareaId}-helper`

  const hasError = Boolean(error)

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-mono uppercase tracking-wider text-[#5F6057] select-none flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[#A65332] ml-1">*</span>}
          </span>
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
        className={`w-full rounded-lg bg-[#FFFDF8] border text-sm text-[#1F211C] placeholder-[#85857A] p-3.5 transition-all duration-200 ease-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#EEE7DC] resize-y ${
          hasError
            ? 'border-red-500/70 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
            : 'border-[#DED7CA] hover:border-[#85857A] focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]'
        } ${className}`}
        {...props}
      />

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

export default Textarea
