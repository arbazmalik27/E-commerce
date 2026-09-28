import { Link } from 'react-router-dom'
import Eyebrow from '../components/Eyebrow'
import SEO from '../components/SEO'

function NotFoundPage() {
  return (
    <section className="flex min-h-[65vh] items-center justify-center px-4 py-16 sm:py-24">
      <SEO
        title="Page Not Found"
        description="The page you requested could not be found on TrendVolt."
        noindex={true}
      />
      <div className="max-w-lg w-full text-center space-y-6">
        <Eyebrow variant="terracotta">PAGE NOT FOUND</Eyebrow>
        
        <h1 className="font-serif text-7xl sm:text-8xl font-bold tracking-tight text-[#1F211C] select-none">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-bold text-[#1F211C]">
            Lost in the Archive
          </h2>
          <p className="text-sm text-[#5F6057] max-w-sm mx-auto leading-relaxed">
            The page or curated piece you are looking for does not exist, has been moved, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            to="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-8 py-3.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
          >
            Explore Catalog
          </Link>
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#EEE7DC] text-[#1F211C] px-8 py-3.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Return Home
          </Link>
        </div>
      </div>
    </section>
  )
}

export default NotFoundPage
