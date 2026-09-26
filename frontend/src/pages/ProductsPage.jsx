import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import Eyebrow from '../components/Eyebrow'
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
]

function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // URL query params as single source of truth
  const activeCategory = searchParams.get('category')?.toLowerCase() || 'all'
  const activeDepartment = searchParams.get('department')?.toLowerCase() || ''
  const activeSubcategory = searchParams.get('subcategory')?.toLowerCase() || ''
  const activeSearch = searchParams.get('search')?.trim() || ''
  const activeSort = searchParams.get('sort') || 'newest'
  const activeMinPrice = searchParams.get('minPrice')?.trim() || ''
  const activeMaxPrice = searchParams.get('maxPrice')?.trim() || ''
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

  // Search input state synced with URL activeSearch
  const [prevSearch, setPrevSearch] = useState(activeSearch)
  const [searchInput, setSearchInput] = useState(activeSearch)

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

        const response = await api.get('/products', { params })
        if (isMounted) {
          if (response.data?.success && Array.isArray(response.data.products)) {
            setProducts(response.data.products)
            if (response.data.pagination) {
              setPagination(response.data.pagination)
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

      const response = await api.get('/products', { params })
      if (response.data?.success && Array.isArray(response.data.products)) {
        setProducts(response.data.products)
        if (response.data.pagination) {
          setPagination(response.data.pagination)
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

  // Search Submit & Clear Handlers (Resetting page to 1)
  const handleSearchSubmit = (e) => {
    e.preventDefault()
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

  const handleClearSearch = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('search')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  // Price Filter Submit & Clear Handlers (Resetting page to 1)
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

  const handleClearPriceFilter = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('minPrice')
    nextParams.delete('maxPrice')
    nextParams.delete('page')
    setMinPriceInput('')
    setMaxPriceInput('')
    setSearchParams(nextParams)
  }

  // Taxonomy Navigation Handlers (Preserving search, sort, price filters; resetting page to 1)
  const handleCategoryChange = (categoryId) => {
    const nextParams = new URLSearchParams()
    if (categoryId !== 'all') {
      nextParams.set('category', categoryId)
    }
    if (activeSearch) {
      nextParams.set('search', activeSearch)
    }
    if (activeSort && activeSort !== 'newest') {
      nextParams.set('sort', activeSort)
    }
    if (activeMinPrice) {
      nextParams.set('minPrice', activeMinPrice)
    }
    if (activeMaxPrice) {
      nextParams.set('maxPrice', activeMaxPrice)
    }
    // Switching top-level category clears department, subcategory, and page
    setSearchParams(nextParams)
  }

  const handleDepartmentChange = (departmentId) => {
    const nextParams = new URLSearchParams()
    if (activeCategory !== 'all') {
      nextParams.set('category', activeCategory)
    }
    if (departmentId) {
      nextParams.set('department', departmentId)
    }
    if (activeSearch) {
      nextParams.set('search', activeSearch)
    }
    if (activeSort && activeSort !== 'newest') {
      nextParams.set('sort', activeSort)
    }
    if (activeMinPrice) {
      nextParams.set('minPrice', activeMinPrice)
    }
    if (activeMaxPrice) {
      nextParams.set('maxPrice', activeMaxPrice)
    }
    // Switching department clears subcategory and page
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

  // Products are already sorted server-side in MongoDB
  const sortedProducts = products

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. TAXONOMY BREADCRUMBS & CONTEXT
           ========================================================================= */}
        <nav aria-label="Taxonomy Breadcrumbs" className="mb-4 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5F6057]">
          <Link to="/" className="hover:text-[#1F211C] transition-colors">Home</Link>
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
        <header className="mb-8">
          <div className="mb-3">
            <Eyebrow variant="olive">SHOP THE EDIT</Eyebrow>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1F211C] leading-[1.1]">
            {headerTitle}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#5F6057] font-normal leading-relaxed max-w-2xl">
            {activeCategory === 'fashion'
              ? 'Curated fashion pieces, tailored silhouettes, and elevated wardrobe essentials.'
              : 'Explore our complete curated selection across luxury fashion apparel and contemporary essentials.'}
          </p>

          {/* Active Filter Chips / Clear Actions */}
          {(activeCategory !== 'all' || activeDepartment || activeSubcategory || activeSearch || priceFilterLabel) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-[#85857A] font-mono uppercase tracking-wider">Active Filters:</span>
              {activeSearch && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#A65332]/30 px-3 py-1 text-xs text-[#A65332] shadow-2xs">
                  <span>Search: &ldquo;{activeSearch}&rdquo;</span>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold"
                    title="Clear Search"
                  >
                    ×
                  </button>
                </span>
              )}
              {priceFilterLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#34452F]/30 px-3 py-1 text-xs text-[#34452F] shadow-2xs">
                  <span>{priceFilterLabel}</span>
                  <button
                    type="button"
                    onClick={handleClearPriceFilter}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold"
                    title="Clear Price Filter"
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
                    onClick={handleResetFilters}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold"
                    title="Remove Category"
                  >
                    ×
                  </button>
                </span>
              )}
              {activeDepartment && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#DED7CA] px-3 py-1 text-xs text-[#1F211C] shadow-2xs">
                  <span>Dept: {getDepartmentLabel(activeCategory, activeDepartment)}</span>
                  <button
                    type="button"
                    onClick={handleClearDepartment}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold"
                    title="Remove Department"
                  >
                    ×
                  </button>
                </span>
              )}
              {activeSubcategory && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFDF8] border border-[#A65332]/30 px-3 py-1 text-xs text-[#A65332] shadow-2xs">
                  <span>Subcat: {getSubcategoryLabel(activeCategory, activeDepartment, activeSubcategory)}</span>
                  <button
                    type="button"
                    onClick={handleClearSubcategory}
                    className="hover:text-red-600 cursor-pointer ml-1 font-bold"
                    title="Remove Subcategory"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[#85857A] hover:text-[#A65332] underline underline-offset-2 ml-2 cursor-pointer transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </header>

        {/* =========================================================================
            3. TAXONOMY NAVIGATION & FILTERS
           ========================================================================= */}
        <div className="mb-8 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-4 sm:p-6 shadow-xs space-y-4">
          {/* Tier 1: Category Filter Pills + Search Form + Sort Dropdown */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <nav aria-label="Main Categories" className="flex items-center flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    aria-pressed={isActive}
                    className={`min-h-[44px] px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                        : 'bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#1F211C] border border-[#DED7CA]'
                    }`}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </nav>

            {/* Search Input, Price Filter & Sort Dropdown Group */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Product Search Form */}
              <form
                onSubmit={handleSearchSubmit}
                role="search"
                className="relative flex items-center min-w-[200px] sm:min-w-[240px] grow sm:grow-0"
              >
                <label htmlFor="product-search-input" className="sr-only">
                  Search products by name or brand
                </label>
                <div className="relative w-full flex items-center">
                  <input
                    id="product-search-input"
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by name or brand..."
                    className="w-full min-h-[44px] rounded-full border border-[#DED7CA] bg-[#FAF7F0] pl-10 pr-9 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-colors"
                  />
                  <button
                    type="submit"
                    aria-label="Submit search"
                    className="absolute left-3.5 text-[#85857A] hover:text-[#1F211C] transition-colors cursor-pointer"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  </button>
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('')
                        if (activeSearch) handleClearSearch()
                      }}
                      aria-label="Clear search input"
                      className="absolute right-3.5 text-[#85857A] hover:text-[#1F211C] transition-colors cursor-pointer text-base leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </form>

              {/* Price Filter Form */}
              <form
                onSubmit={handlePriceFilterSubmit}
                aria-label="Price Filter"
                className="flex items-center gap-1.5"
              >
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#85857A] text-xs font-mono">₹</span>
                    <input
                      id="min-price-input"
                      type="number"
                      min="0"
                      value={minPriceInput}
                      onChange={(e) => setMinPriceInput(e.target.value)}
                      placeholder="Min"
                      aria-label="Minimum Price in INR"
                      className="w-18 sm:w-20 min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] pl-6 pr-1.5 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <span className="text-[#85857A] text-xs font-mono">-</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#85857A] text-xs font-mono">₹</span>
                    <input
                      id="max-price-input"
                      type="number"
                      min="0"
                      value={maxPriceInput}
                      onChange={(e) => setMaxPriceInput(e.target.value)}
                      placeholder="Max"
                      aria-label="Maximum Price in INR"
                      className="w-18 sm:w-20 min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] pl-6 pr-1.5 py-2 text-xs sm:text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-hidden focus:border-[#34452F] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  aria-label="Apply Price Filter"
                  className="min-h-[44px] px-3.5 rounded-xl bg-[#34452F] text-[#FFFDF8] hover:bg-[#263722] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  Filter
                </button>
                {(activeMinPrice || activeMaxPrice || minPriceInput || maxPriceInput) && (
                  <button
                    type="button"
                    onClick={handleClearPriceFilter}
                    aria-label="Clear Price Filter"
                    title="Clear Price Filter"
                    className="min-h-[44px] px-2.5 rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#5F6057] hover:text-[#A65332] text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    ×
                  </button>
                )}
              </form>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="sort-select" className="text-xs font-mono uppercase tracking-wider text-[#5F6057]">
                  Sort:
                </label>
                <select
                  id="sort-select"
                  value={activeSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="min-h-[44px] rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-3 py-2 text-xs font-medium text-[#1F211C] focus:outline-hidden focus:border-[#34452F] transition-colors"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-[#FFFDF8] text-[#1F211C]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
                  className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
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
                      className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
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
                  className={`min-h-[34px] px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase transition-all duration-200 cursor-pointer ${
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
                      className={`min-h-[34px] px-3 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase transition-all duration-200 cursor-pointer ${
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
        </div>

        {/* Product Count Indicator */}
        {!loading && !error && (
          <div className="mb-6 flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#85857A]">
            <span>
              Showing {products.length} of {pagination.totalProducts} {pagination.totalProducts === 1 ? 'item' : 'items'}
              {activeSearch ? ` for "${activeSearch}"` : ''}
              {pagination.totalPages > 1 ? ` (Page ${activePage} of ${pagination.totalPages})` : ''}
            </span>
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
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1F211C]">Connection Error</h2>
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

        {!loading && !error && sortedProducts.length === 0 && (
          <div className="py-20 text-center max-w-lg mx-auto rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-8 sm:p-12 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F0] border border-[#DED7CA] flex items-center justify-center mx-auto text-[#85857A] mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1F211C]">
              {activeSearch
                ? `No products found for "${activeSearch}"`
                : priceFilterLabel
                ? 'No Products Within This Price Range'
                : 'No Products In This Category'}
            </h2>
            <p className="mt-2 text-sm text-[#5F6057] leading-relaxed">
              {activeSearch ? (
                <>
                  We couldn&apos;t find any products matching{' '}
                  <span className="text-[#1F211C] font-semibold">&ldquo;{activeSearch}&rdquo;</span>.
                  Try checking your spelling, using more general keywords, or clearing your active filters.
                </>
              ) : priceFilterLabel ? (
                <>
                  No items matched your selected price criteria ({priceFilterLabel}).
                  Try broadening your price range or clearing the price filter.
                </>
              ) : (
                <>
                  We currently don&apos;t have any active listings under{' '}
                  <span className="text-[#1F211C] font-semibold">
                    {[
                      activeCategory !== 'all' ? getCategoryLabel(activeCategory) : null,
                      activeDepartment ? getDepartmentLabel(activeCategory, activeDepartment) : null,
                      activeSubcategory ? getSubcategoryLabel(activeCategory, activeDepartment, activeSubcategory) : null,
                    ].filter(Boolean).join(' → ') || 'this selection'}
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
              {activeSubcategory && (
                <button
                  type="button"
                  onClick={handleClearSubcategory}
                  className="min-h-[44px] px-5 py-2 rounded-full border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  View All {getDepartmentLabel(activeCategory, activeDepartment)}
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

        {!loading && !error && sortedProducts.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedProducts.map((product) => (
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
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
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
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ProductsPage
