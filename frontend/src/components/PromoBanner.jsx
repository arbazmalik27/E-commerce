import { Link } from 'react-router-dom'
import Eyebrow from './Eyebrow'

const FASHION_STRIPS = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    alt: 'Tailored minimalist outerwear look',
    heightClass: 'h-[250px] sm:h-[310px] lg:h-[370px]',
    visibility: 'hidden sm:block',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    alt: 'Dramatic studio light tailored blazer',
    heightClass: 'h-[270px] sm:h-[330px] lg:h-[390px]',
    visibility: 'block',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80',
    alt: 'Contemporary monochrome suit editorial',
    heightClass: 'h-[290px] sm:h-[350px] lg:h-[410px]',
    visibility: 'block',
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
    alt: 'Structured oversized white coat and boots',
    heightClass: 'h-[280px] sm:h-[340px] lg:h-[400px]',
    visibility: 'block',
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80',
    alt: 'Chic fedora hat and linen styling',
    heightClass: 'h-[300px] sm:h-[360px] lg:h-[420px]',
    visibility: 'block',
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=600&q=80',
    alt: 'Sleek dark monochrome street style',
    heightClass: 'h-[260px] sm:h-[320px] lg:h-[380px]',
    visibility: 'hidden md:block',
  },
  {
    id: 7,
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
    alt: 'Crisp oversized poplin shirt editorial',
    heightClass: 'h-[280px] sm:h-[340px] lg:h-[400px]',
    visibility: 'hidden lg:block',
  },
]

function PromoBanner() {
  return (
    <section
      id="editorial-promo"
      aria-labelledby="promo-banner-heading"
      className="relative w-full bg-neutral-950 py-16 sm:py-20 lg:py-24 text-white border-t border-white/5 overflow-hidden scroll-mt-32"
    >
      {/* Soft atmospheric ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-b from-purple-900/10 via-purple-950/5 to-transparent blur-3xl opacity-30 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Master Editorial Campaign Canvas */}
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 p-6 sm:p-10 lg:p-12 shadow-2xl shadow-black/80 backdrop-blur-md">
          {/* Top Bar: Eyebrow + Social/Studio Handle */}
          <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
            <Eyebrow>The TrendVolt Edit</Eyebrow>
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-neutral-400 uppercase">
              @TRENDVOLT_STUDIO
            </span>
          </div>

          {/* Billboard Heading: Wide, Bold, Italic (Direct Reference Match) */}
          <div className="text-center my-6 sm:my-8">
            <h2
              id="promo-banner-heading"
              className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight italic text-white leading-tight"
            >
              TRENDVOLT FASHION TRENDS
            </h2>
          </div>

          {/* Dynamic Slanted Ribbon Fashion Strip Collage */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 my-6 sm:my-10 px-1 sm:px-4">
            {FASHION_STRIPS.map((strip) => (
              <div
                key={strip.id}
                className={`relative flex-1 ${strip.visibility} overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl transition-all duration-500 ease-out hover:scale-105 hover:z-20 hover:border-white/30 transform -skew-x-6 sm:-skew-x-8 ${strip.heightClass}`}
              >
                <img
                  src={strip.url}
                  alt={strip.alt}
                  loading="lazy"
                  className="h-full w-full object-cover object-center transform skew-x-6 sm:skew-x-8 scale-125 transition-transform duration-700 ease-out hover:scale-130 select-none"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/40 via-transparent to-transparent"
                  aria-hidden="true"
                />
              </div>
            ))}
          </div>

          {/* Bottom Bar: Outfit Of The Day Sub-label & Primary CTA */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-5">
            <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.35em] text-neutral-400 uppercase italic">
              O U T F I T &nbsp; O F &nbsp; T H E &nbsp; D A Y
            </span>

            <Link
              to="/products?category=fashion"
              aria-label="Explore TrendVolt fashion trends"
              className="group inline-flex items-center justify-center gap-2.5 min-h-[44px] rounded-full bg-white px-8 py-3 text-xs sm:text-sm font-bold tracking-wider text-neutral-950 uppercase shadow-xl transition-all duration-300 hover:bg-neutral-200 hover:shadow-2xl hover:scale-102 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>Shop Fashion</span>
              <svg
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PromoBanner
