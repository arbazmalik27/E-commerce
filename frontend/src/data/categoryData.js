/**
 * Category Architecture & Taxonomy Configuration
 * 
 * Centralized data configuration for TrendVolt's primary departments and
 * subcategory groups. Scalable for future category expansions and filtering.
 */

export const CATEGORY_DATA = [
  {
    id: 'fashion',
    name: 'Fashion',
    tagline: 'Tailored silhouettes, contemporary apparel, and everyday luxury essentials.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Curated contemporary fashion apparel and seasonal editorial collection',
    ctaText: 'Explore Fashion',
    ctaLink: '/products?category=fashion',
    departments: [
      {
        name: 'Men',
        slug: 'men',
        link: '/products?category=fashion&department=men',
        items: [
          { name: 'T-Shirts', slug: 't-shirts' },
          { name: 'Shirts', slug: 'shirts' },
          { name: 'Jeans', slug: 'jeans' },
          { name: 'Trousers', slug: 'trousers' },
          { name: 'Hoodies & Sweatshirts', slug: 'hoodies-sweatshirts' },
          { name: 'Jackets & Coats', slug: 'jackets-coats' },
          { name: 'Shorts', slug: 'shorts' },
          { name: 'Ethnic Wear', slug: 'ethnic-wear' },
          { name: 'Suits & Blazers', slug: 'suits-blazers' },
        ],
      },
      {
        name: 'Women',
        slug: 'women',
        link: '/products?category=fashion&department=women',
        items: [
          { name: 'Tops', slug: 'tops' },
          { name: 'Dresses', slug: 'dresses' },
          { name: 'Jeans', slug: 'jeans' },
          { name: 'Trousers', slug: 'trousers' },
          { name: 'Skirts', slug: 'skirts' },
          { name: 'Kurtis', slug: 'kurtis' },
          { name: 'Sarees', slug: 'sarees' },
          { name: 'Ethnic Wear', slug: 'ethnic-wear' },
          { name: 'Jackets & Coats', slug: 'jackets-coats' },
        ],
      },
      {
        name: 'Kids',
        slug: 'kids',
        link: '/products?category=fashion&department=kids',
        items: [
          { name: 'Boys', slug: 'boys' },
          { name: 'Girls', slug: 'girls' },
          { name: 'Kids Clothing', slug: 'kids-clothing' },
          { name: 'Kids Footwear', slug: 'kids-footwear' },
          { name: 'Kids Accessories', slug: 'kids-accessories' },
        ],
      },
      {
        name: 'Footwear',
        slug: 'footwear',
        link: '/products?category=fashion&department=footwear',
        items: [
          { name: 'Sneakers', slug: 'sneakers' },
          { name: 'Running Shoes', slug: 'running-shoes' },
          { name: 'Casual Shoes', slug: 'casual-shoes' },
          { name: 'Formal Shoes', slug: 'formal-shoes' },
          { name: 'Boots', slug: 'boots' },
          { name: 'Sandals', slug: 'sandals' },
          { name: 'Heels', slug: 'heels' },
          { name: 'Flats', slug: 'flats' },
          { name: 'Slippers', slug: 'slippers' },
        ],
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        link: '/products?category=fashion&department=accessories',
        // Note: Classic analog/luxury Watches are categorized under Fashion > Accessories
        items: [
          { name: 'Watches', slug: 'watches' },
          { name: 'Sunglasses', slug: 'sunglasses' },
          { name: 'Bags', slug: 'bags' },
          { name: 'Backpacks', slug: 'backpacks' },
          { name: 'Wallets', slug: 'wallets' },
          { name: 'Belts', slug: 'belts' },
          { name: 'Caps & Hats', slug: 'caps-hats' },
          { name: 'Jewellery', slug: 'jewellery' },
        ],
      },
      {
        name: 'Beauty & Fragrance',
        slug: 'beauty-fragrance',
        link: '/products?category=fashion&department=beauty-fragrance',
        items: [
          { name: 'Perfumes', slug: 'perfumes' },
          { name: 'Deodorants', slug: 'deodorants' },
          { name: 'Skincare', slug: 'skincare' },
          { name: 'Grooming', slug: 'grooming' },
          { name: 'Makeup', slug: 'makeup' },
        ],
      },
    ],
  },
]

