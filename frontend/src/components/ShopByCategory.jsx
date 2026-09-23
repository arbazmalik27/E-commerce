import { Link } from 'react-router-dom'
import Eyebrow from './Eyebrow'

/**
 * SHOP BY CATEGORY — Premium Editorial Section
 *
 * Four fixed category cards: Men, Women, Kids, Combos
 * Grid:
 *   Mobile  (default): 2 columns × 2 rows
 *   Tablet  (sm/md):   2 columns × 2 rows
 *   Desktop (lg):      4 columns × 1 row
 *
 * Navigation:
 *   Men    → /products?category=fashion&department=men
 *   Women  → /products?category=fashion&department=women
 *   Kids   → /products?category=fashion&department=kids
 *   Combos → /products (presentation CTA only; no backend taxonomy yet)
 */

const CATEGORY_CARDS = [
  {
    id: 'men',
    label: 'MEN',
    tagline: 'Refined essentials for every occasion.',
    image: '/images/categories/men.jpg',
    imageAlt: 'Premium menswear editorial — tailored suits and refined essentials',
    to: '/products?category=fashion&department=men',
    isLive: true,
    eyebrow: 'COLLECTION',
  },
  {
    id: 'women',
    label: 'WOMEN',
    tagline: 'Contemporary silhouettes, timeless attitude.',
    image: '/images/categories/women.jpg',
    imageAlt: 'Premium womenswear editorial — contemporary silhouettes and elegant styling',
    to: '/products?category=fashion&department=women',
    isLive: true,
    eyebrow: 'COLLECTION',
  },
  {
    id: 'kids',
    label: 'KIDS',
    tagline: 'Everyday style, made for growing wardrobes.',
    image: '/images/categories/kids.jpg',
    imageAlt: 'Premium children\'s fashion — natural lifestyle photography for kids',
    to: '/products?category=fashion&department=kids',
    isLive: true,
    eyebrow: 'COLLECTION',
  },
  {
    id: 'combos',
    label: 'COMBOS',
    tagline: 'Curated looks, styled together.',
    image: '/images/categories/combos.jpg',
    imageAlt: 'Curated outfit combinations — premium fashion flat lay editorial',
    // Combos has no backend taxonomy yet — links to products for discovery
    to: '/products',
    isLive: false,
    eyebrow: 'COMING SOON',
  },
]

function ShopByCategory() {
  return (
    <section
      id="shop-by-category"
      aria-labelledby="category-heading"
      className="relative w-full bg-neutral-950 py-16 sm:py-20 lg:py-24 text-white border-t border-white/5 overflow-hidden"
    >
      {/* Subtle lilac atmospheric ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-purple-900/10 via-purple-950/5 to-transparent blur-3xl opacity-30 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            SECTION HEADER — Editorial, Fashion-Forward
           ========================================================================= */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12 sm:mb-16 lg:mb-20">
          <div className="mb-4">
            <Eyebrow>CURATED FOR YOU</Eyebrow>
          </div>
          <h2
            id="category-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight"
          >
            SHOP BY CATEGORY
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-lg">
            Explore the collections shaping the TrendVolt wardrobe.
          </p>
        </div>

        {/* =========================================================================
            4-CARD EDITORIAL GRID
            Mobile/Tablet: 2 cols × 2 rows
            Desktop (lg+): 4 cols × 1 row
           ========================================================================= */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
          role="list"
          aria-label="Shop by fashion category"
        >
          {CATEGORY_CARDS.map((card) => (
            <article
              key={card.id}
              role="listitem"
              className="group relative overflow-hidden rounded-2xl border border-white/8 bg-neutral-900 shadow-xl transition-all duration-400 hover:border-white/18 hover:-translate-y-0.5 hover:shadow-2xl focus-within:border-white/25"
            >
              {/* ---------------------------------------------------------------
                  FULL-BLEED IMAGE BACKGROUND with cinematic gradient overlay
                 --------------------------------------------------------------- */}
              {/* Aspect ratio container — portrait on mobile, landscape on desktop */}
              <div className="relative aspect-[3/4] sm:aspect-[3/4] lg:aspect-[3/4] xl:aspect-[4/5] overflow-hidden">
                <img
                  src={card.image}
                  alt={card.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-center select-none transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />

                {/* Cinematic gradient — deepens from bottom, preserves image depth */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/75 via-55% to-neutral-900/15 transition-opacity duration-400 group-hover:opacity-90"
                  aria-hidden="true"
                />

                {/* Subtle upper-right atmospheric accent */}
                <div
                  className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-purple-600/8 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                />

                {/* ---------------------------------------------------------------
                    CARD CONTENT — Bottom-left editorial composition
                   --------------------------------------------------------------- */}
                <div className="absolute inset-0 z-10 flex flex-col justify-end p-4 sm:p-5 lg:p-5">
                  {/* Eyebrow: COLLECTION or COMING SOON */}
                  <p className="mb-1.5 text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase text-white/55 transition-colors duration-300 group-hover:text-purple-300/75">
                    {card.eyebrow}
                  </p>

                  {/* Category Title */}
                  <h3 className="text-xl sm:text-2xl lg:text-xl xl:text-2xl font-black uppercase tracking-tight text-white leading-tight">
                    {card.label}
                  </h3>

                  {/* Supporting Copy */}
                  <p className="mt-1 text-[11px] sm:text-xs text-neutral-300/80 font-normal leading-relaxed line-clamp-2 transition-colors duration-300 group-hover:text-neutral-200/90">
                    {card.tagline}
                  </p>

                  {/* Explore CTA */}
                  <div className="mt-3 sm:mt-4">
                    <Link
                      to={card.to}
                      aria-label={
                        card.isLive
                          ? `Explore ${card.label} collection`
                          : `${card.label} — coming soon, browse all products`
                      }
                      className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold tracking-[0.15em] uppercase text-white/80 border-b border-white/25 pb-0.5 transition-all duration-300 group-hover:text-white group-hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 rounded-sm"
                    >
                      <span>EXPLORE</span>
                      <svg
                        className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5"
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
              </div>
            </article>
          ))}
        </div>

        {/* =========================================================================
            BOTTOM EDITORIAL NOTE — Fashion-only positioning
           ========================================================================= */}
        <p className="mt-10 sm:mt-12 text-center text-xs text-neutral-600 font-normal tracking-wider uppercase">
          Fashion • Apparel • Style
        </p>
      </div>
    </section>
  )
}

export default ShopByCategory
