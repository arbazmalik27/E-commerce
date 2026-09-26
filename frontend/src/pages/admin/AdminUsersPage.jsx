import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectUser } from '../../features/auth/authSlice'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'
import AdminNav from '../../components/AdminNav'

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
          ? 'bg-[#34452F]/10 border-[#34452F]/25 text-[#34452F]'
          : 'bg-[#FAF7F0] border-[#DED7CA] text-[#5F6057]'
      }`}
    >
      {isAdmin ? (
        <svg className="w-3 h-3 text-[#34452F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-[#5F6057]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          ? 'bg-[#3F6B45]/10 border-[#3F6B45]/25 text-[#3F6B45]'
          : 'bg-[#A65332]/10 border-[#A65332]/25 text-[#A65332]'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[#3F6B45]' : 'bg-[#A65332]'}`}
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
      } else {
        setLoading(true)
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
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* =========================================================================
            SUB-NAVIGATION BAR
           ========================================================================= */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <AdminNav />
          <div className="flex items-center gap-2 text-xs font-medium text-[#5F6057]">
            <span className="h-2 w-2 rounded-full bg-[#34452F]" />
            <span>Store Membership & Access</span>
          </div>
        </div>

        {/* =========================================================================
            HEADER & NAVIGATION
           ========================================================================= */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b border-[#DED7CA]">
          <div>
            <div className="flex items-center gap-3">
              <Eyebrow variant="olive">USER DIRECTORY</Eyebrow>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20">
                Security & Roles
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#1F211C]">
                User Management
              </h1>
              <span className="inline-flex items-center rounded-full bg-[#FAF7F0] border border-[#DED7CA] px-3 py-1 text-xs font-mono font-bold text-[#34452F]">
                {totalCount} {totalCount === 1 ? 'Account' : 'Accounts'}
              </span>
            </div>

            <p className="mt-2 text-sm text-[#5F6057] max-w-2xl leading-relaxed">
              Inspect registered customer accounts, filter by role/status, toggle active login privileges, and safely manage admin roles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchUsers(true)}
              disabled={loading || isRefreshing}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFDF8] hover:bg-[#FAF7F0] text-[#1F211C] text-xs font-semibold border border-[#DED7CA] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              title="Refresh users directory"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#34452F]' : 'text-[#5F6057]'}`}
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
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-200 shadow-xl ${
              toast.type === 'success'
                ? 'bg-[#34452F] border-[#263722] text-[#FFFDF8]'
                : 'bg-[#A65332] border-[#8D4428] text-[#FFFDF8]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5 text-[#FFFDF8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[#FFFDF8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/70 hover:text-white p-1 rounded-md transition-colors"
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
          className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <label htmlFor="user-search" className="sr-only">
                Search users by name or email
              </label>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#85857A]">
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
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#85857A] hover:text-[#1F211C]"
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
                className="w-full py-2.5 px-3 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-sm text-[#1F211C] focus:outline-hidden focus:border-[#34452F] cursor-pointer transition-colors"
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
                className="w-full py-2.5 px-3 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-sm text-[#1F211C] focus:outline-hidden focus:border-[#34452F] cursor-pointer transition-colors"
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
          <div className="p-12 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] flex flex-col items-center justify-center space-y-4 shadow-xs">
            <svg className="w-8 h-8 text-[#34452F] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-sm text-[#5F6057]">Loading user accounts...</p>
          </div>
        )}

        {!loading && error && (
          <div className="p-8 rounded-2xl bg-[#A65332]/10 border border-[#A65332]/30 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#A65332]/15 border border-[#A65332]/25 mx-auto flex items-center justify-center text-[#A65332]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1F211C]">Failed to Load User Accounts</h2>
              <p className="mt-1 text-sm text-[#A65332]">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => fetchUsers()}
              className="px-4 py-2 rounded-xl bg-[#34452F] text-[#FFFDF8] hover:bg-[#263722] text-xs font-semibold transition-colors cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="p-12 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#DED7CA] mx-auto flex items-center justify-center text-[#5F6057]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#1F211C]">No Users Found</h2>
              <p className="mt-1 text-sm text-[#5F6057]">
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
                className="px-4 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] border border-[#DED7CA] text-xs font-semibold transition-colors cursor-pointer"
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
          <div className="hidden md:block rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#1F211C]">
                <thead className="bg-[#FAF7F0] border-b border-[#DED7CA] text-xs uppercase font-mono tracking-wider text-[#5F6057]">
                  <tr>
                    <th scope="col" className="py-4 pl-6 pr-3 font-semibold">User</th>
                    <th scope="col" className="py-4 px-3 font-semibold">Email Address</th>
                    <th scope="col" className="py-4 px-3 font-semibold">Role</th>
                    <th scope="col" className="py-4 px-3 font-semibold">Status</th>
                    <th scope="col" className="py-4 px-3 font-semibold">Joined Date</th>
                    <th scope="col" className="py-4 pl-3 pr-6 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DED7CA]/70">
                  {users.map((user) => {
                    const isSelf = user._id === currentUserId
                    const isActive = user.isActive !== false
                    const isAdmin = user.role === 'admin'
                    const userInitial = (user.name || user.email || 'U').charAt(0).toUpperCase()

                    return (
                      <tr
                        key={user._id}
                        className={`hover:bg-[#FAF7F0] transition-colors ${
                          isSelf ? 'bg-[#FAF7F0]/60' : ''
                        }`}
                      >
                        {/* User Identity */}
                        <td className="py-4 pl-6 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#EEE7DC] border border-[#DED7CA] flex items-center justify-center text-xs font-bold text-[#34452F] shrink-0">
                              {userInitial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#1F211C] truncate">
                                  {user.name || 'Unnamed User'}
                                </span>
                                {isSelf && (
                                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#34452F]/10 border border-[#34452F]/30 text-[#34452F] text-[10px] font-bold uppercase tracking-wider">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-[#85857A] font-mono truncate block">
                                ID: {user._id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-4 px-3 font-mono text-xs text-[#5F6057]">
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
                        <td className="py-4 px-3 text-xs text-[#5F6057]">
                          {formatDate(user.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-3 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isSelf ? (
                              <span className="text-xs text-[#85857A] italic pr-2 font-medium">
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
                                      ? 'bg-[#A86B2D]/10 border-[#A86B2D]/25 text-[#A86B2D] hover:bg-[#A86B2D]/20'
                                      : 'bg-[#34452F]/10 border-[#34452F]/25 text-[#34452F] hover:bg-[#34452F]/20'
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
                                      ? 'bg-[#A65332]/10 border-[#A65332]/25 text-[#A65332] hover:bg-[#A65332]/20'
                                      : 'bg-[#3F6B45]/10 border-[#3F6B45]/25 text-[#3F6B45] hover:bg-[#3F6B45]/20'
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
                  className={`rounded-2xl border p-5 shadow-xs space-y-4 ${
                    isSelf
                      ? 'bg-[#FFFDF8] border-[#34452F]/30'
                      : 'bg-[#FFFDF8] border-[#DED7CA]'
                  }`}
                >
                  {/* Card Header: Avatar, Name, Email, "You" Badge */}
                  <div className="flex items-start justify-between gap-3 border-b border-[#DED7CA]/70 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#EEE7DC] border border-[#DED7CA] flex items-center justify-center text-sm font-bold text-[#34452F] shrink-0">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-[#1F211C] truncate text-sm">
                            {user.name || 'Unnamed User'}
                          </h2>
                          {isSelf && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#34452F]/10 border border-[#34452F]/30 text-[#34452F] text-[10px] font-bold uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#5F6057] truncate font-mono">
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
                    <span className="text-[#85857A]">
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 border-t border-[#DED7CA]/70 flex items-center justify-end gap-2">
                    {isSelf ? (
                      <span className="text-xs text-[#85857A] italic py-1 font-medium">
                        Active Administrator (Self)
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenRoleModal(user)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer text-center ${
                            isAdmin
                              ? 'bg-[#A86B2D]/10 border-[#A86B2D]/25 text-[#A86B2D] hover:bg-[#A86B2D]/20'
                              : 'bg-[#34452F]/10 border-[#34452F]/25 text-[#34452F] hover:bg-[#34452F]/20'
                          }`}
                        >
                          {isAdmin ? 'Demote to Customer' : 'Promote to Admin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenStatusModal(user)}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer text-center ${
                            isActive
                              ? 'bg-[#A65332]/10 border-[#A65332]/25 text-[#A65332] hover:bg-[#A65332]/20'
                              : 'bg-[#3F6B45]/10 border-[#3F6B45]/25 text-[#3F6B45] hover:bg-[#3F6B45]/20'
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F211C]/60 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-[#FFFDF8] border border-[#DED7CA] p-6 sm:p-7 shadow-2xl space-y-5 text-[#1F211C]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Icon + Title */}
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    modal.isDanger
                      ? 'bg-[#A65332]/10 border-[#A65332]/25 text-[#A65332]'
                      : 'bg-[#34452F]/10 border-[#34452F]/25 text-[#34452F]'
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
                  <h2 id="modal-headline" className="text-base font-serif font-bold text-[#1F211C]">
                    {modal.title}
                  </h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#5F6057] leading-relaxed">
                    {modal.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#DED7CA]/70">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] text-xs font-semibold border border-[#DED7CA] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModalAction}
                  disabled={isSubmittingAction}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm ${
                    modal.isDanger
                      ? 'bg-[#A65332] hover:bg-[#8D4428] text-[#FFFDF8]'
                      : 'bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8]'
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
