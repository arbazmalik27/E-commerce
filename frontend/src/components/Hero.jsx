import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft } from 'lucide-react'

import hero01 from '../assets/products/hero-01.jpg'
import hero02 from '../assets/products/hero-02.jpg'
import hero03 from '../assets/products/hero-03.jpg'
import hero04 from '../assets/products/hero-04.jpg'
import hero05 from '../assets/products/hero-05.jpg'

/**
 * Terracotta Botanical Palm Leaves Graphic
 * Radiating organic frond matching the reference illustration behind the upper-left card.
 */
function TerracottaFrond({ className = '' }) {
  return (
    <svg
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <path
        d="M70 115 C45 95 15 80 10 60 C5 42 22 34 35 48 C45 58 60 85 70 115Z"
        fill="#C47A5C"
      />
      <path
        d="M70 115 C35 88 15 50 25 28 C33 10 52 14 56 38 C59 58 65 85 70 115Z"
        fill="#C47A5C"
      />
      <path
        d="M70 115 C52 78 40 32 55 10 C65 -6 82 2 80 26 C78 50 74 85 70 115Z"
        fill="#C47A5C"
      />
      <path
        d="M70 115 C75 80 85 40 100 22 C112 8 126 26 112 50 C98 70 82 92 70 115Z"
        fill="#C47A5C"
      />
      <path
        d="M70 115 C85 92 102 70 118 65 C130 60 132 82 115 95 C98 105 85 110 70 115Z"
        fill="#C47A5C"
      />
    </svg>
  )
}

/**
 * Editorial Circular Stamp Seal
 * Features circular text "• FASON • STYLE • LIEUTEN • LIFRN" and a 4-pointed olive star.
 */
function CircularStamp({ className = '' }) {
  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <path
          id="heroSealPath"
          d="M 60, 60 m -44, 0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
          fill="none"
        />
        <text
          fill="#1F211C"
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="0.22em"
          className="uppercase font-mono opacity-85"
        >
          <textPath href="#heroSealPath" startOffset="0%">
            • FASON • STYLE • LIEUTEN • LIFRN
          </textPath>
        </text>
      </svg>
      {/* 4-point dark olive star in center */}
      <div className="absolute inset-0 flex items-center justify-center text-[#34452F]">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#34452F]">
          <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
        </svg>
      </div>
    </div>
  )
}

