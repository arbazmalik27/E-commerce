import { Link } from 'react-router-dom'
import Eyebrow from './Eyebrow'

// High-resolution realistic human fashion model campaign photography
const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=2000&q=85'

function Hero() {
  return (
    <section className="relative w-full bg-neutral-950 text-white overflow-hidden">
      {/* Background Lifestyle Visual (Right-Oriented Campaign Model) */}
      <img
        src={HERO_IMAGE_URL}
        alt="TrendVolt Luxury Fashion Campaign"
        className="absolute inset-0 h-full w-full object-cover object-[center_top] lg:object-[70%_top] select-none opacity-85 transition-transform duration-1000 ease-out hover:scale-102"
        loading="eager"
      />

      {/* Layered cinematic gradients ensuring flawless contrast & depth */}
      {/* Desktop: Horizontal gradient from deep black on left to photography on right */}
      <div
        className="pointer-events-none hidden lg:block absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 via-48% to-transparent"
        aria-hidden="true"
      />
      {/* Mobile & Tablet: Vertical gradient from dark bottom upwards */}
      <div
        className="pointer-events-none lg:hidden absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/85 via-50% to-neutral-950/35"
        aria-hidden="true"
      />

      {/* Subtle lilac atmospheric ambient glow (restrained lower-left edge aura, far from model) */}
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 w-[600px] h-[450px] bg-gradient-to-tr from-purple-900/15 via-purple-950/5 to-transparent blur-3xl opacity-35 -z-10"
        aria-hidden="true"
      />

      {/* Hero Content Container */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-36 sm:pt-40 lg:pt-44 pb-16 sm:pb-20 lg:pb-24 flex flex-col justify-between min-h-[640px] sm:min-h-[680px] lg:min-h-[740px]">
        {/* Main Editorial Text Content Area */}
        <div className="my-auto max-w-2xl">
          {/* Small Eyebrow / Collection Label */}
          <div className="mb-4">
            <Eyebrow>NEW COLLECTION • 2026</Eyebrow>
          </div>

          {/* Large Editorial Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tight text-white leading-[0.96]">
            Elevate Your
            <br />
            <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Everyday Style.
            </span>
          </h1>

          {/* Short Supporting Copy */}
          <p className="mt-5 max-w-lg text-base sm:text-lg text-neutral-300 font-normal leading-relaxed">
            A signature curation of tailored apparel and modern essentials,
            crafted for effortless sophistication.
          </p>

          {/* Primary CTA (Single, Clear Conversion Action) */}
          <div className="mt-8 flex items-center">
            <Link
              to="/products"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-xs sm:text-sm font-bold tracking-wider text-neutral-950 uppercase shadow-xl transition-all duration-300 hover:bg-neutral-200 hover:shadow-2xl hover:scale-103 active:scale-97 cursor-pointer"
            >
              <span>Shop Now</span>
              <svg
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Restrained Editorial Trust Line */}
        <div className="mt-10 sm:mt-12 pt-6 border-t border-white/10 max-w-xl">
          <div className="flex flex-wrap items-center gap-x-3.5 sm:gap-x-4 gap-y-2 text-xs font-bold tracking-[0.18em] text-neutral-400 uppercase">
            <span>Premium Quality</span>
            <span className="h-1 w-1 rounded-full bg-purple-400/60" aria-hidden="true" />
            <span>Secure Payments</span>
            <span className="h-1 w-1 rounded-full bg-purple-400/60" aria-hidden="true" />
            <span>Easy Returns</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
