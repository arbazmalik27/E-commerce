import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../../services/api'
import Eyebrow from '../../components/Eyebrow'
import AdminNav from '../../components/AdminNav'
import {
  TAXONOMY,
  isValidDepartment,
  isValidSubcategory,
  getDepartmentLabel,
  getSubcategoryLabel,
} from '../../constants/taxonomy'
import { getProductImage } from '../../utils/productImageMap'

const INITIAL_FORM = {
  name: '',
  description: '',
  price: '',
  category: 'fashion',
  department: '',
  subcategory: '',
  brand: '',
  stock: '',
  images: [],
  isActive: true,
}

// Client-side image processor: ensures clean JPEG/PNG encoding and optimizes large photos for web
const processImageFile = (file) => {
  return new Promise((resolve, reject) => {
    // If file is already smaller than 400KB, read directly as Data URL
    if (file.size < 400 * 1024) {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to read image file.'))
      reader.readAsDataURL(file)
      return
    }

    // For larger images (e.g. multi-MB JPGs), resize and compress via canvas
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const maxDim = 1400
      let width = img.width
      let height = img.height

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to clean JPEG format with high quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Failed to process image.'))
      reader.readAsDataURL(file)
    }
    img.src = objectUrl
  })
}

function AdminProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null) // { type: 'success' | 'error', message: string }

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' | 'edit'
  const [currentProductId, setCurrentProductId] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Single Product Image Picker State
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  // Delete Dialog State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Fetch Products
  const loadProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/products?all=true')
      if (response.data?.success && Array.isArray(response.data.products)) {
        setProducts(response.data.products)
      } else {
        setProducts([])
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products from server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  // Derived Department options for Add/Edit Modal
  const departmentOptions = useMemo(() => {
    if (!formData.category || !TAXONOMY[formData.category]) return []
    const depts = TAXONOMY[formData.category].departments
    return Object.keys(depts).map((key) => ({
      id: key,
      name: depts[key].name,
    }))
  }, [formData.category])

  // Derived Subcategory options for Add/Edit Modal
  const subcategoryOptions = useMemo(() => {
    if (!formData.category || !formData.department) return []
    const depts = TAXONOMY[formData.category]?.departments
    if (!depts || !depts[formData.department]) return []
    return depts[formData.department].subcategories || []
  }, [formData.category, formData.department])

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = item.name?.toLowerCase().includes(q)
        const matchBrand = item.brand?.toLowerCase().includes(q)
        const matchCategory = item.category?.toLowerCase().includes(q)
        const matchDept = item.department?.toLowerCase().includes(q)
        const matchSubcat = item.subcategory?.toLowerCase().includes(q)
        const matchId = item._id?.toLowerCase().includes(q)
        if (!matchName && !matchBrand && !matchCategory && !matchDept && !matchSubcat && !matchId) {
          return false
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'all') {
        if (item.category !== categoryFilter) return false
      }

      // 3. Stock Filter
      if (stockFilter === 'inStock' && item.stock <= 0) return false
      if (stockFilter === 'outOfStock' && item.stock > 0) return false

      // 4. Status Filter
      if (statusFilter === 'active' && item.isActive === false) return false
      if (statusFilter === 'inactive' && item.isActive !== false) return false

      return true
    })
  }, [products, searchQuery, categoryFilter, stockFilter, statusFilter])

  // Quick Metrics
  const inStockCount = useMemo(() => products.filter((p) => p.stock > 0).length, [products])
  const outOfStockCount = useMemo(() => products.filter((p) => p.stock <= 0).length, [products])

  // Reset form and file picker state
  const resetFormState = () => {
    setFormData(INITIAL_FORM)
    setFormErrors({})
    setSelectedFile(null)
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Add Product Flow
  const handleOpenAdd = () => {
    resetFormState()
    setModalMode('add')
    setCurrentProductId(null)
    setModalOpen(true)
  }

  // Edit Product Flow
  const handleOpenEdit = (product) => {
    resetFormState()
    setModalMode('edit')
    setCurrentProductId(product._id)
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price ?? '',
      category: product.category || 'fashion',
      department: product.department || '',
      subcategory: product.subcategory || '',
      brand: product.brand || '',
      stock: product.stock ?? '',
      images: Array.isArray(product.images) ? product.images : [],
      isActive: product.isActive !== false,
    })
    if (Array.isArray(product.images) && product.images.length > 0) {
      setImagePreview(product.images[0])
    }
    setModalOpen(true)
  }

  // Taxonomy Cascade Handlers in Modal
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value
    setFormData((prev) => ({
      ...prev,
      category: newCategory,
      department: '',
      subcategory: '',
    }))
  }

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value
    setFormData((prev) => ({
      ...prev,
      department: newDept,
      subcategory: '',
    }))
  }

  // Client-Side Validation
  const validateForm = () => {
    const errors = {}

    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Product name is required.'
    } else if (formData.name.trim().length > 200) {
      errors.name = 'Product name cannot exceed 200 characters.'
    }

    if (!formData.description || !formData.description.trim()) {
      errors.description = 'Description is required.'
    } else if (formData.description.trim().length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters.'
    }

    if (formData.price === '' || isNaN(Number(formData.price))) {
      errors.price = 'Price is required and must be a number.'
    } else if (Number(formData.price) < 0) {
      errors.price = 'Price cannot be negative.'
    }

    if (!formData.brand || !formData.brand.trim()) {
      errors.brand = 'Brand name is required.'
    } else if (formData.brand.trim().length > 100) {
      errors.brand = 'Brand cannot exceed 100 characters.'
    }

    if (formData.stock === '' || isNaN(Number(formData.stock))) {
      errors.stock = 'Stock is required and must be a whole number.'
    } else if (Number(formData.stock) < 0 || !Number.isInteger(Number(formData.stock))) {
      errors.stock = 'Stock must be a non-negative integer.'
    }

    if (!formData.category) {
      errors.category = 'Category is required.'
    } else if (formData.category !== 'fashion') {
      errors.category = 'Currently only the "fashion" category is supported.'
    }

    // Taxonomy consistency check
    if (formData.department && !isValidDepartment(formData.category, formData.department)) {
      errors.department = 'Invalid department for fashion category.'
    }

    if (formData.subcategory && !isValidSubcategory(formData.category, formData.department, formData.subcategory)) {
      errors.subcategory = 'Invalid subcategory for selected department.'
    }

    // Single Image Requirement
    const hasExistingImage = imagePreview && imagePreview.length > 0
    const hasNewFile = !!selectedFile

    if (!hasExistingImage && !hasNewFile) {
      errors.image = 'Product image is required. Please choose an image file.'
    }

    return errors
  }

  // Add / Edit Submission Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    const priceNum = Number(formData.price)
    const stockNum = parseInt(formData.stock, 10)

    setSubmitting(true)
    try {
      let finalImageUrl = imagePreview

      // If user selected a new file from local computer, process and optimize it
      if (selectedFile) {
        finalImageUrl = await processImageFile(selectedFile)
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceNum,
        category: formData.category,
        department: formData.department || null,
        subcategory: formData.subcategory || null,
        brand: formData.brand.trim(),
        stock: stockNum,
        images: finalImageUrl ? [finalImageUrl] : [],
        isActive: formData.isActive,
      }

      if (modalMode === 'add') {
        const res = await api.post('/products', payload)
        if (res.data?.success) {
          setToast({
            type: 'success',
            message: `Product "${payload.name}" created successfully.`,
          })
          setModalOpen(false)
          await loadProducts()
        }
      } else {
        const res = await api.put(`/products/${currentProductId}`, payload)
        if (res.data?.success) {
          setToast({
            type: 'success',
            message: `Product "${payload.name}" updated successfully.`,
          })
          setModalOpen(false)
          await loadProducts()
        }
      }
    } catch (err) {
      const backendErrors = err.response?.data?.errors
      if (backendErrors && typeof backendErrors === 'object') {
        setFormErrors(backendErrors)
      } else {
        setToast({
          type: 'error',
          message:
            err.response?.data?.message ||
            `Failed to ${modalMode === 'add' ? 'create' : 'update'} product.`,
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Native Single Image Picker Handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reject non-image files
    if (!file.type.startsWith('image/')) {
      setFormErrors((prev) => ({
        ...prev,
        image: 'Invalid file format. Please select an image file (PNG, JPG, WEBP, etc.).',
      }))
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Clear any previous image errors
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next.image
      delete next.images
      return next
    })

    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    setSelectedFile(file)
  }

  const handleRemoveImage = () => {
    setSelectedFile(null)
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFormData((prev) => ({ ...prev, images: [] }))
  }

  // Delete Action Handlers
  const handleOpenDelete = (product) => {
    setProductToDelete(product)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setDeleting(true)
    try {
      const res = await api.delete(`/products/${productToDelete._id}`)
      if (res.data?.success) {
        setToast({
          type: 'success',
          message: `Product "${productToDelete.name}" deactivated successfully.`,
        })
        setDeleteModalOpen(false)
        setProductToDelete(null)
        await loadProducts()
      } else {
        setToast({
          type: 'error',
          message: res.data?.message || 'Failed to deactivate product.',
        })
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to deactivate product.',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Reactivate Action Handler
  const handleReactivate = async (product) => {
    try {
      const res = await api.put(`/products/${product._id}`, { isActive: true })
      if (res.data?.success) {
        setToast({
          type: 'success',
          message: `Product "${product.name}" reactivated successfully.`,
        })
        await loadProducts()
      } else {
        setToast({
          type: 'error',
          message: res.data?.message || 'Failed to reactivate product.',
        })
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reactivate product.',
      })
    }
  }

  return (
    <div className="relative min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-36 sm:pt-40 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8">
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
            <span className="h-2 w-2 rounded-full bg-[#34452F]" />
            <span>Fashion Catalog Directory</span>
          </div>
        </div>

        {/* =========================================================================
            HEADER & BREADCRUMB
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#DED7CA]">
          <div>
            <div className="flex items-center gap-3">
              <Eyebrow variant="olive">PRODUCT CATALOG</Eyebrow>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20">
                Live Inventory
              </span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#1F211C]">
              Inventory Management
            </h1>
            <p className="mt-2 text-sm text-[#5F6057] max-w-2xl leading-relaxed">
              Inspect, create, edit, and safely manage product listings across TrendVolt&apos;s 3-tier fashion catalog taxonomy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] px-6 py-2.5 text-xs sm:text-sm font-bold tracking-wider text-[#FFFDF8] uppercase shadow-sm transition-all duration-200 hover:bg-[#263722] active:scale-95 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#34452F]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Product</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            METRICS STRIP
           ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs">
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">Total Products</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#1F211C]">{products.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs">
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">Active Listings</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#34452F]">
              {products.filter((p) => p.isActive !== false).length}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs">
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">In Stock</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#3F6B45]">{inStockCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs">
            <p className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">Out of Stock</p>
            <p className="mt-1 text-2xl font-serif font-bold text-[#A65332]">{outOfStockCount}</p>
          </div>
        </div>

        {/* =========================================================================
            SEARCH & FILTER CONTROLS
           ========================================================================= */}
        <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#DED7CA] shadow-xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#85857A]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, brand, taxonomy, or ID..."
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

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="admin-filter-category" className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                Category:
              </label>
              <select
                id="admin-filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-all"
              >
                <option value="all">All Categories</option>
                <option value="fashion">Fashion</option>
              </select>
            </div>

            {/* Stock Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="admin-filter-stock" className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                Stock:
              </label>
              <select
                id="admin-filter-stock"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-all"
              >
                <option value="all">All Stock Status</option>
                <option value="inStock">In Stock (&gt;0)</option>
                <option value="outOfStock">Out of Stock (0)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="admin-filter-status" className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                Status:
              </label>
              <select
                id="admin-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadProducts}
              disabled={loading}
              title="Refresh Products"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FFFDF8] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
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
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRODUCTS CONTENT STATE: SKELETON / ERROR / EMPTY / TABLE
           ========================================================================= */}
        {loading && (
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-4 animate-pulse">
              <div className="h-10 bg-[#EEE7DC] rounded-xl w-full" />
            </div>
            <div className="space-y-3 animate-pulse pt-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-[#EEE7DC] rounded-xl w-full" />
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
            <h3 className="mt-4 text-base font-bold text-[#1F211C] uppercase tracking-wider">Failed to Load Catalog</h3>
            <p className="mt-1 text-xs text-[#A65332]">{error}</p>
            <button
              type="button"
              onClick={loadProducts}
              className="mt-5 min-h-[44px] px-6 py-2 rounded-full bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-12 text-center max-w-md mx-auto my-12 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F0] border border-[#DED7CA] flex items-center justify-center mx-auto text-[#5F6057]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-serif font-bold text-[#1F211C]">No Products Found</h3>
            <p className="mt-1 text-xs text-[#5F6057]">
              {searchQuery || categoryFilter !== 'all' || stockFilter !== 'all'
                ? 'No catalog items match your search and filter criteria.'
                : 'Your store catalog is currently empty. Click "New Product" above to create your first item.'}
            </p>
            {(searchQuery || categoryFilter !== 'all' || stockFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setCategoryFilter('all')
                  setStockFilter('all')
                }}
                className="mt-5 min-h-[44px] px-5 py-2 rounded-full bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] border border-[#DED7CA] font-semibold text-xs uppercase tracking-wider transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {/* =========================================================================
            DESKTOP DATA TABLE (Screens >= 1024px)
           ========================================================================= */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="hidden lg:block rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DED7CA] bg-[#FAF7F0] text-[11px] font-mono uppercase tracking-wider text-[#5F6057]">
                  <th className="py-4 pl-6 pr-3 font-semibold">Product</th>
                  <th className="py-4 px-3 font-semibold">Taxonomy</th>
                  <th className="py-4 px-3 font-semibold">Brand</th>
                  <th className="py-4 px-3 font-semibold">Price</th>
                  <th className="py-4 px-3 font-semibold">Stock</th>
                  <th className="py-4 px-3 font-semibold">Status</th>
                  <th className="py-4 pl-3 pr-6 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DED7CA]/70 text-sm">
                {filteredProducts.map((product) => {
                  const displayImg = getProductImage(product)
                  const isAvailable = product.stock > 0

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

                      {/* Taxonomy (Category > Department > Subcategory) */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          <span className="inline-flex items-center rounded-full bg-[#FAF7F0] border border-[#DED7CA] px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#5F6057] w-fit">
                            {product.category}
                          </span>
                          {product.department ? (
                            <span className="text-[11px] text-[#5F6057] font-medium truncate">
                              {getDepartmentLabel(product.category, product.department)}
                              {product.subcategory && (
                                <span className="text-[#34452F]">
                                  {' '}&bull; {getSubcategoryLabel(product.category, product.department, product.subcategory)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#85857A] italic font-mono">Unclassified</span>
                          )}
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="py-4 px-3">
                        <span className="text-xs text-[#5F6057] font-medium">
                          {product.brand || 'Unbranded'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-3">
                        <span className="font-serif font-bold text-[#1F211C] text-sm tracking-tight">
                          ₹{Number(product.price).toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border ${
                            isAvailable
                              ? 'bg-[#3F6B45]/10 text-[#3F6B45] border-[#3F6B45]/25'
                              : 'bg-[#A65332]/10 text-[#A65332] border-[#A65332]/25'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAvailable ? 'bg-[#3F6B45]' : 'bg-[#A65332]'
                            }`}
                          />
                          {isAvailable ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-4 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                            product.isActive !== false
                              ? 'bg-[#34452F]/10 text-[#34452F] border-[#34452F]/25'
                              : 'bg-[#FAF7F0] text-[#85857A] border-[#DED7CA]'
                          }`}
                        >
                          {product.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            aria-label={`Edit ${product.name}`}
                            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] text-xs font-semibold tracking-wider uppercase transition-colors active:scale-95 cursor-pointer border border-[#DED7CA]"
                          >
                            Edit
                          </button>
                          {product.isActive === false ? (
                            <button
                              type="button"
                              onClick={() => handleReactivate(product)}
                              aria-label={`Reactivate ${product.name}`}
                              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#3F6B45]/10 hover:bg-[#3F6B45]/20 text-[#3F6B45] text-xs font-semibold tracking-wider uppercase transition-colors active:scale-95 cursor-pointer border border-[#3F6B45]/25"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(product)}
                              aria-label={`Deactivate ${product.name}`}
                              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#A65332]/10 hover:bg-[#A65332]/20 text-[#A65332] text-xs font-semibold tracking-wider uppercase transition-colors active:scale-95 cursor-pointer border border-[#A65332]/25"
                            >
                              Deactivate
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

        {/* =========================================================================
            TABLET & MOBILE RESPONSIVE CARDS (Screens < 1024px)
           ========================================================================= */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div className="lg:hidden space-y-3.5">
            {filteredProducts.map((product) => {
              const displayImg = getProductImage(product)
              const isAvailable = product.stock > 0

              return (
                <article
                  key={product._id}
                  className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-4 shadow-xs"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="h-16 w-16 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] overflow-hidden shrink-0 flex items-center justify-center">
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
                      <p className="text-[10px] font-mono uppercase tracking-wider text-[#85857A] truncate">
                        {product.brand || 'Unbranded'}
                      </p>
                      <h3 className="font-bold text-[#1F211C] text-base leading-snug truncate">
                        {product.name}
                      </h3>

                      {/* Taxonomy Path */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                        <span className="rounded-full bg-[#FAF7F0] border border-[#DED7CA] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#5F6057]">
                          {product.category}
                        </span>
                        {product.department ? (
                          <span className="text-[#5F6057] font-medium">
                            {getDepartmentLabel(product.category, product.department)}
                            {product.subcategory && (
                              <span className="text-[#34452F]">
                                {' '}&bull; {getSubcategoryLabel(product.category, product.department, product.subcategory)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#85857A] italic font-mono">Unclassified</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="font-serif font-bold text-[#1F211C] text-sm">
                          ₹{Number(product.price).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[#DED7CA]">•</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isAvailable
                              ? 'bg-[#3F6B45]/10 text-[#3F6B45] border-[#3F6B45]/25'
                              : 'bg-[#A65332]/10 text-[#A65332] border-[#A65332]/25'
                          }`}
                        >
                          {isAvailable ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                            product.isActive !== false
                              ? 'bg-[#34452F]/10 text-[#34452F] border-[#34452F]/25'
                              : 'bg-[#FAF7F0] text-[#85857A] border-[#DED7CA]'
                          }`}
                        >
                          {product.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-3.5 pt-3 border-t border-[#DED7CA]/70 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(product)}
                      aria-label={`Edit ${product.name}`}
                      className="min-h-[44px] flex items-center justify-center rounded-xl bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] text-xs font-bold tracking-wider uppercase transition-all active:scale-95 cursor-pointer border border-[#DED7CA]"
                    >
                      Edit
                    </button>
                    {product.isActive === false ? (
                      <button
                        type="button"
                        onClick={() => handleReactivate(product)}
                        aria-label={`Reactivate ${product.name}`}
                        className="min-h-[44px] flex items-center justify-center rounded-xl bg-[#3F6B45]/15 hover:bg-[#3F6B45] text-[#3F6B45] hover:text-[#FFFDF8] text-xs font-bold tracking-wider uppercase transition-all active:scale-95 cursor-pointer border border-[#3F6B45]/30"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(product)}
                        aria-label={`Deactivate ${product.name}`}
                        className="min-h-[44px] flex items-center justify-center rounded-xl bg-[#A65332]/10 hover:bg-[#A65332] text-[#A65332] hover:text-[#FFFDF8] text-xs font-bold tracking-wider uppercase transition-all active:scale-95 cursor-pointer border border-[#A65332]/25"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          ADD / EDIT PRODUCT MODAL
         ========================================================================= */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#1F211C]/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-2xl rounded-3xl border border-[#DED7CA] bg-[#FFFDF8] p-6 sm:p-8 shadow-2xl my-8 text-[#1F211C]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#34452F] font-bold">
                  {modalMode === 'add' ? 'Catalog Expansion' : 'Catalog Modification'}
                </span>
                <h2 id="modal-title" className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#1F211C] mt-1">
                  {modalMode === 'add' ? 'Create New Product' : 'Edit Product'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0] transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error Banner */}
            {formErrors.body && (
              <div className="mt-4 p-3 rounded-xl bg-[#A65332]/10 border border-[#A65332]/30 text-[#A65332] text-xs">
                {formErrors.body}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
              {/* Product Name */}
              <div>
                <label htmlFor="form-name" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                  Product Name <span className="text-[#A65332]">*</span>
                </label>
                <input
                  id="form-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Silk Jacquard Tuxedo Blazer"
                  maxLength={200}
                  className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-4 text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden transition-all ${
                    formErrors.name
                      ? 'border-[#A65332] focus:border-[#A65332] focus:ring-1 focus:ring-[#A65332]'
                      : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]'
                  }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-[#A65332]">{formErrors.name}</p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label htmlFor="form-brand" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                  Brand Name <span className="text-[#A65332]">*</span>
                </label>
                <input
                  id="form-brand"
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. TrendVolt Studio"
                  maxLength={100}
                  className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-4 text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden transition-all ${
                    formErrors.brand
                      ? 'border-[#A65332] focus:border-[#A65332] focus:ring-1 focus:ring-[#A65332]'
                      : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]'
                  }`}
                />
                {formErrors.brand && (
                  <p className="mt-1 text-xs text-[#A65332]">{formErrors.brand}</p>
                )}
              </div>

              {/* 3-Tier Taxonomy: Category, Department, Subcategory */}
              <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#DED7CA] space-y-3">
                <p className="text-[11px] font-mono uppercase tracking-widest text-[#34452F] font-semibold">
                  Catalog Taxonomy
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Category */}
                  <div>
                    <label htmlFor="form-category" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                      1. Category <span className="text-[#A65332]">*</span>
                    </label>
                    <select
                      id="form-category"
                      value={formData.category}
                      onChange={handleCategoryChange}
                      className="w-full min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FFFDF8] px-3 text-sm text-[#1F211C] focus:border-[#34452F] focus:outline-hidden focus:ring-1 focus:ring-[#34452F] transition-all"
                    >
                      <option value="fashion">Fashion</option>
                    </select>
                    {formErrors.category && (
                      <p className="mt-1 text-xs text-[#A65332]">{formErrors.category}</p>
                    )}
                  </div>

                  {/* Department */}
                  <div>
                    <label htmlFor="form-department" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                      2. Department
                    </label>
                    <select
                      id="form-department"
                      value={formData.department}
                      onChange={handleDepartmentChange}
                      className="w-full min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FFFDF8] px-3 text-sm text-[#1F211C] focus:border-[#34452F] focus:outline-hidden focus:ring-1 focus:ring-[#34452F] transition-all"
                    >
                      <option value="">-- Select Dept --</option>
                      {departmentOptions.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.department && (
                      <p className="mt-1 text-xs text-[#A65332]">{formErrors.department}</p>
                    )}
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label htmlFor="form-subcategory" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                      3. Subcategory
                    </label>
                    <select
                      id="form-subcategory"
                      value={formData.subcategory}
                      disabled={!formData.department}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FFFDF8] px-3 text-sm text-[#1F211C] focus:border-[#34452F] focus:outline-hidden focus:ring-1 focus:ring-[#34452F] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {formData.department ? '-- Select Subcat --' : '-- Choose Dept First --'}
                      </option>
                      {subcategoryOptions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.subcategory && (
                      <p className="mt-1 text-xs text-[#A65332]">{formErrors.subcategory}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price & Stock (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form-price" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Price (₹) <span className="text-[#A65332]">*</span>
                  </label>
                  <input
                    id="form-price"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 3499"
                    className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-4 text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden transition-all ${
                      formErrors.price
                        ? 'border-[#A65332] focus:border-[#A65332] focus:ring-1 focus:ring-[#A65332]'
                        : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]'
                    }`}
                  />
                  {formErrors.price && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.price}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="form-stock" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                    Stock Quantity <span className="text-[#A65332]">*</span>
                  </label>
                  <input
                    id="form-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="e.g. 25"
                    className={`w-full min-h-[44px] rounded-xl border bg-[#FAF7F0] px-4 text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden transition-all ${
                      formErrors.stock
                        ? 'border-[#A65332] focus:border-[#A65332] focus:ring-1 focus:ring-[#A65332]'
                        : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]'
                    }`}
                  />
                  {formErrors.stock && (
                    <p className="mt-1 text-xs text-[#A65332]">{formErrors.stock}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="form-description" className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-1.5">
                  Description <span className="text-[#A65332]">*</span>
                </label>
                <textarea
                  id="form-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide luxury product details, materials, tailoring, and specifications..."
                  maxLength={2000}
                  className={`w-full rounded-xl border bg-[#FAF7F0] p-3 text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden transition-all ${
                    formErrors.description
                      ? 'border-[#A65332] focus:border-[#A65332] focus:ring-1 focus:ring-[#A65332]'
                      : 'border-[#DED7CA] focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F]'
                  }`}
                />
                {formErrors.description && (
                  <p className="mt-1 text-xs text-[#A65332]">{formErrors.description}</p>
                )}
              </div>

              {/* Product Image Upload (Native Browser File Picker) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#5F6057] mb-2">
                  Product Image <span className="text-[#A65332]">*</span>
                </label>

                {/* Native Single File Input: accept="image/*", no multiple */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!imagePreview ? (
                  /* Empty state: Click to open native file picker */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative cursor-pointer rounded-2xl border-2 border-dashed border-[#DED7CA] hover:border-[#34452F]/60 bg-[#FAF7F0] hover:bg-[#EEE7DC]/50 p-8 flex flex-col items-center justify-center text-center transition-all group focus:outline-hidden focus:ring-2 focus:ring-[#34452F]/40"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        fileInputRef.current?.click()
                      }
                    }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#34452F]/10 border border-[#34452F]/20 flex items-center justify-center text-[#34452F] group-hover:scale-110 transition-transform mb-3">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-[#1F211C] group-hover:text-[#34452F] transition-colors">
                      Select Product Image
                    </p>
                    <p className="mt-1 text-xs text-[#5F6057] max-w-xs">
                      Choose exactly ONE image from your local computer (Downloads, Pictures, Desktop)
                    </p>
                    <span className="mt-3 inline-flex items-center px-3.5 py-1.5 rounded-lg bg-[#FFFDF8] border border-[#DED7CA] group-hover:bg-[#34452F] group-hover:text-[#FFFDF8] group-hover:border-[#34452F] text-xs font-semibold text-[#1F211C] transition-all shadow-xs">
                      Browse Files
                    </span>
                  </div>
                ) : (
                  /* Local preview state before upload */
                  <div className="relative rounded-2xl border border-[#DED7CA] bg-[#FAF7F0] p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-[#DED7CA] bg-[#FFFDF8] shrink-0">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <p className="text-xs font-mono uppercase tracking-wider text-[#34452F] font-semibold">
                        Selected Image
                      </p>
                      <p className="text-sm text-[#1F211C] font-medium truncate mt-0.5">
                        {selectedFile ? selectedFile.name : 'Existing Product Image'}
                      </p>
                      {selectedFile && (
                        <p className="text-xs text-[#5F6057] mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type || 'image'}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-[#FFFDF8] hover:bg-[#EEE7DC] text-xs font-semibold text-[#1F211C] border border-[#DED7CA] transition-colors cursor-pointer"
                        >
                          Change Image
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-3 py-1.5 rounded-lg bg-[#A65332]/10 hover:bg-[#A65332]/20 text-xs font-semibold text-[#A65332] border border-[#A65332]/20 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(formErrors.image || formErrors.images) && (
                  <p className="mt-2 text-xs text-[#A65332]">{formErrors.image || formErrors.images}</p>
                )}
              </div>

              {/* Active Status Checkbox */}
              <div className="pt-2 flex items-center gap-3">
                <input
                  id="form-is-active"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded-md border-[#DED7CA] text-[#34452F] focus:ring-[#34452F] cursor-pointer"
                />
                <label htmlFor="form-is-active" className="text-sm font-medium text-[#1F211C] cursor-pointer">
                  Product Active (Visible in Storefront)
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[#DED7CA] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] font-semibold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-6 py-2.5 text-xs font-bold tracking-wider text-[#FFFDF8] uppercase shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span>{modalMode === 'add' ? 'Create Product' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION DIALOG (SOFT-DELETE DEACTIVATE)
         ========================================================================= */}
      {deleteModalOpen && productToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F211C]/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-[#A65332]/30 bg-[#FFFDF8] p-6 sm:p-7 shadow-2xl text-[#1F211C]">
            <div className="w-12 h-12 rounded-2xl bg-[#A65332]/10 border border-[#A65332]/25 flex items-center justify-center text-[#A65332] mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <h2 id="delete-dialog-title" className="text-xl font-serif font-bold tracking-tight text-[#1F211C]">
              Deactivate Product?
            </h2>

            <p className="mt-2 text-sm text-[#5F6057] leading-relaxed">
              Are you sure you want to deactivate{' '}
              <strong className="text-[#1F211C] font-semibold">&ldquo;{productToDelete.name}&rdquo;</strong>?
              This product will be hidden from customer catalog, but historical orders and references will remain intact. You can reactivate it at any time.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false)
                  setProductToDelete(null)
                }}
                disabled={deleting}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#A65332] hover:bg-[#8D4428] px-5 py-2.5 text-xs font-bold tracking-wider text-[#FFFDF8] uppercase shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {deleting && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>Deactivate Product</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProductsPage
