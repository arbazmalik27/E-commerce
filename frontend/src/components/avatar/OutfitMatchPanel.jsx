import { Sparkles, Palette, CheckCircle2, ArrowRight, Info } from 'lucide-react'

export default function OutfitMatchPanel({
  analysis,
  onApplySuggestion,
  className = '',
}) {
  if (!analysis) return null

  const { status, label, explanation, pairings = [], suggestions = [] } = analysis

  // Status visual mapping
  const getStatusBadge = () => {
    switch (status) {
      case 'excellent':
        return {
          bg: 'bg-[#34452F] text-[#FFFDF8]',
          border: 'border-[#34452F]',
          icon: <Sparkles className="w-3.5 h-3.5 text-[#DDB088]" />,
        }
      case 'strong':
        return {
          bg: 'bg-[#34452F]/15 text-[#34452F] dark:text-emerald-400',
          border: 'border-[#34452F]/30',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#34452F]" />,
        }
      case 'good':
        return {
          bg: 'bg-[#A65332]/10 text-[#A65332]',
          border: 'border-[#A65332]/25',
          icon: <Palette className="w-3.5 h-3.5 text-[#A65332]" />,
        }
      case 'contrast':
        return {
          bg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
          border: 'border-amber-500/30',
          icon: <Info className="w-3.5 h-3.5 text-amber-600" />,
        }
      default:
        return {
          bg: 'bg-[#FAF7F0] text-[#5F6057]',
          border: 'border-[#DED7CA]',
          icon: <Info className="w-3.5 h-3.5 text-[#85857A]" />,
        }
    }
  }

  const badge = getStatusBadge()

  return (
    <div
      aria-label="Outfit Color & Style Match Analysis"
      className={`rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 shadow-xs transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DED7CA] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#34452F]" />
          <h3 className="font-serif text-sm font-bold text-[#1F211C] uppercase tracking-wider">
            Palette Harmony
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${badge.bg} ${badge.border}`}
        >
          {badge.icon}
          <span>{label}</span>
        </span>
      </div>

      {/* Main Narrative Explanation */}
      <div className="space-y-3">
        <p className="text-xs text-[#1F211C] leading-relaxed">
          {explanation}
        </p>

        {/* Pairings Breakdown */}
        {pairings.length > 0 && status !== 'incomplete' && (
          <div className="pt-2 space-y-2 border-t border-[#DED7CA]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#85857A] font-semibold block">
              Garment Pairings
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pairings.map((pair, idx) => (
                <div
                  key={`${pair.firstSlot}-${pair.secondSlot}-${idx}`}
                  className="p-2.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#34452F]">
                      {pair.firstSlot} ↔ {pair.secondSlot}
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-[#FFFDF8] border border-[#DED7CA] font-semibold text-[#5F6057]">
                      {pair.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5F6057] line-clamp-2">
                    {pair.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contextual Suggestions */}
        {suggestions.length > 0 && (
          <div className="pt-3 border-t border-[#DED7CA] space-y-2.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#A65332] font-bold block">
              Suggested Alternates
            </span>
            <div className="space-y-2">
              {suggestions.map((sugg) => (
                <div
                  key={`${sugg.slot}-${sugg.productId}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-xs hover:border-[#34452F]/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1F211C] truncate">
                      {sugg.productName}
                    </p>
                    <p className="text-[11px] text-[#5F6057] mt-0.5">
                      {sugg.reason}
                    </p>
                  </div>
                  {onApplySuggestion && (
                    <button
                      type="button"
                      onClick={() => onApplySuggestion(sugg)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold text-[#34452F] hover:bg-[#34452F] hover:text-white border border-[#34452F]/30 transition-colors cursor-pointer shrink-0"
                    >
                      <span>Try</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editorial Subtitle Disclaimer */}
        <p className="text-[10px] font-mono text-[#85857A] pt-1">
          * Advisory palette harmony. Fashion choices are entirely personal—wear whatever feels authentic.
        </p>
      </div>
    </div>
  )
}
