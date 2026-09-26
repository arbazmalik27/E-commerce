import { Link } from 'react-router-dom'

const SHOP_LINKS = [
  { label: 'All Products', to: '/products' },
  { label: 'Fashion Collection', to: '/products?category=fashion' },
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
  { label: 'Shopping Cart', to: '/cart' },
  { label: 'Sign In', to: '/login' },
]

function Footer() {
  return (
    <footer
      id="site-footer"
      aria-labelledby="footer-heading"
      className="relative w-full bg-[#1F211C] text-[#F5F0E8] border-t border-[#34452F]/40"
    >
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12">
        {/* =========================================================================
            TOP SECTION: Brand Narrative + 4-Column Navigation
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-14">
          {/* Brand Presentation Column */}
          <div className="lg:col-span-4 flex flex-col justify-between max-w-sm">
            <div>
              <Link
                to="/"
                aria-label="TrendVolt Homepage"
                className="inline-block text-2xl sm:text-3xl font-black uppercase tracking-[0.2em] text-[#FFFDF8] hover:text-[#C47A5C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFDF8] rounded"
              >
                TrendVolt
              </Link>
              <p className="mt-4 text-sm text-[#A3A39A] font-normal leading-relaxed">
                Curated contemporary apparel and enduring wardrobe essentials for effortless everyday living.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <span className="text-xs font-mono font-semibold tracking-widest uppercase text-[#C47A5C]">
                Tailoring &bull; Permanence &bull; Character
              </span>
            </div>
          </div>

          {/* Navigation Columns */}
          <nav
            aria-label="Footer Navigation"
            className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8"
          >
            {/* Column 1: Shop */}
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#FFFDF8] mb-3">
                Shop
              </h3>
              <ul className="space-y-1">
                {SHOP_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="min-h-[40px] flex items-center text-sm text-[#A3A39A] hover:text-[#FFFDF8] transition-colors duration-200 focus-visible:outline-none"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Fashion */}
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#FFFDF8] mb-3">
                Fashion
              </h3>
              <ul className="space-y-1">
                {FASHION_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="min-h-[40px] flex items-center text-sm text-[#A3A39A] hover:text-[#FFFDF8] transition-colors duration-200 focus-visible:outline-none"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Kids */}
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#FFFDF8] mb-3">
                Kids
              </h3>
              <ul className="space-y-1">
                {KIDS_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="min-h-[40px] flex items-center text-sm text-[#A3A39A] hover:text-[#FFFDF8] transition-colors duration-200 focus-visible:outline-none"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Account */}
            <div>
              <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#FFFDF8] mb-3">
                Account
              </h3>
              <ul className="space-y-1">
                {ACCOUNT_LINKS.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="min-h-[40px] flex items-center text-sm text-[#A3A39A] hover:text-[#FFFDF8] transition-colors duration-200 focus-visible:outline-none"
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
            BOTTOM STRIP: Copyright + Policy Links
           ========================================================================= */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#85857A]">
          <p>&copy; {new Date().getFullYear()} TrendVolt Studio. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link to="/privacy" className="hover:text-[#FFFDF8] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#FFFDF8] transition-colors">
              Terms of Service
            </Link>
            <Link to="/shipping" className="hover:text-[#FFFDF8] transition-colors">
              Shipping &amp; Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
