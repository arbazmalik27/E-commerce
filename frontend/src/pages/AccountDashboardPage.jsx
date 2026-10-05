import { useEffect, useState, useCallback, useTransition } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { logout, selectUser } from '../features/auth/authSlice'
import {
  fetchWishlist,
  selectWishlistInitialized,
  selectWishlistItems,
  selectWishlistTotalItems,
} from '../features/wishlist/wishlistSlice'
import api from '../services/api'
import SEO from '../components/SEO'
import AccountShell from '../components/account/AccountShell'
import AccountOverview from '../components/account/AccountOverview'
import AccountOrdersTab from '../components/account/AccountOrdersTab'
import AccountAddressesTab from '../components/account/AccountAddressesTab'
import AccountWishlistTab from '../components/account/AccountWishlistTab'
import AccountSettingsTab from '../components/account/AccountSettingsTab'

const VALID_TABS = ['overview', 'orders', 'addresses', 'wishlist', 'settings']

function AccountDashboardPage({ defaultTab = 'overview' }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectUser)
  const wishlistItems = useSelector(selectWishlistItems)
  const wishlistCount = useSelector(selectWishlistTotalItems)
  const wishlistInitialized = useSelector(selectWishlistInitialized)

  const [searchParams, setSearchParams] = useSearchParams()
  const [, startTransition] = useTransition()

  // Resolve active tab from URL or fallback
  const rawTab = searchParams.get('tab')
  const activeTab = VALID_TABS.includes(rawTab)
    ? rawTab
    : VALID_TABS.includes(defaultTab)
    ? defaultTab
    : 'overview'

  // Orders State
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState(null)

  // Addresses State
  const [addresses, setAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [addressesError, setAddressesError] = useState(null)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // ── Fetch Orders ───────────────────────────────────────────────────────────
  const loadOrders = useCallback(() => {
    setOrdersLoading(true)
    setOrdersError(null)
    api
      .get('/orders')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.orders)) {
          setOrders(res.data.orders)
        } else {
          setOrders([])
        }
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Unable to load your orders. Please check your connection.'
        setOrdersError(msg)
      })
      .finally(() => {
        setOrdersLoading(false)
      })
  }, [])

  // ── Fetch Addresses ────────────────────────────────────────────────────────
  const loadAddresses = useCallback(() => {
    setAddressesLoading(true)
    setAddressesError(null)
    api
      .get('/users/addresses')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.addresses)) {
          setAddresses(res.data.addresses)
        } else {
          setAddresses([])
        }
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Unable to load saved addresses. Please check your connection.'
        setAddressesError(msg)
      })
      .finally(() => {
        setAddressesLoading(false)
      })
  }, [])

  // Initial parallel load
  useEffect(() => {
    queueMicrotask(() => {
      loadOrders()
      loadAddresses()
    })

    if (!wishlistInitialized) {
      dispatch(fetchWishlist())
    }
  }, [loadOrders, loadAddresses, wishlistInitialized, dispatch])

  // ── Tab Navigation Handler ─────────────────────────────────────────────────
  const handleTabChange = (newTab) => {
    if (!VALID_TABS.includes(newTab)) return
    startTransition(() => {
      setSearchParams({ tab: newTab })
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Logout Handler ─────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  // Counts for shell badges
  const counts = {
    ordersCount: ordersLoading ? null : orders.length,
    addressesCount: addressesLoading ? null : addresses.length,
    wishlistCount: wishlistCount,
  }

  return (
    <>
      <SEO
        title="Account Center"
        description="Manage your orders, saved addresses, curated wardrobe, and profile on TrendVolt."
        canonical="/account"
        noindex={true}
      />

      <AccountShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
      >
        {activeTab === 'overview' && (
          <AccountOverview
            user={user}
            orders={orders}
            ordersLoading={ordersLoading}
            addresses={addresses}
            addressesLoading={addressesLoading}
            wishlistItems={wishlistItems}
            wishlistCount={wishlistCount}
            onTabChange={handleTabChange}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'orders' && (
          <AccountOrdersTab
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            onRetry={loadOrders}
          />
        )}

        {activeTab === 'addresses' && (
          <AccountAddressesTab
            addresses={addresses}
            loading={addressesLoading}
            error={addressesError}
            user={user}
            onAddressesUpdate={setAddresses}
            onRetry={loadAddresses}
          />
        )}

        {activeTab === 'wishlist' && (
          <AccountWishlistTab />
        )}

        {activeTab === 'settings' && (
          <AccountSettingsTab
            user={user}
            onLogout={handleLogout}
          />
        )}
      </AccountShell>
    </>
  )
}

export default AccountDashboardPage
