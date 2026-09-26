import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Heart, ShoppingBag, User, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react'
import {
  logout,
  selectIsAuthenticated,
  selectUser,
} from '../features/auth/authSlice'
import {
  fetchCart,
  selectCartInitialized,
  selectCartTotalItems,
} from '../features/cart/cartSlice'
import {
  fetchWishlist,
  selectWishlistInitialized,
  selectWishlistTotalItems,
} from '../features/wishlist/wishlistSlice'

function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [navSearchQuery, setNavSearchQuery] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  const cartTotalItems = useSelector(selectCartTotalItems)
  const cartInitialized = useSelector(selectCartInitialized)
  const wishlistTotalItems = useSelector(selectWishlistTotalItems)
  const wishlistInitialized = useSelector(selectWishlistInitialized)

  useEffect(() => {
    if (isAuthenticated && !cartInitialized) {
      dispatch(fetchCart())
    }
    if (isAuthenticated && !wishlistInitialized) {
      dispatch(fetchWishlist())
    }
  }, [dispatch, isAuthenticated, cartInitialized, wishlistInitialized])

  const handleLogout = async () => {
    await dispatch(logout())
    setMobileMenuOpen(false)
    navigate('/login')
  }

  const handleNavSearchSubmit = (e) => {
    e.preventDefault()
    const trimmed = navSearchQuery.trim()
    setDesktopSearchOpen(false)
    setMobileSearchOpen(false)
    if (trimmed) {
      navigate(`/products?search=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/products')
    }
  }

  const isHomeActive = location.pathname === '/'

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FFFDF8] border-b border-[#DED7CA] transition-colors">
      {/* Editorial Announcement Strip */}
      <div className="bg-[#34452F] text-[#FFFDF8] py-1.5 px-4 text-center text-[11px] font-mono tracking-[0.2em] uppercase">
        <span>Complimentary Express Shipping on Orders Over ₹2,999</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            DESKTOP & TABLET NAVBAR: Balanced Editorial 3-Zone Architecture
           ========================================================================= */}
        <div className="hidden md:flex items-center justify-between h-20">
          {/* Left: Editorial Serif Brand Wordmark */}
          <div className="flex items-center">
            <Link
              to="/"
              aria-label="TrendVolt Home"
              className="font-serif text-2xl lg:text-3xl font-bold tracking-[0.2em] uppercase text-[#1F211C] hover:text-[#34452F] transition-colors inline-block"
            >
              TrendVolt
            </Link>
          </div>

          {/* Center: Primary Editorial Navigation */}
          <nav aria-label="Main Navigation" className="flex items-center gap-8 text-sm font-medium text-[#5F6057]">
            <Link
              to="/"
              className={`relative py-1.5 transition-colors hover:text-[#1F211C] ${
                isHomeActive
                  ? 'text-[#1F211C] font-semibold'
                  : ''
              }`}
            >
              <span>Home</span>
              {isHomeActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1F211C]" aria-hidden="true" />
              )}
            </Link>
            <Link
              to="/products"
              className={`flex items-center gap-1 py-1.5 transition-colors hover:text-[#1F211C] ${
                location.pathname === '/products'
                  ? 'text-[#1F211C] font-semibold'
                  : ''
              }`}
            >
              <span>Shop</span>
              <span className="text-[10px] text-[#5F6057] leading-none" aria-hidden="true">▾</span>
            </Link>
            <Link
              to={isAuthenticated ? '/orders' : '/login'}
              className={`flex items-center gap-1 py-1.5 transition-colors hover:text-[#1F211C] ${
                location.pathname === '/orders'
                  ? 'text-[#1F211C] font-semibold'
                  : ''
              }`}
            >
              <span>Pages</span>
              <span className="text-[10px] text-[#5F6057] leading-none" aria-hidden="true">▾</span>
            </Link>
            <a
              href="#fashion-trends"
              className="py-1.5 transition-colors hover:text-[#1F211C]"
            >
              Blog
            </a>
            <a
              href="#footer"
              className="py-1.5 transition-colors hover:text-[#1F211C]"
            >
              Contact
            </a>
          </nav>

          {/* Right: Search, Wishlist, Cart, Account, Admin */}
          <div className="flex items-center gap-3">
            {/* Desktop Search Toggle / Form */}
            {desktopSearchOpen ? (
              <form
                onSubmit={handleNavSearchSubmit}
                role="search"
                className="flex items-center gap-1.5 animate-in fade-in duration-200"
              >
                <label htmlFor="nav-desktop-search" className="sr-only">
                  Search products
                </label>
                <input
                  id="nav-desktop-search"
                  type="search"
                  autoFocus
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder="Search catalog..."
                  className="w-36 lg:w-48 px-3 py-1.5 text-xs rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F]"
                />
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="h-8 w-8 flex items-center justify-center rounded-full text-[#FFFDF8] bg-[#34452F] hover:bg-[#263722] transition-colors cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopSearchOpen(false)}
                  aria-label="Close search"
                  className="text-[#85857A] hover:text-[#1F211C] px-1 text-sm cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                aria-label="Search products"
                onClick={() => setDesktopSearchOpen(true)}
                className="h-10 w-10 flex items-center justify-center rounded-full text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
              >
                <Search className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}

            {/* Wishlist Icon */}
            {isAuthenticated && (
              <Link
                to="/wishlist"
                aria-label={`Wishlist${wishlistTotalItems > 0 ? `, ${wishlistTotalItems} saved` : ''}`}
                className="h-10 w-10 flex items-center justify-center rounded-full text-[#5F6057] hover:text-[#A65332] hover:bg-[#FAF7F0] transition-colors relative"
              >
                <Heart className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
                {wishlistTotalItems > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#A65332] text-[10px] font-bold text-[#FFFDF8] leading-none shadow-xs">
                    {wishlistTotalItems > 99 ? '99+' : wishlistTotalItems}
                  </span>
                )}
              </Link>
            )}

            {/* Shopping Cart Button */}
            <Link
              to="/cart"
              aria-label={`Shopping Cart${cartTotalItems > 0 ? `, ${cartTotalItems} items` : ''}`}
              className="h-10 w-10 flex items-center justify-center rounded-full text-[#5F6057] hover:text-[#34452F] hover:bg-[#FAF7F0] transition-colors relative"
            >
              <ShoppingBag className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
              {cartTotalItems > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#34452F] text-[10px] font-bold text-[#FFFDF8] leading-none shadow-xs">
                  {cartTotalItems > 99 ? '99+' : cartTotalItems}
                </span>
              )}
            </Link>

            {/* Account / User Link */}
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              aria-label={isAuthenticated ? `Profile (${user?.name})` : 'Sign in to your account'}
              className="h-10 w-10 flex items-center justify-center rounded-full text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0] transition-colors"
            >
              <User className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
            </Link>

            {/* Admin Badge */}
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20 text-[11px] font-semibold hover:bg-[#34452F]/15 transition-colors"
              >
                <ShieldCheck className="h-3 w-3" />
                <span>Admin</span>
              </Link>
            )}

            {/* Logout Button */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1 rounded-full border border-[#DED7CA] text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0] text-xs transition-colors cursor-pointer"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            MOBILE NAVBAR: Clean [ ☰   TRENDVOLT   🔍  🛒 ] Ivory Bar + Slide Drawer
           ========================================================================= */}
        <div className="md:hidden flex items-center justify-between h-16">
          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen)
              if (mobileSearchOpen) setMobileSearchOpen(false)
            }}
            className="h-10 w-10 flex items-center justify-center text-[#1F211C] hover:text-[#34452F] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>

          {/* Centered Brand Logo */}
          <Link
            to="/"
            className="text-lg font-black tracking-[0.2em] uppercase text-[#1F211C]"
          >
            TrendVolt
          </Link>

          {/* Mobile Utility Actions: Search, Wishlist, Cart */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Search catalog"
              onClick={() => {
                setMobileSearchOpen(!mobileSearchOpen)
                if (mobileMenuOpen) setMobileMenuOpen(false)
              }}
              className={`h-9 w-9 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                mobileSearchOpen ? 'bg-[#34452F]/10 text-[#34452F]' : 'text-[#5F6057]'
              }`}
            >
              <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>

            {isAuthenticated && (
              <Link
                to="/wishlist"
                aria-label="Wishlist"
                className="h-9 w-9 flex items-center justify-center text-[#5F6057] relative"
              >
                <Heart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                {wishlistTotalItems > 0 && (
                  <span className="absolute top-1 right-1 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-[#A65332] text-[9px] font-bold text-white leading-none">
                    {wishlistTotalItems}
                  </span>
                )}
              </Link>
            )}

            <Link
              to="/cart"
              aria-label="Shopping Cart"
              className="h-9 w-9 flex items-center justify-center text-[#1F211C] relative"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {cartTotalItems > 0 && (
                <span className="absolute top-1 right-1 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-[#34452F] text-[9px] font-bold text-white leading-none">
                  {cartTotalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {mobileSearchOpen && (
          <form
            onSubmit={handleNavSearchSubmit}
            role="search"
            className="md:hidden pb-3 pt-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <input
              type="search"
              autoFocus
              value={navSearchQuery}
              onChange={(e) => setNavSearchQuery(e.target.value)}
              placeholder="Search by name, brand, or style..."
              className="flex-1 px-4 py-2 text-xs rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F]"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="h-8 w-8 flex items-center justify-center rounded-full bg-[#34452F] text-[#FFFDF8] cursor-pointer"
            >
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </form>
        )}

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#DED7CA] py-4 flex flex-col gap-1 text-sm text-[#1F211C] animate-in fade-in duration-200">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-lg transition-colors ${
                isHomeActive ? 'bg-[#34452F]/10 text-[#34452F] font-semibold' : 'hover:bg-[#FAF7F0]'
              }`}
            >
              Home
            </Link>
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#FAF7F0] transition-colors"
            >
              Shop Collection
            </Link>
            <Link
              to={isAuthenticated ? '/orders' : '/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#FAF7F0] transition-colors"
            >
              Orders &amp; Account
            </Link>
            <a
              href="#blog"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#FAF7F0] transition-colors"
            >
              Editorial Blog
            </a>

            <div className="h-px bg-[#DED7CA] my-2" />

            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#FAF7F0] transition-colors flex items-center justify-between"
            >
              <span>{isAuthenticated ? 'My Profile' : 'Sign In'}</span>
              {isAuthenticated && (
                <span className="text-xs text-[#85857A]">{user?.name}</span>
              )}
            </Link>

            {isAuthenticated && user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#34452F] font-semibold hover:bg-[#FAF7F0] transition-colors"
              >
                Admin Portal
              </Link>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-[#B7473A] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
