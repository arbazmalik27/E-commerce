import { useState, useEffect, useCallback } from 'react'
import {
  Tag,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react'
import api from '../../services/api'
import AdminNav from '../../components/AdminNav'
import Eyebrow from '../../components/Eyebrow'
import SEO from '../../components/SEO'

function formatDate(iso) {
  if (!iso) return 'None'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals & form state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [toast, setToast] = useState(null)

  // Coupon form data
  const defaultFormData = {
    code: '',
    type: 'percentage',
    value: 20,
    buyQuantity: 2,
    freeQuantity: 3,
    minimumOrderValue: '',
    maximumDiscount: '',
    usageLimit: '',
    perUserLimit: '',
    startsAt: '',
    expiresAt: '',
    isActive: true,
  }
  const [formData, setFormData] = useState(defaultFormData)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (statusFilter !== 'all') params.set('isActive', statusFilter === 'active' ? 'true' : 'false')

      const res = await api.get(`/coupons/admin?${params.toString()}`)
      if (res.data?.success) {
        setCoupons(res.data.coupons || [])
      } else {
        throw new Error(res.data?.message || 'Failed to load coupons')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to fetch coupons')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoupons()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchCoupons])

  const openCreateModal = () => {
    setEditingCoupon(null)
    setFormData(defaultFormData)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code || '',
      type: coupon.type || 'percentage',
      value: coupon.value || 0,
      buyQuantity: coupon.buyQuantity || 2,
      freeQuantity: coupon.freeQuantity || 3,
      minimumOrderValue: coupon.minimumOrderValue != null ? coupon.minimumOrderValue : '',
      maximumDiscount: coupon.maximumDiscount != null ? coupon.maximumDiscount : '',
      usageLimit: coupon.usageLimit != null ? coupon.usageLimit : '',
      perUserLimit: coupon.perUserLimit != null ? coupon.perUserLimit : '',
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().split('T')[0] : '',
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '',
      isActive: coupon.isActive !== false,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }
      // When changing to buy_x_get_y, auto set minimumOrderValue to 10000 if lower
      if (name === 'type' && value === 'buy_x_get_y') {
        if (!next.minimumOrderValue || Number(next.minimumOrderValue) < 10000) {
          next.minimumOrderValue = 10000
        }
      }
      return next
    })

    if (formErrors[name]) {
      setFormErrors((prev) => {
        const updated = { ...prev }
        delete updated[name]
        return updated
      })
    }
  }

  const handleSaveCoupon = async (e) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormErrors({})

    const payload = {
      code: formData.code.trim().toUpperCase(),
      type: formData.type,
      isActive: formData.isActive,
    }

    if (formData.type === 'percentage') {
      payload.value = Number(formData.value)
    } else if (formData.type === 'fixed') {
      payload.value = Number(formData.value)
    } else if (formData.type === 'buy_x_get_y') {
      payload.buyQuantity = Number(formData.buyQuantity)
      payload.freeQuantity = Number(formData.freeQuantity)
      payload.value = 0
    }

    if (formData.minimumOrderValue !== '') {
      payload.minimumOrderValue = Number(formData.minimumOrderValue)
    }
    if (formData.maximumDiscount !== '') {
      payload.maximumDiscount = Number(formData.maximumDiscount)
    }
    if (formData.usageLimit !== '') {
      payload.usageLimit = Number(formData.usageLimit)
    }
    if (formData.perUserLimit !== '') {
      payload.perUserLimit = Number(formData.perUserLimit)
    }
    if (formData.startsAt) {
      payload.startsAt = new Date(formData.startsAt).toISOString()
    }
    if (formData.expiresAt) {
      payload.expiresAt = new Date(formData.expiresAt).toISOString()
    }

    try {
      if (editingCoupon) {
        const res = await api.patch(`/coupons/admin/${editingCoupon._id}`, payload)
        if (res.data?.success) {
          showToast('success', `Coupon ${res.data.coupon.code} updated successfully`)
          setModalOpen(false)
          fetchCoupons()
        }
      } else {
        const res = await api.post('/coupons/admin', payload)
        if (res.data?.success) {
          showToast('success', `Coupon ${res.data.coupon.code} created successfully`)
          setModalOpen(false)
          fetchCoupons()
        }
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors)
      } else {
        showToast('error', err.response?.data?.message || 'Failed to save coupon')
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleToggleStatus = async (coupon) => {
    try {
      const res = await api.patch(`/coupons/admin/${coupon._id}/status`, {
        isActive: !coupon.isActive,
      })
      if (res.data?.success) {
        showToast('success', `Coupon ${coupon.code} is now ${!coupon.isActive ? 'active' : 'inactive'}`)
        setCoupons((prev) =>
          prev.map((c) => (c._id === coupon._id ? { ...c, isActive: !c.isActive } : c))
        )
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update coupon status')
    }
  }

  const handleDelete = async (couponId) => {
    try {
      const res = await api.delete(`/coupons/admin/${couponId}`)
      if (res.data?.success) {
        showToast('success', 'Coupon deleted successfully')
        setDeleteConfirmId(null)
        setCoupons((prev) => prev.filter((c) => c._id !== couponId))
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete coupon')
    }
  }

  // Stats calculation
  const totalCoupons = coupons.length
  const activeCoupons = coupons.filter((c) => c.isActive).length
  const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)
  const bogoCoupons = coupons.filter((c) => c.type === 'buy_x_get_y').length

  return (
    <>
      <SEO
        title="Admin — Coupons & Discounts"
        description="Manage TrendVolt coupons, percentage discounts, fixed savings, and BOGO offers."
        canonical="/admin/coupons"
        noindex={true}
      />

      <div className="min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DED7CA] pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Eyebrow variant="olive">ADMINISTRATION</Eyebrow>
                <span className="text-[#85857A]">/</span>
                <span className="text-xs uppercase tracking-wider text-[#5F6057] font-semibold">
                  Promotions
                </span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1F211C]">
                Coupons & Discounts
              </h1>
              <p className="text-xs sm:text-sm text-[#5F6057] mt-1">
                Configure promotional campaigns, percentage discounts, flat savings, and BOGO bundles.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#FFFDF8] transition-all shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Coupon</span>
              </button>
            </div>
          </div>

          {/* Admin Navigation */}
          <div>
            <AdminNav />
          </div>

          {/* Toast Notification */}
          {toast && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between shadow-xs transition-all ${
                toast.type === 'success'
                  ? 'bg-[#3F6B45]/15 border border-[#3F6B45]/30 text-[#2D5032]'
                  : 'bg-[#A65332]/15 border border-[#A65332]/30 text-[#8C3D21]'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                {toast.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 hover:opacity-70 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6057] block mb-1">
                Total Coupons
              </span>
              <span className="font-serif text-2xl font-bold text-[#1F211C]">{totalCoupons}</span>
            </div>

            <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6057] block mb-1">
                Active Campaigns
              </span>
              <span className="font-serif text-2xl font-bold text-[#3F6B45]">{activeCoupons}</span>
            </div>

            <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6057] block mb-1">
                Total Usages
              </span>
              <span className="font-serif text-2xl font-bold text-[#1F211C]">{totalUsed}</span>
            </div>

            <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6057] block mb-1">
                BOGO Offers
              </span>
              <span className="font-serif text-2xl font-bold text-[#D97706]">{bogoCoupons}</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#85857A]" />
              <input
                type="text"
                placeholder="Search by coupon code (e.g. SAVE20, BUY2GET3)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="typeFilter" className="text-xs font-bold text-[#5F6057]">
                  Type:
                </label>
                <select
                  id="typeFilter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 py-2 text-xs font-medium text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                >
                  <option value="all">All Types</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                  <option value="buy_x_get_y">Buy X Get Y (BOGO)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="statusFilter" className="text-xs font-bold text-[#5F6057]">
                  Status:
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 py-2 text-xs font-medium text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Coupons Table / Grid */}
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-[#5F6057] text-sm">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#34452F] border-t-transparent mb-3" />
                <p>Loading coupons...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-[#A65332] text-sm">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-80" />
                <p>{error}</p>
              </div>
            ) : coupons.length === 0 ? (
              <div className="p-14 text-center text-[#5F6057]">
                <Tag className="h-10 w-10 mx-auto text-[#85857A] mb-3 opacity-60" />
                <h3 className="font-serif text-lg font-bold text-[#1F211C] mb-1">No coupons found</h3>
                <p className="text-xs text-[#5F6057] max-w-sm mx-auto mb-5">
                  {search || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'No coupons match the selected filter criteria. Try clearing filters.'
                    : 'Get started by creating your first promotional coupon.'}
                </p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#34452F] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] hover:bg-[#263722]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Coupon</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-bold uppercase tracking-wider text-[#5F6057]">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Code & Type</th>
                      <th className="py-3.5 px-4">Offer Rule</th>
                      <th className="py-3.5 px-4">Min. Subtotal</th>
                      <th className="py-3.5 px-4">Usage</th>
                      <th className="py-3.5 px-4">Validity</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DED7CA]/60">
                    {coupons.map((coupon) => {
                      const isBogo = coupon.type === 'buy_x_get_y'
                      const isExpired = coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()

                      return (
                        <tr key={coupon._id} className="hover:bg-[#FAF7F0]/50 transition-colors">
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-[#1F211C] bg-[#FAF7F0] px-2.5 py-1 rounded-lg border border-[#DED7CA]">
                                {coupon.code}
                              </span>
                            </div>
                            <span className="text-[10px] uppercase font-semibold text-[#85857A] block mt-1 tracking-wider">
                              {coupon.type === 'buy_x_get_y'
                                ? 'Buy X Get Y'
                                : coupon.type === 'percentage'
                                  ? 'Percentage'
                                  : 'Fixed Amount'}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            {isBogo ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-[#1F211C] flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-[#D97706]" />
                                  Buy {coupon.buyQuantity}, Get {coupon.freeQuantity} Free
                                </span>
                                {coupon.maximumDiscount ? (
                                  <span className="text-[11px] text-[#5F6057] block">
                                    Capped at ₹{coupon.maximumDiscount.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#85857A] block">No discount cap</span>
                                )}
                              </div>
                            ) : coupon.type === 'percentage' ? (
                              <div>
                                <span className="font-bold text-[#1F211C]">{coupon.value}% OFF</span>
                                {coupon.maximumDiscount ? (
                                  <span className="text-[11px] text-[#5F6057] block">
                                    Max ₹{coupon.maximumDiscount.toLocaleString('en-IN')}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-[#1F211C]">
                                  ₹{coupon.value?.toLocaleString('en-IN')} OFF
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            {coupon.minimumOrderValue ? (
                              <span className="font-semibold text-[#1F211C]">
                                ₹{coupon.minimumOrderValue.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-[#85857A]">None</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span className="font-mono text-xs font-semibold text-[#1F211C]">
                              {coupon.usedCount || 0}
                            </span>
                            <span className="text-[11px] text-[#5F6057]">
                              {coupon.usageLimit ? ` / ${coupon.usageLimit} max` : ' / ∞'}
                            </span>
                            {coupon.perUserLimit ? (
                              <span className="text-[10px] text-[#85857A] block">
                                {coupon.perUserLimit} per user
                              </span>
                            ) : null}
                          </td>

                          <td className="py-4 px-4 text-xs">
                            {coupon.startsAt || coupon.expiresAt ? (
                              <div className="space-y-0.5">
                                <span className="text-[11px] text-[#5F6057] block">
                                  {coupon.startsAt ? formatDate(coupon.startsAt) : 'Now'} →{' '}
                                  {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No end'}
                                </span>
                                {isExpired && (
                                  <span className="text-[10px] font-bold text-[#A65332] uppercase tracking-wider block">
                                    Expired
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[#85857A]">Always valid</span>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(coupon)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                                coupon.isActive
                                  ? 'bg-[#3F6B45]/15 text-[#2D5032] hover:bg-[#3F6B45]/25 border border-[#3F6B45]/30'
                                  : 'bg-[#85857A]/15 text-[#5F6057] hover:bg-[#85857A]/25 border border-[#85857A]/30'
                              }`}
                              title="Click to toggle status"
                            >
                              {coupon.isActive ? (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  <span>Inactive</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(coupon)}
                                className="p-1.5 rounded-lg text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
                                title="Edit Coupon"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>

                              {deleteConfirmId === coupon._id ? (
                                <div className="inline-flex items-center gap-1 ml-1 bg-[#A65332]/10 p-1 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(coupon._id)}
                                    className="text-[11px] font-bold text-[#A65332] hover:underline px-1 cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-[11px] text-[#5F6057] hover:underline px-1 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(coupon._id)}
                                  className="p-1.5 rounded-lg text-[#5F6057] hover:text-[#A65332] hover:bg-[#A65332]/10 transition-colors cursor-pointer"
                                  title="Delete Coupon"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1F211C]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto my-8">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 p-1 text-[#85857A] hover:text-[#1F211C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#34452F]">
                {editingCoupon ? 'Update Campaign' : 'New Promotion'}
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C]">
                {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
              </h2>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              {/* Code */}
              <div>
                <label htmlFor="code" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                  Coupon Code <span className="text-[#A65332]">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  required
                  placeholder="e.g. SAVE20, FLAT500, BUY2GET3"
                  value={formData.code}
                  onChange={handleFormChange}
                  className="w-full font-mono uppercase rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]"
                />
                {formErrors.code && (
                  <p className="mt-1 text-xs text-[#A65332]">{formErrors.code}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label htmlFor="type" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                  Coupon Type <span className="text-[#A65332]">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                >
                  <option value="percentage">Percentage Discount (%)</option>
                  <option value="fixed">Fixed Amount Discount (₹)</option>
                  <option value="buy_x_get_y">Buy X Get Y Free (BOGO)</option>
                </select>
              </div>

              {/* Value (Percentage / Fixed) */}
              {formData.type === 'percentage' && (
                <div>
                  <label htmlFor="value" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Percentage Value (%) <span className="text-[#A65332]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="value"
                      name="value"
                      min="1"
                      max="100"
                      step="any"
                      required
                      placeholder="e.g. 20"
                      value={formData.value}
                      onChange={handleFormChange}
                      className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#85857A]">
                      %
                    </span>
                  </div>
                  {formErrors.value && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.value}</p>
                  )}
                </div>
              )}

              {formData.type === 'fixed' && (
                <div>
                  <label htmlFor="value" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Fixed Discount Amount (₹) <span className="text-[#A65332]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#85857A]">
                      ₹
                    </span>
                    <input
                      type="number"
                      id="value"
                      name="value"
                      min="1"
                      step="any"
                      required
                      placeholder="e.g. 500"
                      value={formData.value}
                      onChange={handleFormChange}
                      className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] pl-8 pr-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                    />
                  </div>
                  {formErrors.value && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.value}</p>
                  )}
                </div>
              )}

              {/* BOGO Buy Quantity & Free Quantity */}
              {formData.type === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-4 bg-[#FAF7F0] p-4 rounded-xl border border-[#DED7CA]">
                  <div>
                    <label htmlFor="buyQuantity" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                      Buy Quantity (X) <span className="text-[#A65332]">*</span>
                    </label>
                    <input
                      type="number"
                      id="buyQuantity"
                      name="buyQuantity"
                      min="1"
                      step="1"
                      required
                      value={formData.buyQuantity}
                      onChange={handleFormChange}
                      className="w-full rounded-xl border border-[#DED7CA] bg-[#FFFDF8] px-3.5 py-2 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                    />
                    {formErrors.buyQuantity && (
                      <p className="mt-1 text-xs text-[#A65332]">{formErrors.buyQuantity}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="freeQuantity" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                      Free Quantity (Y) <span className="text-[#A65332]">*</span>
                    </label>
                    <input
                      type="number"
                      id="freeQuantity"
                      name="freeQuantity"
                      min="1"
                      step="1"
                      required
                      value={formData.freeQuantity}
                      onChange={handleFormChange}
                      className="w-full rounded-xl border border-[#DED7CA] bg-[#FFFDF8] px-3.5 py-2 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                    />
                    {formErrors.freeQuantity && (
                      <p className="mt-1 text-xs text-[#A65332]">{formErrors.freeQuantity}</p>
                    )}
                  </div>

                  <div className="col-span-2 text-[11px] text-[#5F6057] leading-relaxed">
                    <strong>Rule:</strong> Customer buys {formData.buyQuantity || 'X'} and receives{' '}
                    {formData.freeQuantity || 'Y'} free (total{' '}
                    {(Number(formData.buyQuantity) || 0) + (Number(formData.freeQuantity) || 0)} items).
                    Lowest-priced units become free first. Requires min subtotal ₹10,000.
                  </div>
                </div>
              )}

              {/* Minimum Order Value & Maximum Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="minimumOrderValue" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Min. Order Value (₹)
                  </label>
                  <input
                    type="number"
                    id="minimumOrderValue"
                    name="minimumOrderValue"
                    min="0"
                    step="any"
                    placeholder={formData.type === 'buy_x_get_y' ? '10000' : '0 (optional)'}
                    value={formData.minimumOrderValue}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                  />
                  {formErrors.minimumOrderValue && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.minimumOrderValue}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="maximumDiscount" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    id="maximumDiscount"
                    name="maximumDiscount"
                    min="0"
                    step="any"
                    placeholder="None (uncapped)"
                    value={formData.maximumDiscount}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                  />
                  {formErrors.maximumDiscount && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.maximumDiscount}</p>
                  )}
                </div>
              </div>

              {/* Usage Limit & Per User Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="usageLimit" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Global Usage Limit
                  </label>
                  <input
                    type="number"
                    id="usageLimit"
                    name="usageLimit"
                    min="0"
                    step="1"
                    placeholder="Unlimited"
                    value={formData.usageLimit}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                  />
                  {formErrors.usageLimit && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.usageLimit}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="perUserLimit" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Per User Limit
                  </label>
                  <input
                    type="number"
                    id="perUserLimit"
                    name="perUserLimit"
                    min="0"
                    step="1"
                    placeholder="Unlimited"
                    value={formData.perUserLimit}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                  />
                  {formErrors.perUserLimit && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.perUserLimit}</p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startsAt" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Start Date (optional)
                  </label>
                  <input
                    type="date"
                    id="startsAt"
                    name="startsAt"
                    value={formData.startsAt}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                  />
                  {formErrors.startsAt && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.startsAt}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="expiresAt" className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="date"
                    id="expiresAt"
                    name="expiresAt"
                    value={formData.expiresAt}
                    onChange={handleFormChange}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-2.5 text-sm text-[#1F211C] focus:outline-none focus:border-[#34452F]"
                  />
                  {formErrors.expiresAt && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.expiresAt}</p>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFormChange}
                    className="h-4 w-4 rounded-sm border-[#DED7CA] text-[#34452F] focus:ring-[#34452F]"
                  />
                  <span className="text-xs font-semibold text-[#1F211C]">
                    Coupon is active and available for customer use
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DED7CA] mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#1F211C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-[#34452F] hover:bg-[#263722] disabled:opacity-50 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] cursor-pointer shadow-xs"
                >
                  {formSubmitting ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default AdminCouponsPage
