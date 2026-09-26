import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'
import AdminNav from '../../components/AdminNav'

// ─── Formatters & Style Tokens ───────────────────────────────────────────────

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ORDER_STATUS_STYLES = {
  pending:    { bg: 'bg-[#FAF7F0]',       border: 'border-[#DED7CA]',       text: 'text-[#A86B2D]', dot: 'bg-[#A86B2D]', label: 'Pending'     },
  confirmed:  { bg: 'bg-[#34452F]/10',    border: 'border-[#34452F]/20',    text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Confirmed'   },
  processing: { bg: 'bg-[#FAF7F0]',       border: 'border-[#DED7CA]',       text: 'text-[#5F6057]', dot: 'bg-[#5F6057]', label: 'Processing'  },
  shipped:    { bg: 'bg-[#34452F]/10',    border: 'border-[#34452F]/25',    text: 'text-[#34452F]', dot: 'bg-[#34452F]', label: 'Shipped'     },
  delivered:  { bg: 'bg-[#3F6B45]/15',    border: 'border-[#3F6B45]/30',    text: 'text-[#3F6B45]', dot: 'bg-[#3F6B45]', label: 'Delivered'   },
  cancelled:  { bg: 'bg-[#A65332]/10',    border: 'border-[#A65332]/25',    text: 'text-[#A65332]', dot: 'bg-[#A65332]', label: 'Cancelled'   },
}

const PAYMENT_STATUS_STYLES = {
  pending: { bg: 'bg-[#FAF7F0]',    border: 'border-[#DED7CA]',    text: 'text-[#A86B2D]', label: 'Pending' },
  paid:    { bg: 'bg-[#34452F]/10', border: 'border-[#34452F]/20', text: 'text-[#34452F]', label: 'Paid'    },
  failed:  { bg: 'bg-[#A65332]/10', border: 'border-[#A65332]/20', text: 'text-[#A65332]', label: 'Failed'  },
}

function OrderStatusBadge({ status }) {
  const s = ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  )
}

function PaymentStatusBadge({ status }) {
  const s = PAYMENT_STATUS_STYLES[status] || PAYMENT_STATUS_STYLES.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      {s.label}
    </span>
  )
}

// ─── Main Admin Dashboard Component ─────────────────────────────────────────

