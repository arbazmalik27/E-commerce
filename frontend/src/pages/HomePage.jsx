import Hero from '../components/Hero'
import PersonalizedSection from '../components/PersonalizedSection'
import ShopByCategory from '../components/ShopByCategory'
import FlashSaleSection from '../components/FlashSaleSection'
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
      <PersonalizedSection />
      <ShopByCategory />
      <FlashSaleSection />
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

