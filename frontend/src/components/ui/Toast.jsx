import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const TOAST_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const TOAST_STYLES = {
  success: 'bg-[#FFFDF8] border-[#3F6B45]/40 text-[#3F6B45] shadow-lg shadow-[#3F6B45]/5',
  error: 'bg-[#FFFDF8] border-[#B7473A]/40 text-[#B7473A] shadow-lg shadow-[#B7473A]/5',
  warning: 'bg-[#FFFDF8] border-[#A86B2D]/40 text-[#A86B2D] shadow-lg shadow-[#A86B2D]/5',
  info: 'bg-[#FFFDF8] border-[#DED7CA] text-[#34452F] shadow-lg',
}

/**
 * TrendVolt Production Toast Notification
 * Floating notification banner with auto/manual dismiss.
 */
function Toast({ toast, onDismiss, className = '' }) {
  if (!toast) return null

  const type = toast.type || 'info'
  const Icon = TOAST_ICONS[type] || Info
  const style = TOAST_STYLES[type] || TOAST_STYLES.info

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${style} ${className}`}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-xs sm:text-sm font-medium tracking-wide text-[#1F211C]">
        {toast.message}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="ml-2 p-1 rounded-full text-[#85857A] hover:text-[#1F211C] hover:bg-[#EEE7DC] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default Toast
