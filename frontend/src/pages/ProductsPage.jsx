import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  PackageCheck,
  AlertCircle,
} from 'lucide-react'
import ProductCard from '../components/ProductCard'
import RecentlyViewed from '../components/RecentlyViewed'
import Eyebrow from '../components/Eyebrow'
import SEO from '../components/SEO'
import api from '../services/api'
import {
  TAXONOMY,
  getCategoryLabel,
  getDepartmentLabel,
  getSubcategoryLabel,
} from '../constants/taxonomy'

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All Catalog' },
  { id: 'fashion', label: 'Fashion' },
]

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'relevance', label: 'Relevance' },
]

const PRICE_PRESETS = [
  { label: 'Under ₹1,000', min: '', max: '1000' },
  { label: '₹1,000 - ₹3,000', min: '1000', max: '3000' },
  { label: '₹3,000 - ₹5,000', min: '3000', max: '5000' },
  { label: 'Over ₹5,000', min: '5000', max: '' },
]

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [products, setProducts] = useState([])
  const [availableBrands, setAvailableBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // URL query params as single source of truth
  const activeCategory = searchParams.get('category')?.toLowerCase() || 'all'
  const activeDepartment = searchParams.get('department')?.toLowerCase() || ''
  const activeSubcategory = searchParams.get('subcategory')?.toLowerCase() || ''
  const activeSearch = searchParams.get('search')?.trim() || ''
  const activeSort = searchParams.get('sort') || 'newest'
  const activeMinPrice = searchParams.get('minPrice')?.trim() || ''
  const activeMaxPrice = searchParams.get('maxPrice')?.trim() || ''
  const activeBrand = searchParams.get('brand')?.trim() || ''
  const activeInStock =
    searchParams.get('inStock') === 'true' || searchParams.get('availability') === 'in-stock'
  const activeFlashSale = searchParams.get('flashSale') === 'true'
  const rawPage = parseInt(searchParams.get('page'), 10)
  const activePage = !isNaN(rawPage) && rawPage > 0 ? rawPage : 1
  const rawLimit = parseInt(searchParams.get('limit'), 10)
  const activeLimit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 12

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    totalProducts: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  // Search input state with debounced sync to URL
  const [searchInput, setSearchInput] = useState(activeSearch)
  const debounceTimerRef = useRef(null)

  // Sync search input if activeSearch in URL changes externally (e.g. Back/Forward)
  const [prevSearch, setPrevSearch] = useState(activeSearch)
  if (prevSearch !== activeSearch) {
    setPrevSearch(activeSearch)
    setSearchInput(activeSearch)
  }

  // Price inputs state synced with URL activeMinPrice and activeMaxPrice
  const [prevMinPrice, setPrevMinPrice] = useState(activeMinPrice)
  const [minPriceInput, setMinPriceInput] = useState(activeMinPrice)
  if (prevMinPrice !== activeMinPrice) {
    setPrevMinPrice(activeMinPrice)
    setMinPriceInput(activeMinPrice)
  }

  const [prevMaxPrice, setPrevMaxPrice] = useState(activeMaxPrice)
  const [maxPriceInput, setMaxPriceInput] = useState(activeMaxPrice)
  if (prevMaxPrice !== activeMaxPrice) {
    setPrevMaxPrice(activeMaxPrice)
    setMaxPriceInput(activeMaxPrice)
  }

  // Close mobile filter drawer on Escape key
  useEffect(() => {
    if (!mobileDrawerOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileDrawerOpen])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Price Filter Chip Label
  const priceFilterLabel = useMemo(() => {
    const hasMin = Boolean(activeMinPrice && !isNaN(Number(activeMinPrice)))
    const hasMax = Boolean(activeMaxPrice && !isNaN(Number(activeMaxPrice)))
    if (hasMin && hasMax) {
      return `Price: ₹${Number(activeMinPrice).toLocaleString('en-IN')} - ₹${Number(activeMaxPrice).toLocaleString('en-IN')}`
    }
    if (hasMin) {
      return `Price: From ₹${Number(activeMinPrice).toLocaleString('en-IN')}`
    }
    if (hasMax) {
      return `Price: Up to ₹${Number(activeMaxPrice).toLocaleString('en-IN')}`
    }
    return null
  }, [activeMinPrice, activeMaxPrice])

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (activeCategory !== 'all') count++
    if (activeDepartment) count++
    if (activeSubcategory) count++
    if (activeBrand) count++
    if (activeInStock) count++
    if (activeMinPrice || activeMaxPrice) count++
    if (activeSearch) count++
    return count
  }, [
    activeCategory,
    activeDepartment,
    activeSubcategory,
    activeBrand,
    activeInStock,
    activeMinPrice,
    activeMaxPrice,
    activeSearch,
  ])

  // Fetch products from backend whenever URL query changes
  useEffect(() => {
    let isMounted = true

    const loadProducts = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = {
          page: activePage,
          limit: activeLimit,
        }
        if (activeCategory !== 'all') {
          params.category = activeCategory
        }
        if (activeDepartment) {
          params.department = activeDepartment
        }
        if (activeSubcategory) {
          params.subcategory = activeSubcategory
        }
        if (activeSearch) {
          params.search = activeSearch
        }
        if (activeSort && activeSort !== 'newest') {
          params.sort = activeSort
        }
        if (activeMinPrice) {
          params.minPrice = activeMinPrice
        }
        if (activeMaxPrice) {
          params.maxPrice = activeMaxPrice
        }
        if (activeBrand) {
          params.brand = activeBrand
        }
        if (activeInStock) {
          params.inStock = 'true'
        }
        if (activeFlashSale) {
          params.flashSale = 'true'
        }

        const response = await api.get('/products', { params })
        if (isMounted) {
          if (response.data?.success && Array.isArray(response.data.products)) {
            setProducts(response.data.products)
            if (response.data.pagination) {
              setPagination(response.data.pagination)
            }
            if (Array.isArray(response.data.brands) && response.data.brands.length > 0) {
              setAvailableBrands(response.data.brands)
            }
          } else {
            setProducts([])
          }
        }
      } catch {
        if (isMounted) {
          setError('Unable to load products. Please check your connection and try again.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      isMounted = false
    }
  }, [
    activeCategory,
    activeDepartment,
    activeSubcategory,
    activeSearch,
    activeSort,
    activeMinPrice,
    activeMaxPrice,
    activeBrand,
    activeInStock,
    activeFlashSale,
    activePage,
    activeLimit,
  ])

  // Manual retry handler
  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        page: activePage,
        limit: activeLimit,
      }
      if (activeCategory !== 'all') params.category = activeCategory
      if (activeDepartment) params.department = activeDepartment
      if (activeSubcategory) params.subcategory = activeSubcategory
      if (activeSearch) params.search = activeSearch
      if (activeSort && activeSort !== 'newest') params.sort = activeSort
      if (activeMinPrice) params.minPrice = activeMinPrice
      if (activeMaxPrice) params.maxPrice = activeMaxPrice
      if (activeBrand) params.brand = activeBrand
      if (activeInStock) params.inStock = 'true'

      const response = await api.get('/products', { params })
      if (response.data?.success && Array.isArray(response.data.products)) {
        setProducts(response.data.products)
        if (response.data.pagination) {
          setPagination(response.data.pagination)
        }
        if (Array.isArray(response.data.brands) && response.data.brands.length > 0) {
          setAvailableBrands(response.data.brands)
        }
      } else {
        setProducts([])
      }
    } catch {
      setError('Unable to load products. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Search input typing with sensible 350ms debounce
  const handleSearchInputChange = (e) => {
    const val = e.target.value
    setSearchInput(val)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams)
      const trimmed = val.trim()
      if (trimmed) {
        nextParams.set('search', trimmed)
      } else {
        nextParams.delete('search')
      }
      nextParams.delete('page')
      setSearchParams(nextParams)
    }, 350)
  }

  // Instant submit on form submit (Enter key)
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    const nextParams = new URLSearchParams(searchParams)
    const trimmed = searchInput.trim()
    if (trimmed) {
      nextParams.set('search', trimmed)
    } else {
      nextParams.delete('search')
    }
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  // Instant clear search
  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setSearchInput('')
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('search')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  // Brand Filter Handler
  const handleBrandChange = (brandName) => {
    const nextParams = new URLSearchParams(searchParams)
    if (brandName && brandName !== 'all') {
      nextParams.set('brand', brandName)
    } else {
      nextParams.delete('brand')
    }
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleClearBrand = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('brand')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  // Stock / Availability Filter Handler
  const handleStockToggle = () => {
    const nextParams = new URLSearchParams(searchParams)
    if (activeInStock) {
      nextParams.delete('inStock')
      nextParams.delete('availability')
    } else {
      nextParams.set('inStock', 'true')
    }
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleClearStock = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('inStock')
    nextParams.delete('availability')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  // Flash Sale Filter Handler
  const handleFlashSaleToggle = () => {
    const nextParams = new URLSearchParams(searchParams)
    if (activeFlashSale) {
      nextParams.delete('flashSale')
    } else {
      nextParams.set('flashSale', 'true')
    }
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleClearFlashSale = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('flashSale')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  // Price Filter Submit & Presets
  const handlePriceFilterSubmit = (e) => {
    e.preventDefault()
    const nextParams = new URLSearchParams(searchParams)
    const trimmedMin = minPriceInput.trim()
    const trimmedMax = maxPriceInput.trim()

    if (trimmedMin && !isNaN(Number(trimmedMin)) && Number(trimmedMin) >= 0) {
      nextParams.set('minPrice', trimmedMin)
    } else {
      nextParams.delete('minPrice')
    }

    if (trimmedMax && !isNaN(Number(trimmedMax)) && Number(trimmedMax) >= 0) {
      nextParams.set('maxPrice', trimmedMax)
    } else {
      nextParams.delete('maxPrice')
    }

    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleApplyPricePreset = (preset) => {
    const nextParams = new URLSearchParams(searchParams)
    if (preset.min) {
      nextParams.set('minPrice', preset.min)
      setMinPriceInput(preset.min)
    } else {
      nextParams.delete('minPrice')
      setMinPriceInput('')
    }
    if (preset.max) {
      nextParams.set('maxPrice', preset.max)
      setMaxPriceInput(preset.max)
    } else {
      nextParams.delete('maxPrice')
      setMaxPriceInput('')
    }
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleClearPriceFilter = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('minPrice')
    nextParams.delete('maxPrice')
    nextParams.delete('page')
    setMinPriceInput('')
    setMaxPriceInput('')
    setSearchParams(nextParams)
  }

  // Taxonomy Navigation Handlers: Dependent filters reset children
  const handleCategoryChange = (categoryId) => {
    const nextParams = new URLSearchParams(searchParams)
    if (categoryId !== 'all') {
      nextParams.set('category', categoryId)
    } else {
      nextParams.delete('category')
    }
    // Switching category invalidates department and subcategory
    nextParams.delete('department')
    nextParams.delete('subcategory')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleDepartmentChange = (departmentId) => {
    const nextParams = new URLSearchParams(searchParams)
    if (departmentId) {
      nextParams.set('department', departmentId)
    } else {
      nextParams.delete('department')
    }
    // Switching department invalidates subcategory
    nextParams.delete('subcategory')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleSubcategoryChange = (subcategoryId) => {
    const nextParams = new URLSearchParams(searchParams)
    if (subcategoryId) {
      nextParams.set('subcategory', subcategoryId)
    } else {
      nextParams.delete('subcategory')
    }
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleClearDepartment = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('department')
    nextParams.delete('subcategory')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleClearSubcategory = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('subcategory')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handleSortChange = (newSort) => {
    const nextParams = new URLSearchParams(searchParams)
    if (newSort && newSort !== 'newest') {
      nextParams.set('sort', newSort)
    } else {
      nextParams.delete('sort')
    }
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(searchParams)
    if (newPage > 1) {
      nextParams.set('page', newPage.toString())
    } else {
      nextParams.delete('page')
    }
    setSearchParams(nextParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleResetFilters = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setSearchInput('')
    setMinPriceInput('')
    setMaxPriceInput('')
    setSearchParams(new URLSearchParams())
  }

  // Available departments for currently active category
  const availableDepartments = useMemo(() => {
    if (activeCategory === 'all' || !TAXONOMY[activeCategory]) return []
    const depts = TAXONOMY[activeCategory].departments
    return Object.keys(depts).map((key) => ({
      id: key,
      name: depts[key].name,
    }))
  }, [activeCategory])

  // Available subcategories for currently active department
  const availableSubcategories = useMemo(() => {
    if (activeCategory === 'all' || !activeDepartment) return []
    const catObj = TAXONOMY[activeCategory]
    if (!catObj) return []
    const deptObj = catObj.departments[activeDepartment]
    if (!deptObj) return []
    return Object.keys(deptObj.subcategories).map((key) => ({
      id: key,
      name: deptObj.subcategories[key],
    }))
  }, [activeCategory, activeDepartment])

  // Dynamic Header Titles & Breadcrumbs
  const headerTitle = useMemo(() => {
    if (activeSubcategory && activeDepartment && activeCategory !== 'all') {
      return getSubcategoryLabel(activeCategory, activeDepartment, activeSubcategory)
    }
    if (activeDepartment && activeCategory !== 'all') {
      return getDepartmentLabel(activeCategory, activeDepartment)
    }
    if (activeCategory !== 'all') {
      return getCategoryLabel(activeCategory)
    }
    return 'All Products'
  }, [activeCategory, activeDepartment, activeSubcategory])

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1F211C] pt-28 sm:pt-32 lg:pt-36 pb-24">
      <SEO
        title={headerTitle === 'All Products' ? 'All Fashion Collection' : headerTitle}
        description="Explore TrendVolt's curated catalog of premium apparel, designer footwear, and fine accessories crafted for timeless style."
        canonical="/products"
        ogType="website"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. TAXONOMY BREADCRUMBS & CONTEXT
           ========================================================================= */}
        <nav
          aria-label="Taxonomy Breadcrumbs"
          className="mb-4 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5F6057]"
        >
          <Link to="/" className="hover:text-[#1F211C] transition-colors">
            Home
          </Link>
          <span className="text-[#DED7CA]">/</span>
          <button
            type="button"
            onClick={handleResetFilters}
            className={`hover:text-[#1F211C] transition-colors cursor-pointer ${
              activeCategory === 'all' ? 'text-[#1F211C] font-bold' : ''
            }`}
          >
            Shop
          </button>

          {activeCategory !== 'all' && (
            <>
              <span className="text-[#DED7CA]">/</span>
              <button
                type="button"
                onClick={() => handleCategoryChange(activeCategory)}
                className={`hover:text-[#1F211C] transition-colors cursor-pointer ${
                  !activeDepartment ? 'text-[#1F211C] font-bold' : ''
                }`}
              >
                {getCategoryLabel(activeCategory)}
              </button>
            </>
          )}

          {activeDepartment && (
            <>
              <span className="text-[#DED7CA]">/</span>
              <button
                type="button"
                onClick={() => handleDepartmentChange(activeDepartment)}
                className={`hover:text-[#1F211C] transition-colors cursor-pointer ${
                  !activeSubcategory ? 'text-[#1F211C] font-bold' : ''
                }`}
              >
                {getDepartmentLabel(activeCategory, activeDepartment)}
              </button>
            </>
          )}

          {activeSubcategory && (
            <>
              <span className="text-[#DED7CA]">/</span>
              <span className="text-[#A65332] font-bold">
                {getSubcategoryLabel(activeCategory, activeDepartment, activeSubcategory)}
              </span>
            </>
          )}
        </nav>

        {/* =========================================================================
            2. SHOP HEADER
           ========================================================================= */}
        <header className="mb-6">
          <div className="mb-2">
            <Eyebrow variant="olive">CURATED COLLECTION</Eyebrow>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1F211C] leading-[1.1]">
              {headerTitle}
            </h1>
            {!loading && !error && (
              <span className="text-xs font-mono uppercase tracking-wider text-[#85857A]">
                {pagination.totalProducts} {pagination.totalProducts === 1 ? 'Product' : 'Products'} Found
              </span>
            )}
          </div>
          <p className="mt-2 text-sm sm:text-base text-[#5F6057] font-normal leading-relaxed max-w-2xl">
            {activeCategory === 'fashion'
              ? 'Curated fashion pieces, tailored silhouettes, and elevated wardrobe essentials.'
              : 'Explore our complete curated selection across luxury fashion apparel and contemporary essentials.'}
          </p>

          {/* Active Filter Chips / Clear Actions */}
          {(activeCategory !== 'all' ||
            activeDepartment ||
            activeSubcategory ||
            activeBrand ||
            activeInStock ||
            activeSearch ||
            priceFilterLabel) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-[#DED7CA]/60">
              <span className="text-xs text-[#85857A] font-mono uppercase tracking-wider">
                Active:
              </span>

              {activeSearch && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#A65332]/40 px-3 py-1 text-xs text-[#A65332] shadow-2xs">
                  <span>Search: &ldquo;{activeSearch}&rdquo;</span>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold text-sm leading-none"
                    title="Clear Search"
                    aria-label="Clear Search"
                  >
                    ×
                  </button>
                </span>
              )}

              {activeCategory !== 'all' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#DED7CA] px-3 py-1 text-xs text-[#1F211C] shadow-2xs">
                  <span>Category: {getCategoryLabel(activeCategory)}</span>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('all')}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold text-sm leading-none"
                    title="Remove Category"
                    aria-label="Remove Category"
                  >
                    ×
                  </button>
                </span>
              )}

              {activeDepartment && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#34452F]/40 px-3 py-1 text-xs text-[#34452F] shadow-2xs">
                  <span>Dept: {getDepartmentLabel(activeCategory, activeDepartment)}</span>
                  <button
                    type="button"
                    onClick={handleClearDepartment}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold text-sm leading-none"
                    title="Remove Department"
                    aria-label="Remove Department"
                  >
                    ×
                  </button>
                </span>
              )}

              {activeSubcategory && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#A65332]/40 px-3 py-1 text-xs text-[#A65332] shadow-2xs">
                  <span>Subcat: {getSubcategoryLabel(activeCategory, activeDepartment, activeSubcategory)}</span>
                  <button
                    type="button"
                    onClick={handleClearSubcategory}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold text-sm leading-none"
                    title="Remove Subcategory"
                    aria-label="Remove Subcategory"
                  >
                    ×
                  </button>
                </span>
              )}

              {activeBrand && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#DED7CA] px-3 py-1 text-xs text-[#1F211C] shadow-2xs font-medium">
                  <span>Brand: {activeBrand}</span>
                  <button
                    type="button"
                    onClick={handleClearBrand}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold text-sm leading-none"
                    title="Remove Brand"
                    aria-label="Remove Brand"
                  >
                    ×
                  </button>
                </span>
              )}

              {activeInStock && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#3F6B45]/40 px-3 py-1 text-xs text-[#3F6B45] shadow-2xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3F6B45]" />
                  <span>In Stock Only</span>
                  <button
                    type="button"
                    onClick={handleClearStock}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold text-sm leading-none"
                    title="Clear In Stock Filter"
                    aria-label="Clear In Stock Filter"
                  >
                    ×
                  </button>
                </span>
              )}

              {activeFlashSale && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#A65332]/10 border border-[#A65332]/40 px-3 py-1 text-xs text-[#A65332] shadow-2xs font-bold">
                  <span>⚡ Flash Sale Only</span>
                  <button
                    type="button"
                    onClick={handleClearFlashSale}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold text-sm leading-none"
                    title="Clear Flash Sale Filter"
                    aria-label="Clear Flash Sale Filter"
                  >
                    ×
                  </button>
                </span>
              )}

              {priceFilterLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#34452F]/40 px-3 py-1 text-xs text-[#34452F] shadow-2xs">
                  <span>{priceFilterLabel}</span>
                  <button
                    type="button"
                    onClick={handleClearPriceFilter}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold text-sm leading-none"
                    title="Clear Price Filter"
                    aria-label="Clear Price Filter"
                  >
                    ×
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[#85857A] hover:text-[#A65332] underline underline-offset-2 ml-1 cursor-pointer transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </header>

        {/* =========================================================================
            3. MAIN CONTROLS BAR: SEARCH, TOOLBAR & FILTERS
           ========================================================================= */}
        <div className="mb-6 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-4 sm:p-5 shadow-xs space-y-4">
          {/* Top Row: Search Input + Action Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <form
              onSubmit={handleSearchSubmit}
              role="search"
              className="relative flex items-center min-w-[240px] grow lg:max-w-md"
            >
              <label htmlFor="product-search-input" className="sr-only">
                Search products by name, description, brand, or category
              </label>
              <div className="relative w-full flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-[#85857A] pointer-events-none" />
                <input
                  id="product-search-input"
                  type="search"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  placeholder="Search name, brand, style, department..."
                  className="w-full min-h-[44px] rounded-full border border-[#DED7CA] bg-[#FAF7F0] pl-10 pr-9 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label="Clear search input"
                    className="absolute right-3.5 text-[#85857A] hover:text-[#1F211C] transition-colors cursor-pointer text-base leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            </form>

            {/* Desktop & Tablet Filter Bar Controls */}
            <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
              {/* Flash Sale Filter Button */}
              <button
                type="button"
                onClick={handleFlashSaleToggle}
                aria-pressed={activeFlashSale}
                className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold tracking-wide transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeFlashSale
                    ? 'bg-[#A65332] text-white border-[#A65332] shadow-xs'
                    : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#A65332] hover:text-[#8C4326] border-[#DED7CA]'
                }`}
              >
                <span>⚡</span>
                <span>Flash Sales</span>
              </button>

              {/* In-Stock Toggle Button */}
              <button
                type="button"
                onClick={handleStockToggle}
                aria-pressed={activeInStock}
                className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-semibold tracking-wide transition-all cursor-pointer inline-flex items-center gap-2 ${
                  activeInStock
                    ? 'bg-[#34452F] text-[#FFFDF8] border-[#34452F] shadow-xs'
                    : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] border-[#DED7CA]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${activeInStock ? 'bg-[#7EC186]' : 'bg-[#85857A]'}`}
                />
                <span>In Stock Only</span>
              </button>

              {/* Brand Selector Dropdown */}
              {availableBrands.length > 0 && (
                <div className="relative flex items-center">
                  <label htmlFor="brand-select" className="sr-only">
                    Filter by Brand
                  </label>
                  <select
                    id="brand-select"
                    value={activeBrand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] pl-3 pr-8 py-2 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-colors cursor-pointer appearance-none"
                  >
                    <option value="" className="bg-[#FFFDF8]">
                      All Brands
                    </option>
                    {availableBrands.map((b) => (
                      <option key={b} value={b} className="bg-[#FFFDF8]">
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-[#85857A] pointer-events-none" />
                </div>
              )}

              {/* Sort Dropdown */}
              <div className="relative flex items-center">
                <label htmlFor="sort-select" className="sr-only">
                  Sort products
                </label>
                <select
                  id="sort-select"
                  value={activeSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] pl-3 pr-8 py-2 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-colors cursor-pointer appearance-none"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-[#FFFDF8]">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-[#85857A] pointer-events-none" />
              </div>

              {/* Mobile Filter Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden min-h-[44px] px-3.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#34452F]" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[#34452F] text-[#FFFDF8] h-5 min-w-[20px] px-1 text-[10px] font-mono">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tier 1: Category Filter Pills */}
          <div className="pt-2 border-t border-[#DED7CA]/60 flex items-center flex-wrap gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#85857A] mr-1">
              Category:
            </span>
            {CATEGORY_OPTIONS.map((cat) => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  aria-pressed={isActive}
                  className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                      : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] border border-[#DED7CA]'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Tier 2: Department Pills (Rendered when a category is selected) */}
          {availableDepartments.length > 0 && (
            <div className="pt-3 border-t border-[#DED7CA]/60">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#34452F] font-bold">
                  {getCategoryLabel(activeCategory)} Departments:
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDepartmentChange('')}
                  aria-pressed={!activeDepartment}
                  className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                    !activeDepartment
                      ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                      : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] border border-[#DED7CA]'
                  }`}
                >
                  All {getCategoryLabel(activeCategory)}
                </button>
                {availableDepartments.map((dept) => {
                  const isDeptActive = activeDepartment === dept.id
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => handleDepartmentChange(dept.id)}
                      aria-pressed={isDeptActive}
                      className={`min-h-[36px] px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                        isDeptActive
                          ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                          : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] border border-[#DED7CA]'
                      }`}
                    >
                      {dept.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tier 3: Subcategory Pills (Rendered when a department is selected) */}
          {availableSubcategories.length > 0 && (
            <div className="pt-3 border-t border-[#DED7CA]/60">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#5F6057] font-bold">
                  {getDepartmentLabel(activeCategory, activeDepartment)} Subcategories:
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => handleSubcategoryChange('')}
                  aria-pressed={!activeSubcategory}
                  className={`min-h-[32px] px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                    !activeSubcategory
                      ? 'bg-[#34452F]/15 text-[#34452F] border border-[#34452F]/30 font-bold'
                      : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] border border-[#DED7CA]'
                  }`}
                >
                  All {getDepartmentLabel(activeCategory, activeDepartment)}
                </button>
                {availableSubcategories.map((sub) => {
                  const isSubActive = activeSubcategory === sub.id
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubcategoryChange(sub.id)}
                      aria-pressed={isSubActive}
                      className={`min-h-[32px] px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                        isSubActive
                          ? 'bg-[#A65332] text-white border border-[#A65332] font-bold shadow-xs'
                          : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] border border-[#DED7CA]'
                      }`}
                    >
                      {sub.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Desktop Inline Price Filter & Quick Presets */}
          <div className="hidden lg:flex items-center justify-between pt-3 border-t border-[#DED7CA]/60 gap-4 flex-wrap">
            {/* Quick Price Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#85857A] mr-1">
                Price:
              </span>
              {PRICE_PRESETS.map((preset, idx) => {
                const isSelected =
                  (preset.min === '' || activeMinPrice === preset.min) &&
                  (preset.max === '' || activeMaxPrice === preset.max) &&
                  (activeMinPrice !== '' || activeMaxPrice !== '')
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPricePreset(preset)}
                    className={`min-h-[32px] px-2.5 py-0.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#34452F] text-[#FFFDF8] border-[#34452F] font-semibold'
                        : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] border-[#DED7CA]'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            {/* Custom Min / Max Price Inputs */}
            <form
              onSubmit={handlePriceFilterSubmit}
              aria-label="Custom Price Range Filter"
              className="flex items-center gap-1.5"
            >
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#85857A] text-xs font-mono">
                  ₹
                </span>
                <input
                  id="min-price-input"
                  type="number"
                  min="0"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  placeholder="Min"
                  aria-label="Minimum Price in INR"
                  className="w-20 min-h-[36px] rounded-lg border border-[#DED7CA] bg-[#FAF7F0] pl-6 pr-1.5 py-1 text-xs text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <span className="text-[#85857A] text-xs font-mono">-</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#85857A] text-xs font-mono">
                  ₹
                </span>
                <input
                  id="max-price-input"
                  type="number"
                  min="0"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  placeholder="Max"
                  aria-label="Maximum Price in INR"
                  className="w-20 min-h-[36px] rounded-lg border border-[#DED7CA] bg-[#FAF7F0] pl-6 pr-1.5 py-1 text-xs text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <button
                type="submit"
                aria-label="Apply Price Filter"
                className="min-h-[36px] px-3 rounded-lg bg-[#34452F] text-[#FFFDF8] hover:bg-[#263722] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              >
                Apply
              </button>
              {(activeMinPrice || activeMaxPrice) && (
                <button
                  type="button"
                  onClick={handleClearPriceFilter}
                  aria-label="Clear Price Filter"
                  className="min-h-[36px] px-2 rounded-lg border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#A65332] text-xs font-bold transition-colors cursor-pointer"
                  title="Clear Price Filter"
                >
                  ×
                </button>
              )}
            </form>
          </div>
        </div>

        {/* =========================================================================
            MOBILE FILTER DRAWER (SLIDE-OVER)
           ========================================================================= */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden lg:hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-md bg-[#FFFDF8] border-l border-[#DED7CA] shadow-2xl flex flex-col justify-between">
                {/* Drawer Header */}
                <div className="p-4 sm:p-6 border-b border-[#DED7CA] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-[#34452F]" />
                    <h2 className="font-serif text-lg font-bold text-[#1F211C]">Filters & Refinements</h2>
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-[#34452F] text-[#FFFDF8] h-5 min-w-[20px] px-1 text-[10px] font-mono flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-2 text-[#85857A] hover:text-[#1F211C] cursor-pointer"
                    aria-label="Close filters drawer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 grow">
                  {/* Availability */}
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#85857A] mb-3">
                      Availability
                    </h3>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={activeInStock}
                        onChange={handleStockToggle}
                        className="h-4 w-4 rounded border-[#DED7CA] text-[#34452F] focus:ring-[#34452F]"
                      />
                      <span className="text-sm font-medium text-[#1F211C]">In Stock Only</span>
                    </label>
                  </div>

                  {/* Categories */}
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#85857A] mb-3">
                      Category
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryChange(cat.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border cursor-pointer ${
                            activeCategory === cat.id
                              ? 'bg-[#34452F] text-[#FFFDF8] border-[#34452F]'
                              : 'bg-[#FAF7F0] text-[#5F6057] border-[#DED7CA]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Departments */}
                  {availableDepartments.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[#85857A] mb-3">
                        Department
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDepartmentChange('')}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border cursor-pointer ${
                            !activeDepartment
                              ? 'bg-[#34452F] text-[#FFFDF8] border-[#34452F]'
                              : 'bg-[#FAF7F0] text-[#5F6057] border-[#DED7CA]'
                          }`}
                        >
                          All
                        </button>
                        {availableDepartments.map((dept) => (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => handleDepartmentChange(dept.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border cursor-pointer ${
                              activeDepartment === dept.id
                                ? 'bg-[#34452F] text-[#FFFDF8] border-[#34452F]'
                                : 'bg-[#FAF7F0] text-[#5F6057] border-[#DED7CA]'
                            }`}
                          >
                            {dept.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subcategories */}
                  {availableSubcategories.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[#85857A] mb-3">
                        Subcategory
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSubcategoryChange('')}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide border cursor-pointer ${
                            !activeSubcategory
                              ? 'bg-[#34452F]/15 text-[#34452F] border-[#34452F]/30 font-bold'
                              : 'bg-[#FAF7F0] text-[#5F6057] border-[#DED7CA]'
                          }`}
                        >
                          All
                        </button>
                        {availableSubcategories.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSubcategoryChange(sub.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide border cursor-pointer ${
                              activeSubcategory === sub.id
                                ? 'bg-[#A65332] text-white border-[#A65332] font-bold'
                                : 'bg-[#FAF7F0] text-[#5F6057] border-[#DED7CA]'
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brands */}
                  {availableBrands.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-[#85857A] mb-3">
                        Brand
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleBrandChange('all')}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                            !activeBrand
                              ? 'bg-[#34452F] text-[#FFFDF8] border-[#34452F] font-semibold'
                              : 'bg-[#FAF7F0] text-[#5F6057] border-[#DED7CA]'
                          }`}
                        >
                          All Brands
                        </button>
                        {availableBrands.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => handleBrandChange(b)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                              activeBrand === b
                                ? 'bg-[#34452F] text-[#FFFDF8] border-[#34452F] font-semibold'
                                : 'bg-[#FAF7F0] text-[#5F6057] border-[#DED7CA]'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Presets & Inputs */}
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#85857A] mb-3">
                      Price Range
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {PRICE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPricePreset(preset)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-xs text-[#1F211C] font-medium text-left cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handlePriceFilterSubmit} className="flex items-center gap-2">
                      <div className="relative grow">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#85857A] text-xs font-mono">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={minPriceInput}
                          onChange={(e) => setMinPriceInput(e.target.value)}
                          placeholder="Min"
                          className="w-full min-h-[40px] rounded-lg border border-[#DED7CA] bg-[#FAF7F0] pl-6 pr-2 py-1 text-xs text-[#1F211C]"
                        />
                      </div>
                      <span className="text-[#85857A] text-xs font-mono">-</span>
                      <div className="relative grow">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#85857A] text-xs font-mono">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={maxPriceInput}
                          onChange={(e) => setMaxPriceInput(e.target.value)}
                          placeholder="Max"
                          className="w-full min-h-[40px] rounded-lg border border-[#DED7CA] bg-[#FAF7F0] pl-6 pr-2 py-1 text-xs text-[#1F211C]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="min-h-[40px] px-3 rounded-lg bg-[#34452F] text-[#FFFDF8] text-xs font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Apply
                      </button>
                    </form>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 sm:p-6 border-t border-[#DED7CA] flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="w-1/2 min-h-[44px] rounded-full border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-xs font-bold uppercase tracking-wider text-[#1F211C] cursor-pointer"
                  >
                    Reset All
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="w-1/2 min-h-[44px] rounded-full bg-[#34452F] hover:bg-[#263722] text-xs font-bold uppercase tracking-wider text-[#FFFDF8] cursor-pointer shadow-xs"
                  >
                    Show Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. PRODUCTS CONTENT: SKELETON / ERROR / EMPTY / GRID
           ========================================================================= */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#DED7CA] bg-[#FFFDF8] p-4 space-y-4 animate-pulse shadow-xs"
              >
                <div className="aspect-square bg-[#EEE7DC] rounded-lg w-full" />
                <div className="h-4 bg-[#EEE7DC] rounded w-3/4" />
                <div className="h-4 bg-[#EEE7DC] rounded w-1/2" />
                <div className="h-9 bg-[#EEE7DC] rounded-lg w-full pt-2" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="py-20 text-center max-w-md mx-auto rounded-2xl border border-red-200 bg-[#FFFDF8] p-8 sm:p-12 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-[#B7473A] mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1F211C]">
              Connection Error
            </h2>
            <p className="mt-2 text-sm text-[#5F6057]">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-6 min-h-[44px] px-6 py-2.5 rounded-full bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-colors shadow-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="py-20 text-center max-w-lg mx-auto rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-8 sm:p-12 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F0] border border-[#DED7CA] flex items-center justify-center mx-auto text-[#85857A] mb-4">
              <PackageCheck className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1F211C]">
              {activeSearch
                ? `No products found for "${activeSearch}"`
                : priceFilterLabel
                ? 'No Products Within This Price Range'
                : activeBrand
                ? `No Products Found For ${activeBrand}`
                : activeInStock
                ? 'No In-Stock Items Match This Filter'
                : 'No Products In This Category'}
            </h2>
            <p className="mt-2 text-sm text-[#5F6057] leading-relaxed">
              {activeSearch ? (
                <>
                  We couldn&apos;t find any fashion items matching{' '}
                  <span className="text-[#1F211C] font-semibold">&ldquo;{activeSearch}&rdquo;</span>.
                  Try checking your spelling, using more general keywords, or clearing your active filters.
                </>
              ) : priceFilterLabel ? (
                <>
                  No items matched your selected price criteria ({priceFilterLabel}).
                  Try broadening your price range or clearing the price filter.
                </>
              ) : activeBrand ? (
                <>
                  No active listings currently available under brand{' '}
                  <span className="text-[#1F211C] font-semibold">&ldquo;{activeBrand}&rdquo;</span>.
                  Try selecting another brand or clearing this filter.
                </>
              ) : activeInStock ? (
                <>
                  All products matching your current category selection are temporarily out of stock.
                  Try clearing the &ldquo;In Stock Only&rdquo; filter.
                </>
              ) : (
                <>
                  We currently don&apos;t have any active listings under{' '}
                  <span className="text-[#1F211C] font-semibold">
                    {[
                      activeCategory !== 'all' ? getCategoryLabel(activeCategory) : null,
                      activeDepartment ? getDepartmentLabel(activeCategory, activeDepartment) : null,
                      activeSubcategory
                        ? getSubcategoryLabel(activeCategory, activeDepartment, activeSubcategory)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' → ') || 'this selection'}
                  </span>
                  . Check back soon for upcoming season arrivals.
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {activeSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="min-h-[44px] px-5 py-2 rounded-full bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer shadow-xs"
                >
                  Clear Search
                </button>
              )}
              {priceFilterLabel && (
                <button
                  type="button"
                  onClick={handleClearPriceFilter}
                  className="min-h-[44px] px-5 py-2 rounded-full bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer shadow-xs"
                >
                  Clear Price Filter
                </button>
              )}
              {activeBrand && (
                <button
                  type="button"
                  onClick={handleClearBrand}
                  className="min-h-[44px] px-5 py-2 rounded-full bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer shadow-xs"
                >
                  Clear Brand Filter
                </button>
              )}
              {activeInStock && (
                <button
                  type="button"
                  onClick={handleClearStock}
                  className="min-h-[44px] px-5 py-2 rounded-full bg-[#34452F] text-[#FFFDF8] font-bold text-xs uppercase tracking-wider hover:bg-[#263722] transition-colors cursor-pointer shadow-xs"
                >
                  Clear In-Stock Filter
                </button>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[44px] px-5 py-2 rounded-full border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <nav
                aria-label="Product Pagination"
                className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-2 select-none"
              >
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(activePage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  aria-label="Go to previous page"
                  className="min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-[#DED7CA] bg-[#FFFDF8] text-xs font-bold uppercase tracking-wider text-[#1F211C] transition-all duration-200 hover:bg-[#34452F] hover:text-[#FFFDF8] hover:border-[#34452F] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#FFFDF8] disabled:hover:text-[#1F211C] disabled:hover:border-[#DED7CA] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] active:scale-95 shadow-xs"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isCurrent = pageNum === activePage
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        aria-current={isCurrent ? 'page' : undefined}
                        aria-label={`Page ${pageNum}`}
                        className={`min-h-[44px] min-w-[44px] rounded-full text-xs font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] active:scale-95 ${
                          isCurrent
                            ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                            : 'bg-[#FFFDF8] border border-[#DED7CA] text-[#5F6057] hover:bg-[#FAF7F0] hover:text-[#1F211C] hover:border-[#34452F]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => handlePageChange(activePage + 1)}
                  disabled={!pagination.hasNextPage}
                  aria-label="Go to next page"
                  className="min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-[#DED7CA] bg-[#FFFDF8] text-xs font-bold uppercase tracking-wider text-[#1F211C] transition-all duration-200 hover:bg-[#34452F] hover:text-[#FFFDF8] hover:border-[#34452F] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#FFFDF8] disabled:hover:text-[#1F211C] disabled:hover:border-[#DED7CA] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] active:scale-95 shadow-xs"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </nav>
            )}
          </>
        )}

        {/* Recently Viewed Products Section */}
        <RecentlyViewed limit={4} className="mt-14 sm:mt-20" />
      </div>
    </div>
  )
}

export default ProductsPage
