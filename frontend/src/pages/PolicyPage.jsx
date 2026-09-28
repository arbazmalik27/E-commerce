import { useLocation, Link } from 'react-router-dom'
import { ShieldCheck, FileText, Truck, ArrowLeft } from 'lucide-react'
import SEO from '../components/SEO'

const POLICY_DATA = {
  '/privacy': {
    title: 'Privacy Policy',
    subtitle: 'Editorial Care & Digital Protection',
    description:
      'Read TrendVolt\'s privacy policy to learn how we protect your personal information, manage cookies, and safeguard user data.',
    icon: ShieldCheck,
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: 'Information We Collect',
        content:
          'TrendVolt collects information you provide directly to us when creating an account, curating your wishlist, placing orders, or communicating with customer service. This includes name, delivery address, contact email, and telephone details.',
      },
      {
        heading: 'How We Protect Your Information',
        content:
          'We implement industry-standard cryptographic protocols (TLS/HTTPS) and token-based authentication. We never store raw payment credentials or card verification values on our servers; all transactions are processed securely through certified payment gateways.',
      },
      {
        heading: 'Cookies & Tracking',
        content:
          'We use essential cookies strictly to maintain user authentication sessions, persist shopping cart state, and preserve user interface preferences. We do not sell personal data to third-party data brokers.',
      },
      {
        heading: 'Your Privacy Rights',
        content:
          'You may request access to, correction of, or deletion of your personal profile data at any time through your Account settings or by contacting our client concierge.',
      },
    ],
  },
  '/terms': {
    title: 'Terms of Service',
    subtitle: 'Guidelines of our Curated Atelier',
    description:
      'Review the terms and conditions governing purchases, accounts, and services across the TrendVolt atelier.',
    icon: FileText,
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: 'Acceptance of Terms',
        content:
          'By accessing TrendVolt, creating an account, or purchasing merchandise, you agree to abide by these terms of service, all applicable laws, and relevant commercial regulations.',
      },
      {
        heading: 'Product Availability & Pricing',
        content:
          'Merchandise availability, inventory allocations, and prices are subject to real-time verification. While we strive for uncompromising accuracy, errors in catalog descriptions or pricing will be corrected promptly.',
      },
      {
        heading: 'Order Acceptance & Fulfillment',
        content:
          'Placement of an order constitutes an offer to purchase. An order is accepted once payment verification is confirmed and shipping dispatch confirmation is issued.',
      },
      {
        heading: 'Intellectual Property',
        content:
          'All trademarks, editorial imagery, styling concepts, typography pairings, and software assets are the proprietary intellectual property of TrendVolt Studio.',
      },
    ],
  },
  '/shipping': {
    title: 'Shipping & Returns',
    subtitle: 'White-Glove Delivery & Seamless Exchanges',
    description:
      'Learn about TrendVolt\'s domestic dispatch, delivery timelines, real-time tracking, and 14-day complimentary return policy.',
    icon: Truck,
    lastUpdated: 'September 2026',
    sections: [
      {
        heading: 'Domestic & Regional Dispatch',
        content:
          'Standard orders are prepared and dispatched within 24 to 48 business hours. Express priority courier delivery typically delivers within 2 to 4 business days nationwide.',
      },
      {
        heading: 'Delivery Tracking',
        content:
          'Real-time courier tracking information is issued immediately upon package dispatch. You can track your shipment live within your TrendVolt Orders dashboard.',
      },
      {
        heading: '14-Day Complimentary Returns',
        content:
          'We accept returns and size exchanges on unworn, unwashed garments with all designer tags and original presentation packaging intact within 14 calendar days of delivery.',
      },
      {
        heading: 'Refund Settlement',
        content:
          'Approved return merchandise refunds are credited directly to your original payment method within 5 to 7 business banking days following quality inspection.',
      },
    ],
  },
}

function PolicyPage() {
  const { pathname } = useLocation()
  const policy = POLICY_DATA[pathname] || POLICY_DATA['/privacy']
  const Icon = policy.icon

  return (
    <div className="min-h-[70vh] bg-[#F5F0E8] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <SEO
        title={policy.title}
        description={policy.description}
        canonical={pathname}
        ogType="website"
      />
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#34452F] hover:text-[#A65332] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Boutique
          </Link>
        </div>

        {/* Header */}
        <header className="border-b border-[#DED7CA] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E2DBD0] text-[#34452F] text-xs font-semibold uppercase tracking-wider mb-4">
            <Icon className="w-4 h-4 text-[#A65332]" />
            <span>Official Policy &bull; Updated {policy.lastUpdated}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#1F211C] tracking-tight">
            {policy.title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[#52524E] font-medium">
            {policy.subtitle}
          </p>
        </header>

        {/* Content Sections */}
        <div className="space-y-8 bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl p-6 sm:p-10 shadow-sm">
          {policy.sections.map((section, idx) => (
            <section key={section.heading} className={idx > 0 ? 'pt-8 border-t border-[#EAE4D9]' : ''}>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1F211C] mb-3">
                {idx + 1}. {section.heading}
              </h2>
              <p className="text-sm sm:text-base text-[#52524E] leading-relaxed">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Policy Switcher Quick Links */}
        <nav aria-label="Other Policies" className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold uppercase tracking-widest text-[#52524E]">
          <Link
            to="/privacy"
            className={`px-4 py-2 rounded-lg transition-colors ${pathname === '/privacy' ? 'bg-[#34452F] text-[#FFFDF8]' : 'bg-[#EAE4D9] hover:bg-[#DED7CA] text-[#34452F]'}`}
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className={`px-4 py-2 rounded-lg transition-colors ${pathname === '/terms' ? 'bg-[#34452F] text-[#FFFDF8]' : 'bg-[#EAE4D9] hover:bg-[#DED7CA] text-[#34452F]'}`}
          >
            Terms of Service
          </Link>
          <Link
            to="/shipping"
            className={`px-4 py-2 rounded-lg transition-colors ${pathname === '/shipping' ? 'bg-[#34452F] text-[#FFFDF8]' : 'bg-[#EAE4D9] hover:bg-[#DED7CA] text-[#34452F]'}`}
          >
            Shipping &amp; Returns
          </Link>
        </nav>
      </div>
    </div>
  )
}

export default PolicyPage
