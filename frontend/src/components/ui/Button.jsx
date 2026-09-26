import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-[#34452F] text-[#FFFDF8] font-semibold hover:bg-[#263722] active:scale-[0.98] shadow-xs',
  secondary:
    'bg-[#FAF7F0] text-[#1F211C] border border-[#DED7CA] font-medium hover:bg-[#EEE7DC] hover:border-[#85857A] active:scale-[0.98]',
  outline:
    'bg-transparent text-[#1F211C] border border-[#DED7CA] font-medium hover:border-[#34452F] hover:bg-[#FAF7F0] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[#5F6057] font-medium hover:text-[#1F211C] hover:bg-[#EEE7DC]/60 active:scale-[0.98]',
  accent:
    'bg-[#A65332] text-[#FFFDF8] font-semibold hover:bg-[#8F452B] active:scale-[0.98] shadow-xs',
  danger:
    'bg-red-500/10 text-[#B7473A] border border-red-500/20 font-medium hover:bg-red-500/20 active:scale-[0.98]',
}

const SIZES = {
  sm: 'min-h-[36px] px-3.5 py-1.5 text-xs',
  md: 'min-h-[44px] px-5 py-2.5 text-sm',
  lg: 'min-h-[52px] px-7 py-3.5 text-base',
  'icon-sm': 'h-9 w-9 p-0 flex items-center justify-center text-xs',
  'icon-md': 'min-h-[44px] min-w-[44px] p-0 flex items-center justify-center text-sm',
}

const ROUNDED = {
  default: 'rounded-lg',
  pill: 'rounded-full',
  md: 'rounded-xl',
}

/**
 * TrendVolt Production Button
 * Accessible, keyboard-focusable, touch-friendly button variant system.
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    rounded = 'default',
    isLoading = false,
    leftIcon,
    rightIcon,
    disabled = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading
  const variantClass = VARIANTS[variant] || VARIANTS.primary
  const sizeClass = SIZES[size] || SIZES.md
  const roundedClass = ROUNDED[rounded] || ROUNDED.default

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading ? 'true' : undefined}
      className={`inline-flex items-center justify-center gap-2 select-none tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E8] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${variantClass} ${sizeClass} ${roundedClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  )
})

export default Button
