import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'

import trend01 from '../assets/fashion-trends/trend-01.jpg'
import trend02 from '../assets/fashion-trends/trend-02.jpg'
import trend03 from '../assets/fashion-trends/trend-03.jpg'
import trend04 from '../assets/fashion-trends/trend-04.jpg'
import trend05 from '../assets/fashion-trends/trend-05.jpg'
import trend06 from '../assets/fashion-trends/trend-06.jpg'
import trend07 from '../assets/fashion-trends/trend-07.jpg'

const TREND_SLICES = [
  {
    id: 1,
    image: trend01,
    title: 'Minimal Outerwear',
    subtitle: 'Architectural grey drape',
    alt: 'Tailored minimalist outerwear look',
    objectPosition: 'center 20%',
    heightDesktop: '86%',
    translateYDesktop: '4%',
    heightMobile: '86%',
    translateYMobile: '3%',
  },
  {
    id: 2,
    image: trend02,
    title: 'Studio Tailoring',
    subtitle: 'Warm sunlit tailored blazer',
    alt: 'Dramatic studio light tailored blazer',
    objectPosition: 'center 18%',
    heightDesktop: '94%',
    translateYDesktop: '10%',
    heightMobile: '92%',
    translateYMobile: '8%',
  },
  {
    id: 3,
    image: trend03,
    title: 'Monochrome Suiting',
    subtitle: 'Cream suit with rose boutonnière',
    alt: 'Contemporary monochrome suit editorial',
    objectPosition: 'center 18%',
    heightDesktop: '88%',
    translateYDesktop: '-4%',
    heightMobile: '88%',
    translateYMobile: '-3%',
  },
  {
    id: 4,
    image: trend04,
    title: 'Oversized Overcoat',
    subtitle: 'Structured double-breasted white coat',
    alt: 'Structured oversized white coat and boots',
    objectPosition: 'center 30%',
    heightDesktop: '97%',
    translateYDesktop: '7%',
    heightMobile: '95%',
    translateYMobile: '6%',
  },
  {
    id: 5,
    image: trend05,
    title: 'Linen & Panama',
    subtitle: 'Classic fedora and relaxed linen',
    alt: 'Chic fedora hat and linen styling',
    objectPosition: 'center 20%',
    heightDesktop: '89%',
    translateYDesktop: '-5%',
    heightMobile: '89%',
    translateYMobile: '-4%',
  },
  {
    id: 6,
    image: trend06,
    title: 'Urban Charcoal',
    subtitle: 'Streetwear crop top and flare silhouette',
    alt: 'Sleek dark monochrome street style',
    objectPosition: 'center 28%',
    heightDesktop: '94%',
    translateYDesktop: '9%',
    heightMobile: '92%',
    translateYMobile: '7%',
  },
  {
    id: 7,
    image: trend07,
    title: 'Crisp Poplin',
    subtitle: 'Oversized white cotton essential',
    alt: 'Crisp oversized poplin shirt editorial',
    objectPosition: 'center 20%',
    heightDesktop: '88%',
    translateYDesktop: '-4%',
    heightMobile: '88%',
    translateYMobile: '-3%',
  },
]

function FashionTrends() {
  const [activeId, setActiveId] = useState(null)
  const [imageErrors, setImageErrors] = useState({})

  const handleImageError = (id) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }))
  }

  const handleSliceClick = (id) => {
    setActiveId((prev) => (prev === id ? null : id))
  }

  return (
    <section
      id="fashion-trends"
      aria-labelledby="fashion-trends-title"
      className="relative w-full bg-white py-14 sm:py-20 lg:py-28 text-[#1F211C] border-b border-[#DED7CA] overflow-hidden select-none"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* =========================================================================
            1. POSTER HEADER: Top Handle + Big Italic Extended Title
           ========================================================================= */}
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto mb-6 sm:mb-10 lg:mb-12">
          {/* Top Handle Row matching Reference */}
          <div className="w-full flex items-center justify-between pb-3 sm:pb-4 text-xs font-mono font-bold tracking-[0.2em] sm:tracking-[0.25em] text-[#5F6057] uppercase">
            <span className="hidden sm:inline-block">ARCHIVE &apos;26</span>
            <span className="ml-auto text-[#1F211C] font-black tracking-widest text-[11px] sm:text-xs">
              @TRENDVOLT_STUDIO
            </span>
          </div>

          {/* Main Billboard Headline */}
          <h2
            id="fashion-trends-title"
            className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter uppercase text-[#111111] leading-[0.95] text-center"
            style={{ fontStyle: 'italic', transform: 'skewX(-4deg)' }}
          >
            TRENDVOLT FASHION TRENDS
          </h2>
        </div>

        {/* =========================================================================
            2. THE 7-SLICE SLANTED EDITORIAL RIBBON (Laptop / Tablet / Mobile)
           ========================================================================= */}
        <div className="relative w-full px-2 sm:px-6 md:px-10 lg:px-12 my-2 sm:my-4">
          <div
            className="relative w-full flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 lg:gap-3.5 h-[300px] xs:h-[340px] sm:h-[420px] md:h-[480px] lg:h-[530px]"
            role="region"
            aria-label="Fashion Trends Slanted Collage"
          >
            {TREND_SLICES.map((slice) => {
              const isSelected = activeId === slice.id
              const hasActiveSlice = activeId !== null
              const isErrored = Boolean(imageErrors[slice.id])

              return (
                <div
                  key={slice.id}
                  onClick={() => handleSliceClick(slice.id)}
                  onMouseEnter={() => setActiveId(slice.id)}
                  onMouseLeave={() => setActiveId(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSliceClick(slice.id)
                    }
                  }}
                  aria-label={`View ${slice.title}`}
                  aria-expanded={isSelected}
                  className={`group relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer select-none rounded-xs sm:rounded-sm shadow-xs ${
                    isSelected
                      ? 'flex-[2.2] sm:flex-[2.5] md:flex-[2.8] z-20 shadow-xl ring-1 sm:ring-2 ring-[#34452F]'
                      : hasActiveSlice
                      ? 'flex-[0.7] sm:flex-[0.75] opacity-75 hover:opacity-100 z-10'
                      : 'flex-1 z-10 hover:flex-[1.4] hover:opacity-100'
                  }`}
                  style={{
                    height: slice.heightDesktop,
                    transform: `translateY(${slice.translateYDesktop}) skewX(-10deg)`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Inner Image Container: Counter-skews by +10deg so people stay completely undistorted */}
                  <div
                    className="relative w-full h-full overflow-hidden bg-[#EEE7DC]"
                    style={{
                      transform: 'skewX(10deg) scale(1.38)',
                      transformOrigin: 'center center',
                    }}
                  >
                    {!isErrored ? (
                      <img
                        src={slice.image}
                        alt={slice.alt}
                        loading="lazy"
                        decoding="async"
                        onError={() => handleImageError(slice.id)}
                        className={`h-full w-full object-cover select-none pointer-events-none transition-transform duration-700 ease-out ${
                          isSelected ? 'scale-105' : 'group-hover:scale-105'
                        }`}
                        style={{ objectPosition: slice.objectPosition }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#EEE7DC] text-[#85857A] text-[10px] font-mono uppercase font-bold">
                        Look 0{slice.id}
                      </div>
                    )}

                    {/* Subtle Gradient Vignette at Bottom */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent transition-opacity duration-300 ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                      }`}
                    />

                    {/* Expanded Interactive Pill Label */}
                    <div
                      className={`absolute bottom-3 left-2 right-2 sm:bottom-4 sm:left-3 sm:right-3 flex flex-col justify-end text-white transition-all duration-300 ${
                        isSelected
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-3 pointer-events-none'
                      }`}
                    >
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest uppercase text-[#EEE7DC]">
                        LOOK 0{slice.id}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold tracking-tight leading-snug line-clamp-1 drop-shadow-xs">
                        {slice.title}
                      </h3>
                      <p className="hidden sm:block text-[11px] text-[#DED7CA] line-clamp-1 mt-0.5 font-normal">
                        {slice.subtitle}
                      </p>
                      <Link
                        to="/products?category=fashion"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider underline hover:text-[#DED7CA] transition-colors"
                      >
                        <span>Shop Look</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* =========================================================================
            3. POSTER FOOTER: O U T F I T   O F   T H E   D A Y  + Action Button
           ========================================================================= */}
        <div className="mt-8 sm:mt-12 lg:mt-14 flex flex-col items-center text-center gap-5">
          {/* Exact Subtitle from Reference Photo */}
          <p
            className="text-xs sm:text-sm md:text-base font-bold italic tracking-[0.35em] sm:tracking-[0.5em] text-[#111111] uppercase select-none"
            style={{ fontStyle: 'italic', transform: 'skewX(-4deg)' }}
          >
            O U T F I T &nbsp; O F &nbsp; T H E &nbsp; D A Y
          </p>

          {/* Interactive Hint for Mobile / Tablet / Laptop */}
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#85857A]">
            <Sparkles className="h-3.5 w-3.5 text-[#34452F]" />
            <span>Hover or tap any silhouette to inspect details</span>
          </div>

          {/* CTA Link */}
          <div className="mt-2">
            <Link
              to="/products?category=fashion"
              aria-label="Explore full Fashion Trends catalog"
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#111111] px-8 py-3.5 text-xs sm:text-sm font-bold tracking-wider text-white uppercase shadow-sm transition-all duration-300 hover:bg-[#34452F] hover:shadow-md active:scale-98 cursor-pointer"
            >
              <span>Explore The Trend Vault</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}

export default FashionTrends
