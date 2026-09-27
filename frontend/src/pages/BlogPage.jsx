import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock, Calendar, X, Sparkles, Filter, Search, Share2, Check } from 'lucide-react'
import Eyebrow from '../components/Eyebrow'
import NewsletterCTA from '../components/NewsletterCTA'

import trend01 from '../assets/fashion-trends/trend-01.jpg'
import trend02 from '../assets/fashion-trends/trend-02.jpg'
import trend03 from '../assets/fashion-trends/trend-03.jpg'
import trend04 from '../assets/fashion-trends/trend-04.jpg'
import trend05 from '../assets/fashion-trends/trend-05.jpg'
import trend06 from '../assets/fashion-trends/trend-06.jpg'
import trend07 from '../assets/fashion-trends/trend-07.jpg'

const CATEGORIES = [
  'All Topics',
  'Seasonal Style',
  "Men's Style",
  "Women's Style",
  'Footwear',
  'Accessories',
  'Wardrobe Essentials',
  'Fashion Trends',
]

const FEATURED_STORY = {
  id: 'featured-01',
  category: 'Fashion Trends',
  topic: 'Fashion Trends',
  title: 'The Architecture of Modern Tailoring: Beyond Fleeting Cycles',
  subtitle: 'Monochrome Suiting & The Precision of Subtle Drapery',
  excerpt:
    'A considered exploration of relaxed shoulder construction, textural wools, and why balanced proportions consistently outlast short-lived seasonal novelties.',
  fullText: [
    'Contemporary tailoring is undergoing a profound cultural recalibration. Where earlier eras demanded rigid canvassing and unyielding shoulder pads, the modern silhouette prizes natural movement, breathable textile weaves, and intentional ease.',
    'By pairing unstructured jackets with softly pleated trousers, the ensemble moves seamlessly between formal ateliers and relaxed city living. The key lies in selecting honest, natural fibers—dense worsted wool, unbleached cotton twill, and virgin linen—that drape organically around the wearer.',
    'Investing in proportion rather than ornamentation guarantees longevity. A precisely cut lapel, a whisper of cuff contrast, and unlined inner seams speak to quiet sophistication that never demands attention yet always commands respect.',
  ],
  pullQuote: '“True style is not the relentless pursuit of novelty, but the discipline of knowing what endures.”',
  author: 'Editorial Desk',
  readTime: '5 min read',
  date: 'Autumn / Winter 2026',
  image: trend03,
  objectPosition: 'center 16%',
  alt: 'Tailored monochrome suit editorial with sculptural proportions',
}

const STORIES = [
  {
    id: 'story-01',
    category: 'Seasonal Style',
    title: 'Minimal Outerwear: The Architectural Heavy Wool Drape',
    excerpt:
      'Neutral silhouettes, dropped armholes, and unlined virgin wool create effortless movement across unpredictable transitional weather.',
    fullText: [
      'Outerwear serves as the outer boundary of personal expression. In transitional months, heavy wool coats cut with architectural restraint provide both thermal comfort and sculptural presence.',
      'We advocate for muted basalt, stone grey, and deep charcoal shades that harmonize with crisp white shirting or ribbed cashmere crewnecks underneath.',
    ],
    pullQuote: '“An exceptional coat transforms even the simplest base layers into an unmistakable sartorial statement.”',
    date: 'Sep 24, 2026',
    readTime: '4 min read',
    image: trend01,
    objectPosition: 'center 15%',
    alt: 'Minimalist grey tailored outerwear',
  },
  {
    id: 'story-02',
    category: "Men's Style",
    title: 'Studio Tailoring: Earth Tones in Natural Light',
    excerpt:
      'Warm umber, tobacco brown, and breathable woven linen: redefining everyday formal ease for the discerning gentleman.',
    fullText: [
      'The modern men’s wardrobe flourishes when steeped in earth pigments. Natural light brings out the subtle micro-textures of hopsack weaves and garment-dyed twills.',
      'Layering earth-toned jackets with light ecru trousers produces a warm, welcoming presence suitable for creative studios and boardroom presentations alike.',
    ],
    pullQuote: '“Natural dyes and open weaves breathe character into tailored separates.”',
    date: 'Sep 21, 2026',
    readTime: '3 min read',
    image: trend02,
    objectPosition: 'center 18%',
    alt: 'Studio tailored blazer in warm light',
  },
  {
    id: 'story-03',
    category: "Women's Style",
    title: 'Sculptural Silhouettes for Everyday Wear',
    excerpt:
      'Balancing asymmetric cuts with functional, relaxed fabrics for a wardrobe that speaks softly yet carries indelible grace.',
    fullText: [
      'Fluidity does not mean an absence of form. Sculptural womenswear thrives on tension—where an oversized sleeve meets a tapered waistline.',
      'Our editors highlight how thoughtfully placed pleats and organic cotton poplins flatter natural postures while maintaining absolute comfort throughout the day.',
    ],
    pullQuote: '“Form follows movement. Garments must celebrate how the body navigates space.”',
    date: 'Sep 18, 2026',
    readTime: '4 min read',
    image: trend04,
    objectPosition: 'center 18%',
    alt: 'Sculptural contemporary womenswear silhouette',
  },
  {
    id: 'story-04',
    category: 'Accessories',
    title: 'The Art of Restraint: Understated Accent Pieces',
    excerpt:
      'Why a single brushed brass clasp or vegetable-tanned leather strap completes an entire ensemble without shouting.',
    fullText: [
      'Accessories frequently suffer from overdesign. In contrast, the philosophy of restraint prizes patinated metals, hand-burnished edges, and minimal logos.',
      'A timeless leather tote or a subtle mechanical timepiece acts as an anchor, grounding loose linen trousers or oversized tailoring with quiet authority.',
    ],
    pullQuote: '“The strongest details are those discovered upon closer inspection.”',
    date: 'Sep 15, 2026',
    readTime: '3 min read',
    image: trend05,
    objectPosition: 'center 16%',
    alt: 'Minimalist leather and metal accessories in natural tone',
  },
  {
    id: 'story-05',
    category: 'Footwear',
    title: 'From Cobbler Bench to City Pavements: Enduring Soles',
    excerpt:
      'The anatomy of Goodyear-welted soles, supple vegetable calfskin, and footwear engineered for decade-long wear.',
    fullText: [
      'Footwear represents the physical connection between apparel and the earth. Quality cobbling emphasizes resolable welt construction and full-grain leather uppers that mould to the foot.',
      'Investing in properly welted loafers and derby shoes repays itself manifold in comfort, poise, and sustainable longevity over disposable footwear.',
    ],
    pullQuote: '“Shoes that can be resoled age like fine bindings, carrying history in every crease.”',
    date: 'Sep 12, 2026',
    readTime: '5 min read',
    image: trend06,
    objectPosition: 'center 20%',
    alt: 'Handcrafted leather shoes and artisanal footwear details',
  },
  {
    id: 'story-06',
    category: 'Wardrobe Essentials',
    title: 'The 10-Piece Foundation: Permanence in Design',
    excerpt:
      'A practical blueprint for assembling a coherent wardrobe where every garment harmonizes effortlessly with the next.',
    fullText: [
      'Wardrobe fatigue stems from disjointed purchases that fail to communicate with one another. A cohesive capsule rests on ten complementary keystones.',
      'From the immaculate white poplin shirt to the unhemmed raw selvedge denim and the unstructured wool blazer, harmony is achieved through palette unity.',
    ],
    pullQuote: '“A ten-piece wardrobe curated with precision offers infinitely more versatility than a closet overflowing with impulse buys.”',
    date: 'Sep 08, 2026',
    readTime: '4 min read',
    image: trend07,
    objectPosition: 'center 18%',
    alt: 'Wardrobe essentials arranged with editorial precision',
  },
]

