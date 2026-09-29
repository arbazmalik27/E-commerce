import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Truck,
  Heart,
  MapPin,
  ArrowRight,
  ExternalLink,
  Plus,
  LogOut,
  UserCheck,
} from 'lucide-react'
import { OrderStatusBadge, PaymentStatusBadge } from '../../pages/OrdersPage'
import { getProductImage } from '../../utils/productImageMap'

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'TV'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function AccountOverview({
  user,
  orders = [],
  ordersLoading = false,
  addresses = [],
  addressesLoading = false,
  wishlistItems = [],
  wishlistCount = 0,
  onTabChange,
  onLogout,
}) {
  // Compute active deliveries (pending, confirmed, processing, shipped)
  const activeDeliveries = orders.filter((o) =>
    ['pending', 'confirmed', 'processing', 'shipped'].includes(o.orderStatus)
  )

  // Find default address
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0] || null

  // 2 most recent orders
  const recentOrders = orders.slice(0, 2)

  // 3 preview wishlist items
  const previewWishlist = wishlistItems.slice(0, 3)

  return (
    <div className="space-y-8">
      {/* =======================================================================
          1. IDENTITY HEADER
         ======================================================================= */}
      <section
        aria-labelledby="identity-heading"
        className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-7 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[#DED7CA]/70">
          <div className="flex items-center gap-4">
            {/* Initials Avatar */}
            <div
              className="h-16 w-16 rounded-2xl bg-[#34452F] flex items-center justify-center text-[#FFFDF8] font-serif font-bold text-xl tracking-wider shadow-xs shrink-0 select-none"
              aria-hidden="true"
            >
              {getInitials(user?.name)}
            </div>

            {/* User Meta */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2
                  id="identity-heading"
                  className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C] tracking-tight"
                >
                  {user?.name || 'Customer'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-[11px] font-mono font-bold text-[#5F6057] uppercase tracking-wide">
                  {user?.role || 'Customer'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3F6B45]">
                  <span className="h-2 w-2 rounded-full bg-[#3F6B45]" />
                  Active Account
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#5F6057] mt-1 font-mono truncate max-w-sm sm:max-w-md">
                {user?.email || '—'}
              </p>
              <p className="text-[11px] text-[#85857A] mt-0.5 font-mono">
                Member since {formatDate(user?.createdAt)}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => onTabChange('settings')}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] text-[#1F211C] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#A65332]/30 bg-[#A65332]/10 hover:bg-[#A65332]/20 text-[#A65332] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A65332]"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Status Notice */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5F6057]">
          <p className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#34452F]" aria-hidden="true" />
            <span>Welcome to your customer portal. Track purchases, manage shipping, and curate style favorites.</span>
          </p>
          <button
            type="button"
            onClick={() => onTabChange('settings')}
            className="text-xs font-semibold text-[#34452F] hover:text-[#263722] transition-colors cursor-pointer"
          >
            Account Details →
          </button>
        </div>
      </section>

      {/* =======================================================================
          2. METRIC CARDS (4-CARD RESPONSIVE GRID)
         ======================================================================= */}
      <section aria-label="Account Overview Metrics">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Metric 1: Total Orders */}
          <div
            onClick={() => onTabChange('orders')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onTabChange('orders')}
            className="p-5 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] hover:border-[#85857A] transition-all cursor-pointer shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">
                Total Orders
              </span>
              <div className="h-8 w-8 rounded-lg bg-[#34452F]/10 text-[#34452F] flex items-center justify-center group-hover:bg-[#34452F] group-hover:text-[#FFFDF8] transition-colors">
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            {ordersLoading ? (
              <div className="h-8 w-16 bg-[#EEE7DC] rounded-md animate-pulse my-1" />
            ) : (
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C]">
                {orders.length}
              </p>
            )}
            <p className="text-xs text-[#5F6057] mt-1 flex items-center justify-between">
              <span>Order history</span>
              <span className="text-[#34452F] group-hover:translate-x-0.5 transition-transform">→</span>
            </p>
          </div>

          {/* Metric 2: Active Deliveries */}
          <div
            onClick={() => onTabChange('orders')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onTabChange('orders')}
            className="p-5 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] hover:border-[#85857A] transition-all cursor-pointer shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">
                In Transit
              </span>
              <div className="h-8 w-8 rounded-lg bg-[#34452F]/10 text-[#34452F] flex items-center justify-center group-hover:bg-[#34452F] group-hover:text-[#FFFDF8] transition-colors">
                <Truck className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            {ordersLoading ? (
              <div className="h-8 w-12 bg-[#EEE7DC] rounded-md animate-pulse my-1" />
            ) : (
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C]">
                {activeDeliveries.length}
              </p>
            )}
            <p className="text-xs text-[#5F6057] mt-1 flex items-center justify-between">
              <span>{activeDeliveries.length > 0 ? 'Active shipments' : 'All delivered'}</span>
              <span className="text-[#34452F] group-hover:translate-x-0.5 transition-transform">→</span>
            </p>
          </div>

          {/* Metric 3: Saved Pieces */}
          <div
            onClick={() => onTabChange('wishlist')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onTabChange('wishlist')}
            className="p-5 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] hover:border-[#85857A] transition-all cursor-pointer shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">
                Saved Pieces
              </span>
              <div className="h-8 w-8 rounded-lg bg-[#A65332]/10 text-[#A65332] flex items-center justify-center group-hover:bg-[#A65332] group-hover:text-[#FFFDF8] transition-colors">
                <Heart className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            <p className="font-serif text-2xl sm:text-3xl font-bold text-[#1F211C]">
              {wishlistCount}
            </p>
            <p className="text-xs text-[#5F6057] mt-1 flex items-center justify-between">
              <span>Wishlist items</span>
              <span className="text-[#34452F] group-hover:translate-x-0.5 transition-transform">→</span>
            </p>
          </div>

          {/* Metric 4: Default Destination */}
          <div
            onClick={() => onTabChange('addresses')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onTabChange('addresses')}
            className="p-5 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] hover:border-[#85857A] transition-all cursor-pointer shadow-xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">
                Delivery Hub
              </span>
              <div className="h-8 w-8 rounded-lg bg-[#34452F]/10 text-[#34452F] flex items-center justify-center group-hover:bg-[#34452F] group-hover:text-[#FFFDF8] transition-colors">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>
            {addressesLoading ? (
              <div className="h-8 w-24 bg-[#EEE7DC] rounded-md animate-pulse my-1" />
            ) : defaultAddress ? (
              <p className="font-serif text-lg sm:text-xl font-bold text-[#1F211C] truncate" title={`${defaultAddress.city}, ${defaultAddress.postalCode}`}>
                {defaultAddress.city}
              </p>
            ) : (
              <p className="font-serif text-base font-semibold text-[#85857A]">
                None set
              </p>
            )}
            <p className="text-xs text-[#5F6057] mt-1 flex items-center justify-between truncate">
              <span>{defaultAddress ? `PIN: ${defaultAddress.postalCode}` : 'Add address'}</span>
              <span className="text-[#34452F] group-hover:translate-x-0.5 transition-transform">→</span>
            </p>
          </div>

        </div>
      </section>

      {/* =======================================================================
          3. RECENT ORDERS SECTION
         ======================================================================= */}
      <section aria-labelledby="recent-orders-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3
              id="recent-orders-heading"
              className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C]"
            >
              Recent Orders
            </h3>
            {!ordersLoading && orders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-xs font-mono font-bold text-[#5F6057]">
                {orders.length}
              </span>
            )}
          </div>
          {orders.length > 0 && (
            <button
              type="button"
              onClick={() => onTabChange('orders')}
              className="text-xs font-semibold text-[#34452F] hover:text-[#263722] inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>View All Orders</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {ordersLoading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="p-5 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] animate-pulse space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-32 bg-[#EEE7DC] rounded-full" />
                  <div className="h-5 w-24 bg-[#EEE7DC] rounded-full" />
                </div>
                <div className="h-10 w-full bg-[#EEE7DC] rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Zero orders empty state */}
        {!ordersLoading && orders.length === 0 && (
          <div className="py-10 px-6 text-center rounded-2xl border border-dashed border-[#DED7CA] bg-[#FFFDF8]">
            <div className="h-12 w-12 rounded-full bg-[#34452F]/10 text-[#34452F] flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="h-6 w-6" aria-hidden="true" />
            </div>
            <h4 className="font-serif text-lg font-bold text-[#1F211C]">No orders placed yet</h4>
            <p className="mt-1 text-xs text-[#5F6057] max-w-sm mx-auto">
              Your purchase history is empty. Discover tailored fashion pieces and exclusive collections.
            </p>
            <Link
              to="/products"
              className="mt-4 min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              <span>Discover New Arrivals</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Recent orders list */}
        {!ordersLoading && recentOrders.length > 0 && (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const allItems = order.items || []
              const firstItem = allItems[0]

              return (
                <div
                  key={order._id}
                  className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-4 sm:p-5 shadow-xs hover:border-[#85857A] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DED7CA]/60">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-[11px] font-mono text-[#85857A] uppercase">Order Number</p>
                        <p className="font-mono text-sm font-bold text-[#34452F]">{order.orderNumber}</p>
                      </div>
                      <div className="h-6 w-px bg-[#DED7CA]" aria-hidden="true" />
                      <div>
                        <p className="text-[11px] font-mono text-[#85857A] uppercase">Date</p>
                        <p className="text-xs font-medium text-[#5F6057]">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <OrderStatusBadge status={order.orderStatus} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                      <span className="font-serif text-sm font-bold text-[#1F211C] ml-1">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Summary & View Details link */}
                  <div className="pt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#5F6057] truncate">
                      {firstItem?.name}
                      {allItems.length > 1 && ` and ${allItems.length - 1} other item${allItems.length > 2 ? 's' : ''}`}
                    </p>

                    <Link
                      to={`/orders/${order._id}`}
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-xs font-semibold text-[#1F211C] transition-colors shrink-0"
                    >
                      <span>View Order</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* =======================================================================
          4. TWO-COLUMN SPLIT: DEFAULT ADDRESS + WISHLIST PREVIEW
         ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Default Address Preview Card ────────────────────────────────────── */}
        <section
          aria-labelledby="default-address-heading"
          className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]/70">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#34452F]" aria-hidden="true" />
                <h3 id="default-address-heading" className="font-serif text-lg font-bold text-[#1F211C]">
                  Primary Shipping Address
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onTabChange('addresses')}
                className="text-xs font-semibold text-[#34452F] hover:text-[#263722] cursor-pointer"
              >
                Manage ({addresses.length})
              </button>
            </div>

            <div className="mt-4">
              {addressesLoading && (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 w-28 bg-[#EEE7DC] rounded-full" />
                  <div className="h-3 w-48 bg-[#EEE7DC] rounded-full" />
                  <div className="h-3 w-36 bg-[#EEE7DC] rounded-full" />
                </div>
              )}

              {!addressesLoading && defaultAddress ? (
                <div className="space-y-1.5 text-xs sm:text-sm text-[#5F6057]">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#1F211C] text-sm">{defaultAddress.fullName}</p>
                    <span className="px-2 py-0.5 rounded-full bg-[#34452F]/10 border border-[#34452F]/20 text-[10px] font-mono font-bold text-[#34452F]">
                      Default
                    </span>
                  </div>
                  <p className="text-[#1F211C] leading-relaxed">{defaultAddress.addressLine}</p>
                  <p className="leading-relaxed">
                    {defaultAddress.city}, {defaultAddress.state} —{' '}
                    <span className="font-mono font-bold text-[#1F211C]">{defaultAddress.postalCode}</span>
                  </p>
                  <p className="text-[#85857A]">{defaultAddress.country}</p>
                  <p className="font-mono text-xs text-[#85857A] pt-1">Phone: {defaultAddress.phone}</p>
                </div>
              ) : null}

              {!addressesLoading && !defaultAddress && (
                <div className="py-6 text-center">
                  <p className="text-xs text-[#5F6057] mb-3">
                    No delivery destination saved. Add an address now to accelerate your checkout.
                  </p>
                  <button
                    type="button"
                    onClick={() => onTabChange('addresses')}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Add Address</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {defaultAddress && (
            <div className="mt-5 pt-3 border-t border-[#DED7CA]/60 flex items-center justify-between">
              <span className="text-[11px] text-[#85857A]">Used as primary address at checkout</span>
              <button
                type="button"
                onClick={() => onTabChange('addresses')}
                className="text-xs font-semibold text-[#34452F] hover:underline cursor-pointer"
              >
                Change Default →
              </button>
            </div>
          )}
        </section>

        {/* ── Wishlist Preview Card ────────────────────────────────────────────── */}
        <section
          aria-labelledby="wishlist-preview-heading"
          className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-6 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]/70">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#A65332]" aria-hidden="true" />
                <h3 id="wishlist-preview-heading" className="font-serif text-lg font-bold text-[#1F211C]">
                  Curated Wishlist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onTabChange('wishlist')}
                className="text-xs font-semibold text-[#34452F] hover:text-[#263722] cursor-pointer"
              >
                View All ({wishlistCount})
              </button>
            </div>

            <div className="mt-4">
              {previewWishlist.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-[#5F6057] mb-3">
                    Your wishlist is waiting. Save your favorite garments and accessories as you explore.
                  </p>
                  <Link
                    to="/products"
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] font-semibold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Browse Collection</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {previewWishlist.map((item) => {
                    const imgSrc = getProductImage(item)

                    return (
                      <Link
                        key={item._id}
                        to={`/products/${item._id}`}
                        className="group flex flex-col rounded-xl border border-[#DED7CA] bg-[#FAF7F0] p-2 hover:border-[#85857A] transition-all"
                      >
                        <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#FFFDF8] flex items-center justify-center p-1">
                          <img
                            src={imgSrc}
                            alt={item.name}
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[#1F211C] truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="font-serif text-xs font-bold text-[#34452F] mt-0.5">
                          {formatCurrency(item.price)}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {previewWishlist.length > 0 && (
            <div className="mt-5 pt-3 border-t border-[#DED7CA]/60 flex items-center justify-between">
              <span className="text-[11px] text-[#85857A]">
                {wishlistCount} {wishlistCount === 1 ? 'piece' : 'pieces'} saved in your wardrobe
              </span>
              <button
                type="button"
                onClick={() => onTabChange('wishlist')}
                className="text-xs font-semibold text-[#34452F] hover:underline cursor-pointer"
              >
                Go to Wishlist →
              </button>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default AccountOverview
