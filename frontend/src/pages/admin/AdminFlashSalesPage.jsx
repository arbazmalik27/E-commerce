import { useState, useEffect, useCallback } from 'react'
import {
  Flame,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  Clock,
  ShoppingBag,
} from 'lucide-react'
import api from '../../services/api'
import AdminNav from '../../components/AdminNav'
import Eyebrow from '../../components/Eyebrow'
import SEO from '../../components/SEO'

function formatDateTime(iso) {
  if (!iso) return 'None'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toLocalDatetimeInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getDefaultFormData() {
  const now = new Date()
  const later = new Date(now.getTime() + 48 * 3600 * 1000)
  return {
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 20,
    startAt: toLocalDatetimeInput(now),
    endAt: toLocalDatetimeInput(later),
    products: [],
    active: true,
  }
}

function AdminFlashSalesPage() {
  const [sales, setSales] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals & form state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [toast, setToast] = useState(null)

  // Product picker search inside modal
  const [productSearch, setProductSearch] = useState('')

  // Form initial state
  const [formData, setFormData] = useState(getDefaultFormData)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const fetchSales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/flash-sales/admin/all')
      if (res.data?.success) {
        setSales(res.data.flashSales || [])
      } else {
        setSales([])
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load flash sales')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get('/products?all=true&limit=100')
      if (res.data?.success && Array.isArray(res.data.products)) {
        setAvailableProducts(res.data.products)
      }
    } catch {
      // Non-blocking
    }
  }, [])

  useEffect(() => {
    fetchSales()
    fetchProducts()
  }, [fetchSales, fetchProducts])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSale(null)
    setFormData(getDefaultFormData())
    setFormErrors({})
    setProductSearch('')
    setModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (sale) => {
    setEditingSale(sale)
    setFormData({
      name: sale.name || '',
      description: sale.description || '',
      discountType: sale.discountType || 'percentage',
      discountValue: sale.discountValue || 0,
      startAt: toLocalDatetimeInput(sale.startAt),
      endAt: toLocalDatetimeInput(sale.endAt),
      products: Array.isArray(sale.products)
        ? sale.products.map((p) => (p._id ? p._id.toString() : p.toString()))
        : [],
      active: sale.active !== false,
    })
    setFormErrors({})
    setProductSearch('')
    setModalOpen(true)
  }

  // Toggle active/inactive
  const handleToggleStatus = async (sale) => {
    try {
      const res = await api.patch(`/flash-sales/admin/${sale._id}/toggle`)
      if (res.data?.success) {
        showToast('success', res.data.message || 'Status updated')
        fetchSales()
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update status')
    }
  }

  // Delete flash sale
  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/flash-sales/admin/${id}`)
      if (res.data?.success) {
        showToast('success', 'Flash sale deleted successfully')
        setDeleteConfirmId(null)
        fetchSales()
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete sale')
    }
  }

  // Product Selection Handlers
  const handleToggleProduct = (productId) => {
    setFormData((prev) => {
      const current = prev.products || []
      const exists = current.includes(productId)
      return {
        ...prev,
        products: exists ? current.filter((id) => id !== productId) : [...current, productId],
      }
    })
  }

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormErrors({})

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      startAt: new Date(formData.startAt).toISOString(),
      endAt: new Date(formData.endAt).toISOString(),
      products: formData.products,
      active: formData.active,
    }

    try {
      if (editingSale) {
        const res = await api.patch(`/flash-sales/admin/${editingSale._id}`, payload)
        if (res.data?.success) {
          showToast('success', 'Flash sale updated successfully')
          setModalOpen(false)
          fetchSales()
        }
      } else {
        const res = await api.post('/flash-sales/admin', payload)
        if (res.data?.success) {
          showToast('success', 'Flash sale created successfully')
          setModalOpen(false)
          fetchSales()
        }
      }
    } catch (err) {
      const resp = err.response?.data
      if (resp?.errors) {
        setFormErrors(resp.errors)
      } else {
        setFormErrors({ general: resp?.message || 'Operation failed. Please check inputs.' })
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  // Filter sales list
  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && s.status === 'ACTIVE' && s.active) ||
      (statusFilter === 'upcoming' && s.status === 'UPCOMING') ||
      (statusFilter === 'expired' && s.status === 'EXPIRED') ||
      (statusFilter === 'inactive' && !s.active)

    return matchesSearch && matchesStatus
  })

  // Filtered available products for modal selection
  const selectableProducts = availableProducts.filter((p) => {
    if (!p.isActive) return false
    if (!productSearch.trim()) return true
    const term = productSearch.toLowerCase()
    return (
      p.name.toLowerCase().includes(term) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    )
  })

  return (
    <div className="min-h-screen bg-[#F5F0E8] py-8 sm:py-10 text-[#1F211C]">
      <SEO
        title="Admin Flash Sales — TrendVolt"
        description="Manage time-limited flash sales, schedules, discounts, and product allocations."
        noindex
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Bar */}
        <div className="mb-6">
          <AdminNav />
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            role="status"
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
              toast.type === 'success'
                ? 'bg-[#34452F] text-[#FFFDF8]'
                : 'bg-red-800 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#A65332] text-white">
                <Flame className="h-3 w-3 fill-current" />
              </span>
              <Eyebrow text="PROMOTION & CAMPAIGN ENGINE" className="text-[#A65332]" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1F211C]">
              Flash Sales & Offers
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#5F6057]">
              Schedule time-limited discounts across selected fashion pieces with automatic authoritative pricing.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Flash Sale</span>
          </button>
        </div>

        {/* Filters and Controls */}
        <div className="mb-6 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#85857A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sale name or description..."
              className="w-full min-h-[42px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] pl-10 pr-4 py-2 text-xs text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F]"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-[42px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 py-2 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Now</option>
              <option value="upcoming">Upcoming</option>
              <option value="expired">Expired</option>
              <option value="inactive">Disabled</option>
            </select>
          </div>
        </div>

        {/* Flash Sales Table */}
        <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs font-mono text-[#85857A] uppercase tracking-wider">
              Loading Flash Sales...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-red-700">{error}</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center">
              <Flame className="mx-auto h-8 w-8 text-[#85857A] mb-2 stroke-1" />
              <p className="font-serif text-lg font-bold text-[#1F211C]">No Flash Sales Found</p>
              <p className="text-xs text-[#5F6057] mt-1">Create your first flash sale or adjust filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] font-mono uppercase tracking-wider text-[10px] text-[#85857A]">
                    <th className="py-3 px-4">Sale Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Products</th>
                    <th className="py-3 px-4">Start Time</th>
                    <th className="py-3 px-4">End Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DED7CA]">
                  {filteredSales.map((sale) => {
                    const isLive = sale.status === 'ACTIVE' && sale.active
                    const isUpcoming = sale.status === 'UPCOMING'
                    const isExpired = sale.status === 'EXPIRED'

                    return (
                      <tr key={sale._id} className="hover:bg-[#FAF7F0]/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#1F211C]">
                          <div>
                            <span className="block font-bold">{sale.name}</span>
                            {sale.description && (
                              <span className="text-[11px] text-[#5F6057] line-clamp-1">
                                {sale.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {!sale.active ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-700">
                              Disabled
                            </span>
                          ) : isLive ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#3F6B45]/15 text-[#3F6B45] border border-[#3F6B45]/30">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#3F6B45]" />
                              Live Active
                            </span>
                          ) : isUpcoming ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="h-3 w-3" />
                              Upcoming
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                              Expired
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-[#A65332]">
                          {sale.discountType === 'percentage'
                            ? `${sale.discountValue}% OFF`
                            : `₹${sale.discountValue} OFF`}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-mono font-semibold bg-[#FAF7F0] border border-[#DED7CA] px-2 py-0.5 rounded-md">
                            <ShoppingBag className="h-3 w-3 text-[#5F6057]" />
                            {Array.isArray(sale.products) ? sale.products.length : 0} items
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-[#5F6057] font-mono text-[11px]">
                          {formatDateTime(sale.startAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-[#5F6057] font-mono text-[11px]">
                          {formatDateTime(sale.endAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1">
                          {/* Toggle Active */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(sale)}
                            title={sale.active ? 'Deactivate sale' : 'Activate sale'}
                            className="p-1.5 rounded-lg border border-[#DED7CA] hover:bg-[#FAF7F0] text-[#5F6057] hover:text-[#1F211C] cursor-pointer"
                          >
                            {sale.active ? (
                              <XCircle className="h-3.5 w-3.5 text-amber-600" />
                            ) : (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sale)}
                            title="Edit sale"
                            className="p-1.5 rounded-lg border border-[#DED7CA] hover:bg-[#FAF7F0] text-[#5F6057] hover:text-[#1F211C] cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(sale._id)}
                            title="Delete sale"
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] p-6 shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#1F211C]">Delete Flash Sale?</h3>
            <p className="text-xs text-[#5F6057]">
              Are you sure you want to delete this flash sale? Effective sale prices will immediately revert to normal product prices.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-[#DED7CA] text-xs font-semibold hover:bg-[#FAF7F0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Flash Sale Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#DED7CA] pb-4">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F211C]">
                  {editingSale ? 'Edit Flash Sale' : 'Create Flash Sale'}
                </h2>
                <p className="text-xs text-[#5F6057]">
                  Configure sale parameters and select participating products.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg border border-[#DED7CA] hover:bg-[#FAF7F0] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formErrors.general && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formErrors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sale Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1">
                  Sale Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Weekend Flash Sale, Midnight Runway"
                  className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3.5 py-2 text-xs text-[#1F211C] focus:outline-hidden focus:border-[#34452F]"
                />
                {formErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Promotional banner description displayed to customers"
                  className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3.5 py-2 text-xs text-[#1F211C] focus:outline-hidden focus:border-[#34452F]"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3.5 py-2 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F]"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed">Fixed Price Reduction (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1">
                    Discount Value * {formData.discountType === 'percentage' ? '(1 - 100%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={formData.discountType === 'percentage' ? 100 : 1000000}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3.5 py-2 text-xs text-[#1F211C] focus:outline-hidden focus:border-[#34452F]"
                  />
                  {formErrors.discountValue && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.discountValue}</p>
                  )}
                </div>
              </div>

              {/* Scheduling: Start and End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startAt}
                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3.5 py-2 text-xs font-mono text-[#1F211C] focus:outline-hidden focus:border-[#34452F]"
                  />
                  {formErrors.startAt && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.startAt}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6057] mb-1">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endAt}
                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    className="w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3.5 py-2 text-xs font-mono text-[#1F211C] focus:outline-hidden focus:border-[#34452F]"
                  />
                  {formErrors.endAt && (
                    <p className="text-[11px] text-red-600 mt-1">{formErrors.endAt}</p>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active-toggle"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-[#DED7CA] text-[#34452F] focus:ring-[#34452F]"
                />
                <label htmlFor="active-toggle" className="text-xs font-semibold text-[#1F211C] cursor-pointer">
                  Activate this sale immediately upon schedule match
                </label>
              </div>

              {/* Product Selection Matrix */}
              <div className="border-t border-[#DED7CA] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6057]">
                    Select Products ({formData.products.length} selected) *
                  </label>
                  <span className="text-[11px] font-mono text-[#85857A]">
                    Only active products can be added
                  </span>
                </div>

                {formErrors.products && (
                  <p className="text-[11px] text-red-600 mb-2">{formErrors.products}</p>
                )}

                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filter available products..."
                  className="w-full mb-3 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 py-1.5 text-xs text-[#1F211C] focus:outline-hidden focus:border-[#34452F]"
                />

                <div className="max-h-52 overflow-y-auto border border-[#DED7CA] rounded-xl divide-y divide-[#DED7CA] bg-[#FFFDF8]">
                  {selectableProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#85857A]">
                      No active products match search.
                    </div>
                  ) : (
                    selectableProducts.map((p) => {
                      const isSelected = formData.products.includes(p._id)
                      return (
                        <div
                          key={p._id}
                          onClick={() => handleToggleProduct(p._id)}
                          className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#34452F]/10 font-bold' : 'hover:bg-[#FAF7F0]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              readOnly
                              checked={isSelected}
                              className="rounded border-[#DED7CA] text-[#34452F]"
                            />
                            <span className="truncate">{p.name}</span>
                            {p.brand && (
                              <span className="text-[10px] text-[#85857A] uppercase font-mono">
                                ({p.brand})
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[#1F211C] shrink-0 ml-2">
                            ₹{Number(p.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DED7CA]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl border border-[#DED7CA] text-xs font-semibold hover:bg-[#FAF7F0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || formData.products.length === 0}
                  className="px-5 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {formSubmitting
                    ? 'Saving...'
                    : editingSale
                    ? 'Update Flash Sale'
                    : 'Create Flash Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminFlashSalesPage
