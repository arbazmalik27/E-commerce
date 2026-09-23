import Eyebrow from './Eyebrow'

const BENEFITS = [
  {
    number: '01',
    title: 'Curated Collections',
    description:
      'Thoughtfully selected fashion and technology for modern everyday living.',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Secure Checkout',
    description:
      'A simple and protected checkout experience from cart to order.',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Quality First',
    description:
      'Products selected with attention to style, functionality, and everyday value.',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Effortless Shopping',
    description:
      'A clean, intuitive experience designed to make finding what you need easier.',
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
  },
]

function WhyTrendVolt() {
  return (
    <section
      id="why-trendvolt"
      aria-labelledby="why-trendvolt-heading"
      className="relative w-full bg-neutral-950 py-16 sm:py-20 lg:py-24 text-white border-t border-white/5 overflow-hidden"
    >
      {/* Subtle atmospheric glow (restrained ambient rim) */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[350px] bg-gradient-to-r from-purple-900/8 via-purple-950/5 to-transparent blur-3xl opacity-25 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            EDITORIAL SECTION HEADER (2-Column Desktop Balance)
           ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-12">
          <div>
            {/* Unified Eyebrow */}
            <div className="mb-4">
              <Eyebrow>The TrendVolt Standard</Eyebrow>
            </div>

            {/* Dominant Headline */}
            <h2
              id="why-trendvolt-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight"
            >
              Why TrendVolt
            </h2>
          </div>

          {/* Lighter, Refined Editorial Purpose Statement */}
          <div className="max-w-md lg:max-w-lg">
            <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed">
              Thoughtfully curated style and technology designed around your everyday. Quality pieces, clear details, and effortless shopping.
            </p>
          </div>
        </div>

        {/* Thin Refined Editorial Divider */}
        <div
          className="my-10 sm:my-12 lg:my-14 border-t border-white/10"
          aria-hidden="true"
        />

        {/* =========================================================================
            BENEFITS: Horizontal Editorial Layout with Thin Dividers
           ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-x-10 md:gap-y-12 lg:gap-0">
          {BENEFITS.map((item, index) => (
            <article
              key={item.number}
              className={`group flex flex-col justify-between border-b border-white/10 pb-8 last:border-b-0 last:pb-0 md:border-b-0 md:pb-0 lg:px-8 first:lg:pl-0 last:lg:pr-0 ${
                index < BENEFITS.length - 1
                  ? 'lg:border-r lg:border-white/10'
                  : ''
              }`}
            >
              <div>
                {/* Micro Icon & Numbered Label (Subtle, no colorful/neon styling) */}
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-neutral-300 transition-colors duration-300 group-hover:border-white/20 group-hover:text-white">
                    {item.icon}
                  </div>
                  <span className="text-xs font-mono font-medium tracking-[0.2em] text-neutral-500 group-hover:text-neutral-400 transition-colors duration-300">
                    {item.number}
                  </span>
                </div>

                {/* Benefit Title: Stronger typographic hierarchy */}
                <h3 className="text-base font-bold tracking-wide uppercase text-white mb-2 transition-colors duration-300 group-hover:text-neutral-200">
                  {item.title}
                </h3>

                {/* Benefit Description */}
                <p className="text-sm text-neutral-400 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WhyTrendVolt
