function Eyebrow({ children, variant = 'olive', className = '' }) {
  const variantStyles = {
    olive: 'border-[#34452F]/20 bg-[#34452F]/8 text-[#34452F]',
    terracotta: 'border-[#A65332]/25 bg-[#A65332]/10 text-[#A65332]',
    neutral: 'border-[#DED7CA] bg-[#EEE7DC] text-[#5F6057]',
  }

  const dotStyles = {
    olive: 'bg-[#34452F]',
    terracotta: 'bg-[#A65332]',
    neutral: 'bg-[#5F6057]',
  }

  const selectedVariant = variantStyles[variant] || variantStyles.olive
  const selectedDot = dotStyles[variant] || dotStyles.olive

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-mono font-bold tracking-[0.2em] uppercase select-none ${selectedVariant} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${selectedDot} shrink-0`}
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  )
}

export default Eyebrow
