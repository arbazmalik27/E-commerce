import Hero from '../components/Hero'
import ShopByCategory from '../components/ShopByCategory'
import FeaturedProducts from '../components/FeaturedProducts'
import EditorialFeature from '../components/EditorialFeature'
import FashionTrends from '../components/FashionTrends'
import PromoBanner from '../components/PromoBanner'
import WhyTrendVolt from '../components/WhyTrendVolt'
import TrendingProducts from '../components/TrendingProducts'
import NewsletterCTA from '../components/NewsletterCTA'

function HomePage() {
  return (
    <div className="w-full">
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

