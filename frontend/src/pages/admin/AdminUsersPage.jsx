import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '../../features/auth/authSlice'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'

// ─── Formatters & Badges ───────────────────────────────────────────────────────

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

function RoleBadge({ role }) {
  const isAdmin = role === 'admin'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
        isAdmin
          ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
          : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
      }`}
    >
      {isAdmin ? (
        <svg className="w-3 h-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      )}
      <span className="capitalize">{role || 'Customer'}</span>
    </span>
  )
}

function StatusBadge({ isActive }) {
  const active = isActive !== false
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
        active
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          : 'bg-red-500/15 border-red-500/30 text-red-300'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`}
        aria-hidden="true"
      />
      {active ? 'Active' : 'Disabled'}
    </span>
  )
}

// ─── Main Admin Users Component ───────────────────────────────────────────────

function AdminUsersPage() {
  const currentUser = useSelector(selectUser)
  const currentUserId = currentUser?._id || currentUser?.id

  const [users, setUsers] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Notification Toast
  const [toast, setToast] = useState(null)

  // Confirmation Modal
  const [modal, setModal] = useState(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const fetchUsers = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true)
      }
      setError(null)

      try {
        const params = {}
        if (debouncedSearch) params.search = debouncedSearch
        if (roleFilter !== 'all') params.role = roleFilter
        if (statusFilter !== 'all') params.status = statusFilter

        const res = await api.get('/users/admin', { params })
        if (res.data?.success) {
          setUsers(res.data.users || [])
          setTotalCount(res.data.count ?? res.data.users?.length ?? 0)
        } else {
          setError(res.data?.message || 'Failed to fetch user directory.')
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Unable to connect to user management service. Please check your connection and try again.'
        )
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [debouncedSearch, roleFilter, statusFilter]
  )

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const params = {}
        if (debouncedSearch) params.search = debouncedSearch
        if (roleFilter !== 'all') params.role = roleFilter
        if (statusFilter !== 'all') params.status = statusFilter

        const res = await api.get('/users/admin', { params })
        if (!ignore && res.data?.success) {
          setUsers(res.data.users || [])
          setTotalCount(res.data.count ?? res.data.users?.length ?? 0)
        } else if (!ignore) {
          setError(res.data?.message || 'Failed to fetch user directory.')
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              'Unable to connect to user management service. Please check your connection and try again.'
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [debouncedSearch, roleFilter, statusFilter])

  // ─── Modal Action Handlers ──────────────────────────────────────────────────

  const handleOpenStatusModal = (user) => {
    const isCurrentlyActive = user.isActive !== false
    const nextStatus = !isCurrentlyActive

    setModal({
      type: 'status',
      user,
      nextValue: nextStatus,
      title: nextStatus ? 'Re-enable User Account' : 'Disable User Account',
      message: nextStatus
        ? `Are you sure you want to re-enable access for "${user.name}" (${user.email})? This user will regain the ability to log in.`
        : `Are you sure you want to disable access for "${user.name}" (${user.email})? This user will be immediately blocked from logging in.`,
      confirmLabel: nextStatus ? 'Enable Account' : 'Disable Account',
      isDanger: !nextStatus,
    })
  }

  const handleOpenRoleModal = (user) => {
    const isCurrentlyAdmin = user.role === 'admin'
    const nextRole = isCurrentlyAdmin ? 'customer' : 'admin'

    setModal({
      type: 'role',
      user,
      nextValue: nextRole,
      title: isCurrentlyAdmin ? 'Demote Admin to Customer' : 'Promote User to Admin',
      message: isCurrentlyAdmin
        ? `Are you sure you want to revoke administrator privileges from "${user.name}" (${user.email})? They will be demoted to a standard customer account and lose admin panel access.`
        : `Are you sure you want to promote "${user.name}" (${user.email}) to Administrator? They will receive full administrative control over orders, products, and users.`,
      confirmLabel: isCurrentlyAdmin ? 'Demote to Customer' : 'Promote to Admin',
      isDanger: isCurrentlyAdmin,
    })
  }

  const handleConfirmModalAction = async () => {
    if (!modal) return
    setIsSubmittingAction(true)

    try {
      if (modal.type === 'status') {
        const res = await api.patch(`/users/admin/${modal.user._id}/status`, {
          isActive: modal.nextValue,
        })
        if (res.data?.success) {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === modal.user._id ? { ...u, isActive: modal.nextValue } : u
            )
          )
          setToast({
            type: 'success',
            message: `Account status for "${modal.user.name}" updated to ${modal.nextValue ? 'Active' : 'Disabled'}.`,
          })
        }
      } else if (modal.type === 'role') {
        const res = await api.patch(`/users/admin/${modal.user._id}/role`, {
          role: modal.nextValue,
        })
        if (res.data?.success) {
          setUsers((prev) =>
            prev.map((u) =>
              u._id === modal.user._id ? { ...u, role: modal.nextValue } : u
            )
          )
          setToast({
            type: 'success',
            message: `Role for "${modal.user.name}" updated to ${modal.nextValue}.`,
          })
        }
      }
      setModal(null)
    } catch (err) {
      const errMsg =
        err.response?.data?.message || 'Failed to update user. Please try again.'
      setToast({
        type: 'error',
        message: errMsg,
      })
      setModal(null)
    } finally {
      setIsSubmittingAction(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* =========================================================================
            HEADER & NAVIGATION
           ========================================================================= */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-purple-300 transition-colors uppercase tracking-wider"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Admin Dashboard
              </Link>
              <span className="text-neutral-600">/</span>
              <Eyebrow text="User Directory" />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                User Management
              </h1>
              <span className="inline-flex items-center rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300">
                {totalCount} {totalCount === 1 ? 'Account' : 'Accounts'}
              </span>
            </div>

            <p className="mt-1 text-sm text-neutral-400">
              Inspect registered accounts, filter by role/status, toggle active login privileges, and configure admin roles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchUsers(true)}
              disabled={loading || isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh users directory"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : 'text-neutral-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        {/* =========================================================================
            TOAST NOTIFICATION BANNER
           ========================================================================= */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-lg ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/80 border-red-500/40 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-neutral-400 hover:text-white p-1 rounded-md transition-colors"
              aria-label="Dismiss toast"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* =========================================================================
            SEARCH & FILTERS TOOLBAR
           ========================================================================= */}
        <section
          aria-label="Search and filter users"
          className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 shadow-xl backdrop-blur-md"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <label htmlFor="user-search" className="sr-only">
                Search users by name or email
              </label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                id="user-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user name or email..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-neutral-950/80 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-purple-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Role Filter */}
            <div className="sm:col-span-3">
              <label htmlFor="role-filter" className="sr-only">
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-neutral-950/80 border border-white/10 text-sm text-neutral-200 focus:outline-hidden focus:border-purple-400 cursor-pointer transition-colors"
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers Only</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <label htmlFor="status-filter" className="sr-only">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-neutral-950/80 border border-white/10 text-sm text-neutral-200 focus:outline-hidden focus:border-purple-400 cursor-pointer transition-colors"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>
          </div>
        </section>

        {/* =========================================================================
            USERS CONTENT: LOADING, ERROR, EMPTY, OR LIST
           ========================================================================= */}
        {loading && (
          <div className="p-12 rounded-2xl bg-neutral-900/40 border border-white/10 flex flex-col items-center justify-center space-y-4">
            <svg className="w-8 h-8 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm text-neutral-400">Loading user accounts...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-8 rounded-2xl bg-red-950/30 border border-red-500/30 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center text-red-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Failed to Load User Accounts</h2>
              <p className="mt-1 text-sm text-red-300">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchUsers()}
              className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold border border-red-500/30 transition-colors cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="p-12 rounded-2xl bg-neutral-900/40 border border-white/10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-neutral-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">No Users Found</h2>
              <p className="mt-1 text-sm text-neutral-400">
                {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'No registered accounts match your active search or filter criteria.'
                  : 'There are currently no registered users in the database.'}
              </p>
            </div>
            {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setRoleFilter('all')
                  setStatusFilter('all')
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* =========================================================================
            DESKTOP TABLE (Screens >= 768px)
           ========================================================================= */}
        {!loading && !error && users.length > 0 && (
          <div className="hidden md:block rounded-2xl border border-white/10 bg-neutral-900/60 shadow-2xl backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-300">
                <thead className="bg-neutral-950/70 border-b border-white/10 text-xs uppercase font-mono tracking-wider text-neutral-400">
                  <tr>
                    <th scope="col" className="py-4 pl-6 pr-3">User</th>
                    <th scope="col" className="py-4 px-3">Email Address</th>
                    <th scope="col" className="py-4 px-3">Role</th>
                    <th scope="col" className="py-4 px-3">Status</th>
                    <th scope="col" className="py-4 px-3">Joined Date</th>
                    <th scope="col" className="py-4 pl-3 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => {
                    const isSelf = user._id === currentUserId
                    const isActive = user.isActive !== false
                    const isAdmin = user.role === 'admin'
                    const userInitial = (user.name || user.email || 'U').charAt(0).toUpperCase()

                    return (
                      <tr
                        key={user._id}
                        className={`hover:bg-white/5 transition-colors ${
                          isSelf ? 'bg-purple-950/15' : ''
                        }`}
                      >
                        {/* User Identity */}
                        <td className="py-4 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600/30 to-cyan-600/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {userInitial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white truncate">
                                  {user.name || 'Unnamed User'}
                                </span>
                                {isSelf && (
                                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-neutral-500 font-mono truncate block">
                                ID: {user._id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-3 font-mono text-xs text-neutral-300">
                          {user.email}
                        </td>

                        {/* Role Badge */}
                        <td className="py-4 px-3">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-3">
                          <StatusBadge isActive={user.isActive} />
                        </td>

                        {/* Joined Date */}
                        <td className="py-4 px-3 text-xs text-neutral-400">
                          {formatDate(user.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-3 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isSelf ? (
                              <span className="text-xs text-neutral-500 italic pr-2">
                                Current Admin
                              </span>
                            ) : (
                              <>
                                {/* Toggle Role Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenRoleModal(user)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer active:scale-95 ${
                                    isAdmin
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                                      : 'bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                                  }`}
                                  title={isAdmin ? 'Demote to Customer' : 'Promote to Admin'}
                                >
                                  {isAdmin ? 'Demote' : 'Promote'}
                                </button>

                                {/* Toggle Status Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenStatusModal(user)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer active:scale-95 ${
                                    isActive
                                      ? 'bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20'
                                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                                  }`}
                                  title={isActive ? 'Disable User' : 'Enable User'}
                                >
                                  {isActive ? 'Disable' : 'Enable'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            MOBILE RESPONSIVE CARDS (Screens < 768px)
           ========================================================================= */}
        {!loading && !error && users.length > 0 && (
          <div className="md:hidden space-y-4">
            {users.map((user) => {
              const isSelf = user._id === currentUserId
              const isActive = user.isActive !== false
              const isAdmin = user.role === 'admin'
              const userInitial = (user.name || user.email || 'U').charAt(0).toUpperCase()

              return (
                <article
                  key={user._id}
                  className={`rounded-2xl border p-5 shadow-xl backdrop-blur-md space-y-4 ${
                    isSelf
                      ? 'bg-neutral-900/90 border-purple-500/30'
                      : 'bg-neutral-900/70 border-white/10'
                  }`}
                >
                  {/* Card Header: Avatar, Name, Email, "You" Badge */}
                  <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600/30 to-cyan-600/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-white truncate text-sm">
                            {user.name || 'Unnamed User'}
                          </h2>
                          {isSelf && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate font-mono">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Details: Badges & Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={user.role} />
                      <StatusBadge isActive={user.isActive} />
                    </div>
                    <span className="text-neutral-500">
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-end gap-2">
                    {isSelf ? (
                      <span className="text-xs text-neutral-500 italic py-1">
                        Active Administrator (Self)
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenRoleModal(user)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer text-center ${
                            isAdmin
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                              : 'bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                          }`}
                        >
                          {isAdmin ? 'Demote to Customer' : 'Promote to Admin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(user)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer text-center ${
                            isActive
                              ? 'bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                          }`}
                        >
                          {isActive ? 'Disable User' : 'Enable User'}
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* =========================================================================
            CONFIRMATION MODAL
           ========================================================================= */}
        {modal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Icon + Title */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    modal.isDanger
                      ? 'bg-red-500/10 border-red-500/20 text-red-400'
                      : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                  }`}
                >
                  {modal.isDanger ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 id="modal-headline" className="text-base font-bold text-white">
                    {modal.title}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-neutral-300 leading-relaxed">
                    {modal.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModalAction}
                  disabled={isSubmittingAction}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95 disabled:opacity-50 ${
                    modal.isDanger
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isSubmittingAction && (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  <span>{isSubmittingAction ? 'Processing...' : modal.confirmLabel}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminUsersPage
