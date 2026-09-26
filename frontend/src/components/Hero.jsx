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
      <path d="M70 115 C45 95 15 80 10 60 C5 42 22 34 35 48 C45 58 60 85 70 115Z" fill="#A65332" />
      <path d="M70 115 C35 88 15 50 25 28 C33 10 52 14 56 38 C59 58 65 85 70 115Z" fill="#A65332" />
      <path d="M70 115 C52 78 40 32 55 10 C65 -6 82 2 80 26 C78 50 74 85 70 115Z" fill="#A65332" />
      <path d="M70 115 C75 80 85 40 100 22 C112 8 126 26 112 50 C98 70 82 92 70 115Z" fill="#A65332" />
      <path d="M70 115 C85 92 102 70 118 65 C130 60 132 82 115 95 C98 105 85 110 70 115Z" fill="#A65332" />
    </svg>
  )
}

/**
 * Editorial Circular Stamp Seal
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
        <text fill="#1F211C" fontSize="9.5" fontWeight="600" letterSpacing="0.22em" className="uppercase opacity-80">
          <textPath href="#heroSealPath" startOffset="0%">
            • FASON • STYLE • LIEUTEN • LIFRN
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[33%] h-[33%] text-[#34452F]">
          <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
        </svg>
      </div>
    </div>
  )
}

/**
 * Hero Section — ONE unified layout across all devices.
 *
 * Layout maths (as % of canvas width):
 *   Center pebble:  width=38%,  left=50% translateX(-50%)  → spans 31%–69%
 *   Upper-left:     width=21%,  left=8%                    → spans 8%–29%  (2% gap to center)
 *   Lower-left:     width=23%,  left=6%                    → spans 6%–29%  (2% gap to center)
 *   Upper-right:    width=15%,  right=15% (=left 70%)      → spans 70%–85% (1% gap from center)
 *   Lower-right:    width=14%,  right=14% (=left 72%)      → spans 72%–86% (3% gap from center)
 *
 * The aspect-ratio canvas scales proportionally on every viewport.
 * Large screens: height capped via max-height so it doesn't grow indefinitely.
 */
function Hero() {
  const [activeSlide, setActiveSlide] = useState(1)

  const handlePrevSlide = () => setActiveSlide((p) => (p > 1 ? p - 1 : 5))
  const handleNextSlide = () => setActiveSlide((p) => (p < 5 ? p + 1 : 1))

  return (
    <section
      id="hero"
      aria-label="Editorial Fashion Campaign Hero"
      className="relative w-full bg-[#F5F0E8] text-[#1F211C] overflow-hidden border-b border-[#DED7CA] pb-4 sm:pb-6 lg:pb-8"
    >
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-8 pt-3 sm:pt-4 lg:pt-5">

        {/* ── Editorial Masthead: scales via clamp so it never wraps ── */}
        <div className="relative flex flex-col items-center text-center max-w-5xl mx-auto mb-2 sm:mb-3">

          {/* Circular stamp: absolute-left of masthead */}
          <div
            className="absolute pointer-events-none select-none opacity-80"
            style={{
              left: 'clamp(-4px, -1.5vw, 0px)',
              top: 0,
              width: 'clamp(40px, 5.5vw, 88px)',
              height: 'clamp(40px, 5.5vw, 88px)',
            }}
          >
            <CircularStamp className="w-full h-full" />
          </div>

          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-1.5 sm:mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34452F]" aria-hidden="true" />
            <span
              className="font-mono font-bold tracking-[0.22em] text-[#34452F] uppercase"
              style={{ fontSize: 'clamp(9px, 1.1vw, 13px)' }}
            >
              NEW COLLECTION
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-serif font-normal tracking-[-0.01em] text-[#1F211C] leading-[1.06]"
            style={{ fontSize: 'clamp(24px, 4.8vw, 78px)' }}
          >
            Timeless Styles
            <br />
            for Modern{' '}
            <span className="font-serif italic font-normal text-[#A65332]">You.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="mt-1.5 sm:mt-2 text-[#5F6057] font-sans font-normal tracking-wide"
            style={{ fontSize: 'clamp(10px, 1.2vw, 15px)' }}
          >
            Curated fashion for the modern wardrobe.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            COLLAGE CANVAS
            Aspect-ratio keeps height proportional on all screens.
            Max-height prevents it from being too tall on 1440px+.
            All cards use % left/top/right/bottom → scale together.
           ═══════════════════════════════════════════════════════════════ */}
        <div
          className="relative w-full"
          style={{
            aspectRatio: '16 / 9',
            maxHeight: '620px',
          }}
        >

          {/* ── 1. UPPER-LEFT (hero02): Blazer + Frond ─────────────────────
              Canvas math: left 8%, width 21% → right edge at 29%.
              Center left edge = 31% → 2% gap only.                      */}
          <div className="absolute z-10" style={{ left: '8%', top: '2%', width: '21%' }}>
            {/* Botanical frond peeks out behind card to the left */}
            <div
              className="absolute -z-10 pointer-events-none select-none"
              style={{ left: '-28%', top: '-16%', width: '58%', height: '68%' }}
              aria-hidden="true"
            >
              <TerracottaFrond className="w-full h-full -rotate-12" />
            </div>

            <article className="relative w-full aspect-[3/4] overflow-hidden border border-[#DED7CA]/80 bg-[#FAF7F0] shadow-sm -rotate-3 hover:rotate-0 hover:scale-102 transition-all duration-500 group" style={{ borderRadius: '9%' }}>
              <img
                src={hero02}
                alt="Woman in tailored beige blazer"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_35%] select-none group-hover:scale-105 transition-transform duration-700"
              />
            </article>
          </div>

          {/* ── 2. LOWER-LEFT (hero04): Jacket + "Better Everyday" ─────────
              Canvas math: left 6%, width 23% → right edge at 29%.
              Positioned top 46% → overlaps bottom of upper-left card.   */}
          <div className="absolute z-10" style={{ left: '6%', top: '46%', width: '23%' }}>
            <article className="relative w-full aspect-[4/3] overflow-hidden border border-[#DED7CA]/80 bg-[#FAF7F0] shadow-sm -rotate-2 hover:rotate-0 hover:scale-102 transition-all duration-500 group" style={{ borderRadius: '7%' }}>
              <img
                src={hero04}
                alt="Editorial portrait in contemporary jacket"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_15%] select-none group-hover:scale-105 transition-transform duration-700"
              />
              {/* "Better Everyday" handwritten script */}
              <div
                className="absolute bottom-[10%] left-[8%] z-20 font-script text-white select-none -rotate-[4deg] leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] pointer-events-none"
                style={{ fontSize: 'clamp(9px, 1.5vw, 24px)' }}
                aria-hidden="true"
              >
                <div>Better</div>
                <div style={{ paddingLeft: '6%' }}>Everyday</div>
              </div>
            </article>
          </div>

          {/* ── 3. CENTER PEBBLE (hero05) + 4-point star + CTAs ────────────
              Canvas math: left 50% translateX(-50%), width 38%.
              → spans 31%–69% (tight 2% gap to both side columns).       */}
          <div
            className="absolute z-20 flex flex-col items-center"
            style={{ left: '50%', transform: 'translateX(-50%)', top: '2%', width: '38%' }}
          >
            {/* 4-point olive star: left of pebble frame */}
            <div
              className="absolute z-30 text-[#34452F] pointer-events-none select-none"
              style={{ left: '-4.5%', top: '22%', width: '4.5%' }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-[#34452F]">
                <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
              </svg>
            </div>

            {/* Pebble frame — organic asymmetric border-radius */}
            <article
              className="relative w-full overflow-hidden border border-[#DED7CA] bg-[#FAF7F0] shadow-[0_14px_36px_-10px_rgba(31,33,28,0.18)] group"
              style={{ aspectRatio: '16/9', borderRadius: '12% 20% 10% 16%' }}
            >
              <img
                src={hero05}
                alt="Campaign tailored collection centerpiece"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_20%] select-none group-hover:scale-103 transition-transform duration-700"
              />
            </article>

            {/* Shop Now + Explore Edit — directly below pebble */}
            <div
              className="flex items-center justify-center w-full z-30"
              style={{ marginTop: '4%', gap: '4%' }}
            >
              <Link
                to="/products"
                className="group inline-flex items-center justify-center gap-1 rounded-full bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-semibold tracking-wide transition-all duration-300 shadow-sm active:scale-98 cursor-pointer whitespace-nowrap"
                style={{
                  padding: 'clamp(5px, 0.7vw, 13px) clamp(10px, 1.7vw, 26px)',
                  fontSize: 'clamp(8px, 0.95vw, 13px)',
                  borderRadius: '9999px',
                  gap: 'clamp(3px, 0.4vw, 7px)',
                }}
              >
                <span>Shop Now</span>
                <ArrowRight
                  style={{ width: 'clamp(7px, 0.9vw, 14px)', height: 'clamp(7px, 0.9vw, 14px)' }}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>

              <Link
                to="/products?category=fashion"
                className="group inline-flex items-center justify-center gap-1 border border-[#1F211C]/35 hover:border-[#34452F] bg-[#FAF7F0] hover:bg-[#FFFDF8] text-[#1F211C] font-semibold tracking-wide transition-all duration-300 active:scale-98 cursor-pointer whitespace-nowrap"
                style={{
                  padding: 'clamp(5px, 0.7vw, 13px) clamp(10px, 1.7vw, 26px)',
                  fontSize: 'clamp(8px, 0.95vw, 13px)',
                  borderRadius: '9999px',
                  gap: 'clamp(3px, 0.4vw, 7px)',
                }}
              >
                <span>Explore Edit</span>
                <ArrowRight
                  style={{ width: 'clamp(7px, 0.9vw, 14px)', height: 'clamp(7px, 0.9vw, 14px)' }}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>

          {/* ── 4. UPPER-RIGHT (hero03): Jumpsuit + Arch + "Style Lives Here"
              Canvas math: right 15%, width 15% → left edge at 70%.
              Center right edge = 69% → 1% gap only (nearly touching).   */}
          <div className="absolute z-10" style={{ right: '15%', top: '1%', width: '15%' }}>
            {/* Terracotta semi-circle arch peeking right of card */}
            <div
              className="absolute -z-10 rounded-r-full bg-[#A65332]"
              style={{ top: '40%', right: '-12%', width: '18%', height: '42%' }}
              aria-hidden="true"
            />

            {/* "Style Lives Here" handwritten script to the right */}
            <div
              className="absolute font-script text-[#A65332] select-none -rotate-[6deg] z-20 pointer-events-none leading-tight"
              style={{
                right: '-52%',
                top: '2%',
                fontSize: 'clamp(7px, 1.2vw, 20px)',
                whiteSpace: 'nowrap',
              }}
              aria-hidden="true"
            >
              <div>Style</div>
              <div style={{ paddingLeft: '10%' }}>Lives</div>
              <div style={{ paddingLeft: '20%' }}>Here</div>
              <div style={{ marginTop: '5%', marginLeft: '6%', height: '1px', width: '70%', backgroundColor: '#A65332' }} />
            </div>

            <article className="relative w-full aspect-[9/16] overflow-hidden border border-[#DED7CA]/80 bg-[#FAF7F0] shadow-sm rotate-2 hover:rotate-0 hover:scale-102 transition-all duration-500 group" style={{ borderRadius: '10%' }}>
              <img
                src={hero03}
                alt="Model in tailored jumpsuit holding luxury handbag"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_12%] select-none group-hover:scale-105 transition-transform duration-700"
              />
            </article>
          </div>

          {/* ── 5. LOWER-RIGHT (hero01): Cream knit + "More Than Fashion" ──
              Canvas math: right 14%, width 14% → left edge at 72%.
              Positioned top 45% → overlaps bottom of upper-right card.  */}
          <div className="absolute z-10" style={{ right: '14%', top: '46%', width: '14%' }}>
            {/* "More Than Fashion" handwritten script to the right */}
            <div
              className="absolute font-script text-[#34452F] select-none -rotate-[8deg] z-20 pointer-events-none leading-tight"
              style={{
                right: '-55%',
                bottom: '-4%',
                fontSize: 'clamp(7px, 1.2vw, 20px)',
                whiteSpace: 'nowrap',
              }}
              aria-hidden="true"
            >
              <div>More</div>
              <div style={{ paddingLeft: '10%' }}>Than</div>
              <div style={{ paddingLeft: '20%' }}>Fashion</div>
              <div style={{ marginTop: '5%', marginLeft: '6%', height: '1px', width: '70%', backgroundColor: '#34452F' }} />
            </div>

            <article className="relative w-full aspect-[4/5] overflow-hidden border border-[#DED7CA]/80 bg-[#FAF7F0] shadow-sm -rotate-2 hover:rotate-0 hover:scale-102 transition-all duration-500 group" style={{ borderRadius: '9%' }}>
              <img
                src={hero01}
                alt="Woman in tailored cream knit turtleneck"
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover object-[center_18%] select-none group-hover:scale-105 transition-transform duration-700"
              />
            </article>
          </div>

          {/* ── 6. RIGHT-EDGE CAROUSEL CONTROLS ─────────────────────────── */}
          <div
            className="absolute z-30 flex flex-col items-center select-none"
            style={{
              right: '1%',
              top: '50%',
              transform: 'translateY(-50%)',
              gap: 'clamp(3px, 0.4vw, 8px)',
            }}
          >
            <span
              className="rotate-90 font-mono text-[#85857A] tracking-widest"
              style={{ fontSize: 'clamp(6px, 0.7vw, 10px)' }}
            >
              0{activeSlide} / 05
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.35vw, 7px)', marginTop: 'clamp(3px, 0.4vw, 8px)' }}>
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="Previous campaign frame"
                className="rounded-full border border-[#DED7CA] hover:border-[#34452F] hover:text-[#34452F] bg-[#FFFDF8] flex items-center justify-center text-[#5F6057] transition-colors cursor-pointer active:scale-95"
                style={{ width: 'clamp(18px, 2vw, 34px)', height: 'clamp(18px, 2vw, 34px)' }}
              >
                <ArrowLeft style={{ width: 'clamp(7px, 0.8vw, 13px)', height: 'clamp(7px, 0.8vw, 13px)' }} />
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="Next campaign frame"
                className="rounded-full border border-[#DED7CA] hover:border-[#34452F] hover:text-[#34452F] bg-[#FFFDF8] flex items-center justify-center text-[#5F6057] transition-colors cursor-pointer active:scale-95"
                style={{ width: 'clamp(18px, 2vw, 34px)', height: 'clamp(18px, 2vw, 34px)' }}
              >
                <ArrowRight style={{ width: 'clamp(7px, 0.8vw, 13px)', height: 'clamp(7px, 0.8vw, 13px)' }} />
              </button>
            </div>
          </div>

          {/* ── 7. BOTTOM-LEFT BRAND NOTE ────────────────────────────────── */}
          <div
            className="absolute flex items-center pointer-events-none select-none"
            style={{
              left: '1%',
              bottom: '2%',
              gap: 'clamp(4px, 0.5vw, 10px)',
              color: '#5F6057',
              fontSize: 'clamp(6px, 0.72vw, 11px)',
            }}
          >
            <span
              className="bg-[#1F211C]"
              style={{ width: 'clamp(12px, 1.5vw, 24px)', height: '1px', flexShrink: 0 }}
              aria-hidden="true"
            />
            <div className="leading-snug font-sans">
              <p>Premium quality. Modern designs.</p>
              <p>Made for your everyday.</p>
            </div>
          </div>

        </div>
        {/* end collage canvas */}

      </div>
    </section>
  )
}

export default Hero
