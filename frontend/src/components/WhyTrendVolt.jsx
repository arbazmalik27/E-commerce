import { Layers, ShieldCheck, Sparkles, Clock } from 'lucide-react'

const PILLARS = [
  {
    number: '01',
    title: 'Curated Collections',
    description: 'Thoughtfully selected wardrobe essentials designed for versatile everyday wear.',
    icon: Layers,
  },
  {
    number: '02',
    title: 'Secure Checkout',
    description: 'Protected payments and encrypted transactions from cart to final delivery.',
    icon: ShieldCheck,
  },
  {
    number: '03',
    title: 'Quality First',
    description: 'Natural fibers, reinforced stitching, and timeless cuts built to outlast seasons.',
    icon: Sparkles,
  },
  {
    number: '04',
    title: 'Effortless Shopping',
    description: 'Transparent sizing, straightforward returns, and dependable customer care.',
    icon: Clock,
  },
]

function WhyTrendVolt() {
  return (
    <section
      id="why-trendvolt"
      aria-labelledby="why-trendvolt-heading"
      className="relative w-full bg-[#F5F0E8] py-12 sm:py-16 text-[#1F211C] border-b border-[#DED7CA] overflow-hidden"
    >
      <h2 id="why-trendvolt-heading" className="sr-only">
        Why Shop With TrendVolt
      </h2>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 divide-y sm:divide-y-0 lg:divide-x divide-[#DED7CA]">
          {PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.number}
                className={`flex flex-col items-start ${
                  idx === 0
                    ? 'lg:pr-8'
                    : idx === 3
                    ? 'lg:pl-8'
                    : 'lg:px-8'
                } pt-4 sm:pt-0`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-full bg-[#34452F]/10 text-[#34452F] flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <span className="text-[11px] font-mono font-bold tracking-widest text-[#A65332]">
                    {pillar.number}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#1F211C] uppercase tracking-wider">
                  {pillar.title}
                </h3>

                <p className="mt-2 text-xs text-[#5F6057] leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default WhyTrendVolt
