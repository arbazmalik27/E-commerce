import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Eyebrow from './Eyebrow'
import editorialImage from '../assets/fashion-trends/trend-02.jpg'

function EditorialFeature() {
  return (
    <section className="relative w-full bg-[#F5F0E8] py-16 sm:py-20 lg:py-24 text-[#1F211C] border-b border-[#DED7CA] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left: Editorial Copy */}
          <div className="lg:col-span-6 flex flex-col items-start justify-center">
            <div className="mb-4">
              <Eyebrow variant="terracotta">STUDIO PERSPECTIVE</Eyebrow>
            </div>

            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight text-[#1F211C] leading-[1.02]">
              Fashion
              <br />
              Beyond
              <br />
              <span className="text-[#34452F]">Trends.</span>
            </h2>

            <p className="mt-6 text-base sm:text-lg text-[#5F6057] leading-relaxed max-w-lg">
              We reject fleeting novelty in favor of quiet permanence. Each piece in the TrendVolt edit
              is chosen to integrate effortlessly into an enduring wardrobe, balancing architectural
              structure with tactile comfort.
            </p>

            <div className="mt-8">
              <Link
                to="/products?category=fashion"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-8 py-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-xs"
              >
                <span>Explore Edit</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right: Large Fashion Image */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/5] sm:aspect-[16/13] lg:aspect-[4/5] overflow-hidden rounded-3xl border border-[#DED7CA] bg-[#FAF7F0] shadow-md">
              <img
                src={editorialImage}
                alt="Dramatic tailored studio look"
                className="h-full w-full object-cover object-center select-none transition-transform duration-700 ease-out hover:scale-103"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute bottom-5 left-5 z-10">
                <span className="px-3.5 py-1.5 rounded-full bg-[#FFFDF8]/90 backdrop-blur-xs border border-[#DED7CA] text-[11px] font-mono font-bold tracking-widest text-[#1F211C] uppercase">
                  ATELIER ARCHIVE &bull; VOL. 04
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default EditorialFeature
