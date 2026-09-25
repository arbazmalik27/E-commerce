import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
    <header
      className={`sticky top-0 z-50 w-full pt-4 pb-2 px-4 sm:px-6 lg:px-8 pointer-events-none transition-all duration-300 ${
        isHomeActive ? '-mb-28 sm:-mb-32' : 'bg-neutral-950 pb-4'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        {/* =========================================================================
            DESKTOP & TABLET NAVBAR: Centered Brand Logo + Floating Capsule Pill
           ========================================================================= */}
        <div className="hidden md:flex flex-col items-center gap-2.5 w-full">
          {/* Brand Logo Centered Above the Capsule */}
          <div className="pointer-events-auto">
            <Link
              to="/"
              className="text-2xl lg:text-3xl font-black tracking-[0.2em] uppercase text-white hover:opacity-90 transition-opacity drop-shadow-sm inline-block"
            >
              TrendVolt
            </Link>
          </div>

          {/* Centered Floating Capsule */}
          <nav
            aria-label="Main Navigation"
            className="pointer-events-auto inline-flex items-center gap-6 lg:gap-8 px-7 py-3 rounded-full bg-neutral-950/75 border border-white/12 backdrop-blur-xl shadow-2xl text-sm font-medium text-neutral-300 transition-all"
          >
            {/* Primary Navigation Links */}
            <div className="flex items-center gap-1.5">
              <Link
                to="/"
                className={`px-4 py-1.5 rounded-full transition-all duration-200 ${
                  isHomeActive
                    ? 'bg-white/12 text-white font-semibold border border-white/10 shadow-xs'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                Home
              </Link>
              <Link
                to="/products"
                className="px-4 py-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Shop
              </Link>
              <Link
                to={isAuthenticated ? '/orders' : '/login'}
                className="px-4 py-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Pages
              </Link>
              <a
                href="#blog"
                className="px-4 py-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Blog
              </a>
            </div>

            {/* Subtle Vertical Divider */}
            <span className="h-4 w-px bg-white/15" aria-hidden="true" />

            {/* Utility Actions: Search, Cart, Account */}
            <div className="flex items-center gap-2">
              {/* Search: Expandable Input or Icon Button */}
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
                    className="w-32 lg:w-44 px-3 py-1 text-xs rounded-full bg-neutral-900 border border-white/20 text-white placeholder-neutral-400 focus:outline-hidden focus:border-purple-400"
                  />
                  <button
                    type="submit"
                    aria-label="Submit search"
                    className="min-w-[30px] min-h-[30px] flex items-center justify-center rounded-full text-white bg-purple-600 hover:bg-purple-500 transition-colors cursor-pointer"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesktopSearchOpen(false)}
                    aria-label="Close search input"
                    className="text-neutral-400 hover:text-white px-1 text-sm cursor-pointer"
                  >
                    ×
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  aria-label="Search products"
                  onClick={() => setDesktopSearchOpen(true)}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
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
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </button>
              )}

              {/* Wishlist Icon Link */}
              {isAuthenticated && (
                <Link
                  to="/wishlist"
                  aria-label={`Wishlist${wishlistTotalItems > 0 ? `, ${wishlistTotalItems} saved` : ''}`}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-neutral-300 hover:text-rose-400 hover:bg-white/10 transition-colors relative"
                >
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
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                    />
                  </svg>
                  {wishlistTotalItems > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white leading-none shadow-sm">
                      {wishlistTotalItems > 99 ? '99+' : wishlistTotalItems}
                    </span>
                  )}
                </Link>
              )}

              {/* Shopping Cart Button */}
              <Link
                to="/cart"
                aria-label={`Shopping Cart${cartTotalItems > 0 ? `, ${cartTotalItems} items` : ''}`}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors relative"
              >
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
                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                {cartTotalItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white leading-none shadow-sm">
                    {cartTotalItems > 99 ? '99+' : cartTotalItems}
                  </span>
                )}
              </Link>

              {/* Account Link / User Status */}
              <Link
                to={isAuthenticated ? '/profile' : '/login'}
                aria-label={isAuthenticated ? `Profile (${user?.name})` : 'Sign in to your account'}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
              >
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
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
              </Link>

              {/* Admin Badge if Authenticated Admin */}
              {isAuthenticated && user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="ml-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold hover:bg-purple-500/30 transition-colors"
                >
                  Admin
                </Link>
              )}

              {/* Logout Button if Authenticated */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-1 px-3 py-1 rounded-full bg-white/10 text-neutral-300 hover:text-white hover:bg-white/20 text-xs transition-colors cursor-pointer"
                >
                  Logout
                </button>
              )}
            </div>
          </nav>
        </div>

        {/* =========================================================================
            MOBILE NAVBAR: Clean [ ☰   TRENDVOLT   🔍  🛒 ] Pill + Expandable Drawer
           ========================================================================= */}
        <div className="md:hidden pointer-events-auto w-full max-w-sm mx-auto">
          <div className="flex items-center justify-between px-4 py-2 rounded-full bg-neutral-950/85 border border-white/12 backdrop-blur-xl shadow-2xl">
            {/* Hamburger Menu Toggle */}
            <button
              type="button"
              aria-label="Toggle navigation menu"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen)
                if (mobileSearchOpen) setMobileSearchOpen(false)
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>

            {/* Centered Brand Logo */}
            <Link
              to="/"
              className="text-lg font-black tracking-[0.18em] uppercase text-white hover:opacity-90 transition-opacity"
            >
              TrendVolt
            </Link>

            {/* Mobile Utility Actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                type="button"
                aria-label="Search products"
                onClick={() => {
                  setMobileSearchOpen(!mobileSearchOpen)
                  if (mobileMenuOpen) setMobileMenuOpen(false)
                }}
                className={`min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors cursor-pointer rounded-full ${
                  mobileSearchOpen ? 'text-purple-400 bg-white/10' : 'text-neutral-300 hover:text-white'
                }`}
              >
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
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>

              {/* Wishlist (mobile) */}
              {isAuthenticated && (
                <Link
                  to="/wishlist"
                  aria-label={`Wishlist${wishlistTotalItems > 0 ? `, ${wishlistTotalItems} saved` : ''}`}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-300 hover:text-rose-400 transition-colors relative"
                >
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
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                    />
                  </svg>
                  {wishlistTotalItems > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white leading-none shadow-sm">
                      {wishlistTotalItems > 99 ? '99+' : wishlistTotalItems}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart */}
              <Link
                to="/cart"
                aria-label={`Shopping Cart${cartTotalItems > 0 ? `, ${cartTotalItems} items` : ''}`}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-300 hover:text-white transition-colors relative"
              >
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
                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                {cartTotalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white leading-none shadow-sm">
                    {cartTotalItems > 99 ? '99+' : cartTotalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar Dropdown */}
          {mobileSearchOpen && (
            <form
              onSubmit={handleNavSearchSubmit}
              role="search"
              className="pointer-events-auto mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-950/90 border border-white/15 backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <label htmlFor="nav-mobile-search" className="sr-only">
                Search products
              </label>
              <input
                id="nav-mobile-search"
                type="search"
                autoFocus
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder="Search by name or brand..."
                className="flex-1 px-2 py-1 text-xs bg-transparent text-white placeholder-neutral-400 focus:outline-hidden"
              />
              <button
                type="submit"
                aria-label="Submit search"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-500 text-white cursor-pointer transition-colors"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close search"
                className="text-neutral-400 hover:text-white px-1.5 text-base cursor-pointer"
              >
                ×
              </button>
            </form>
          )}

          {/* Mobile Drawer Navigation Menu */}
          {mobileMenuOpen && (
            <div className="pointer-events-auto md:hidden w-full mt-2 rounded-2xl bg-neutral-950/95 border border-white/12 backdrop-blur-2xl p-4 shadow-2xl flex flex-col gap-1.5 text-sm text-neutral-200">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-xl transition-colors ${
                  isHomeActive
                    ? 'bg-white/12 text-white font-semibold'
                    : 'hover:bg-white/5'
                }`}
              >
                Home
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
              >
                Shop
              </Link>
              <Link
                to={isAuthenticated ? '/orders' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
              >
                Pages
              </Link>
              <a
                href="#blog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
              >
                Blog
              </a>

              <div className="h-px bg-white/10 my-1" />

              <Link
                to={isAuthenticated ? '/profile' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-between"
              >
                <span>Account</span>
                <span className="text-xs text-neutral-400 capitalize">
                  {isAuthenticated ? user?.name : 'Sign In'}
                </span>
              </Link>

              {isAuthenticated && user?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-purple-300 hover:bg-white/5 transition-colors"
                >
                  Admin Portal
                </Link>
              )}

              {isAuthenticated && (
                <Link
                  to="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-between"
                >
                  <span>Wishlist</span>
                  {wishlistTotalItems > 0 && (
                    <span className="text-xs font-semibold text-rose-400">{wishlistTotalItems}</span>
                  )}
                </Link>
              )}

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