function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Topics')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeStory, setActiveStory] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Body scroll lock & Escape key to close reader modal
  useEffect(() => {
    if (!activeStory) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveStory(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeStory])

  const handleShareStory = (story) => {
    const url = `${window.location.origin}/blog#${story.id}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const filteredStories = STORIES.filter((story) => {
    const matchesCategory =
      selectedCategory === 'All Topics' || story.category === selectedCategory
    const q = searchQuery.trim().toLowerCase()
    const matchesQuery =
      !q ||
      story.title.toLowerCase().includes(q) ||
      story.excerpt.toLowerCase().includes(q) ||
      story.category.toLowerCase().includes(q)
    return matchesCategory && matchesQuery
  })

  return (
    <div className="bg-[#F5F0E8] text-[#1F211C] min-h-screen">
      {/* =========================================================================
          1. EDITORIAL HERO
         ========================================================================= */}
      <section className="border-b border-[#DED7CA] pt-12 sm:pt-16 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <Eyebrow variant="terracotta" className="mb-4">
            The TrendVolt Edit &bull; Vol. IV
          </Eyebrow>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-[#1F211C] uppercase">
            The TrendVolt Edit
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[#52524E] max-w-2xl mx-auto font-medium leading-relaxed">
            Essays on enduring silhouettes, seasonal transitions, modern tailoring,
            and wardrobe permanence. Curated by the TrendVolt Atelier.
          </p>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-mono font-semibold tracking-widest uppercase text-[#85857A]">
            <span>Fashion</span>
            <span>&bull;</span>
            <span>Style</span>
            <span>&bull;</span>
            <span>Seasonal Edits</span>
            <span>&bull;</span>
            <span>Inspiration</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. FEATURED STORY (Magazine Spread / Cover Treatment)
         ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#DED7CA]">
          <span className="text-xs font-mono font-bold tracking-[0.25em] uppercase text-[#34452F]">
            Featured Editorial
          </span>
          <span className="text-xs font-mono text-[#85857A]">
            Issue No. 04 / Autumn
          </span>
        </div>

        <article className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow items-stretch">
          {/* Cover Image */}
          <div className="lg:col-span-5 relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-auto lg:h-full min-h-[360px] sm:min-h-[460px] lg:min-h-[520px] overflow-hidden bg-[#E2DBD0]">
            <img
              src={FEATURED_STORY.image}
              alt={FEATURED_STORY.alt}
              style={{ objectPosition: FEATURED_STORY.objectPosition }}
              className="w-full h-full object-cover transform hover:scale-102 transition-transform duration-700 ease-out"
              loading="eager"
            />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-[#34452F] text-[#FFFDF8] text-[11px] font-mono font-bold tracking-widest uppercase rounded">
                Cover Story
              </span>
            </div>
          </div>

          {/* Editorial Content */}
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-12 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 text-xs text-[#A65332] font-mono font-bold tracking-wider uppercase mb-3">
                <span>{FEATURED_STORY.category}</span>
                <span>&bull;</span>
                <span className="text-[#85857A] flex items-center gap-1 font-normal">
                  <Clock className="w-3.5 h-3.5" />
                  {FEATURED_STORY.readTime}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-[#1F211C] leading-snug tracking-tight">
                {FEATURED_STORY.title}
              </h2>

              <p className="mt-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#85857A]">
                {FEATURED_STORY.subtitle}
              </p>

              <p className="mt-5 text-sm sm:text-base text-[#52524E] leading-relaxed font-normal">
                {FEATURED_STORY.excerpt}
              </p>

              {/* Editorial Quote Box */}
              <div className="mt-6 p-4 rounded-xl bg-[#FAF7F0] border-l-2 border-[#A65332]">
                <p className="font-serif italic text-xs sm:text-sm text-[#34452F] leading-relaxed">
                  {FEATURED_STORY.pullQuote}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#EAE4D9] flex items-center justify-between">
              <div className="text-xs text-[#85857A]">
                <p className="font-semibold text-[#1F211C]">{FEATURED_STORY.author}</p>
                <p>{FEATURED_STORY.date}</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveStory(FEATURED_STORY)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#34452F] text-[#FFFDF8] hover:bg-[#263722] text-xs font-bold tracking-wider uppercase transition-all shadow-xs hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] cursor-pointer"
              >
                <span>Read Story</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </article>
      </section>

      {/* =========================================================================
          3. TOPIC FILTERS & SEARCH
         ========================================================================= */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#DED7CA]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-[0.2em] uppercase text-[#52524E]">
            <Filter className="w-4 h-4 text-[#A65332]" />
            <span>Curate by Topic</span>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#85857A] pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories & styles..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-full bg-[#FFFDF8] border border-[#DED7CA] text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#85857A] hover:text-[#1F211C] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span
            aria-live="polite"
            className="text-xs text-[#85857A] font-mono shrink-0"
          >
            Showing {filteredStories.length} {filteredStories.length === 1 ? 'story' : 'stories'}
          </span>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs font-semibold'
                    : 'bg-[#FFFDF8] text-[#52524E] border border-[#DED7CA] hover:border-[#34452F] hover:text-[#1F211C]'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </section>

      {/* =========================================================================
          4. LATEST STORIES (Responsive Editorial Grid)
         ========================================================================= */}
      <section className="py-10 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {filteredStories.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl shadow-xs">
            <Sparkles className="w-8 h-8 text-[#A65332] mx-auto mb-3" />
            <h3 className="text-xl font-serif font-bold text-[#1F211C]">
              No Editorial Stories Found
            </h3>
            <p className="mt-2 text-sm text-[#52524E] max-w-md mx-auto">
              No articles matched your active search query or topic filter. Explore our other editorial collections.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All Topics')
                setSearchQuery('')
              }}
              className="mt-6 px-6 py-2.5 rounded-full bg-[#34452F] text-[#FFFDF8] hover:bg-[#263722] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStories.map((story) => (
              <article
                key={story.id}
                className="group flex flex-col bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300"
              >
                {/* Card Image */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#E2DBD0]">
                  <img
                    src={story.image}
                    alt={story.alt}
                    style={{ objectPosition: story.objectPosition || 'center 18%' }}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#FFFDF8]/95 backdrop-blur-xs text-[#34452F] text-[10px] font-mono font-bold tracking-wider uppercase rounded shadow-xs">
                    {story.category}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#85857A] mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {story.date}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {story.readTime}
                      </span>
                    </div>

                    <h3 className="text-xl font-serif font-bold text-[#1F211C] group-hover:text-[#34452F] transition-colors leading-snug">
                      {story.title}
                    </h3>

                    <p className="mt-3 text-sm text-[#52524E] leading-relaxed line-clamp-3">
                      {story.excerpt}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#EAE4D9] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveStory(story)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A65332] hover:text-[#7D3D24] transition-colors cursor-pointer group-hover:translate-x-0.5 duration-200"
                    >
                      <span>Read Story</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-[11px] font-mono text-[#85857A]">
                      Issue 04
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          5. STORY READER MODAL (Accessible Editorial Overlay)
         ========================================================================= */}
      {activeStory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reader-story-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200"
          onClick={() => setActiveStory(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Strip with Close & Share Buttons */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#FFFDF8] border-b border-[#DED7CA]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest uppercase text-[#34452F]">
                  <BookOpen className="w-4 h-4 text-[#A65332]" />
                  <span>{activeStory.category}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleShareStory(activeStory)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#DED7CA] hover:border-[#34452F] text-[11px] font-mono text-[#52524E] hover:text-[#1F211C] transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-700" />
                      <span className="text-emerald-700 font-bold">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveStory(null)}
                aria-label="Close story reader"
                className="h-8 w-8 flex items-center justify-center rounded-full text-[#52524E] hover:text-[#1F211C] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Story Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              <div className="relative w-full rounded-xl overflow-hidden bg-[#FAF7F0] border border-[#DED7CA] flex items-center justify-center p-3">
                <img
                  src={activeStory.image}
                  alt={activeStory.alt}
                  className="max-h-[500px] w-auto h-auto object-contain rounded-lg shadow-xs"
                />
              </div>

              <div>
                <span className="text-xs text-[#85857A] font-mono">
                  {activeStory.date} &bull; {activeStory.readTime}
                </span>
                <h2
                  id="reader-story-title"
                  className="mt-2 text-2xl sm:text-3xl font-serif font-black text-[#1F211C] leading-snug"
                >
                  {activeStory.title}
                </h2>
              </div>

              {activeStory.pullQuote && (
                <div className="p-4 rounded-xl bg-[#FAF7F0] border-l-2 border-[#A65332]">
                  <p className="font-serif italic text-sm text-[#34452F]">
                    {activeStory.pullQuote}
                  </p>
                </div>
              )}

              <div className="space-y-4 text-sm sm:text-base text-[#52524E] leading-relaxed">
                {activeStory.fullText ? (
                  activeStory.fullText.map((p, idx) => <p key={idx}>{p}</p>)
                ) : (
                  <p>{activeStory.excerpt}</p>
                )}
              </div>

              {/* Atelier Wardrobe Link */}
              <div className="pt-6 border-t border-[#EAE4D9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs text-[#85857A]">
                  Explore matching silhouettes in our boutique catalog.
                </span>
                <Link
                  to="/products?category=fashion"
                  onClick={() => setActiveStory(null)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#34452F] text-[#FFFDF8] hover:bg-[#263722] text-xs font-bold tracking-wider uppercase transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C47A5C]" />
                  <span>Shop Collection</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. NEWSLETTER CTA
         ========================================================================= */}
      <NewsletterCTA />
    </div>
  )
}

export default BlogPage
