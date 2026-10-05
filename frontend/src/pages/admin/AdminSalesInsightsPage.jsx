import { useEffect, useState, useCallback, useId, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'
import AdminNav from '../../components/AdminNav'
import SEO from '../../components/SEO'

// ─── Formatters & Constants ──────────────────────────────────────────────────

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '—'
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split('-')
    const date = new Date(Number(y), Number(m) - 1, 1)
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  }
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return dateStr
}

const PRESET_RANGES = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
]

export default function AdminSalesInsightsPage() {
  const [selectedRange, setSelectedRange] = useState('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [appliedCustomDates, setAppliedCustomDates] = useState(null)
  const [customError, setCustomError] = useState(null)
  const startDateId = useId()
  const endDateId = useId()

  // Tab & Filter states
  const [productSortBy, setProductSortBy] = useState('revenue') // 'revenue' | 'units' | 'orders'
  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'zero' | 'slow' | 'healthy'
  const [zeroSearch, setZeroSearch] = useState('')

  // Data states
  const [productsData, setProductsData] = useState(null)
  const [categoriesData, setCategoriesData] = useState(null)
  const [brandsData, setBrandsData] = useState(null)
  const [trendsData, setTrendsData] = useState(null)
  const [zeroSalesData, setZeroSalesData] = useState(null)
  const [stockSalesData, setStockSalesData] = useState(null)

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

  const fetchSalesInsights = useCallback(
    async (isManualRefresh = false) => {
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
        const [prodRes, catRes, brandRes, trendRes, zeroRes, stockRes] =
          await Promise.all([
            api.get(`/sales-insights/products${query}&limit=50&sortBy=${productSortBy}`),
            api.get(`/sales-insights/categories${query}`),
            api.get(`/sales-insights/brands${query}`),
            api.get(`/sales-insights/trends${query}`),
            api.get(`/sales-insights/zero-sales${query}&limit=50`),
            api.get(`/sales-insights/stock-sales${query}&limit=50`),
          ])

        if (prodRes.data?.success) setProductsData(prodRes.data)
        if (catRes.data?.success) setCategoriesData(catRes.data)
        if (brandRes.data?.success) setBrandsData(brandRes.data)
        if (trendRes.data?.success) setTrendsData(trendRes.data)
        if (zeroRes.data?.success) setZeroSalesData(zeroRes.data)
        if (stockRes.data?.success) setStockSalesData(stockRes.data)
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Failed to load sales insights. Please check connection and retry.'
        )
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [selectedRange, appliedCustomDates, buildQueryParams, productSortBy]
  )

  useEffect(() => {
    if (selectedRange !== 'custom') {
      queueMicrotask(() => {
        fetchSalesInsights(false)
      })
    }
  }, [selectedRange, fetchSalesInsights])

  useEffect(() => {
    if (selectedRange === 'custom' && appliedCustomDates) {
      queueMicrotask(() => {
        fetchSalesInsights(false)
      })
    }
  }, [appliedCustomDates, selectedRange, fetchSalesInsights])

  // Handle Preset selection
  const handleSelectRange = (key) => {
    setSelectedRange(key)
    setCustomError(null)
    if (key !== 'custom') {
      setAppliedCustomDates(null)
    }
  }

  // Handle Custom Date Range apply
  const handleApplyCustomRange = (e) => {
    e.preventDefault()
    setCustomError(null)

    if (!customStart || !customEnd) {
      setCustomError('Both start and end dates are required.')
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

  // Derived metrics
  const summary = productsData?.summary || {}
  const trendsList = trendsData?.trends || []
  const maxTrendRevenue = Math.max(...trendsList.map((t) => t.revenue || 0), 1)

  // Filtered Stock vs Sales
  const filteredStockSales = useMemo(() => {
    const list = stockSalesData?.products || []
    if (stockFilter === 'zero') return list.filter((p) => p.unitsSold === 0)
    if (stockFilter === 'slow') return list.filter((p) => p.unitsSold > 0 && p.unitsSold <= 2)
    if (stockFilter === 'healthy') return list.filter((p) => p.unitsSold > 2)
    return list
  }, [stockSalesData, stockFilter])

  // Filtered Zero-Sales
  const filteredZeroSales = useMemo(() => {
    const list = zeroSalesData?.products || []
    if (!zeroSearch.trim()) return list
    const q = zeroSearch.toLowerCase()
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(q))
    )
  }, [zeroSalesData, zeroSearch])

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Sales & Product Insights — TrendVolt Admin"
        description="Deep product, category, brand, and inventory turnover sales intelligence."
      />

      <div className="max-w-7xl mx-auto space-y-10">
        {/* ── Admin Navigation ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <AdminNav />
          <div className="flex items-center gap-2 text-xs font-medium text-[#5F6057]">
            <span className="h-2 w-2 rounded-full bg-[#34452F] animate-pulse" />
            <span>Product Velocity Intelligence</span>
          </div>
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#DED7CA]">
          <div>
            <div className="flex items-center gap-3">
              <Eyebrow variant="olive">SALES & PRODUCT INTELLIGENCE</Eyebrow>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20">
                Administrator
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#1F211C]">
              Sales & Product Insights
            </h1>
            <p className="mt-2 text-sm text-[#5F6057] max-w-2xl leading-relaxed">
              Granular product-level velocity, category sales attribution, brand performance, inventory turnover rates, and objective zero-sales catalog analysis.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchSalesInsights(true)}
              disabled={loading || isRefreshing || (selectedRange === 'custom' && !appliedCustomDates)}
              aria-label="Refresh sales insights"
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
              to="/admin/analytics"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] text-[#1F211C] text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
            >
              <span>Overview Analytics</span>
              <svg className="w-3.5 h-3.5 text-[#5F6057]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── Time Range Controls ─────────────────────────────────────────── */}
        <section aria-label="Sales Insights Time Range Selector" className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
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
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                        : 'text-[#5F6057] hover:text-[#1F211C] hover:bg-[#EEE7DC]/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Date Form */}
          {selectedRange === 'custom' && (
            <form
              onSubmit={handleApplyCustomRange}
              className="pt-4 border-t border-[#DED7CA]/70 flex flex-wrap items-end gap-3.5"
            >
              <div className="space-y-1">
                <label htmlFor={startDateId} className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                  Start Date (IST)
                </label>
                <input
                  id={startDateId}
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-xs text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={endDateId} className="block text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                  End Date (IST)
                </label>
                <input
                  id={endDateId}
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-xs text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#34452F] text-[#FFFDF8] text-xs font-semibold uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer shadow-xs"
              >
                Apply Custom Window
              </button>

              {appliedCustomDates && (
                <span className="text-xs text-[#3F6B45] font-medium self-center pl-2">
                  ✓ Window Active ({appliedCustomDates.start} → {appliedCustomDates.end})
                </span>
              )}
            </form>
          )}

          {customError && (
            <p className="text-xs text-[#A65332] font-medium pt-1">
              ⚠️ {customError}
            </p>
          )}
        </section>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="p-5 rounded-2xl bg-[#A65332]/10 border border-[#A65332]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#A65332] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#A65332]">
                  Unable to Synchronize Insights
                </p>
                <p className="mt-1 text-xs text-[#A65332] leading-relaxed max-w-xl">
                  {error}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchSalesInsights(false)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#34452F] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading Skeleton ────────────────────────────────────────────── */}
        {loading && (
          <div aria-busy="true" aria-label="Loading sales insights" className="space-y-10 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-3 shadow-xs">
                  <div className="h-4 w-24 bg-[#EEE7DC] rounded" />
                  <div className="h-8 w-28 bg-[#EEE7DC] rounded" />
                  <div className="h-3 w-32 bg-[#EEE7DC] rounded pt-1" />
                </div>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-4 shadow-xs">
              <div className="h-5 w-48 bg-[#EEE7DC] rounded" />
              <div className="h-44 w-full bg-[#FAF7F0] rounded-xl" />
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-4 shadow-xs">
              <div className="h-5 w-48 bg-[#EEE7DC] rounded" />
              <div className="h-56 w-full bg-[#FAF7F0] rounded-xl" />
            </div>
          </div>
        )}

        {/* ── Live Content ────────────────────────────────────────────────── */}
        {!loading && (
          <div className="space-y-10">
            {/* 1. Summary Highlights Grid */}
            <section aria-label="Sales Volume and Value Highlights">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {/* Qualifying Product Revenue */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                      Product Revenue
                    </span>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {formatCurrency(summary.totalRevenue)}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Item snapshots</span>
                    <span className="font-semibold text-[#3F6B45]">Paid Sales</span>
                  </div>
                </div>

                {/* Units Sold */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                      Units Dispatched
                    </span>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {Number(summary.totalUnits || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Total items</span>
                    <span className="font-semibold text-[#1F211C]">Volume</span>
                  </div>
                </div>

                {/* Qualifying Orders */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                      Qualifying Orders
                    </span>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {Number(summary.totalOrders || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Non-cancelled</span>
                    <span className="font-semibold text-[#1F211C]">Purchases</span>
                  </div>
                </div>

                {/* Products with Sales */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                      Products Moving
                    </span>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#34452F]">
                      {Number(summary.uniqueProductsSold || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>With sales</span>
                    <span className="font-semibold text-[#34452F]">Active</span>
                  </div>
                </div>

                {/* Zero Sales Active Items */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                      Zero-Sales Items
                    </span>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#A86B2D]">
                      {Number(zeroSalesData?.summary?.zeroSalesCount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>In selected window</span>
                    <span className="font-semibold text-[#A86B2D]">Unmoved</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Daily Sales Velocity Trend */}
            <section aria-label="Daily Sales Velocity Trend" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#34452F]" />
                    <h2 className="text-base font-serif font-bold text-[#1F211C]">
                      Daily Sales Velocity Trend
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-[#5F6057]">
                    Continuous daily sales volume, revenue velocity, and orders in IST (+05:30)
                  </p>
                </div>

                {trendsData?.summary?.peakDate && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#34452F]/10 border border-[#34452F]/20 text-xs text-[#34452F] font-medium">
                    <span>Peak Sales:</span>
                    <span className="font-bold">{formatDateLabel(trendsData.summary.peakDate)}</span>
                    <span className="font-mono">({formatCurrency(trendsData.summary.peakRevenue)})</span>
                  </div>
                )}
              </div>

              {trendsList.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-center text-xs text-[#5F6057]">
                  No sales recorded in this window.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                        <th scope="col" className="py-2.5 px-4 font-semibold">Date (IST)</th>
                        <th scope="col" className="py-2.5 px-4 font-semibold text-right">Units</th>
                        <th scope="col" className="py-2.5 px-4 font-semibold text-right">Orders</th>
                        <th scope="col" className="py-2.5 px-4 font-semibold text-right">Revenue</th>
                        <th scope="col" className="py-2.5 px-4 font-semibold w-1/3">Relative Sales Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                      {trendsList.map((row) => {
                        const pct = Math.min(100, Math.round(((row.revenue || 0) / maxTrendRevenue) * 100))
                        return (
                          <tr key={row.date} className="hover:bg-[#FAF7F0]/80 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-[#1F211C]">
                              {formatDateLabel(row.date)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-[#5F6057]">
                              {row.unitsSold}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-[#5F6057]">
                              {row.orders}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold font-mono text-[#1F211C]">
                              {formatCurrency(row.revenue)}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 rounded-full bg-[#EEE7DC] flex-1 overflow-hidden"
                                  role="progressbar"
                                  aria-valuenow={pct}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  <div
                                    className="h-full rounded-full bg-[#34452F] transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-[#85857A] w-9 text-right shrink-0">
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

            {/* 3. Product Sales Performance Table */}
            <section aria-label="Product Sales Performance" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-serif font-bold text-[#1F211C]">
                    Product Performance
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5F6057]">
                    Dispatched volume, order frequency, historical snapshot revenue, and average selling price
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
                  <span className="text-[11px] font-mono text-[#5F6057] px-2 font-medium">Sort By:</span>
                  {[
                    { key: 'revenue', label: 'Revenue' },
                    { key: 'units', label: 'Units Sold' },
                    { key: 'orders', label: 'Orders' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setProductSortBy(tab.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        productSortBy === tab.key
                          ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                          : 'text-[#5F6057] hover:text-[#1F211C]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {(!productsData?.products || productsData.products.length === 0) ? (
                <div className="p-8 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-center text-xs text-[#5F6057]">
                  No product sales recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                        <th scope="col" className="py-2.5 px-3 font-semibold w-8">#</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">Product</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">Taxonomy</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">Brand</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Units</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Orders</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">ASP</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Revenue</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Contrib %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                      {productsData.products.map((item, idx) => (
                        <tr key={item.productId || item.name} className="hover:bg-[#FAF7F0] transition-colors">
                          <td className="py-3 px-3 font-mono text-[#85857A]">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt=""
                                  className="w-9 h-9 rounded-lg object-cover border border-[#DED7CA] shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-[#FAF7F0] border border-[#DED7CA] flex items-center justify-center text-[#85857A] text-[10px] shrink-0">
                                  TV
                                </div>
                              )}
                              <span className="font-medium text-[#1F211C] line-clamp-1 max-w-xs">
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#5F6057] capitalize">
                            {item.department ? `${item.department} / ` : ''}{item.subcategory || item.category}
                          </td>
                          <td className="py-3 px-3 font-medium text-[#1F211C]">
                            {item.brand}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#5F6057]">
                            {item.unitsSold}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#5F6057]">
                            {item.orderCount}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#5F6057]">
                            {formatCurrency(item.averageSellingPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold font-mono text-[#1F211C]">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#34452F] font-semibold">
                            {item.salesContributionPercentage}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 4. Split Grid: Category Breakdown & Brand Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Category & Subcategory Breakdown */}
              <section aria-label="Category & Subcategory Breakdown" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                <div>
                  <h2 className="text-base font-serif font-bold text-[#1F211C]">
                    Category & Subcategory Performance
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5F6057]">
                    Qualifying sales aggregated by TrendVolt fashion taxonomy
                  </p>
                </div>

                {(!categoriesData?.categories || categoriesData.categories.length === 0) ? (
                  <div className="p-8 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-center text-xs text-[#5F6057]">
                    No category sales recorded.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          <th scope="col" className="py-2 px-3 font-semibold">Taxonomy</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-right">Units</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-right">Orders</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-right">Revenue</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                        {categoriesData.categories.map((c) => (
                          <tr key={`${c.department}-${c.category}-${c.subcategory}`} className="hover:bg-[#FAF7F0] transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-[#1F211C] capitalize">
                                {c.department}
                              </span>
                              <span className="text-[#5F6057] capitalize">
                                {' / '}{c.subcategory}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#5F6057]">{c.unitsSold}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#5F6057]">{c.orderCount}</td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-[#1F211C]">{formatCurrency(c.revenue)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#34452F] font-semibold">{c.salesContributionPercentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Brand Performance */}
              <section aria-label="Brand Performance" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                <div>
                  <h2 className="text-base font-serif font-bold text-[#1F211C]">
                    Brand Performance
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5F6057]">
                    Historical brand revenue velocity and contribution share
                  </p>
                </div>

                {(!brandsData?.brands || brandsData.brands.length === 0) ? (
                  <div className="p-8 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-center text-xs text-[#5F6057]">
                    No brand transactions recorded.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          <th scope="col" className="py-2 px-3 font-semibold">Brand</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-right">Products</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-right">Units</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-right">Revenue</th>
                          <th scope="col" className="py-2 px-3 font-semibold text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                        {brandsData.brands.map((b) => (
                          <tr key={b.brand} className="hover:bg-[#FAF7F0] transition-colors">
                            <td className="py-2.5 px-3 font-bold text-[#1F211C]">{b.brand}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#5F6057]">{b.productCount}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#5F6057]">{b.unitsSold}</td>
                            <td className="py-2.5 px-3 text-right font-bold font-mono text-[#1F211C]">{formatCurrency(b.revenue)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-[#34452F] font-semibold">{b.salesContributionPercentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* 5. Stock vs Sales (Inventory Velocity) */}
            <section aria-label="Stock vs Sales Analysis" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-serif font-bold text-[#1F211C]">
                    Stock vs. Sales Velocity
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5F6057]">
                    In-stock catalog items analyzed by sales velocity and sell-through rate (derived UI presentation indicators)
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] overflow-x-auto max-w-full">
                  {[
                    { key: 'all', label: `All In-Stock (${stockSalesData?.summary?.totalInStockProducts || 0})` },
                    { key: 'zero', label: `Zero Sales (${stockSalesData?.summary?.zeroSalesInStock || 0})` },
                    { key: 'slow', label: `Slow Moving (${stockSalesData?.summary?.slowMovingInStock || 0})` },
                    { key: 'healthy', label: `Healthy (${stockSalesData?.summary?.healthyVelocityInStock || 0})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStockFilter(tab.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        stockFilter === tab.key
                          ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                          : 'text-[#5F6057] hover:text-[#1F211C]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredStockSales.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-center text-xs text-[#5F6057]">
                  No products matched the selected velocity filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                        <th scope="col" className="py-2.5 px-3 font-semibold">Product</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">Brand</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Current Stock</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Units Sold</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Revenue</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Sell-Through</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-center">Velocity (UI Grouping)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                      {filteredStockSales.map((item) => (
                        <tr key={item.productId} className="hover:bg-[#FAF7F0] transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-medium text-[#1F211C] line-clamp-1">
                              {item.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#5F6057]">{item.brand}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#1F211C]">
                            {item.currentStock}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#5F6057]">
                            {item.unitsSold}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#1F211C]">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#34452F] font-semibold">
                            {item.sellThroughRate}%
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.velocity === 'zero' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#A65332]/10 text-[#A65332] border border-[#A65332]/25">
                                Zero Sales
                              </span>
                            )}
                            {item.velocity === 'slow' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#A86B2D]/10 text-[#A86B2D] border border-[#A86B2D]/25">
                                Slow Moving
                              </span>
                            )}
                            {item.velocity === 'healthy' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#3F6B45]/15 text-[#3F6B45] border border-[#3F6B45]/30">
                                Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 6. Zero-Sales Active Catalog Products */}
            <section aria-label="Zero-Sales Products Analysis" className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-serif font-bold text-[#1F211C]">
                    Zero-Sales Active Catalog Items
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5F6057]">
                    Active catalog products with zero qualifying sales in the selected period
                  </p>
                </div>

                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search zero-sales items…"
                    value={zeroSearch}
                    onChange={(e) => setZeroSearch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-xs text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                  />
                </div>
              </div>

              {filteredZeroSales.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-center text-xs text-[#5F6057]">
                  {zeroSearch ? 'No zero-sales products matched your search.' : 'All active products recorded sales in this period.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                        <th scope="col" className="py-2.5 px-3 font-semibold">Product</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">Taxonomy</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">Brand</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">In Stock</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-right">Price</th>
                        <th scope="col" className="py-2.5 px-3 font-semibold text-center">Observation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                      {filteredZeroSales.map((item) => (
                        <tr key={item.productId} className="hover:bg-[#FAF7F0] transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-medium text-[#1F211C] line-clamp-1">
                              {item.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#5F6057] capitalize">
                            {item.department ? `${item.department} / ` : ''}{item.subcategory || item.category}
                          </td>
                          <td className="py-3 px-3 text-[#1F211C]">{item.brand}</td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-[#1F211C]">
                            {item.currentStock}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-[#5F6057]">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#A86B2D]/10 text-[#A86B2D] border border-[#A86B2D]/25">
                              0 Units Sold in Window
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
