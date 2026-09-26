import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Eyebrow from './Eyebrow'

/**
 * SHOP BY CATEGORY — Warm Earthy Editorial Section
 *
 * Preserves the approved TrendVolt taxonomy:
 * MEN, WOMEN, KIDS, COMBOS
 */

const CATEGORY_CARDS = [
  {
    id: 'men',
    label: 'MEN',
    tagline: 'Tailored silhouettes and refined daily essentials.',
    image: '/images/categories/men.jpg',
    imageAlt: 'Menswear editorial collection',
    to: '/products?category=fashion&department=men',
    aspect: 'aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4]',
  },
  {
    id: 'women',
    label: 'WOMEN',
    tagline: 'Contemporary draping and timeless elegance.',
    image: '/images/categories/women.jpg',
    imageAlt: 'Womenswear editorial collection',
    to: '/products?category=fashion&department=women',
    aspect: 'aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4]',
  },
  {
    id: 'kids',
    label: 'KIDS',
    tagline: 'Comfort-first staples for young explorers.',
    image: '/images/categories/kids.jpg',
    imageAlt: 'Kids fashion collection',
    to: '/products?category=fashion&department=kids',
    aspect: 'aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4]',
  },
  {
    id: 'combos',
    label: 'COMBOS',
    tagline: 'Coordinated style pairings curated by our studio.',
    image: '/images/categories/combos.jpg',
    imageAlt: 'Curated combo ensembles',
    to: '/products',
    aspect: 'aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4]',
  },
]

function ShopByCategory() {
  return (
    <section
      id="shop-by-category"
      aria-labelledby="category-heading"
      className="relative w-full bg-[#EEE7DC] py-16 sm:py-20 lg:py-24 text-[#1F211C] border-b border-[#DED7CA] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            SECTION HEADER: Warm Earthy Editorial Heading
           ========================================================================= */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="mb-4">
            <Eyebrow variant="olive">CURATED WARDROBE</Eyebrow>
          </div>
          <h2
            id="category-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#1F211C] leading-tight"
          >
            Explore Categories
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#5F6057] font-normal leading-relaxed max-w-lg">
            Discover intentional design across every department of the TrendVolt collection.
          </p>
        </div>

        {/* =========================================================================
            4-CARD EDITORIAL GRID
           ========================================================================= */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
          role="list"
          aria-label="Shop by fashion category"
        >
          {CATEGORY_CARDS.map((card) => (
            <article
              key={card.id}
              role="listitem"
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-3 shadow-xs transition-all duration-300 hover:border-[#34452F] hover:shadow-md"
            >
              <Link
                to={card.to}
                className="relative w-full overflow-hidden rounded-xl bg-[#FAF7F0] block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <div className={`${card.aspect} w-full overflow-hidden`}>
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-center select-none transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>

                {/* Subtle Gradient Veil for contrast */}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1F211C]/60 via-transparent to-transparent opacity-40 group-hover:opacity-60 transition-opacity duration-300"
                  aria-hidden="true"
                />

                {/* Category Badge on Image */}
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="px-3 py-1 rounded-full bg-[#FFFDF8]/90 backdrop-blur-xs border border-[#DED7CA] text-xs font-mono font-bold tracking-widest text-[#1F211C] uppercase">
                    {card.label}
                  </span>
                </div>
              </Link>

              {/* Editorial Card Footnote */}
              <div className="pt-4 pb-2 px-1 flex flex-col justify-between flex-1">
                <p className="text-xs text-[#5F6057] leading-relaxed line-clamp-2">
                  {card.tagline}
                </p>

                <div className="mt-4 pt-3 border-t border-[#DED7CA] flex items-center justify-between">
                  <Link
                    to={card.to}
                    className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#34452F] uppercase transition-colors group-hover:text-[#A65332]"
                  >
                    <span>Shop Now</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ShopByCategory
