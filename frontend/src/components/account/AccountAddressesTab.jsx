import { useState } from 'react'
import { Plus, MapPin, Phone, Trash2, Edit3, Check, AlertCircle } from 'lucide-react'
import api from '../../services/api'

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

function AccountAddressesTab({
  addresses = [],
  loading = false,
  error = null,
  user,
  onAddressesUpdate,
  onRetry,
}) {
  // Modal state: 'add' | 'edit' | null
  const [modalMode, setModalMode] = useState(null)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(INITIAL_ADDRESS_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formServerError, setFormServerError] = useState(null)

  // Delete confirm state
  const [deletingAddressId, setDeletingAddressId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  // Feedback banner
  const [feedbackMessage, setFeedbackMessage] = useState(null)

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

  const handleInputChange = (e) => {
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

  const validateForm = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setFormSubmitting(true)
    setFormServerError(null)

    try {
      if (modalMode === 'add') {
        const res = await api.post('/users/addresses', addressForm)
        if (res.data?.success) {
          onAddressesUpdate(res.data.addresses)
          closeModal()
          setFeedbackMessage('Delivery address saved successfully!')
          setTimeout(() => setFeedbackMessage(null), 4000)
        }
      } else if (modalMode === 'edit' && editingAddressId) {
        const res = await api.put(`/users/addresses/${editingAddressId}`, addressForm)
        if (res.data?.success) {
          onAddressesUpdate(res.data.addresses)
          closeModal()
          setFeedbackMessage('Address updated successfully!')
          setTimeout(() => setFeedbackMessage(null), 4000)
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

  const handleSetDefault = async (addrId) => {
    try {
      const res = await api.patch(`/users/addresses/${addrId}/default`)
      if (res.data?.success) {
        onAddressesUpdate(res.data.addresses)
        setFeedbackMessage('Default shipping address updated.')
        setTimeout(() => setFeedbackMessage(null), 4000)
      }
    } catch {
      setFeedbackMessage('Failed to update default address. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!deletingAddressId) return
    setDeleteSubmitting(true)
    try {
      const res = await api.delete(`/users/addresses/${deletingAddressId}`)
      if (res.data?.success) {
        onAddressesUpdate(res.data.addresses)
        setDeletingAddressId(null)
        setFeedbackMessage('Address deleted successfully.')
        setTimeout(() => setFeedbackMessage(null), 4000)
      }
    } catch {
      setFeedbackMessage('Failed to delete address. Please try again.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Tab Header & Add Button ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DED7CA]/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl font-bold text-[#1F211C] tracking-tight">
              Delivery Addresses
            </h2>
            {!loading && (
              <span className="px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-xs font-mono font-bold text-[#5F6057]">
                {addresses.length}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#5F6057] mt-0.5">
            Manage your personal shipping destinations for rapid one-click checkout.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="min-h-[44px] px-5 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] self-start sm:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add New Address</span>
        </button>
      </div>

      {/* ── Feedback Banner ────────────────────────────────────────────────── */}
      {feedbackMessage && (
        <div
          role="status"
          className="rounded-2xl border border-[#34452F]/30 bg-[#34452F]/10 px-5 py-3.5 text-sm text-[#34452F] flex items-center justify-between shadow-xs animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2.5">
            <Check className="h-4 w-4 text-[#34452F] shrink-0" />
            <span className="font-medium text-xs sm:text-sm">{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-[#5F6057] hover:text-[#1F211C] text-sm p-1 cursor-pointer"
            aria-label="Dismiss feedback notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="p-6 text-center rounded-2xl bg-[#A65332]/10 border border-[#A65332]/20 text-[#A65332]">
          <p className="text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-xs font-bold underline underline-offset-4 hover:text-[#8F452B] cursor-pointer"
          >
            Retry Loading Addresses
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ────────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="p-6 rounded-2xl border border-[#DED7CA] bg-[#FAF7F0] space-y-3 animate-pulse">
              <div className="h-4 w-32 bg-[#EEE7DC] rounded-full" />
              <div className="h-3 w-48 bg-[#EEE7DC] rounded-full" />
              <div className="h-3 w-28 bg-[#EEE7DC] rounded-full" />
              <div className="h-8 w-full bg-[#EEE7DC] rounded-xl pt-2" />
            </div>
          ))}
        </div>
      )}

      {/* ── Zero Addresses Empty State ─────────────────────────────────────── */}
      {!loading && !error && addresses.length === 0 && (
        <div className="py-16 px-6 text-center max-w-md mx-auto rounded-2xl border border-dashed border-[#DED7CA] bg-[#FFFDF8]">
          <div className="h-12 w-12 rounded-full bg-[#34452F]/10 text-[#34452F] flex items-center justify-center mx-auto mb-3">
            <MapPin className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#1F211C]">No Saved Addresses Yet</h3>
          <p className="mt-1 text-xs text-[#5F6057] leading-relaxed">
            You haven&apos;t saved any delivery destinations. Add an address now to accelerate your checkout process.
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

      {/* ── Addresses Grid ─────────────────────────────────────────────────── */}
      {!loading && !error && addresses.length > 0 && (
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
              <div>
                {/* Top Row: Name + Default Pill */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#1F211C]">
                    {addr.fullName}
                  </h3>
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#34452F]/10 border border-[#34452F]/20 px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#34452F] uppercase tracking-wide shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#34452F]" />
                      Default
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs sm:text-sm text-[#5F6057]">
                  <p className="leading-relaxed text-[#1F211C]">{addr.addressLine}</p>
                  <p className="leading-relaxed">
                    {addr.city}, {addr.state} —{' '}
                    <span className="font-mono font-semibold text-[#1F211C]">{addr.postalCode}</span>
                  </p>
                  <p className="text-[#85857A]">{addr.country}</p>
                  <p className="pt-2 text-xs text-[#85857A] flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[#5F6057]" aria-hidden="true" />
                    <span className="font-mono text-[#5F6057]">{addr.phone}</span>
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
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
                    className="min-h-[36px] px-3.5 rounded-lg border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-xs font-semibold text-[#1F211C] transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                  >
                    <Edit3 className="h-3 w-3" aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingAddressId(addr._id)}
                    className="min-h-[36px] px-3.5 rounded-lg border border-[#A65332]/30 bg-[#A65332]/10 hover:bg-[#A65332]/20 text-xs font-semibold text-[#A65332] hover:text-[#8F452B] transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A65332]"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =======================================================================
          MODAL: ADD / EDIT ADDRESS DIALOG
         ======================================================================= */}
      {modalMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1F211C]/60 backdrop-blur-sm overflow-y-auto"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]/70">
              <h3 id="address-modal-title" className="font-serif text-xl font-bold text-[#1F211C]">
                {modalMode === 'add' ? 'Add Delivery Address' : 'Edit Delivery Address'}
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

            {/* Error Message */}
            {formServerError && (
              <div className="mt-4 p-3.5 rounded-xl bg-[#A65332]/10 border border-[#A65332]/30 text-xs text-[#A65332] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formServerError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addr-fullName" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                    Recipient Full Name *
                  </label>
                  <input
                    id="addr-fullName"
                    name="fullName"
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={handleInputChange}
                    placeholder="Recipient's Name"
                    className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-3.5 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors ${
                      formErrors.fullName ? 'border-[#A65332]' : 'border-[#DED7CA]'
                    }`}
                  />
                  {formErrors.fullName && <p className="text-[11px] text-[#A65332] mt-1">{formErrors.fullName}</p>}
                </div>

                <div>
                  <label htmlFor="addr-phone" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1">
                    Contact Phone *
                  </label>
                  <input
                    id="addr-phone"
                    name="phone"
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={handleInputChange}
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
                  Street Address, Flat &amp; Landmark *
                </label>
                <input
                  id="addr-addressLine"
                  name="addressLine"
                  type="text"
                  required
                  value={addressForm.addressLine}
                  onChange={handleInputChange}
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
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
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
                  onChange={handleInputChange}
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
                    onChange={handleInputChange}
                    disabled={modalMode === 'edit' && addressForm.isDefault && addresses.length === 1}
                    className="h-4 w-4 rounded-sm border-[#DED7CA] bg-[#FAF7F0] text-[#34452F] focus:ring-[#34452F]"
                  />
                  <span className="text-xs text-[#5F6057]">Set as my primary delivery destination</span>
                </label>
              </div>

              {/* Form Buttons */}
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
          MODAL: DELETE ADDRESS CONFIRMATION DIALOG
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
              <Trash2 className="h-6 w-6" aria-hidden="true" />
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
                onClick={handleDelete}
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

export default AccountAddressesTab
