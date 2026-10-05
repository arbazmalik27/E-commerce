import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'
import AdminNav from '../../components/AdminNav'
import SEO from '../../components/SEO'
import { TAXONOMY } from '../../constants/taxonomy'
import { getProductImage } from '../../utils/productImageMap'

const STOCK_STATUS_CONFIG = {
  in_stock: {
    label: 'In Stock',
    bg: 'bg-[#3F6B45]/10',
    border: 'border-[#3F6B45]/25',
    text: 'text-[#3F6B45]',
    dot: 'bg-[#3F6B45]',
  },
  low_stock: {
    label: 'Low Stock',
    bg: 'bg-[#A86B2D]/10',
    border: 'border-[#A86B2D]/25',
    text: 'text-[#A86B2D]',
    dot: 'bg-[#A86B2D]',
  },
  out_of_stock: {
    label: 'Out of Stock',
    bg: 'bg-[#A65332]/10',
    border: 'border-[#A65332]/25',
    text: 'text-[#A65332]',
    dot: 'bg-[#A65332]',
  },
}

function AdminInventoryPage() {
  const [products, setProducts] = useState([])
  const [summary, setSummary] = useState({
    totalProducts: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalProducts: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null) // { type: 'success' | 'error', message: string }

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [stockStatusFilter, setStockStatusFilter] = useState('all') // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [sortBy, setSortBy] = useState('stock')
  const [sortOrder, setSortOrder] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Stock Adjustment Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [targetProduct, setTargetProduct] = useState(null)
  const [newStockInput, setNewStockInput] = useState('')
  const [modalError, setModalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Reset to page 1 on filter changes
  const handleStockFilterChange = (status) => {
    setStockStatusFilter(status)
    setCurrentPage(1)
  }

  const handleDepartmentFilterChange = (dept) => {
    setDepartmentFilter(dept)
    setCurrentPage(1)
  }

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Lock background scroll when modal is active
  useEffect(() => {
    if (modalOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [modalOpen])

  const handleCloseModal = () => {
    if (submitting) return
    setModalOpen(false)
    setTargetProduct(null)
    setNewStockInput('')
    setModalError(null)
  }

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalOpen && !submitting) {
        setModalOpen(false)
        setTargetProduct(null)
        setNewStockInput('')
        setModalError(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [modalOpen, submitting])

  // Fetch Inventory from Backend
  const loadInventory = async (isManual = false) => {
    if (!isManual) setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('limit', '20')
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (stockStatusFilter !== 'all') params.append('stockStatus', stockStatusFilter)
      if (departmentFilter !== 'all') params.append('department', departmentFilter)
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)

      const res = await api.get(`/admin/inventory?${params.toString()}`)
      if (res.data?.success) {
        setProducts(res.data.products || [])
        setSummary(
          res.data.summary || {
            totalProducts: 0,
            inStockCount: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
          }
        )
        setPagination(
          res.data.pagination || {
            page: currentPage,
            limit: 20,
            totalProducts: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        )
      } else {
        setError(res.data?.message || 'Failed to load inventory data.')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to communicate with inventory service. Please check your connection.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const params = new URLSearchParams()
    params.append('page', currentPage.toString())
    params.append('limit', '20')
    if (debouncedSearch) params.append('search', debouncedSearch)
    if (stockStatusFilter !== 'all') params.append('stockStatus', stockStatusFilter)
    if (departmentFilter !== 'all') params.append('department', departmentFilter)
    params.append('sortBy', sortBy)
    params.append('sortOrder', sortOrder)

    api
      .get(`/admin/inventory?${params.toString()}`)
      .then((res) => {
        if (!isMounted) return
        if (res.data?.success) {
          setProducts(res.data.products || [])
          setSummary(
            res.data.summary || {
              totalProducts: 0,
              inStockCount: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
            }
          )
          setPagination(
            res.data.pagination || {
              page: currentPage,
              limit: 20,
              totalProducts: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            }
          )
        } else {
          setError(res.data?.message || 'Failed to load inventory data.')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setError(
          err.response?.data?.message ||
            'Failed to communicate with inventory service. Please check your connection.'
        )
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [currentPage, debouncedSearch, stockStatusFilter, departmentFilter, sortBy, sortOrder])

  // Open modal
  const handleOpenModal = (product) => {
    setTargetProduct(product)
    setNewStockInput(typeof product.stock === 'number' ? String(product.stock) : '0')
    setModalError(null)
    setModalOpen(true)
  }

  // Submit stock adjustment
  const handleSaveStock = async (e) => {
    e.preventDefault()
    if (!targetProduct) return

    const trimmed = newStockInput.trim()
    if (trimmed === '') {
      setModalError('Stock quantity is required.')
      return
    }

    const parsed = Number(trimmed)
    if (isNaN(parsed) || !Number.isInteger(parsed)) {
      setModalError('Stock quantity must be a whole integer.')
      return
    }

    if (parsed < 0) {
      setModalError('Stock quantity cannot be negative.')
      return
    }

    if (parsed > 1000000) {
      setModalError('Stock quantity cannot exceed 1,000,000.')
      return
    }

    setSubmitting(true)
    setModalError(null)

    try {
      const res = await api.patch(`/admin/inventory/${targetProduct._id}`, {
        stock: parsed,
      })

      if (res.data?.success) {
        setToast({
          type: 'success',
          message: `Stock for "${targetProduct.name}" set to ${parsed} units.`,
        })
        handleCloseModal()
        // Refresh authoritative list & summary
        await loadInventory(true)
      } else {
        setModalError(res.data?.message || 'Failed to update product stock.')
      }
    } catch (err) {
      const backendMsg =
        err.response?.data?.errors?.stock ||
        err.response?.data?.message ||
        'Error saving stock to server.'
      setModalError(backendMsg)
    } finally {
      setSubmitting(false)
    }
  }

  // Department filter options from taxonomy
  const departmentOptions = useMemo(() => {
    const depts = TAXONOMY.fashion?.departments || {}
    return Object.entries(depts).map(([id, dept]) => ({
      id,
      name: dept.name,
    }))
  }, [])

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8">
      <SEO
        title="Admin Inventory Management"
        description="TrendVolt catalog live stock levels, low-stock alerts, and fast restock administration."
        canonical="/admin/inventory"
        noindex={true}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border ${
              toast.type === 'success'
                ? 'bg-[#34452F] border-[#263722] text-[#FFFDF8]'
                : 'bg-[#A65332] border-[#8D4428] text-[#FFFDF8]'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 text-[#FFFDF8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[#FFFDF8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-white/70 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* =========================================================================
            SUB-NAVIGATION BAR
           ========================================================================= */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <AdminNav />
          <div className="flex items-center gap-2 text-xs font-medium text-[#5F6057]">
            <span className="h-2 w-2 rounded-full bg-[#34452F] animate-pulse" />
            <span>Authoritative Inventory Ledger</span>
          </div>
        </div>

        {/* =========================================================================
            HEADER & BREADCRUMB
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#DED7CA]">
          <div>
            <div className="flex items-center gap-3">
              <Eyebrow variant="olive">STOCK CONTROL</Eyebrow>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20">
                Live Catalog
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#1F211C]">
              Inventory &amp; Low-Stock
            </h1>
            <p className="mt-2 text-sm text-[#5F6057] max-w-2xl leading-relaxed">
              Monitor real-time inventory counts across the TrendVolt catalog, filter low-stock warnings (&le; 5 units), and atomically update stock quantities.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => loadInventory(true)}
              disabled={loading}
              title="Sync Live Inventory"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] text-xs font-semibold uppercase tracking-wider text-[#1F211C] transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin text-[#34452F]' : 'text-[#5F6057]'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              <span>{loading ? 'Syncing...' : 'Sync Live'}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            SUMMARY CARDS (Server-authoritative counts)
           ========================================================================= */}
        <section aria-label="Inventory Summary Metrics" className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
          {/* Total Products */}
          <div
            onClick={() => handleStockFilterChange('all')}
            className={`p-4 rounded-2xl bg-[#FFFDF8] border transition-all cursor-pointer shadow-xs hover:border-[#34452F]/40 ${
              stockStatusFilter === 'all' ? 'border-[#34452F] ring-1 ring-[#34452F]' : 'border-[#DED7CA]'
            }`}
          >
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">Total Active</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#1F211C]">{summary.totalProducts}</p>
            <p className="mt-2 text-[11px] text-[#5F6057]">All active listings</p>
          </div>

          {/* In Stock */}
          <div
            onClick={() => handleStockFilterChange('in_stock')}
            className={`p-4 rounded-2xl bg-[#FFFDF8] border transition-all cursor-pointer shadow-xs hover:border-[#3F6B45]/60 ${
              stockStatusFilter === 'in_stock' ? 'border-[#3F6B45] ring-1 ring-[#3F6B45]' : 'border-[#DED7CA]'
            }`}
          >
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">In Stock</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#3F6B45]">{summary.inStockCount}</p>
            <p className="mt-2 text-[11px] text-[#3F6B45] font-medium">&gt; 5 units available</p>
          </div>

          {/* Low Stock Alert */}
          <div
            onClick={() => handleStockFilterChange('low_stock')}
            className={`p-4 rounded-2xl bg-[#FFFDF8] border transition-all cursor-pointer shadow-xs hover:border-[#A86B2D]/60 ${
              stockStatusFilter === 'low_stock' ? 'border-[#A86B2D] ring-1 ring-[#A86B2D]' : 'border-[#DED7CA]'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-wider text-[#A86B2D] font-bold">Low Stock</p>
              <span className="h-2 w-2 rounded-full bg-[#A86B2D] animate-ping" />
            </div>
            <p className="mt-1 text-2xl font-serif font-bold text-[#A86B2D]">{summary.lowStockCount}</p>
            <p className="mt-2 text-[11px] text-[#A86B2D] font-medium">1 to 5 units remaining</p>
          </div>

          {/* Out of Stock */}
          <div
            onClick={() => handleStockFilterChange('out_of_stock')}
            className={`p-4 rounded-2xl bg-[#FFFDF8] border transition-all cursor-pointer shadow-xs hover:border-[#A65332]/60 ${
              stockStatusFilter === 'out_of_stock' ? 'border-[#A65332] ring-1 ring-[#A65332]' : 'border-[#DED7CA]'
            }`}
          >
            <p className="text-xs font-mono uppercase tracking-wider text-[#A65332] font-bold">Out of Stock</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#A65332]">{summary.outOfStockCount}</p>
            <p className="mt-2 text-[11px] text-[#A65332] font-medium">0 units (depleted)</p>
          </div>
        </section>

        {/* =========================================================================
            FILTERS & SEARCH
           ========================================================================= */}
        <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#85857A]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, brand, dept, ID..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#85857A] hover:text-[#1F211C]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status Pills & Department Dropdown */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Pills */}
            <div className="flex items-center rounded-xl bg-[#FAF7F0] p-1 border border-[#DED7CA]">
              <button
                type="button"
                onClick={() => handleStockFilterChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  stockStatusFilter === 'all'
                    ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                    : 'text-[#5F6057] hover:text-[#1F211C]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleStockFilterChange('low_stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  stockStatusFilter === 'low_stock'
                    ? 'bg-[#A86B2D] text-[#FFFDF8] shadow-xs'
                    : 'text-[#5F6057] hover:text-[#1F211C]'
                }`}
              >
                Low Stock
              </button>
              <button
                type="button"
                onClick={() => handleStockFilterChange('out_of_stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  stockStatusFilter === 'out_of_stock'
                    ? 'bg-[#A65332] text-[#FFFDF8] shadow-xs'
                    : 'text-[#5F6057] hover:text-[#1F211C]'
                }`}
              >
                Out of Stock
              </button>
              <button
                type="button"
                onClick={() => handleStockFilterChange('in_stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  stockStatusFilter === 'in_stock'
                    ? 'bg-[#3F6B45] text-[#FFFDF8] shadow-xs'
                    : 'text-[#5F6057] hover:text-[#1F211C]'
                }`}
              >
                In Stock
              </button>
            </div>

            {/* Department Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="inv-filter-dept" className="text-xs font-mono uppercase tracking-wider text-[#5F6057] sr-only sm:not-sr-only">
                Dept:
              </label>
              <select
                id="inv-filter-dept"
                value={departmentFilter}
                onChange={(e) => handleDepartmentFilterChange(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-all cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filter Button */}
            {(searchQuery || stockStatusFilter !== 'all' || departmentFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setStockStatusFilter('all')
                  setDepartmentFilter('all')
                  setCurrentPage(1)
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-xs font-semibold uppercase tracking-wider text-[#5F6057] hover:text-[#1F211C] hover:bg-[#EEE7DC] transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            CONTENT STATES: SKELETON / ERROR / EMPTY / TABLE
           ========================================================================= */}
        {loading && (
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-8 space-y-4 shadow-xs">
            <div className="h-10 bg-[#EEE7DC] rounded-xl w-full animate-pulse" />
            <div className="space-y-3 pt-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-[#EEE7DC] rounded-xl w-full animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-[#A65332]/30 bg-[#A65332]/10 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#A65332]/15 border border-[#A65332]/25 flex items-center justify-center mx-auto text-[#A65332]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-[#1F211C] uppercase tracking-wider">Inventory Sync Failed</h3>
            <p className="mt-1 text-xs text-[#A65332]">{error}</p>
            <button
              type="button"
              onClick={() => loadInventory()}
              className="mt-5 min-h-[44px] px-6 py-2 rounded-full bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-12 text-center max-w-md mx-auto my-12 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#DED7CA] flex items-center justify-center mx-auto text-[#5F6057]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-serif font-bold text-[#1F211C]">No Inventory Records Found</h3>
            <p className="mt-1 text-xs text-[#5F6057]">
              No catalog items match your current filter and search conditions.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setStockStatusFilter('all')
                setDepartmentFilter('all')
                setCurrentPage(1)
              }}
              className="mt-5 min-h-[44px] px-5 py-2 rounded-full bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] border border-[#DED7CA] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* =========================================================================
            DESKTOP INVENTORY TABLE (Screens >= 1024px)
           ========================================================================= */}
        {!loading && !error && products.length > 0 && (
          <div className="hidden lg:block rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                  <th
                    className="py-4 pl-6 pr-3 font-semibold cursor-pointer select-none hover:text-[#1F211C]"
                    onClick={() => handleSortChange('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Product</span>
                      {sortBy === 'name' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-3 font-semibold">Brand</th>
                  <th className="py-4 px-3 font-semibold">Department</th>
                  <th
                    className="py-4 px-3 font-semibold cursor-pointer select-none hover:text-[#1F211C]"
                    onClick={() => handleSortChange('price')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Price</span>
                      {sortBy === 'price' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-4 px-3 font-semibold cursor-pointer select-none hover:text-[#1F211C]"
                    onClick={() => handleSortChange('stock')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Current Stock</span>
                      {sortBy === 'stock' && (
                        <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-4 px-3 font-semibold">Stock Status</th>
                  <th className="py-4 pl-3 pr-6 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED7CA]/70 text-sm">
                {products.map((product) => {
                  const displayImg = getProductImage(product)
                  const cfg = STOCK_STATUS_CONFIG[product.stockStatus] || STOCK_STATUS_CONFIG.in_stock

                  return (
                    <tr
                      key={product._id}
                      className="hover:bg-[#FAF7F0] transition-colors duration-150 group"
                    >
                      {/* Product Thumbnail & Details */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex items-center gap-3.5">
                          <div className="h-12 w-12 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] overflow-hidden shrink-0 flex items-center justify-center">
                            {displayImg ? (
                              <img
                                src={displayImg}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-[9px] text-[#85857A] uppercase font-mono">No img</span>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <h3 className="font-bold text-[#1F211C] text-sm truncate leading-snug">
                              {product.name}
                            </h3>
                            <p className="text-[10px] font-mono text-[#85857A] truncate">
                              ID: {product._id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="py-4 px-3">
                        <span className="text-xs text-[#5F6057] font-medium">
                          {product.brand || 'Unbranded'}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-4 px-3">
                        <span className="inline-flex items-center rounded-full bg-[#FAF7F0] border border-[#DED7CA] px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5F6057] w-fit">
                          {product.department || 'unassigned'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-3">
                        <span className="font-serif font-bold text-[#1F211C] text-sm tracking-tight">
                          ₹{Number(product.price).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-4 px-3">
                        <span className="font-mono font-bold text-base text-[#1F211C]">
                          {product.stock}
                        </span>
                        <span className="text-xs text-[#5F6057] ml-1">units</span>
                      </td>

                      {/* Stock Status */}
                      <td className="py-4 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border ${cfg.bg} ${cfg.border} ${cfg.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(product)}
                          aria-label={`Adjust stock for ${product.name}`}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-semibold tracking-wider uppercase transition-all active:scale-95 cursor-pointer shadow-xs"
                        >
                          Set Stock
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================================================
            MOBILE INVENTORY CARDS (Screens < 1024px)
           ========================================================================= */}
        {!loading && !error && products.length > 0 && (
          <div className="lg:hidden space-y-4">
            {products.map((product) => {
              const displayImg = getProductImage(product)
              const cfg = STOCK_STATUS_CONFIG[product.stockStatus] || STOCK_STATUS_CONFIG.in_stock

              return (
                <div
                  key={product._id}
                  className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] overflow-hidden shrink-0 flex items-center justify-center">
                      {displayImg ? (
                        <img
                          src={displayImg}
                          alt={product.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[9px] text-[#85857A] uppercase font-mono">No img</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[#1F211C] text-sm truncate">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[#5F6057]">{product.brand || 'Unbranded'}</span>
                        <span className="text-[#85857A]">&bull;</span>
                        <span className="text-[10px] font-mono text-[#5F6057] uppercase">{product.department || 'fashion'}</span>
                      </div>
                      <p className="font-serif font-bold text-sm text-[#1F211C] mt-1">
                        ₹{Number(product.price).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#DED7CA]/70">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border ${cfg.bg} ${cfg.border} ${cfg.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      <span className="font-mono font-bold text-sm text-[#1F211C] ml-1">
                        {product.stock} units
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenModal(product)}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer shadow-xs"
                    >
                      Set Stock
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* =========================================================================
            PAGINATION CONTROLS
           ========================================================================= */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between flex-wrap gap-4 pt-4 border-t border-[#DED7CA]">
            <p className="text-xs text-[#5F6057] font-mono">
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.totalProducts} items total)
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPreviousPage || loading}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] text-xs font-semibold uppercase tracking-wider text-[#1F211C] hover:bg-[#FAF7F0] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] text-xs font-mono font-bold text-[#1F211C]">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage || loading}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-[#DED7CA] bg-[#FFFDF8] text-xs font-semibold uppercase tracking-wider text-[#1F211C] hover:bg-[#FAF7F0] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          STOCK ADJUSTMENT MODAL
         ========================================================================= */}
      {modalOpen && targetProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#A86B2D] font-bold">
                  Quick Stock Adjustment
                </span>
                <h3 id="stock-modal-title" className="text-lg font-serif font-bold text-[#1F211C] mt-0.5">
                  Set Inventory Level
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                className="text-[#85857A] hover:text-[#1F211C] transition-colors p-1"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Product Summary */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F0] border border-[#DED7CA]">
              <div className="h-12 w-12 rounded-lg bg-[#EEE7DC] overflow-hidden shrink-0 flex items-center justify-center border border-[#DED7CA]">
                {getProductImage(targetProduct) ? (
                  <img
                    src={getProductImage(targetProduct)}
                    alt={targetProduct.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] text-[#85857A] uppercase font-mono">No img</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#1F211C] truncate">{targetProduct.name}</p>
                <p className="text-xs text-[#5F6057]">
                  Current Stock:{' '}
                  <span className="font-mono font-bold text-[#1F211C]">{targetProduct.stock} units</span>
                </p>
              </div>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="p-3 rounded-xl bg-[#A65332]/10 border border-[#A65332]/30 text-xs text-[#A65332]">
                {modalError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveStock} className="space-y-4">
              <div>
                <label htmlFor="new-stock-input" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                  Exact Available Stock <span className="text-[#A65332]">*</span>
                </label>
                <input
                  id="new-stock-input"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  required
                  autoFocus
                  disabled={submitting}
                  value={newStockInput}
                  onChange={(e) => {
                    setNewStockInput(e.target.value)
                    if (modalError) setModalError(null)
                  }}
                  placeholder="e.g. 25"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-base font-mono font-bold text-[#1F211C] focus:outline-hidden focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-all"
                />
                <p className="mt-1 text-[11px] text-[#5F6057]">
                  Setting this will atomically update available units. If previously 0, back-in-stock alerts will trigger.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DED7CA]/70">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-xs font-semibold uppercase tracking-wider text-[#5F6057] hover:text-[#1F211C] hover:bg-[#EEE7DC] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Stock</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminInventoryPage
