const BADGE_VARIANTS = {
  // Brand Olive
  brand:
    'bg-[#34452F]/10 text-[#34452F] border-[#34452F]/20',
  // Accent Terracotta
  terracotta:
    'bg-[#A65332]/10 text-[#A65332] border-[#A65332]/25',
  // Neutral / Warm Beige
  neutral:
    'bg-[#EEE7DC] text-[#5F6057] border-[#DED7CA]',
  // Success Olive Green
  success:
    'bg-[#3F6B45]/12 text-[#3F6B45] border-[#3F6B45]/25',
  // Warning Warm Amber
  warning:
    'bg-[#A86B2D]/12 text-[#A86B2D] border-[#A86B2D]/25',
  // Error Rust Red
  error:
    'bg-[#B7473A]/12 text-[#B7473A] border-[#B7473A]/25',
  // Info Muted Blue
  info:
    'bg-sky-700/10 text-sky-800 border-sky-600/20',
  // Outline Minimal
  outline:
    'bg-transparent text-[#1F211C] border-[#DED7CA]',
}

const BADGE_SIZES = {
  sm: 'text-[10px] px-2 py-0.5 tracking-wider',
  md: 'text-xs px-2.5 py-0.5 tracking-wide',
  lg: 'text-xs px-3 py-1 tracking-wide',
}

/**
 * TrendVolt Production Badge
 * Clean, restrained status tags and micro labels in warm earthy tones.
 */
function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variantClass = BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral
  const sizeClass = BADGE_SIZES[size] || BADGE_SIZES.md

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold uppercase rounded-full border select-none shrink-0 ${variantClass} ${sizeClass} ${className}`}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

/**
 * Maps known TrendVolt e-commerce statuses to standardized badges.
 */
const STATUS_CONFIGS = {
  // Inventory
  'in stock': { variant: 'success', label: 'In Stock' },
  'out of stock': { variant: 'error', label: 'Out of Stock' },
  'low stock': { variant: 'warning', label: 'Low Stock' },

  // Orders
  pending: { variant: 'warning', label: 'Pending' },
  paid: { variant: 'success', label: 'Paid' },
  confirmed: { variant: 'info', label: 'Confirmed' },
  processing: { variant: 'info', label: 'Processing' },
  shipped: { variant: 'brand', label: 'Shipped' },
  delivered: { variant: 'success', label: 'Delivered' },
  cancelled: { variant: 'error', label: 'Cancelled' },
  failed: { variant: 'error', label: 'Failed' },
  refunded: { variant: 'neutral', label: 'Refunded' },

  // Account / User
  active: { variant: 'success', label: 'Active' },
  disabled: { variant: 'error', label: 'Disabled' },
  admin: { variant: 'brand', label: 'Admin' },
  customer: { variant: 'neutral', label: 'Customer' },
}

export function StatusBadge({ status, size = 'md', className = '' }) {
  const normalizedKey = String(status || '').trim().toLowerCase()
  const config = STATUS_CONFIGS[normalizedKey] || {
    variant: 'neutral',
    label: status || 'Unknown',
  }

  return (
    <Badge
      variant={config.variant}
      size={size}
      dot
      className={className}
    >
      {config.label}
    </Badge>
  )
}

export default Badge
