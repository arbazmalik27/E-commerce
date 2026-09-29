import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { User, Shield, LogOut, Check, AlertCircle } from 'lucide-react'
import { updateUserProfile } from '../../features/auth/authSlice'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function AccountSettingsTab({ user, onLogout }) {
  const dispatch = useDispatch()

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.name || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(null)

  const handleSaveName = async (e) => {
    e.preventDefault()
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed.length < 2) {
      setProfileError('Name must be at least 2 characters')
      return
    }
    if (trimmed.length > 50) {
      setProfileError('Name cannot exceed 50 characters')
      return
    }

    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(null)

    try {
      const resultAction = await dispatch(updateUserProfile({ name: trimmed }))
      if (updateUserProfile.fulfilled.match(resultAction)) {
        setProfileSuccess('Profile name updated successfully!')
        setIsEditingName(false)
        setTimeout(() => setProfileSuccess(null), 3500)
      } else {
        setProfileError(resultAction.payload || 'Failed to update name')
      }
    } catch {
      setProfileError('An unexpected error occurred. Please try again.')
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── Subheader ──────────────────────────────────────────────────────── */}
      <div className="pb-4 border-b border-[#DED7CA]/70">
        <h2 className="font-serif text-2xl font-bold text-[#1F211C] tracking-tight">
          Account &amp; Security Settings
        </h2>
        <p className="text-xs sm:text-sm text-[#5F6057] mt-0.5">
          Manage your personal credentials, contact email, and session controls.
        </p>
      </div>

      {/* ── Feedback Banners ────────────────────────────────────────────────── */}
      {profileSuccess && (
        <div
          role="status"
          className="rounded-2xl border border-[#34452F]/30 bg-[#34452F]/10 px-5 py-3 text-xs sm:text-sm text-[#34452F] flex items-center gap-2.5 animate-in fade-in"
        >
          <Check className="h-4 w-4 shrink-0" />
          <span className="font-medium">{profileSuccess}</span>
        </div>
      )}

      {profileError && (
        <div
          role="alert"
          className="rounded-2xl border border-[#A65332]/30 bg-[#A65332]/10 px-5 py-3 text-xs sm:text-sm text-[#A65332] flex items-center gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{profileError}</span>
        </div>
      )}

      {/* ── Personal Details Section ────────────────────────────────────────── */}
      <section
        aria-labelledby="personal-info-heading"
        className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-7 shadow-xs space-y-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]/70">
          <div className="flex items-center gap-2.5">
            <User className="h-4 w-4 text-[#34452F]" aria-hidden="true" />
            <h3 id="personal-info-heading" className="font-serif text-lg font-bold text-[#1F211C]">
              Personal Information
            </h3>
          </div>
          {!isEditingName && (
            <button
              type="button"
              onClick={() => {
                setIsEditingName(true)
                setNameInput(user?.name || '')
                setProfileError(null)
              }}
              className="min-h-[40px] px-4 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
            >
              Edit Name
            </button>
          )}
        </div>

        {isEditingName ? (
          <form onSubmit={handleSaveName} className="max-w-md space-y-4">
            <div>
              <label
                htmlFor="edit-account-name"
                className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5"
              >
                Full Name *
              </label>
              <input
                id="edit-account-name"
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your full name"
                className="w-full min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2 text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors"
              />
              <span className="text-[11px] text-[#85857A] font-mono block mt-1">
                2 to 50 characters
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                {profileLoading ? 'Saving...' : 'Save Name'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingName(false)
                  setNameInput(user?.name || '')
                  setProfileError(null)
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
            <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]/70">
              <dt className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">
                Full Name
              </dt>
              <dd className="mt-1 font-semibold text-[#1F211C]">{user?.name || '—'}</dd>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]/70">
              <dt className="text-[11px] font-mono uppercase tracking-wider text-[#85857A] flex items-center justify-between">
                <span>Email Address</span>
                <span className="text-[10px] text-[#85857A] font-sans lowercase">read only</span>
              </dt>
              <dd className="mt-1 font-semibold text-[#1F211C] truncate">{user?.email || '—'}</dd>
              <p className="text-[10px] text-[#85857A] mt-1 font-mono">Primary login identifier</p>
            </div>
          </dl>
        )}
      </section>

      {/* ── Account Status & Privileges ──────────────────────────────────────── */}
      <section
        aria-labelledby="status-info-heading"
        className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-7 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#DED7CA]/70">
          <Shield className="h-4 w-4 text-[#34452F]" aria-hidden="true" />
          <h3 id="status-info-heading" className="font-serif text-lg font-bold text-[#1F211C]">
            Membership &amp; Role Details
          </h3>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]/70">
            <dt className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">
              Account Role
            </dt>
            <dd className="mt-1 font-semibold text-[#1F211C] uppercase font-mono">
              {user?.role || 'Customer'}
            </dd>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]/70">
            <dt className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">
              Account Status
            </dt>
            <dd className="mt-1 font-semibold text-[#3F6B45] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#3F6B45]" />
              Active Customer
            </dd>
          </div>
          <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]/70">
            <dt className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">
              Member Since
            </dt>
            <dd className="mt-1 font-semibold text-[#1F211C] font-mono text-xs">
              {formatDate(user?.createdAt)}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Session & Sign Out ──────────────────────────────────────────────── */}
      <section
        aria-labelledby="session-heading"
        className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h3 id="session-heading" className="font-serif text-lg font-bold text-[#1F211C]">
            Session Management
          </h3>
          <p className="text-xs sm:text-sm text-[#5F6057] mt-0.5">
            Safely terminate your current session on this device.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[44px] px-5 py-2 rounded-xl border border-[#A65332]/30 bg-[#A65332]/10 hover:bg-[#A65332]/20 text-[#A65332] font-semibold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A65332]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Sign Out of TrendVolt</span>
        </button>
      </section>
    </div>
  )
}

export default AccountSettingsTab
