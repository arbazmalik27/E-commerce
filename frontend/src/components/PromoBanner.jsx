import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import promoImage from '../assets/fashion-trends/trend-04.jpg'

/**
 * PROMOTIONAL SECTION — Editorial Split Banner
 * Deep olive canvas with warm cream typography and local asset imagery.
 */
function PromoBanner() {
  return (
    <section
      id="editorial-promo"
      aria-labelledby="promo-banner-heading"
      className="relative w-full bg-[#EEE7DC] py-16 sm:py-20 text-[#1F211C] border-b border-[#DED7CA] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative w-full overflow-hidden rounded-3xl bg-[#34452F] text-[#FFFDF8] p-8 sm:p-12 lg:p-16 shadow-[0_20px_50px_-20px_rgba(52,69,47,0.3)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Area (lg: 7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-mono font-bold tracking-[0.2em] uppercase mb-4 text-[#FFFDF8]">
                <Sparkles className="h-3 w-3 text-[#C47A5C]" />
                <span>LIMITED RUN &bull; AUTUMN &apos;26</span>
              </div>

              <h2
                id="promo-banner-heading"
                className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#FFFDF8] leading-[1.05]"
              >
                Crafted for Character.
                <br />
                <span className="text-[#C47A5C] italic font-serif sm:font-sans">
                  Built to Endure.
                </span>
              </h2>

              <p className="mt-5 text-base sm:text-lg text-[#EEE7DC] font-normal leading-relaxed max-w-xl">
                Every garment begins with intentional fiber selection and tailored precision.
                Explore our limited seasonal run of outerwear and foundational separates.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/products?category=fashion"
                  aria-label="Explore TrendVolt editorial collection"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#FFFDF8] px-8 py-3.5 text-xs sm:text-sm font-bold tracking-wider text-[#34452F] uppercase shadow-md transition-all duration-300 hover:bg-[#EEE7DC] active:scale-98 cursor-pointer"
                >
                  <span>Explore Collection</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Right Split Image Area (lg: 5 cols) */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/15 bg-[#263722] shadow-xl">
                <img
                  src={promoImage}
                  alt="Structured oversized outerwear look"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-center select-none transition-transform duration-700 ease-out hover:scale-103"
                />
                <div className="absolute bottom-4 left-4 z-10">
                  <span className="px-3 py-1 rounded-full bg-[#1F211C]/80 backdrop-blur-xs border border-white/10 text-[10px] font-mono tracking-widest text-[#FFFDF8] uppercase">
                    FEATURED LOOK &bull; WHITE COAT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PromoBanner
