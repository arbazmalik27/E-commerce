import { Link } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, MapPin, Heart, Settings } from 'lucide-react'
import Eyebrow from '../Eyebrow'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, badgeKey: 'ordersCount' },
  { id: 'addresses', label: 'Addresses', icon: MapPin, badgeKey: 'addressesCount' },
  { id: 'wishlist', label: 'Wishlist', icon: Heart, badgeKey: 'wishlistCount' },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function AccountShell({
  activeTab,
  onTabChange,
  counts = {},
  children,
}) {
  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-32 sm:pt-36 lg:pt-40 pb-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
        <nav
          aria-label="Breadcrumbs"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#5F6057]"
        >
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#1F211C] transition-colors">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#DED7CA]">/</span>
            <span className="text-[#1F211C] font-semibold">Account Center</span>
            {activeTab !== 'overview' && (
              <>
                <span aria-hidden="true" className="text-[#DED7CA]">/</span>
                <span className="text-[#34452F] capitalize font-medium">{activeTab}</span>
              </>
            )}
          </div>

          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34452F] hover:text-[#263722] transition-colors"
          >
            <span>Continue Shopping</span>
            <span aria-hidden="true">→</span>
          </Link>
        </nav>

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <header className="mb-8">
          <Eyebrow variant="olive" className="mb-2">CUSTOMER ACCOUNT CENTER</Eyebrow>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1F211C] tracking-tight">
              My Account
            </h1>
            <p className="text-xs sm:text-sm text-[#5F6057] font-mono">
              TrendVolt Editorial Membership
            </p>
          </div>
        </header>

        {/* ── Tab Navigation Bar ─────────────────────────────────────────────── */}
        <div className="mb-8 border-b border-[#DED7CA]">
          <nav
            role="tablist"
            aria-label="Account sections"
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar -mb-px pb-1 sm:pb-0"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              const count = tab.badgeKey ? counts[tab.badgeKey] : null

              return (
                <button
                  key={tab.id}
                  id={`account-tab-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`account-panel-${tab.id}`}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`min-h-[44px] px-3.5 sm:px-5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] ${
                    isActive
                      ? 'border-[#34452F] text-[#34452F] bg-[#FFFDF8] shadow-xs'
                      : 'border-transparent text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0]/60'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                  <span>{tab.label}</span>
                  {typeof count === 'number' && count > 0 && (
                    <span
                      className={`ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
                        isActive
                          ? 'bg-[#34452F] text-[#FFFDF8]'
                          : 'bg-[#FAF7F0] text-[#5F6057] border border-[#DED7CA]'
                      }`}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* ── Active Tab Content Panel ───────────────────────────────────────── */}
        <main
          id={`account-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`account-tab-${activeTab}`}
          tabIndex={0}
          className="focus-visible:outline-none"
        >
          {children}
        </main>

      </div>
    </div>
  )
}

export default AccountShell