function Hero() {
  const [activeSlide, setActiveSlide] = useState(1)

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev > 1 ? prev - 1 : 5))
  }

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev < 5 ? prev + 1 : 1))
  }

  return (
    <section
      id="hero"
      aria-label="Editorial Fashion Campaign Hero"
      className="relative w-full bg-[#F5F0E8] text-[#1F211C] overflow-hidden pt-6 pb-16 sm:pb-20 lg:pt-8 lg:pb-24 border-b border-[#DED7CA]"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 relative">
        {/* =========================================================================
            TOP: Circular Stamp (Left) & Header Masthead (Center)
           ========================================================================= */}
        <div className="relative flex flex-col items-center justify-center text-center max-w-4xl mx-auto pt-2 pb-4">
          {/* Top-Left Circular Stamp */}
          <div className="hidden md:block absolute -left-8 lg:-left-16 xl:-left-24 top-0 w-24 h-24 lg:w-28 lg:h-28">
            <CircularStamp className="w-full h-full" />
          </div>

          {/* Eyebrow: Solid Olive Dot + Spaced Uppercase */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34452F]" aria-hidden="true" />
            <span className="text-xs sm:text-[13px] font-mono font-bold tracking-[0.22em] text-[#34452F] uppercase">
              NEW COLLECTION
            </span>
          </div>

          {/* Master Headline in High-Contrast Editorial Serif */}
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-normal tracking-[-0.01em] text-[#1F211C] leading-[1.05]">
            Timeless Styles
            <br />
            for Modern{' '}
            <span className="font-serif italic font-normal text-[#C47A5C]">
              You.
            </span>
          </h1>

          {/* Supporting Subtitle */}
          <p className="mt-3.5 sm:mt-4 text-sm sm:text-base text-[#5F6057] font-sans font-normal tracking-wide max-w-md mx-auto">
            Curated fashion for the modern wardrobe.
          </p>
        </div>

        {/* =========================================================================
            DESKTOP & LARGE SCREENS: Exact Fashion Collage Composition (hidden lg:block)
           ========================================================================= */}
        <div className="hidden lg:block relative w-full h-[580px] xl:h-[620px] mt-4">
          {/* 1. UPPER-LEFT CARD: Model in tailored beige blazer + Terracotta Frond Leaves */}
          <div className="absolute left-[2%] xl:left-[4%] top-[4%] z-10">
            {/* Botanical Frond Graphic radiating out to the left */}
            <div className="absolute -left-12 -top-6 w-24 h-28 -z-10 -rotate-12" aria-hidden="true">
              <TerracottaFrond className="w-full h-full" />
            </div>

            <article
              className="relative w-[190px] xl:w-[220px] aspect-[3/4] rounded-[28px] overflow-hidden shadow-sm border border-[#DED7CA]/80 bg-[#FAF7F0] transform -rotate-3 hover:rotate-0 hover:scale-102 transition-all duration-500 ease-out group"
            >
              <img
                src={hero02}
                alt="Woman in tailored beige blazer holding statement sunglasses"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_35%] select-none transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </article>
          </div>

          {/* 2. LOWER-LEFT CARD: Male model in jacket + "Better Everyday" script */}
          <div className="absolute left-[0%] xl:left-[1%] bottom-[4%] z-10">
            <article
              className="relative w-[210px] xl:w-[240px] aspect-[4/3] rounded-[22px] overflow-hidden shadow-sm border border-[#DED7CA]/80 bg-[#FAF7F0] transform -rotate-2 hover:rotate-0 hover:scale-102 transition-all duration-500 ease-out group"
            >
              <img
                src={hero04}
                alt="Editorial portrait in black jacket and sunglasses"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_15%] select-none transition-transform duration-700 ease-out group-hover:scale-105"
              />

              {/* Handwritten White Micro-Script: Better Everyday */}
              <div
                className="absolute bottom-3 left-3.5 z-20 font-script text-white text-2xl xl:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] select-none rotate-[-4deg] leading-none"
                aria-hidden="true"
              >
                <div>Better</div>
                <div className="pl-1">Everyday</div>
              </div>
            </article>
          </div>

          {/* 3. FLOATING OLIVE 4-POINT STAR ACCENT */}
          <div
            className="absolute left-[26%] xl:left-[27%] top-[34%] text-[#34452F] z-20 select-none pointer-events-none"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 xl:w-6 xl:h-6 text-[#34452F]">
              <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
            </svg>
          </div>

          {/* 4. CENTERPIECE: Organic Asymmetric Pebble Frame */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[12%] xl:top-[8%] z-20">
            <article
              className="relative w-[480px] xl:w-[580px] aspect-[16/9] rounded-[48px_85px_38px_70px] overflow-hidden shadow-[0_20px_50px_-15px_rgba(31,33,28,0.18)] border border-[#DED7CA] bg-[#FAF7F0] group"
            >
              <img
                src={hero05}
                alt="Tailored campaign collection centerpiece"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_20%] select-none transition-transform duration-700 ease-out group-hover:scale-103"
              />
            </article>
          </div>

          {/* 5. TALL RIGHT CARD: Model with luxury handbag + Terracotta Arch + "Style Lives Here" */}
          <div className="absolute right-[8%] xl:right-[10%] top-[2%] z-10">
            {/* Terracotta Semi-Circular Arch Peaking Behind on Right */}
            <div
              className="absolute top-[48%] -right-6 w-14 h-28 rounded-r-full bg-[#C47A5C] -z-10"
              aria-hidden="true"
            />

            {/* Handwritten Terracotta Micro-Script: Style Lives Here */}
            <div
              className="absolute -right-22 xl:-right-26 top-2 font-script text-[#C47A5C] text-3xl xl:text-4xl leading-tight select-none rotate-[-6deg] z-20"
              aria-hidden="true"
            >
              <div>Style</div>
              <div className="pl-3">Lives</div>
              <div className="pl-6">Here</div>
              <div className="w-16 xl:w-20 h-0.5 bg-[#C47A5C] mt-1 ml-4" />
            </div>

            <article
              className="relative w-[180px] xl:w-[210px] aspect-[9/16] xl:aspect-[3/5] rounded-[28px] overflow-hidden shadow-sm border border-[#DED7CA]/80 bg-[#FAF7F0] transform rotate-2 hover:rotate-0 hover:scale-102 transition-all duration-500 ease-out group"
            >
              <img
                src={hero03}
                alt="Model in tailored jumpsuit holding luxury leather handbag"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_12%] select-none transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </article>
          </div>

          {/* 6. LOWER-RIGHT CARD: Chic cream knit walk + "More Than Fashion" */}
          <div className="absolute right-[1%] xl:right-[2%] bottom-[4%] z-10">
            {/* Handwritten Olive Micro-Script: More Than Fashion */}
            <div
              className="absolute -right-18 xl:-right-22 -bottom-2 font-script text-[#34452F] text-3xl xl:text-4xl leading-tight select-none rotate-[-8deg] z-20"
              aria-hidden="true"
            >
              <div>More</div>
              <div className="pl-3">Than</div>
              <div className="pl-6">Fashion</div>
              <div className="w-20 xl:w-24 h-0.5 bg-[#34452F] mt-1 ml-4" />
            </div>

            <article
              className="relative w-[165px] xl:w-[190px] aspect-[4/5] rounded-[24px] overflow-hidden shadow-sm border border-[#DED7CA]/80 bg-[#FAF7F0] transform -rotate-2 hover:rotate-0 hover:scale-102 transition-all duration-500 ease-out group"
            >
              <img
                src={hero01}
                alt="Woman in tailored cream knit turtleneck"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_18%] select-none transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </article>
          </div>

          {/* 7. RIGHT EDGE CONTROLS: Vertical Counter & Arrow Buttons */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-30 select-none">
            <span className="rotate-90 text-[11px] font-mono tracking-widest text-[#85857A]">
              0{activeSlide} / 05
            </span>
            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="Previous campaign frame"
                className="h-8 w-8 rounded-full border border-[#DED7CA] hover:border-[#34452F] hover:text-[#34452F] bg-[#FFFDF8] flex items-center justify-center text-[#5F6057] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="Next campaign frame"
                className="h-8 w-8 rounded-full border border-[#DED7CA] hover:border-[#34452F] hover:text-[#34452F] bg-[#FFFDF8] flex items-center justify-center text-[#5F6057] transition-colors cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TABLET & MOBILE: Intentional Vertical Editorial Composition (block lg:hidden)
           ========================================================================= */}
        <div className="block lg:hidden mt-6 space-y-6">
          {/* 1. Centerpiece Pebble Card */}
          <div className="relative mx-auto max-w-sm sm:max-w-md">
            <article className="relative w-full aspect-[16/10] rounded-[36px_60px_28px_48px] overflow-hidden shadow-md border border-[#DED7CA] bg-[#FAF7F0]">
              <img
                src={hero05}
                alt="Campaign centerpiece look"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_20%] select-none"
              />
            </article>
          </div>

          {/* 2. Dual Row 1: Hero-02 (blazer) and Hero-03 (handbag) */}
          <div className="grid grid-cols-2 gap-3.5 max-w-sm sm:max-w-md mx-auto">
            <div className="relative">
              <article className="relative aspect-[3/4] rounded-2xl border border-[#DED7CA] bg-[#FAF7F0] shadow-xs overflow-hidden transform -rotate-1">
                <img
                  src={hero02}
                  alt="Woman in beige blazer holding sunglasses"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-[center_35%]"
                />
              </article>
            </div>

            <div className="relative">
              <div
                className="absolute top-1/2 -right-2 w-8 h-16 rounded-r-full bg-[#C47A5C] -z-10"
                aria-hidden="true"
              />
              <article className="relative aspect-[3/4] rounded-2xl border border-[#DED7CA] bg-[#FAF7F0] shadow-xs overflow-hidden transform rotate-1">
                <img
                  src={hero03}
                  alt="Model holding luxury leather handbag"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-[center_12%]"
                />
              </article>
            </div>
          </div>

          {/* 3. Dual Row 2: Hero-04 (leather jacket) and Hero-01 (cream knit) */}
          <div className="grid grid-cols-2 gap-3.5 max-w-sm sm:max-w-md mx-auto">
            <article className="relative aspect-[3/4] rounded-2xl border border-[#DED7CA] bg-[#FAF7F0] shadow-xs overflow-hidden transform rotate-1">
              <img
                src={hero04}
                alt="Portrait in black leather jacket"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-[center_15%]"
              />
              <div
                className="absolute bottom-2 left-2 z-10 font-script text-white text-xl drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] select-none rotate-[-4deg] leading-none"
                aria-hidden="true"
              >
                Better Everyday
              </div>
            </article>

            <article className="relative aspect-[3/4] rounded-2xl border border-[#DED7CA] bg-[#FAF7F0] shadow-xs overflow-hidden transform -rotate-1">
              <img
                src={hero01}
                alt="Woman in tailored cream knit sweater"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-[center_18%]"
              />
            </article>
          </div>
        </div>

        {/* =========================================================================
            BOTTOM STRIP: Editorial Note (Left) + CTAs (Center)
           ========================================================================= */}
        <div className="mt-8 sm:mt-10 lg:mt-6 pt-4 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Bottom-Left Brand Note */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-[#5F6057] font-sans">
            <span className="w-8 h-px bg-[#1F211C]" aria-hidden="true" />
            <div className="leading-snug">
              <p>Premium quality. Modern designs.</p>
              <p>Made for your everyday.</p>
            </div>
          </div>

          {/* Center Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
            {/* Primary Action Button: Solid Deep Olive Pill */}
            <Link
              to="/products"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-8 py-3.5 text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300 shadow-sm active:scale-98 cursor-pointer"
            >
              <span>Shop Now</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* Secondary Action Button: Cream Surface with Thin Border */}
            <Link
              to="/products?category=fashion"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#DED7CA] hover:border-[#34452F] bg-[#FAF7F0] hover:bg-[#FFFDF8] text-[#1F211C] px-8 py-3.5 text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300 active:scale-98 cursor-pointer"
            >
              <span>Explore Edit</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Empty spacer to balance flex-between on desktop */}
          <div className="hidden sm:block w-32" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}

export default Hero


