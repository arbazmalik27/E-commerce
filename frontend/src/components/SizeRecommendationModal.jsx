import { useEffect, useState } from 'react'
import {
  getProductSizeCategory,
  recommendSize,
  SIZE_CHARTS,
} from '../constants/sizeCharts'

function SizeRecommendationModal({
  isOpen,
  onClose,
  product,
  onSelectSize,
  onOpenSizeGuide,
}) {
  const department = product?.department || ''
  const subcategory = product?.subcategory || ''
  const productSizes = product?.sizes || []

  const chartType = getProductSizeCategory(department, subcategory)
  const chart = chartType ? SIZE_CHARTS[chartType] : null

  const [unit, setUnit] = useState('in') // 'in' | 'cm'
  const [measurements, setMeasurements] = useState({})
  const [fitPreference, setFitPreference] = useState('regular')
  const [result, setResult] = useState(null)
  const [formError, setFormError] = useState(null)

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setResult(null)
      setFormError(null)
      setMeasurements({})
      setFitPreference('regular')
    }
  }

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !chart) return null

  const handleInputChange = (fieldId, value) => {
    setMeasurements((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
    setFormError(null)
  }

  const handleCalculate = (e) => {
    e.preventDefault()

    const primaryKey = chart.primaryKey
    const val = measurements[primaryKey]

    if (val === undefined || val === null || String(val).trim() === '') {
      setFormError(
        `Please enter your ${primaryKey === 'footLength' ? 'foot length' : primaryKey} to calculate your size.`
      )
      return
    }

    const num = Number(val)
    if (isNaN(num) || num <= 0) {
      setFormError('Please enter a valid positive number.')
      return
    }

    const outcome = recommendSize({
      department,
      subcategory,
      productSizes,
      measurements,
      unit,
      fitPreference,
    })

    setResult(outcome)
  }

  const handleApplySize = (sizeLabel) => {
    if (onSelectSize) {
      onSelectSize(sizeLabel)
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-rec-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1F211C]/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-2xl overflow-hidden text-[#1F211C]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[#DED7CA] bg-[#FAF7F0] shrink-0">
          <div>
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#A65332] block mb-0.5">
              Personalized Fit
            </span>
            <h2
              id="size-rec-modal-title"
              className="font-serif text-lg sm:text-xl font-bold text-[#1F211C] tracking-tight"
            >
              Find Your Recommended Size
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close size recommender"
            className="h-8 w-8 flex items-center justify-center rounded-full border border-[#DED7CA] bg-[#FFFDF8] text-[#5F6057] hover:text-[#1F211C] hover:border-[#85857A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5">
          {/* Subtitle / Product info */}
          <div className="text-xs text-[#5F6057]">
            Providing your measurements helps calculate an ideal size match for{' '}
            <span className="font-semibold text-[#1F211C]">{product?.name || 'this item'}</span>.
          </div>

          {/* Form */}
          <form onSubmit={handleCalculate} className="space-y-4">
            {/* Unit Toggle if applicable */}
            {chart.primaryKey !== 'age' && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5F6057]">
                  Measurement Unit
                </span>
                <div
                  role="radiogroup"
                  aria-label="Unit of measurement"
                  className="inline-flex items-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] p-0.5 text-xs font-semibold"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={unit === 'in'}
                    onClick={() => {
                      setUnit('in')
                      setResult(null)
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      unit === 'in'
                        ? 'bg-[#34452F] text-[#FFFDF8] font-bold shadow-2xs'
                        : 'text-[#5F6057] hover:text-[#1F211C]'
                    }`}
                  >
                    Inches
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={unit === 'cm'}
                    onClick={() => {
                      setUnit('cm')
                      setResult(null)
                    }}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      unit === 'cm'
                        ? 'bg-[#34452F] text-[#FFFDF8] font-bold shadow-2xs'
                        : 'text-[#5F6057] hover:text-[#1F211C]'
                    }`}
                  >
                    CM
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Relevant Measurement Fields */}
            {chart.fields.map((field) => (
              <div key={field.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`input-${field.id}`}
                    className="block text-xs font-bold uppercase tracking-wider text-[#1F211C]"
                  >
                    {field.label}
                    {field.required && <span className="text-[#A65332] ml-0.5">*</span>}
                  </label>
                  {chart.primaryKey !== 'age' && (
                    <span className="text-[11px] font-mono text-[#85857A]">
                      ({unit})
                    </span>
                  )}
                </div>
                <input
                  id={`input-${field.id}`}
                  type="number"
                  step="0.1"
                  min="1"
                  max="300"
                  value={measurements[field.id] || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  placeholder={
                    field.id === 'age'
                      ? 'e.g. 6'
                      : unit === 'in'
                      ? 'e.g. 38'
                      : 'e.g. 96'
                  }
                  required={field.required}
                  className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3.5 py-2.5 text-sm text-[#1F211C] placeholder-[#85857A] transition-colors focus:border-[#34452F] focus:bg-[#FFFDF8] focus:outline-none"
                />
                <p className="text-[11px] text-[#85857A] leading-tight">{field.hint}</p>
              </div>
            ))}

            {/* Fit Preference */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1F211C]">
                Fit Preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'slim', label: 'Slim / Snug' },
                  { id: 'regular', label: 'Regular' },
                  { id: 'relaxed', label: 'Roomy' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFitPreference(opt.id)
                      setResult(null)
                    }}
                    className={`rounded-xl py-2 px-2 text-center text-xs font-semibold transition-all border cursor-pointer ${
                      fitPreference === opt.id
                        ? 'border-[#34452F] bg-[#34452F]/10 text-[#34452F] font-bold ring-1 ring-[#34452F]'
                        : 'border-[#DED7CA] bg-[#FAF7F0] text-[#5F6057] hover:text-[#1F211C] hover:border-[#85857A]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-xs font-medium text-[#A65332]" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs mt-2"
            >
              Calculate Size Recommendation
            </button>
          </form>

          {/* Recommendation Output Card */}
          {result && (
            <div className="rounded-xl border border-[#DED7CA] bg-[#FAF7F0] p-4 sm:p-5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#5F6057]">
                  Recommendation
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    result.isAvailable
                      ? 'bg-[#3F6B45]/15 text-[#3F6B45]'
                      : 'bg-[#A65332]/15 text-[#A65332]'
                  }`}
                >
                  {result.isAvailable ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl font-extrabold text-[#1F211C]">
                  {result.recommendedSize}
                </span>
                <span className="text-xs font-medium text-[#5F6057]">
                  Recommended Fit
                </span>
              </div>

              <p className="text-xs text-[#1F211C] leading-relaxed">
                {result.reason}
              </p>

              {result.stockMessage && (
                <div className="rounded-lg bg-[#A65332]/10 border border-[#A65332]/25 p-2.5 text-xs text-[#A65332] font-medium">
                  {result.stockMessage}
                </div>
              )}

              {/* Action: Select this size if available */}
              {result.isAvailable && (
                <button
                  type="button"
                  onClick={() => handleApplySize(result.recommendedSize)}
                  className="w-full rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] py-2 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                >
                  Select Size {result.recommendedSize}
                </button>
              )}

              {/* Transparency disclaimer */}
              <p className="text-[11px] text-[#85857A] italic leading-tight pt-1">
                {result.disclaimer}
              </p>
            </div>
          )}

          {/* Quick link to view full size guide */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                onClose()
                if (onOpenSizeGuide) onOpenSizeGuide()
              }}
              className="text-xs font-semibold text-[#34452F] hover:text-[#263722] underline underline-offset-4 cursor-pointer"
            >
              View Full Size Guide & Reference Tables →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SizeRecommendationModal
