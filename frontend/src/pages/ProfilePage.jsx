import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  selectUser,
  updateUserProfile,
} from '../features/auth/authSlice'
import api from '../services/api'
import Eyebrow from '../components/Eyebrow'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return 'Recent Member'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'TV'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const INITIAL_ADDRESS_FORM = {
  fullName: '',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
}

function ProfilePage() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)

  // Auto scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // ─── Profile Edit State ────────────────────────────────────────────────────
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [prevUserName, setPrevUserName] = useState(user?.name || '')
  const [profileName, setProfileName] = useState(user?.name || '')

  if (user?.name && prevUserName !== user.name) {
    setPrevUserName(user.name)
    setProfileName(user.name)
  }

  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(null)

  // ─── Addresses State ───────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [addressesError, setAddressesError] = useState(null)

  // Address Modal State: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState(null)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(INITIAL_ADDRESS_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formServerError, setFormServerError] = useState(null)

  // Address Delete Confirm State
  const [deletingAddressId, setDeletingAddressId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // General Notification / Feedback Banner
  const [feedbackMessage, setFeedbackMessage] = useState(null)

  // Fetch saved addresses from backend
  const fetchAddresses = async () => {
    setAddressesLoading(true)
    setAddressesError(null)
    try {
      const res = await api.get('/users/addresses')
      if (res.data?.success && Array.isArray(res.data.addresses)) {
        setAddresses(res.data.addresses)
      } else {
        setAddresses([])
      }
    } catch {
      setAddressesError('Unable to load saved addresses. Please check your connection.')
    } finally {
      setAddressesLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  // Auto-dismiss feedback message after 4 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timer = setTimeout(() => setFeedbackMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedbackMessage])

  // ─── Profile Update Handler ────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    const trimmed = profileName.trim()
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
        setProfileSuccess('Profile updated successfully!')
        setIsEditingProfile(false)
        setTimeout(() => setProfileSuccess(null), 3500)
      } else {
        setProfileError(resultAction.payload || 'Failed to update profile')
      }
    } catch {
      setProfileError('An unexpected error occurred. Please try again.')
    } finally {
      setProfileLoading(false)
    }
  }

  // ─── Address Form Handlers ─────────────────────────────────────────────────
  const openAddModal = () => {
    setAddressForm({
      ...INITIAL_ADDRESS_FORM,
      fullName: user?.name || '',
      isDefault: addresses.length === 0,
    })
    setFormErrors({})
    setFormServerError(null)
    setEditingAddressId(null)
    setModalMode('add')
  }

  const openEditModal = (addr) => {
    setAddressForm({
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      addressLine: addr.addressLine || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      country: addr.country || 'India',
      isDefault: Boolean(addr.isDefault),
    })
    setFormErrors({})
    setFormServerError(null)
    setEditingAddressId(addr._id)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingAddressId(null)
    setAddressForm(INITIAL_ADDRESS_FORM)
    setFormErrors({})
    setFormServerError(null)
  }

  const handleAddressInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validateAddressForm = () => {
    const errors = {}
    const { fullName, phone, addressLine, city, state, postalCode, country } = addressForm

    if (!fullName.trim()) errors.fullName = 'Full name is required'
    if (!phone.trim()) {
      errors.phone = 'Phone number is required'
    } else if (phone.trim().length < 5 || phone.trim().length > 20) {
      errors.phone = 'Phone must be between 5 and 20 digits'
    }
    if (!addressLine.trim()) errors.addressLine = 'Street address is required'
    if (!city.trim()) errors.city = 'City is required'
    if (!state.trim()) errors.state = 'State is required'
    if (!postalCode.trim()) errors.postalCode = 'PIN / Postal code is required'
    if (!country.trim()) errors.country = 'Country is required'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddressSubmit = async (e) => {
    e.preventDefault()
    if (!validateAddressForm()) return

    setFormSubmitting(true)
    setFormServerError(null)

    try {
      if (modalMode === 'add') {
        const res = await api.post('/users/addresses', addressForm)
        if (res.data?.success) {
          setAddresses(res.data.addresses)
          closeModal()
          setFeedbackMessage('Delivery address saved successfully!')
        }
      } else if (modalMode === 'edit' && editingAddressId) {
        const res = await api.put(`/users/addresses/${editingAddressId}`, addressForm)
        if (res.data?.success) {
          setAddresses(res.data.addresses)
          closeModal()
          setFeedbackMessage('Address updated successfully!')
        }
      }
    } catch (err) {
      setFormServerError(
        err.response?.data?.message ||
          (err.response?.data?.errors
            ? Object.values(err.response.data.errors).join(', ')
            : 'Failed to save address. Please try again.')
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  // ─── Set Default Address Handler ───────────────────────────────────────────
  const handleSetDefault = async (addrId) => {
    try {
      const res = await api.patch(`/users/addresses/${addrId}/default`)
      if (res.data?.success) {
        setAddresses(res.data.addresses)
        setFeedbackMessage('Default delivery address updated.')
      }
    } catch {
      setFeedbackMessage('Failed to update default address. Please try again.')
    }
  }

  // ─── Delete Address Handler ────────────────────────────────────────────────
  const handleDeleteAddress = async () => {
    if (!deletingAddressId) return
    setDeleteSubmitting(true)
    try {
      const res = await api.delete(`/users/addresses/${deletingAddressId}`)
      if (res.data?.success) {
        setAddresses(res.data.addresses)
        setDeletingAddressId(null)
        setFeedbackMessage('Address deleted successfully.')
      }
    } catch {
      setFeedbackMessage('Failed to delete address. Please try again.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Navigation Breadcrumbs */}
        <nav
          aria-label="Breadcrumbs"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#5F6057]"
        >
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#1F211C] transition-colors">
              Home
            </Link>
            <span aria-hidden="true" className="text-[#DED7CA]">/</span>
            <span className="text-[#1F211C] font-semibold">My Profile</span>
          </div>

          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34452F] hover:text-[#263722] transition-colors"
          >
            <span>View My Orders</span>
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </nav>

        {/* Page Header */}
        <header className="mb-8 sm:mb-10">
          <Eyebrow variant="olive" className="mb-3">CUSTOMER ACCOUNT</Eyebrow>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1F211C] tracking-tight mb-2">
            Account &amp; Addresses
          </h1>
          <p className="text-sm sm:text-base text-[#5F6057] max-w-2xl">
            Manage your personal profile information, account credentials, and saved shipping destinations.
          </p>
        </header>

        {/* Global Action Feedback Alert */}
        {feedbackMessage && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-[#34452F]/30 bg-[#34452F]/10 px-5 py-3.5 text-sm text-[#34452F] flex items-center justify-between shadow-xs animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2.5">
              <svg className="h-5 w-5 text-[#34452F] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">{feedbackMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-[#5F6057] hover:text-[#1F211C] text-sm ml-2 cursor-pointer p-1"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* ===================================================================
              1. PERSONAL PROFILE SECTION
             =================================================================== */}
          <section
            aria-labelledby="profile-heading"
            className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DED7CA]/70">
              <div className="flex items-center gap-4">
                {/* Initials Avatar */}
                <div className="h-16 w-16 rounded-2xl bg-[#34452F] flex items-center justify-center text-[#FFFDF8] font-serif font-bold text-xl tracking-wider shadow-xs shrink-0">
                  {getInitials(user?.name)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 id="profile-heading" className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C] tracking-tight">
                      {user?.name || 'Customer'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-[11px] font-mono font-bold text-[#5F6057] uppercase tracking-wide">
                      {user?.role || 'Customer'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#85857A] mt-1 font-mono">
                    Member since {formatDate(user?.createdAt)}
                  </p>
                </div>
              </div>

              {/* Edit Profile Toggle Button */}
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(true)
                    setProfileError(null)
                    setProfileSuccess(null)
                  }}
                  className="min-h-[44px] px-5 py-2 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#EEE7DC] text-[#1F211C] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {/* Profile Information or Edit Form */}
            <div className="mt-6">
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="max-w-md space-y-4">
                  <div>
                    <label htmlFor="profile-name-input" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="profile-name-input"
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      minLength={2}
                      maxLength={50}
                      className="w-full min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2 text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors"
                    />
                  </div>

                  {profileError && (
                    <p className="text-xs text-[#A65332] font-medium">{profileError}</p>
                  )}
                  {profileSuccess && (
                    <p className="text-xs text-[#3F6B45] font-medium">{profileSuccess}</p>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="min-h-[44px] px-6 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                    >
                      {profileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false)
                        setProfileName(user?.name || '')
                        setProfileError(null)
                      }}
                      className="min-h-[44px] px-5 py-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
                  <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]/70">
                    <dt className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">Full Name</dt>
                    <dd className="mt-1 font-semibold text-[#1F211C]">{user?.name || '—'}</dd>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]/70">
                    <dt className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">Email Address</dt>
                    <dd className="mt-1 font-semibold text-[#1F211C] truncate">{user?.email || '—'}</dd>
                    <span className="text-[11px] text-[#85857A] block mt-0.5 font-mono">Primary login identifier</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]/70">
                    <dt className="text-[11px] font-mono uppercase tracking-wider text-[#85857A]">Account Status</dt>
                    <dd className="mt-1 font-semibold text-[#3F6B45] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#3F6B45] inline-block" />
                      Active Customer
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </section>

          {/* ===================================================================
              2. SAVED DELIVERY ADDRESSES SECTION
             =================================================================== */}
          <section
            aria-labelledby="addresses-heading"
            className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 shadow-xs"
          >
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DED7CA]/70">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 id="addresses-heading" className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C]">
                    Delivery Addresses
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-xs font-mono font-bold text-[#5F6057]">
                    {addresses.length}
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-[#5F6057]">
                  Manage multiple shipping destinations for speedy checkout.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddModal}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Add New Address</span>
              </button>
            </div>

            {/* Addresses Grid / Skeleton / Empty State */}
            <div className="mt-6">
              {addressesLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1].map((i) => (
                    <div key={i} className="p-5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] space-y-3 animate-pulse">
                      <div className="h-4 w-32 bg-[#EEE7DC] rounded-full" />
                      <div className="h-3 w-48 bg-[#EEE7DC] rounded-full" />
                      <div className="h-3 w-28 bg-[#EEE7DC] rounded-full" />
                      <div className="h-8 w-full bg-[#EEE7DC] rounded-xl pt-2" />
                    </div>
                  ))}
                </div>
              )}

              {!addressesLoading && addressesError && (
                <div className="p-6 text-center rounded-xl bg-[#A65332]/10 border border-[#A65332]/20 text-[#A65332]">
                  <p className="text-sm">{addressesError}</p>
                  <button
                    type="button"
                    onClick={fetchAddresses}
                    className="mt-3 text-xs font-bold underline underline-offset-4 hover:text-[#8F452B] cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!addressesLoading && !addressesError && addresses.length === 0 && (
                <div className="py-12 px-6 text-center max-w-md mx-auto rounded-2xl border border-dashed border-[#DED7CA] bg-[#FAF7F0]">
                  <div className="h-12 w-12 rounded-full bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center mx-auto text-[#34452F] mb-3">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#1F211C]">No Saved Addresses Yet</h3>
                  <p className="mt-1 text-xs text-[#5F6057] leading-relaxed">
                    You haven&apos;t saved any shipping destinations. Add an address now to accelerate your checkout process.
                  </p>
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="mt-5 min-h-[44px] px-6 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                  >
                    Add Delivery Address
                  </button>
                </div>
              )}

              {!addressesLoading && !addressesError && addresses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className={`relative p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                        addr.isDefault
                          ? 'border-2 border-[#34452F] bg-[#FAF7F0] shadow-xs'
                          : 'border border-[#DED7CA] bg-[#FFFDF8] hover:border-[#85857A]'
                      }`}
                    >
                      {/* Top Row: Name + Default Badge */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F211C]">{addr.fullName}</h3>
                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#34452F]/10 border border-[#34452F]/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#34452F] uppercase tracking-wide shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#34452F]" />
                              Default
                            </span>
                          )}
                        </div>

                        {/* Address Details */}
                        <div className="space-y-1 text-xs sm:text-sm text-[#5F6057]">
                          <p className="leading-relaxed text-[#1F211C]">{addr.addressLine}</p>
                          <p className="leading-relaxed">
                            {addr.city}, {addr.state} — <span className="font-mono font-semibold text-[#1F211C]">{addr.postalCode}</span>
                          </p>
                          <p className="text-[#85857A]">{addr.country}</p>
                          <p className="pt-2 text-xs text-[#85857A] flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 text-[#5F6057]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="font-mono text-[#5F6057]">{addr.phone}</span>
                          </p>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-5 pt-4 border-t border-[#DED7CA]/70 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(addr._id)}
                              className="text-xs text-[#34452F] hover:text-[#263722] font-semibold cursor-pointer transition-colors"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(addr)}
                            className="min-h-[36px] px-3.5 rounded-lg border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-xs font-semibold text-[#1F211C] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAddressId(addr._id)}
                            className="min-h-[36px] px-3.5 rounded-lg border border-[#A65332]/30 bg-[#A65332]/10 hover:bg-[#A65332]/20 text-xs font-semibold text-[#A65332] hover:text-[#8F452B] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A65332]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* =======================================================================
          MODAL: ADD / EDIT ADDRESS DIALOG
         ======================================================================= */}
      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1F211C]/60 backdrop-blur-sm overflow-y-auto"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]/70">
              <h3 id="modal-title" className="font-serif text-xl font-bold text-[#1F211C]">
                {modalMode === 'add' ? 'Add New Address' : 'Edit Delivery Address'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close dialog"
                className="h-8 w-8 rounded-full border border-[#DED7CA] flex items-center justify-center text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0] transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Error message */}
            {formServerError && (
              <div className="mt-4 p-3.5 rounded-xl bg-[#A65332]/10 border border-[#A65332]/30 text-xs text-[#A65332]">
                {formServerError}
              </div>
            )}

            {/* Address Form */}
            <form onSubmit={handleAddressSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addr-fullName" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                    Full Name *
                  </label>
                  <input
                    id="addr-fullName"
                    name="fullName"
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={handleAddressInputChange}
                    placeholder="Recipient's Name"
                    className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-3.5 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors ${
                      formErrors.fullName ? 'border-[#A65332]' : 'border-[#DED7CA]'
                    }`}
                  />
                  {formErrors.fullName && <p className="text-[11px] text-[#A65332] mt-1">{formErrors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor="addr-phone" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="addr-phone"
                    name="phone"
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={handleAddressInputChange}
                    placeholder="10-digit mobile number"
                    className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-3.5 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors font-mono ${
                      formErrors.phone ? 'border-[#A65332]' : 'border-[#DED7CA]'
                    }`}
                  />
                  {formErrors.phone && <p className="text-[11px] text-[#A65332] mt-1">{formErrors.phone}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="addr-addressLine" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                  Street Address &amp; House/Flat No. *
                </label>
                <input
                  id="addr-addressLine"
                  name="addressLine"
                  type="text"
                  required
                  value={addressForm.addressLine}
                  onChange={handleAddressInputChange}
                  placeholder="e.g. 42 MG Road, Indiranagar"
                  className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-3.5 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors ${
                    formErrors.addressLine ? 'border-[#A65332]' : 'border-[#DED7CA]'
                  }`}
                />
                {formErrors.addressLine && <p className="text-[11px] text-[#A65332] mt-1">{formErrors.addressLine}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="addr-city" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                    City *
                  </label>
                  <input
                    id="addr-city"
                    name="city"
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={handleAddressInputChange}
                    placeholder="City"
                    className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-3 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors ${
                      formErrors.city ? 'border-[#A65332]' : 'border-[#DED7CA]'
                    }`}
                  />
                  {formErrors.city && <p className="text-[11px] text-[#A65332] mt-1">{formErrors.city}</p>}
                </div>

                <div>
                  <label htmlFor="addr-state" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                    State *
                  </label>
                  <input
                    id="addr-state"
                    name="state"
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={handleAddressInputChange}
                    placeholder="State"
                    className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-3 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors ${
                      formErrors.state ? 'border-[#A65332]' : 'border-[#DED7CA]'
                    }`}
                  />
                  {formErrors.state && <p className="text-[11px] text-[#A65332] mt-1">{formErrors.state}</p>}
                </div>

                <div>
                  <label htmlFor="addr-postalCode" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                    PIN Code *
                  </label>
                  <input
                    id="addr-postalCode"
                    name="postalCode"
                    type="text"
                    required
                    value={addressForm.postalCode}
                    onChange={handleAddressInputChange}
                    placeholder="PIN Code"
                    className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-3 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors font-mono ${
                      formErrors.postalCode ? 'border-[#A65332]' : 'border-[#DED7CA]'
                    }`}
                  />
                  {formErrors.postalCode && <p className="text-[11px] text-[#A65332] mt-1">{formErrors.postalCode}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="addr-country" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                  Country *
                </label>
                <input
                  id="addr-country"
                  name="country"
                  type="text"
                  required
                  value={addressForm.country}
                  onChange={handleAddressInputChange}
                  placeholder="Country"
                  className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-3.5 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors ${
                    formErrors.country ? 'border-[#A65332]' : 'border-[#DED7CA]'
                  }`}
                />
                {formErrors.country && <p className="text-[11px] text-[#A65332] mt-1">{formErrors.country}</p>}
              </div>

              {/* Set As Default Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={addressForm.isDefault}
                    onChange={handleAddressInputChange}
                    disabled={modalMode === 'edit' && addressForm.isDefault && addresses.length === 1}
                    className="h-4 w-4 rounded-sm border-[#DED7CA] bg-[#FAF7F0] text-[#34452F] focus:ring-[#34452F]"
                  />
                  <span className="text-xs text-[#5F6057]">Set as my default shipping address</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-[#DED7CA]/70 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="min-h-[44px] px-5 py-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="min-h-[44px] px-6 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                >
                  {formSubmitting
                    ? 'Saving...'
                    : modalMode === 'add'
                    ? 'Save Address'
                    : 'Update Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: CONFIRM DELETE DIALOG
         ======================================================================= */}
      {deletingAddressId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F211C]/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="h-12 w-12 rounded-full bg-[#A65332]/10 border border-[#A65332]/20 flex items-center justify-center mx-auto text-[#A65332] mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 id="delete-dialog-title" className="font-serif text-lg font-bold text-[#1F211C]">
              Delete Address
            </h3>
            <p className="mt-2 text-xs text-[#5F6057] leading-relaxed">
              Are you sure you want to remove this delivery address? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingAddressId(null)}
                className="min-h-[44px] px-5 py-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-xs font-semibold uppercase tracking-wider text-[#5F6057] hover:text-[#1F211C] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAddress}
                disabled={deleteSubmitting}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#A65332] hover:bg-[#8F452B] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A65332]"
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
