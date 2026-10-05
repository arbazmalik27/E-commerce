import { useEffect, useState, useCallback, useId } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'
import AdminNav from '../../components/AdminNav'
import SEO from '../../components/SEO'

// ─── Formatters & Theme Tokens ──────────────────────────────────────────────

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '—'
  // Handle YYYY-MM
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split('-')
    const date = new Date(Number(y), Number(m) - 1, 1)
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  }
  // Handle YYYY-MM-DD
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return dateStr
}

const ORDER_STATUS_STYLES = {
  pending:    { bg: 'bg-[#FAF7F0]',    border: 'border-[#DED7CA]',    text: 'text-[#A86B2D]', dot: 'bg-[#A86B2D]', label: 'Pending'    },
  confirmed:  { bg: 'bg-[#34452F]/10', border: 'border-[#34452F]/20', text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Confirmed'  },
  processing: { bg: 'bg-[#FAF7F0]',    border: 'border-[#DED7CA]',    text: 'text-[#5F6057]', dot: 'bg-[#5F6057]', label: 'Processing' },
  shipped:    { bg: 'bg-[#34452F]/10', border: 'border-[#34452F]/25', text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Shipped'    },
  delivered:  { bg: 'bg-[#3F6B45]/15', border: 'border-[#3F6B45]/30', text: 'text-[#3F6B45]', dot: 'bg-[#3F6B45]', label: 'Delivered'  },
  cancelled:  { bg: 'bg-[#A65332]/10', border: 'border-[#A65332]/25', text: 'text-[#A65332]', dot: 'bg-[#A65332]', label: 'Cancelled'  },
}

const PRESET_RANGES = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
]

function AdminAnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [appliedCustomDates, setAppliedCustomDates] = useState(null)
  const [customError, setCustomError] = useState(null)
  const startDateId = useId()
  const endDateId = useId()

  const [activeProductTab, setActiveProductTab] = useState('units') // 'units' | 'revenue'

  const [overview, setOverview] = useState(null)
  const [products, setProducts] = useState(null)
  const [customers, setCustomers] = useState(null)
  const [coupons, setCoupons] = useState(null)
  const [payments, setPayments] = useState(null)

  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Build query string depending on selected range
  const buildQueryParams = useCallback(() => {
    if (selectedRange === 'custom' && appliedCustomDates) {
      return `?range=custom&startDate=${encodeURIComponent(appliedCustomDates.start)}&endDate=${encodeURIComponent(appliedCustomDates.end)}`
    }
    return `?range=${selectedRange}`
  }, [selectedRange, appliedCustomDates])

  const fetchAnalytics = useCallback(async (isManualRefresh = false) => {
    if (selectedRange === 'custom' && !appliedCustomDates) {
      return
    }

    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    const query = buildQueryParams()

    try {
      const [ovRes, prodRes, custRes, coupRes, payRes] = await Promise.all([
        api.get(`/analytics/overview${query}`),
        api.get(`/analytics/products${query}&limit=10`),
        api.get(`/analytics/customers${query}`),
        api.get(`/analytics/coupons${query}`),
        api.get(`/analytics/payments${query}`),
      ])

      if (ovRes.data?.success) setOverview(ovRes.data)
      if (prodRes.data?.success) setProducts(prodRes.data)
      if (custRes.data?.success) setCustomers(custRes.data.customers || custRes.data)
      if (coupRes.data?.success) setCoupons(coupRes.data.coupons || coupRes.data)
      if (payRes.data?.success) setPayments(payRes.data.payments || payRes.data || ovRes.data?.payments)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load live analytics. Please check your connection and retry.'
      )
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedRange, appliedCustomDates, buildQueryParams])

  useEffect(() => {
    if (selectedRange !== 'custom') {
      queueMicrotask(() => {
        fetchAnalytics(false)
      })
    }
  }, [selectedRange, fetchAnalytics])

  useEffect(() => {
    if (selectedRange === 'custom' && appliedCustomDates) {
      queueMicrotask(() => {
        fetchAnalytics(false)
      })
    }
  }, [appliedCustomDates, selectedRange, fetchAnalytics])

  // Handle Preset vs Custom Range selection
  const handleSelectRange = (key) => {
    setSelectedRange(key)
    setCustomError(null)
    if (key !== 'custom') {
      setAppliedCustomDates(null)
    }
  }

  // Handle Custom Date Range validation & apply
  const handleApplyCustomRange = (e) => {
    e.preventDefault()
    setCustomError(null)

    if (!customStart || !customEnd) {
      setCustomError('Please choose both start and end dates.')
      return
    }

    const start = new Date(customStart)
    const end = new Date(customEnd)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setCustomError('Please enter valid dates.')
      return
    }

    if (end <= start) {
      setCustomError('End date must be strictly after start date.')
      return
    }

    const diffDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
    if (diffDays > 366) {
      setCustomError('Custom date range cannot exceed 366 days.')
      return
    }

    setAppliedCustomDates({
      start: customStart,
      end: customEnd,
    })
  }

  const kpis = overview?.kpis
  const fulfillment = overview?.fulfillmentStatus
  const trend = overview?.trend || []
  const maxTrendRevenue = Math.max(...trend.map((t) => t.revenue || 0), 1)

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Admin Analytics — TrendVolt"
        description="Comprehensive store analytics, sales trends, inventory health, and customer insights."
        canonical="/admin/analytics"
        noindex={true}
      />

      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        {/* ── Sub Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <AdminNav />
          <div className="flex items-center gap-2 text-xs font-medium text-[#5F6057]">
            <span className="h-2 w-2 rounded-full bg-[#34452F] animate-pulse" />
            <span>Store Intelligence Hub</span>
          </div>
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#DED7CA]">
          <div>
            <div className="flex items-center gap-3">
              <Eyebrow variant="olive">INTELLIGENCE & INSIGHTS</Eyebrow>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20">
                Administrator
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#1F211C]">
              Advanced Analytics
            </h1>
            <p className="mt-2 text-sm text-[#5F6057] max-w-2xl leading-relaxed">
              Authoritative e-commerce metrics: revenue velocity, order fulfillment status, snapshot product sales, customer retention, and coupon impact.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              disabled={loading || isRefreshing || (selectedRange === 'custom' && !appliedCustomDates)}
              aria-label="Refresh analytics data"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] text-xs font-semibold uppercase tracking-wider text-[#1F211C] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#34452F]' : 'text-[#5F6057]'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              <span>{isRefreshing ? 'Syncing…' : 'Sync Live'}</span>
            </button>

            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
            >
              <span>Manage Orders</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Time Range Controls ─────────────────────────────────────────── */}
        <section aria-label="Analytics Time Range Selector" className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057] font-semibold">
              Time Window (IST +05:30)
            </span>

            {/* Preset Buttons */}
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] overflow-x-auto max-w-full">
              {PRESET_RANGES.map((preset) => {
                const isActive = selectedRange === preset.key
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handleSelectRange(preset.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                        : 'text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FFFDF8]'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Date Form (Shown only when 'custom' is active) */}
          {selectedRange === 'custom' && (
            <form onSubmit={handleApplyCustomRange} className="pt-3 border-t border-[#DED7CA]/70 flex flex-col sm:flex-row sm:items-end gap-3.5">
              <div className="space-y-1">
                <label htmlFor={startDateId} className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                  Start Date
                </label>
                <input
                  id={startDateId}
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] text-xs font-mono text-[#1F211C] focus:outline-hidden focus:ring-2 focus:ring-[#34452F]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={endDateId} className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                  End Date
                </label>
                <input
                  id={endDateId}
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] text-xs font-mono text-[#1F211C] focus:outline-hidden focus:ring-2 focus:ring-[#34452F]"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs shrink-0"
              >
                Apply Range
              </button>

              {customError && (
                <span className="text-xs text-[#A65332] font-medium self-center">
                  {customError}
                </span>
              )}
            </form>
          )}
        </section>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {error && !loading && (
          <div
            role="alert"
            className="p-6 rounded-2xl bg-[#A65332]/10 border border-[#A65332]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#A65332]/15 border border-[#A65332]/25 flex items-center justify-center text-[#A65332] shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1F211C] uppercase tracking-wider">
                  Analytics Synchronization Failed
                </h3>
                <p className="mt-1 text-xs text-[#A65332] leading-relaxed max-w-xl">
                  {error}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchAnalytics(false)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#34452F] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading Skeleton ────────────────────────────────────────────── */}
        {loading && (
          <div aria-busy="true" aria-label="Loading analytics dashboard" className="space-y-10 animate-pulse">
            {/* KPI Cards Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-3 shadow-xs">
                  <div className="h-4 w-24 bg-[#EEE7DC] rounded" />
                  <div className="h-8 w-28 bg-[#EEE7DC] rounded" />
                  <div className="h-3 w-32 bg-[#EEE7DC] rounded pt-1" />
                </div>
              ))}
            </div>

            {/* Trend Skeleton */}
            <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-4 shadow-xs">
              <div className="h-5 w-48 bg-[#EEE7DC] rounded" />
              <div className="h-40 w-full bg-[#FAF7F0] rounded-xl" />
            </div>

            {/* Split Grid Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-4 shadow-xs">
                <div className="h-5 w-36 bg-[#EEE7DC] rounded" />
                <div className="h-44 w-full bg-[#FAF7F0] rounded-xl" />
              </div>
              <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-4 shadow-xs">
                <div className="h-5 w-36 bg-[#EEE7DC] rounded" />
                <div className="h-44 w-full bg-[#FAF7F0] rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* ── Live Analytics Content ──────────────────────────────────────── */}
        {!loading && kpis && (
          <div className="space-y-10">
            {/* 1. Overview KPI Cards Grid */}
            <section aria-label="Key Performance Indicators">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {/* Total Revenue */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                        Total Revenue
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {formatCurrency(kpis.revenue ?? kpis.totalRevenue)}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Paid & verified</span>
                    <span className="font-semibold text-[#3F6B45]">Active Sales</span>
                  </div>
                </div>

                {/* Paid Orders */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                        Paid Orders
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {Number((kpis.orders ?? kpis.paidOrders) || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Non-cancelled</span>
                    <span className="font-semibold text-[#1F211C]">Transactions</span>
                  </div>
                </div>

                {/* Average Order Value (AOV) */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                        Avg Order Value
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {formatCurrency(kpis.averageOrderValue)}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Revenue per order</span>
                    <span className="font-semibold text-[#1F211C]">AOV</span>
                  </div>
                </div>

                {/* New Customers */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                        New Customers
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {Number(kpis.newCustomers || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>In selected range</span>
                    <span className="font-semibold text-[#34452F]">Signups</span>
                  </div>
                </div>

                {/* Payment Success Rate */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                        Payment Success
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {kpis.paymentSuccessRate}%
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Attempt success</span>
                    <span className="font-semibold text-[#3F6B45]">Gateway</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Order Fulfillment Status Pipeline */}
            {fulfillment && (
              <section aria-label="Order Fulfillment Pipeline" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#34452F]" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#1F211C]">
                      Fulfillment Status Distribution
                    </h2>
                  </div>
                  <span className="text-xs text-[#85857A]">Operational orders in range</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  {Object.entries(ORDER_STATUS_STYLES).map(([stKey, stMeta]) => {
                    const count = fulfillment[stKey] || 0
                    return (
                      <div
                        key={stKey}
                        className={`p-3.5 rounded-xl border ${stMeta.bg} ${stMeta.border} flex flex-col justify-between space-y-2`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className={stMeta.text}>{stMeta.label}</span>
                          <span className={`h-2 w-2 rounded-full ${stMeta.dot}`} />
                        </div>
                        <div className="text-xl font-serif font-bold text-[#1F211C]">
                          {Number(count).toLocaleString('en-IN')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* 3. Revenue & Orders Trend Section */}
            <section aria-label="Revenue and Order Velocity Trend" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-serif font-bold text-[#1F211C]">
                    Revenue & Orders Trend
                  </h2>
                  <p className="text-xs text-[#5F6057]">
                    Continuous daily sales performance and order velocity in IST
                  </p>
                </div>
                <div className="text-xs font-mono text-[#5F6057]">
                  {trend.length} intervals recorded
                </div>
              </div>

              {trend.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-center text-xs text-[#5F6057]">
                  No sales or order records found in this range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                        <th scope="col" className="py-2.5 px-4 font-semibold w-32">Date</th>
                        <th scope="col" className="py-2.5 px-4 font-semibold w-32">Revenue</th>
                        <th scope="col" className="py-2.5 px-4 font-semibold w-24">Orders</th>
                        <th scope="col" className="py-2.5 px-4 font-semibold">Relative Scale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                      {trend.map((point) => {
                        const pct = Math.min(100, Math.round(((point.revenue || 0) / maxTrendRevenue) * 100))
                        return (
                          <tr key={point.date} className="hover:bg-[#FAF7F0] transition-colors">
                            <td className="py-3 px-4 font-mono font-medium text-[#1F211C] whitespace-nowrap">
                              {formatDateLabel(point.date)}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#1F211C] whitespace-nowrap">
                              {formatCurrency(point.revenue)}
                            </td>
                            <td className="py-3 px-4 font-mono text-[#5F6057] whitespace-nowrap">
                              {point.orders} {point.orders === 1 ? 'order' : 'orders'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-2.5 flex-1 bg-[#EEE7DC] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#34452F] rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                    role="progressbar"
                                    aria-valuenow={pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-[#85857A] w-9 text-right shrink-0">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 4. Deep-Dive Grid: Products, Customers, Catalog Health & Coupons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Top Products & Customer Retention */}
              <div className="space-y-8">
                {/* Product Performance Section */}
                <section aria-label="Product Performance" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#1F211C]">
                        Top Products
                      </h2>
                      <p className="text-xs text-[#5F6057]">
                        Verified sales derived from order snapshot data
                      </p>
                    </div>

                    {/* Units vs Revenue Tabs */}
                    <div className="inline-flex items-center p-1 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                      <button
                        type="button"
                        onClick={() => setActiveProductTab('units')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeProductTab === 'units'
                            ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                            : 'text-[#5F6057] hover:text-[#1F211C]'
                        }`}
                      >
                        By Units
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveProductTab('revenue')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeProductTab === 'revenue'
                            ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                            : 'text-[#5F6057] hover:text-[#1F211C]'
                        }`}
                      >
                        By Revenue
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const list = activeProductTab === 'units' ? products?.topByUnits : products?.topByRevenue
                    if (!list || list.length === 0) {
                      return (
                        <div className="p-6 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-center text-xs text-[#5F6057]">
                          No product transactions recorded in this range.
                        </div>
                      )
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                              <th scope="col" className="py-2 px-3 font-semibold w-10">#</th>
                              <th scope="col" className="py-2 px-3 font-semibold">Product</th>
                              <th scope="col" className="py-2 px-3 font-semibold text-right">Units</th>
                              <th scope="col" className="py-2 px-3 font-semibold text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                            {list.map((item, idx) => (
                              <tr key={item.productId || item.name} className="hover:bg-[#FAF7F0] transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[#85857A]">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-medium text-[#1F211C]">
                                  {item.name || 'Unnamed Product'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-[#5F6057]">
                                  {item.unitsSold}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-[#1F211C]">
                                  {formatCurrency(item.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </section>

                {/* Customer Retention & Acquisition */}
                {customers && (
                  <section aria-label="Customer Retention and Acquisition" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#1F211C]">
                        Customer Retention & Acquisition
                      </h2>
                      <p className="text-xs text-[#5F6057]">
                        Verified customer accounts and repeat purchasing behavior
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Total Customers
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#1F211C]">
                          {customers.totalCustomers}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Active Accounts
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#3F6B45]">
                          {customers.activeCustomers}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          New In Range
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#34452F]">
                          {customers.newCustomers}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Paid Customers
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#1F211C]">
                          {customers.customersWithPaidOrders ?? customers.customersWithOrders ?? 0}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Repeat Buyers
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#1F211C]">
                          {customers.repeatCustomers}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Repeat Rate
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#34452F]">
                          {customers.repeatCustomerRate}%
                        </span>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column: Catalog Health, Payment Gateway & Coupon Impact */}
              <div className="space-y-8">
                {/* Catalog Health */}
                {products?.catalogHealth && (
                  <section aria-label="Catalog Inventory Health" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#1F211C]">
                        Catalog Inventory Health
                      </h2>
                      <p className="text-xs text-[#5F6057]">
                        Active catalog stock levels and low-inventory warnings (stock ≤ 5)
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      <div className="p-3.5 rounded-xl bg-[#34452F]/10 border border-[#34452F]/20">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#34452F]">
                          Active Listings
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#1F211C]">
                          {products.catalogHealth.active}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Inactive
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#5F6057]">
                          {products.catalogHealth.inactive}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#A86B2D]/10 border border-[#A86B2D]/25">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#A86B2D]">
                          Low Stock (≤5)
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#A86B2D]">
                          {products.catalogHealth.lowStock}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#A65332]/10 border border-[#A65332]/25">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#A65332]">
                          Out of Stock
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#A65332]">
                          {products.catalogHealth.outOfStock}
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {/* Payment Performance */}
                {payments && (
                  <section aria-label="Payment Gateway Performance" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#1F211C]">
                        Payment Gateway Performance
                      </h2>
                      <p className="text-xs text-[#5F6057]">
                        Authorization statistics from customer checkout attempts
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                      <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Attempts
                        </span>
                        <span className="mt-1 block text-lg font-serif font-bold text-[#1F211C]">
                          {payments.totalAttempts}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#3F6B45]/15 border border-[#3F6B45]/30">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#3F6B45]">
                          Successful
                        </span>
                        <span className="mt-1 block text-lg font-serif font-bold text-[#3F6B45]">
                          {payments.successful}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#A65332]/10 border border-[#A65332]/25">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#A65332]">
                          Failed
                        </span>
                        <span className="mt-1 block text-lg font-serif font-bold text-[#A65332]">
                          {payments.failed}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#A86B2D]">
                          Pending
                        </span>
                        <span className="mt-1 block text-lg font-serif font-bold text-[#A86B2D]">
                          {payments.pending}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#34452F]/10 border border-[#34452F]/20">
                        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#34452F]">
                          Success Rate
                        </span>
                        <span className="mt-1 block text-lg font-serif font-bold text-[#34452F]">
                          {payments.paymentSuccessRate}%
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                {/* Coupon Impact */}
                {coupons && (
                  <section aria-label="Coupon Promotion Impact" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                    <div>
                      <h2 className="text-base font-serif font-bold text-[#1F211C]">
                        Coupon Promotion Impact
                      </h2>
                      <p className="text-xs text-[#5F6057]">
                        Verified promotional discounts applied to paid customer orders
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3.5">
                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Orders w/ Coupon
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#1F211C]">
                          {coupons.ordersUsingCoupons}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Total Discount
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#A65332]">
                          {formatCurrency(coupons.totalDiscount)}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                        <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          Coupon Revenue
                        </span>
                        <span className="mt-1 block text-xl font-serif font-bold text-[#34452F]">
                          {formatCurrency(coupons.couponAttributedRevenue)}
                        </span>
                      </div>
                    </div>

                    {coupons.topCoupons && coupons.topCoupons.length > 0 && (
                      <div className="pt-2">
                        <span className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-2 font-semibold">
                          Top Performing Promo Codes
                        </span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                                <th scope="col" className="py-2 px-3 font-semibold">Code</th>
                                <th scope="col" className="py-2 px-3 font-semibold text-right">Uses</th>
                                <th scope="col" className="py-2 px-3 font-semibold text-right">Discount</th>
                                <th scope="col" className="py-2 px-3 font-semibold text-right">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                              {coupons.topCoupons.map((c) => (
                                <tr key={c.code} className="hover:bg-[#FAF7F0] transition-colors">
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#34452F]">
                                    {c.code}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#5F6057]">
                                    {c.uses}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-[#A65332]">
                                    {formatCurrency(c.totalDiscount)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-[#1F211C]">
                                    {formatCurrency(c.revenue)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAnalyticsPage
