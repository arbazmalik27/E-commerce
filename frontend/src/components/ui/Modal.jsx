import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * TrendVolt Production Modal
 * Accessible dialog with warm earthy styling, backdrop blur, and focus containment.
 */
function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) {
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.addEventListener('keydown', handleKeyDown)

    if (modalRef.current) {
      modalRef.current.focus()
    }

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs transition-opacity duration-200"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] p-6 sm:p-8 shadow-2xl shadow-neutral-900/15 focus:outline-none transition-all duration-200 animate-in fade-in zoom-in-95 ${className}`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-full text-[#5F6057] hover:text-[#1F211C] hover:bg-[#EEE7DC] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] cursor-pointer"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Title & Description */}
        {title && (
          <h2
            id="modal-title"
            className="text-xl sm:text-2xl font-bold tracking-tight text-[#1F211C] mb-2 pr-8"
          >
            {title}
          </h2>
        )}
        {description && (
          <p id="modal-description" className="text-sm text-[#5F6057] mb-6">
            {description}
          </p>
        )}

        {/* Body Content */}
        {children}
      </div>
    </div>
  )
}

export default Modal
