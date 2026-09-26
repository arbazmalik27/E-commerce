import { forwardRef } from 'react'

const CARD_VARIANTS = {
  // Editorial Card: Warm white surface, subtle stone border, minimal shadow
  editorial:
    'bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl shadow-[0_4px_20px_-4px_rgba(31,33,28,0.05)]',
  // Admin Card: Clean structural card
  admin:
    'bg-[#FFFDF8] border border-[#DED7CA] rounded-xl shadow-xs',
  // Metric / Stat Card
  metric:
    'bg-[#FFFDF8] border border-[#DED7CA] rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xs',
  // Secondary Surface: Lower elevation for nested elements
  secondary:
    'bg-[#FAF7F0] border border-[#DED7CA] rounded-xl',
  // Minimal / Transparent Outline
  outline:
    'bg-transparent border border-[#DED7CA] rounded-xl',
}

const Card = forwardRef(function Card(
  {
    children,
    variant = 'editorial',
    interactive = false,
    className = '',
    ...props
  },
  ref
) {
  const variantClass = CARD_VARIANTS[variant] || CARD_VARIANTS.editorial
  const interactiveClass = interactive
    ? 'hover:border-[#34452F] transition-colors duration-200 cursor-pointer'
    : ''

  return (
    <div
      ref={ref}
      className={`overflow-hidden ${variantClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
})

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`p-5 sm:p-6 flex flex-col gap-1.5 border-b border-[#DED7CA] ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', as = 'h3', ...props }) {
  const Component = as
  return (
    <Component
      className={`text-lg sm:text-xl font-bold tracking-tight text-[#1F211C] ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-xs sm:text-sm text-[#5F6057] ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div
      className={`p-5 sm:p-6 flex items-center justify-between border-t border-[#DED7CA] bg-[#FAF7F0] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
