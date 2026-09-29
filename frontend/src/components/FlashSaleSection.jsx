import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Flame } from 'lucide-react'
import api from '../services/api'
import ProductCard from './ProductCard'
import CountdownTimer from './CountdownTimer'
import Eyebrow from './Eyebrow'

function FlashSaleSection() {
  const [flashSales, setFlashSales] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchActiveSales = async () => {
    try {
      const response = await api.get('/flash-sales')
      if (response.data?.success && Array.isArray(response.data.flashSales)) {
        setFlashSales(response.data.flashSales)
      } else {
        setFlashSales([])
      }
    } catch {
      setFlashSales([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActiveSales()
  }, [])

  // If no active flash sales exist in DB, do not render an empty section
  if (loading || flashSales.length === 0) {
    return null
  }

  // Display the primary active flash sale
  const primarySale = flashSales[0]
  const saleProducts = primarySale.products || []

  if (saleProducts.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="flash-sale-heading"
      className="w-full bg-linear-to-b from-[#FFFDF8] via-[#FAF7F0] to-[#FFFDF8] py-12 sm:py-16 border-y border-[#DED7CA]/70"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#DED7CA]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#A65332] text-white">
                <Flame className="h-3 w-3 fill-current" />
              </span>
              <Eyebrow text="LIMITED TIME EVENT" className="text-[#A65332] font-bold" />
            </div>
            <h2
              id="flash-sale-heading"
              className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1F211C] tracking-tight"
            >
              {primarySale.name}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#5F6057] max-w-xl">
              {primarySale.description || 'Exclusive discounts on select runway and seasonal pieces. When time runs out, prices return to normal.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {primarySale.endAt && (
              <div className="rounded-xl bg-[#FFFDF8] border border-[#A65332]/30 px-3.5 py-2 shadow-xs">
                <CountdownTimer
                  targetDate={primarySale.endAt}
                  label="Ends in"
                  onExpire={fetchActiveSales}
                />
              </div>
            )}
            <Link
              to="/products?flashSale=true"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-xs"
            >
              <span>View All Offers</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Product Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {saleProducts.slice(0, 4).map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              showAddToCart={true}
              variant="default"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default FlashSaleSection
