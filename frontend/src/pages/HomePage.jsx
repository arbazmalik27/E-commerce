import Hero from '../components/Hero'
import ShopByCategory from '../components/ShopByCategory'
import FeaturedProducts from '../components/FeaturedProducts'
import EditorialFeature from '../components/EditorialFeature'
import FashionTrends from '../components/FashionTrends'
import PromoBanner from '../components/PromoBanner'
import WhyTrendVolt from '../components/WhyTrendVolt'
import TrendingProducts from '../components/TrendingProducts'
import NewsletterCTA from '../components/NewsletterCTA'
import SEO from '../components/SEO'

function HomePage() {
  return (
    <div className="w-full">
      <SEO
        title="TrendVolt — Luxury & Everyday Fashion"
        description="Discover curated fashion collections, premium apparel, bespoke tailoring, and timeless wardrobe essentials at TrendVolt."
        canonical="/"
        ogType="website"
      />
      <Hero />
      <ShopByCategory />
      <FeaturedProducts />
      <EditorialFeature />
      <FashionTrends />
      <PromoBanner />
      <WhyTrendVolt />
      <TrendingProducts />
      <NewsletterCTA />
    </div>
  )
}

export default HomePage

