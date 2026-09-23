import { Link } from 'react-router-dom'

const SHOP_LINKS = [
  { label: 'All Products', to: '/products' },
  { label: 'Fashion', to: '/products?category=fashion' },
  { label: 'New Arrivals', to: '/products' },
]

const FASHION_LINKS = [
  { label: 'Men', to: '/products?category=fashion&department=men' },
  { label: 'Women', to: '/products?category=fashion&department=women' },
  { label: 'Footwear', to: '/products?category=fashion&department=footwear' },
  { label: 'Accessories', to: '/products?category=fashion&department=accessories' },
  { label: 'Beauty & Fragrance', to: '/products?category=fashion&department=beauty-fragrance' },
]

const KIDS_LINKS = [
  { label: 'Boys', to: '/products?category=fashion&department=kids&subcategory=boys' },
  { label: 'Girls', to: '/products?category=fashion&department=kids&subcategory=girls' },
  { label: 'Kids Clothing', to: '/products?category=fashion&department=kids&subcategory=kids-clothing' },
  { label: 'Kids Footwear', to: '/products?category=fashion&department=kids&subcategory=kids-footwear' },
  { label: 'Kids Accessories', to: '/products?category=fashion&department=kids&subcategory=kids-accessories' },
]

const ACCOUNT_LINKS = [
  { label: 'My Account', to: '/profile' },
  { label: 'Orders', to: '/orders' },
  { label: 'Cart', to: '/cart' },
  { label: 'Sign In', to: '/login' },
]

function Footer() {
  return (
    <footer
      id="site-footer"
      aria-labelledby="footer-heading"
      className="relative w-full bg-neutral-950 text-white border-t border-white/5"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-12">
        {/* =========================================================================
            TOP SECTION: Brand Narrative + 4-Column Navigation
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-14">
          {/* Brand Presentation Column (lg: 4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between max-w-sm">
            <div>
              <Link
                to="/"
                aria-label="TrendVolt Homepage"
                className="inline-block text-2xl sm:text-3xl font-black uppercase tracking-tight text-white hover:text-neutral-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
              >
                TrendVolt
              </Link>
              <p className="mt-4 text-sm text-neutral-400 font-normal leading-relaxed">
                Curated contemporary fashion and luxury wardrobe essentials for everyday living.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5">
              <span className="text-xs font-mono font-semibold tracking-widest uppercase text-neutral-300">
                Fashion • Elegance • Everyday
              </span>
            </div>
          </div>

          {/* Navigation Columns (lg: 8 cols -> 4 evenly spaced columns) */}
          <nav
            aria-label="Footer Navigation"
            className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8"
          >
            {/* Column 1: Shop */}
            <div>
              <h3 className="text-xs font-bold tracking-[0.18em] uppercase text-white mb-2 sm:mb-3">
                Shop
              </h3>
              <ul className="space-y-0.5">
                {SHOP_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="min-h-[44px] flex items-center text-sm text-neutral-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Fashion */}
            <div>
              <h3 className="text-xs font-bold tracking-[0.18em] uppercase text-white mb-2 sm:mb-3">
                Fashion
              </h3>
              <ul className="space-y-0.5">
                {FASHION_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="min-h-[44px] flex items-center text-sm text-neutral-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Kids Collection */}
            <div>
              <h3 className="text-xs font-bold tracking-[0.18em] uppercase text-white mb-2 sm:mb-3">
                Kids Collection
              </h3>
              <ul className="space-y-0.5">
                {KIDS_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="min-h-[44px] flex items-center text-sm text-neutral-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Account / Help */}
            <div>
              <h3 className="text-xs font-bold tracking-[0.18em] uppercase text-white mb-2 sm:mb-3">
                Account
              </h3>
              <ul className="space-y-0.5">
                {ACCOUNT_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="min-h-[44px] flex items-center text-sm text-neutral-400 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        {/* =========================================================================
            BOTTOM BAR: Copyright & Minimal Brand Note
           ========================================================================= */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p>© 2026 TrendVolt. All rights reserved.</p>
          <p className="text-neutral-400">
            Designed for modern living.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
