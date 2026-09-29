import { useEffect, useState } from 'react'
import {
  getProductSizeCategory,
  SIZE_CHARTS,
  SIZE_CHART_TYPES,
} from '../constants/sizeCharts'

function SizeGuideModal({
  isOpen,
  onClose,
  initialDepartment,
  initialSubcategory,
}) {
  const initialCategory =
    getProductSizeCategory(initialDepartment, initialSubcategory) ||
    SIZE_CHART_TYPES.MEN_TOPS

  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [unit, setUnit] = useState('in') // 'in' | 'cm'

  const [prevContext, setPrevContext] = useState({
    isOpen,
    initialDepartment,
    initialSubcategory,
  })

  if (
    isOpen !== prevContext.isOpen ||
    initialDepartment !== prevContext.initialDepartment ||
    initialSubcategory !== prevContext.initialSubcategory
  ) {
    setPrevContext({ isOpen, initialDepartment, initialSubcategory })
    if (isOpen) {
      const cat = getProductSizeCategory(initialDepartment, initialSubcategory)
      if (cat && SIZE_CHARTS[cat]) {
        setActiveCategory(cat)
      }
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

  if (!isOpen) return null

  const chart = SIZE_CHARTS[activeCategory] || SIZE_CHARTS[SIZE_CHART_TYPES.MEN_TOPS]

  const formatMeasure = (minVal, maxVal) => {
    if (minVal === undefined && maxVal === undefined) return '—'
    if (unit === 'cm') {
      const minCm = Math.round(minVal * 2.54)
      const maxCm = maxVal !== undefined ? Math.round(maxVal * 2.54) : null
      return maxCm ? `${minCm} - ${maxCm} cm` : `${minCm} cm`
    }
    return maxVal ? `${minVal}" - ${maxVal}"` : `${minVal}"`
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1F211C]/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-2xl overflow-hidden text-[#1F211C]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-[#DED7CA] bg-[#FAF7F0] shrink-0">
          <div>
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#A65332] block mb-0.5">
              Reference Guide
            </span>
            <h2
              id="size-guide-modal-title"
              className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C] tracking-tight"
            >
              Size Guide & Measurements
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Unit Toggle */}
            <div
              role="radiogroup"
              aria-label="Unit of measurement"
              className="inline-flex items-center rounded-xl border border-[#DED7CA] bg-[#FFFDF8] p-1 text-xs font-semibold shadow-2xs"
            >
              <button
                type="button"
                role="radio"
                aria-checked={unit === 'in'}
                onClick={() => setUnit('in')}
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
                onClick={() => setUnit('cm')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  unit === 'cm'
                    ? 'bg-[#34452F] text-[#FFFDF8] font-bold shadow-2xs'
                    : 'text-[#5F6057] hover:text-[#1F211C]'
                }`}
              >
                CM
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close size guide"
              className="h-9 w-9 flex items-center justify-center rounded-full border border-[#DED7CA] bg-[#FFFDF8] text-[#5F6057] hover:text-[#1F211C] hover:border-[#85857A] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
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
        </div>

        {/* Category Pills Navigation */}
        <div className="px-5 sm:px-8 py-3 border-b border-[#DED7CA]/60 bg-[#FFFDF8] overflow-x-auto shrink-0 flex items-center gap-2 no-scrollbar">
          {Object.entries(SIZE_CHARTS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === key
                  ? 'bg-[#34452F] text-[#FFFDF8] shadow-2xs'
                  : 'bg-[#FAF7F0] text-[#5F6057] border border-[#DED7CA] hover:text-[#1F211C] hover:border-[#85857A]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-6">
          {/* Chart Intro */}
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1F211C] mb-1">
              {chart.name}
            </h3>
            <p className="text-xs sm:text-sm text-[#5F6057] leading-relaxed">
              {chart.description}
            </p>
          </div>

          {/* Sizing Table (Scrollable container to prevent page-wide overflow) */}
          <div className="overflow-x-auto rounded-xl border border-[#DED7CA] shadow-2xs">
            <table className="w-full text-left text-xs sm:text-sm border-collapse bg-[#FFFDF8]">
              <thead>
                <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[#1F211C] font-mono text-[11px] uppercase tracking-wider">
                  {chart.headers.map((h, idx) => (
                    <th key={idx} scope="col" className="px-4 py-3 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED7CA]/60">
                {chart.sizes.map((s, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-[#FAF7F0]/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-bold font-mono text-[#34452F]">
                      {s.label}
                    </td>

                    {/* Men Tops / Women Tops */}
                    {chart.primaryKey === 'chest' && (
                      <>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {formatMeasure(s.chestMin, s.chestMax)}
                        </td>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {formatMeasure(s.waistMin, s.waistMax)}
                        </td>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {s.length
                            ? formatMeasure(s.length)
                            : formatMeasure(s.hipMin, s.hipMax)}
                        </td>
                      </>
                    )}

                    {/* Men Bottoms / Women Bottoms */}
                    {chart.primaryKey === 'waist' && (
                      <>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {formatMeasure(s.waistMin, s.waistMax)}
                        </td>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {formatMeasure(s.hipMin, s.hipMax)}
                        </td>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {formatMeasure(s.length)}
                        </td>
                      </>
                    )}

                    {/* Footwear */}
                    {chart.primaryKey === 'footLength' && (
                      <>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {s.footMin && s.footMax ? `${s.footMin}" - ${s.footMax}"` : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {s.footMinCm && s.footMaxCm ? `${s.footMinCm} - ${s.footMaxCm} cm` : '—'}
                        </td>
                        {s.eu && (
                          <td className="px-4 py-3 font-mono text-[#1F211C]">
                            {s.eu}
                          </td>
                        )}
                      </>
                    )}

                    {/* Kids Clothing */}
                    {chart.primaryKey === 'age' && (
                      <>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {formatMeasure(s.heightMin, s.heightMax)}
                        </td>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {formatMeasure(s.chestMin, s.chestMax)}
                        </td>
                        <td className="px-4 py-3 text-[#5F6057]">
                          {formatMeasure(s.waistMin, s.waistMax)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to Measure Section */}
          <div className="rounded-xl border border-[#DED7CA] bg-[#FAF7F0] p-4 sm:p-5">
            <h4 className="font-serif text-sm font-bold text-[#1F211C] uppercase tracking-wider mb-3">
              How To Measure Correctly
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#5F6057] leading-relaxed">
              <div className="border-l-2 border-[#34452F] pl-3">
                <span className="font-bold text-[#1F211C] block mb-0.5">Chest / Bust</span>
                Wrap measuring tape comfortably under armpits and across the fullest part of your chest or bust.
              </div>
              <div className="border-l-2 border-[#A65332] pl-3">
                <span className="font-bold text-[#1F211C] block mb-0.5">Waist</span>
                Measure around your natural waistline, keeping the tape comfortably loose.
              </div>
              <div className="border-l-2 border-[#85857A] pl-3">
                <span className="font-bold text-[#1F211C] block mb-0.5">Hips</span>
                Stand with feet together and measure around the fullest point of your hips.
              </div>
              <div className="border-l-2 border-[#34452F] pl-3">
                <span className="font-bold text-[#1F211C] block mb-0.5">Foot Length</span>
                Stand on flat paper, mark heel and longest toe, and measure straight line distance.
              </div>
            </div>
          </div>

          {/* Disclaimer Notice */}
          <div className="text-[11px] sm:text-xs text-[#85857A] italic leading-normal border-t border-[#DED7CA]/60 pt-3">
            Note: All measurements are reference values based on standard industry garment sizing. Actual garment fit may vary depending on material stretch, silhouette cut, and styling.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-8 py-4 border-t border-[#DED7CA] bg-[#FAF7F0] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default SizeGuideModal