function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchDashboard = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const res = await api.get('/orders/admin/dashboard')
      if (res.data?.success) {
        setData(res.data)
      } else {
        setError(res.data?.message || 'Failed to load live dashboard statistics.')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to connect to dashboard service. Please check your connection and try again.'
      )
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const stats = data?.stats
  const recentOrders = data?.recentOrders || []

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        {/* ── Sub Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <AdminNav />
          <div className="flex items-center gap-2 text-xs font-medium text-[#5F6057]">
            <span className="h-2 w-2 rounded-full bg-[#34452F] animate-pulse" />
            <span>Live Store Operations</span>
          </div>
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#DED7CA]">
          <div>
            <div className="flex items-center gap-3">
              <Eyebrow variant="olive">CONTROL CENTER</Eyebrow>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20">
                Administrator
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#1F211C]">
              Operations Dashboard
            </h1>
            <p className="mt-2 text-sm text-[#5F6057] max-w-2xl leading-relaxed">
              Real-time TrendVolt fashion overview: gross verified revenue, customer orders, active catalog inventory, and fulfillment pipeline.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchDashboard(true)}
              disabled={loading || isRefreshing}
              aria-label="Refresh dashboard data"
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

        {/* ── Error State ─────────────────────────────────────────────────── */}
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
                  Dashboard Sync Failed
                </h3>
                <p className="mt-1 text-xs text-[#A65332] leading-relaxed max-w-xl">
                  {error}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchDashboard(false)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#34452F] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Loading Skeleton ────────────────────────────────────────────── */}
        {loading && (
          <div aria-busy="true" aria-label="Loading dashboard" className="space-y-10 animate-pulse">
            {/* Primary KPI Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-3 shadow-xs">
                  <div className="h-4 w-24 bg-[#EEE7DC] rounded" />
                  <div className="h-8 w-32 bg-[#EEE7DC] rounded" />
                  <div className="h-3 w-40 bg-[#EEE7DC] rounded pt-1" />
                </div>
              ))}
            </div>

            {/* Status Skeletons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#FFFDF8] border border-[#DED7CA] space-y-2 shadow-xs">
                  <div className="h-3 w-16 bg-[#EEE7DC] rounded" />
                  <div className="h-6 w-12 bg-[#EEE7DC] rounded" />
                </div>
              ))}
            </div>

            {/* Recent Orders Skeleton */}
            <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] space-y-4 shadow-xs">
              <div className="h-5 w-40 bg-[#EEE7DC] rounded" />
              <div className="h-48 w-full bg-[#FAF7F0] rounded-xl" />
            </div>
          </div>
        )}

        {/* ── Live Dashboard Content ──────────────────────────────────────── */}
        {!loading && stats && (
          <div className="space-y-10">
            {/* 1. Primary Live KPI Cards Grid */}
            <section aria-label="Key Performance Indicators">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                      {formatCurrency(stats.totalRevenue)}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Verified paid orders</span>
                    <span className="font-semibold text-[#3F6B45]">Completed</span>
                  </div>
                </div>

                {/* Total Orders */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                        Total Orders
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {Number(stats.totalOrders || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Lifetime customer orders</span>
                    <Link to="/admin/orders" className="text-[#34452F] hover:text-[#263722] font-semibold">
                      View →
                    </Link>
                  </div>
                </div>

                {/* Total Products */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                        Total Products
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {Number(stats.totalProducts || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Fashion catalog items</span>
                    <Link to="/admin/products" className="text-[#34452F] hover:text-[#263722] font-semibold">
                      Catalog →
                    </Link>
                  </div>
                </div>

                {/* Total Users */}
                <Link
                  to="/admin/users"
                  className="relative overflow-hidden p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col justify-between group hover:border-[#34452F]/40 hover:bg-[#FAF7F0] transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#5F6057] group-hover:text-[#1F211C] transition-colors">
                        Total Users
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F] group-hover:scale-105 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1F211C]">
                      {Number(stats.totalUsers || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-[11px] text-[#5F6057]">
                    <span>Manage directory</span>
                    <span className="font-semibold text-[#34452F] group-hover:underline">View Users →</span>
                  </div>
                </Link>
              </div>
            </section>

            {/* 2. Order Status Pipeline Breakdown */}
            <section aria-label="Order Fulfillment Pipeline">
              <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#34452F]" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#1F211C]">
                      Fulfillment Pipeline
                    </h2>
                  </div>
                  <span className="text-xs text-[#85857A]">Active status distribution</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Pending */}
                  <Link
                    to="/admin/orders"
                    className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] hover:border-[#A86B2D]/40 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#A86B2D]">
                      <span>Pending</span>
                      <span className="h-2 w-2 rounded-full bg-[#A86B2D] animate-pulse" />
                    </div>
                    <div className="mt-3 text-2xl font-serif font-bold text-[#1F211C]">
                      {Number(stats.pendingOrders || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="mt-1 text-[11px] text-[#85857A]">Awaiting confirmation</span>
                  </Link>

                  {/* Processing */}
                  <Link
                    to="/admin/orders"
                    className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] hover:border-[#34452F]/40 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#5F6057]">
                      <span>Processing</span>
                      <span className="h-2 w-2 rounded-full bg-[#5F6057]" />
                    </div>
                    <div className="mt-3 text-2xl font-serif font-bold text-[#1F211C]">
                      {Number(stats.processingOrders || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="mt-1 text-[11px] text-[#85857A]">Packing & staging</span>
                  </Link>

                  {/* Shipped */}
                  <Link
                    to="/admin/orders"
                    className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] hover:border-[#34452F]/40 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#34452F]">
                      <span>Shipped</span>
                      <span className="h-2 w-2 rounded-full bg-[#34452F]" />
                    </div>
                    <div className="mt-3 text-2xl font-serif font-bold text-[#1F211C]">
                      {Number(stats.shippedOrders || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="mt-1 text-[11px] text-[#85857A]">In transit</span>
                  </Link>

                  {/* Delivered */}
                  <Link
                    to="/admin/orders"
                    className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] hover:border-[#3F6B45]/40 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#3F6B45]">
                      <span>Delivered</span>
                      <span className="h-2 w-2 rounded-full bg-[#3F6B45]" />
                    </div>
                    <div className="mt-3 text-2xl font-serif font-bold text-[#1F211C]">
                      {Number(stats.deliveredOrders || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="mt-1 text-[11px] text-[#85857A]">Fulfilled successfully</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* 3. Recent Customer Orders Section */}
            <section aria-label="Recent Customer Orders" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold tracking-tight text-[#1F211C]">
                    Recent Orders
                  </h2>
                  <p className="text-xs text-[#5F6057]">
                    Latest 5 customer transactions sorted by newest first
                  </p>
                </div>
                <Link
                  to="/admin/orders"
                  className="text-xs font-semibold text-[#34452F] hover:text-[#263722] flex items-center gap-1 uppercase tracking-wider transition-colors"
                >
                  <span>View All Orders</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                /* Empty state */
                <div className="p-12 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#DED7CA] flex items-center justify-center text-[#5F6057]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-serif font-bold text-[#1F211C]">No Orders Placed Yet</h3>
                  <p className="text-xs text-[#5F6057] max-w-sm">
                    As customers checkout on TrendVolt, verified customer purchases and fulfillment status will appear here.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs overflow-hidden">
                  {/* Desktop / Tablet Table (visible >= 640px) */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                          <th className="py-3.5 px-4 font-semibold">Order</th>
                          <th className="py-3.5 px-4 font-semibold">Customer</th>
                          <th className="py-3.5 px-4 font-semibold">Date</th>
                          <th className="py-3.5 px-4 font-semibold">Amount</th>
                          <th className="py-3.5 px-4 font-semibold">Payment</th>
                          <th className="py-3.5 px-4 font-semibold">Status</th>
                          <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DED7CA]/70 text-xs">
                        {recentOrders.map((order) => (
                          <tr key={order._id} className="hover:bg-[#FAF7F0] transition-colors group">
                            <td className="py-3.5 px-4 font-mono font-medium text-[#1F211C]">
                              {order.orderNumber}
                            </td>
                            <td className="py-3.5 px-4 text-[#5F6057]">
                              <div className="font-medium text-[#1F211C] truncate max-w-[140px]">
                                {order.user?.name || 'Customer'}
                              </div>
                              <div className="text-[11px] text-[#85857A] truncate max-w-[140px]">
                                {order.user?.email || '—'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#5F6057] whitespace-nowrap">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-[#1F211C] whitespace-nowrap">
                              {formatCurrency(order.totalAmount)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <PaymentStatusBadge status={order.paymentStatus} />
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <OrderStatusBadge status={order.orderStatus} />
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <Link
                                to="/admin/orders"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34452F] hover:text-[#263722] uppercase tracking-wider transition-colors"
                              >
                                Manage →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Cards (visible < 640px) */}
                  <div className="sm:hidden divide-y divide-[#DED7CA]/70">
                    {recentOrders.map((order) => (
                      <div key={order._id} className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[#1F211C]">
                            {order.orderNumber}
                          </span>
                          <span className="font-bold text-sm text-[#1F211C]">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#5F6057]">
                          <span className="truncate max-w-[180px]">
                            {order.user?.name || order.user?.email || 'Customer'}
                          </span>
                          <span>{formatDate(order.createdAt)}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <OrderStatusBadge status={order.orderStatus} />
                            <PaymentStatusBadge status={order.paymentStatus} />
                          </div>
                          <Link
                            to="/admin/orders"
                            className="text-xs font-semibold text-[#34452F] hover:text-[#263722] uppercase tracking-wider"
                          >
                            Manage →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 4. Action Shortcuts (Product Catalog, Customer Orders & User Management) */}
            <section aria-label="Administrative Modules" className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Products Management Card */}
                <Link
                  to="/admin/products"
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] hover:border-[#34452F]/40 hover:bg-[#FAF7F0] transition-all duration-300 shadow-xs"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F] group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 className="mt-4 text-base font-serif font-bold text-[#1F211C] group-hover:text-[#34452F] transition-colors">
                      Product Catalog
                    </h3>
                    <p className="mt-1.5 text-xs text-[#5F6057] leading-relaxed">
                      Add luxury pieces, edit listings, update stock levels, and configure category taxonomy.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#34452F] group-hover:text-[#263722]">
                    <span>Manage Products</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </Link>

                {/* Orders Management Card */}
                <Link
                  to="/admin/orders"
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] hover:border-[#34452F]/40 hover:bg-[#FAF7F0] transition-all duration-300 shadow-xs"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F] group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="mt-4 text-base font-serif font-bold text-[#1F211C] group-hover:text-[#34452F] transition-colors">
                      Customer Orders
                    </h3>
                    <p className="mt-1.5 text-xs text-[#5F6057] leading-relaxed">
                      Update order statuses, verify customer shipping details, and track order fulfillment.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#34452F] group-hover:text-[#263722]">
                    <span>Manage Orders</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </Link>

                {/* Users Management Card */}
                <Link
                  to="/admin/users"
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] hover:border-[#34452F]/40 hover:bg-[#FAF7F0] transition-all duration-300 shadow-xs"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F] group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                    </div>
                    <h3 className="mt-4 text-base font-serif font-bold text-[#1F211C] group-hover:text-[#34452F] transition-colors">
                      User Management
                    </h3>
                    <p className="mt-1.5 text-xs text-[#5F6057] leading-relaxed">
                      Search user accounts, review roles, toggle account access, and manage administrative privileges.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#DED7CA]/70 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#34452F] group-hover:text-[#263722]">
                    <span>Manage Users</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboardPage
