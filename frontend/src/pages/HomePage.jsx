import Hero from '../components/Hero'
import ShopByCategory from '../components/ShopByCategory'
import FeaturedProducts from '../components/FeaturedProducts'
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
      <PromoBanner />
      <WhyTrendVolt />
      <TrendingProducts />
      <NewsletterCTA />
    </div>
  )
}

export default HomePage
