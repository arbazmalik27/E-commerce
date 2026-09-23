import { Link } from 'react-router-dom'
import Eyebrow from '../../components/Eyebrow'

function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <Eyebrow text="CONTROL CENTER" />
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Administrator
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-neutral-400 max-w-2xl">
              Welcome back to TrendVolt Operations. Oversee catalog inventory, review and track customer orders, and manage luxury store logistics.
            </p>
          </div>
        </div>

        {/* Action Modules */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Products Management Card */}
          <Link
            to="/admin/products"
            className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-neutral-900/70 border border-white/10 hover:border-purple-500/50 hover:bg-neutral-900 transition-all duration-300 shadow-xl overflow-hidden focus:outline-hidden focus:ring-2 focus:ring-purple-500/50"
          >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-purple-600/10 blur-2xl group-hover:bg-purple-600/20 transition-all duration-300 pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-bold uppercase tracking-wide text-white group-hover:text-purple-300 transition-colors">
                Product Catalog
              </h2>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                Create new luxury pieces, edit existing listings, update real-time stock levels, and organize categories.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-purple-400 group-hover:text-purple-300">
              <span>Manage Products</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </Link>

          {/* Orders Management Card */}
          <Link
            to="/admin/orders"
            className="group relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-neutral-900/70 border border-white/10 hover:border-purple-500/50 hover:bg-neutral-900 transition-all duration-300 shadow-xl overflow-hidden focus:outline-hidden focus:ring-2 focus:ring-purple-500/50"
          >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-purple-600/10 blur-2xl group-hover:bg-purple-600/20 transition-all duration-300 pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-bold uppercase tracking-wide text-white group-hover:text-purple-300 transition-colors">
                Customer Orders
              </h2>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                Review verified customer purchases, track fulfillment progression, and update delivery status.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-purple-400 group-hover:text-purple-300">
              <span>Manage Orders</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </Link>

          {/* Quick Stats or Shortcuts Info */}
          <div className="p-6 sm:p-8 rounded-2xl bg-neutral-900/40 border border-white/5 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="mt-5 text-xl font-bold uppercase tracking-wide text-neutral-200">
                Security & Access
              </h2>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                You are authenticated as an authorized administrator. All modifications to the product catalog directly sync with the live MongoDB store.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Database Sync Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
