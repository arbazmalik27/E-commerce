import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Phone,
  Clock,
  MapPin,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'
import Eyebrow from '../components/Eyebrow'
import NewsletterCTA from '../components/NewsletterCTA'
import SEO from '../components/SEO'

const SUBJECT_OPTIONS = [
  'General Inquiry',
  'Order Status & Tracking',
  'Styling & Sizing Counsel',
  'Returns & Exchanges',
  'Atelier & Editorial Press',
]

const FAQS = [
  {
    q: 'How can I track my active order?',
    a: 'You can monitor your order status in real time within your Orders dashboard. Tracking links and dispatch notifications are generated once your items leave our atelier.',
    link: '/orders',
    linkText: 'View My Orders',
  },
  {
    q: 'Where do I manage my delivery addresses & account?',
    a: 'Your account profile lets you update your default delivery addresses, contact details, and view your complete purchasing history.',
    link: '/profile',
    linkText: 'Account Settings',
  },
  {
    q: 'What is your complimentary return & exchange policy?',
    a: 'We welcome returns and size exchanges on unworn, unwashed garments with all designer tags attached within 14 calendar days of delivery.',
    link: '/shipping',
    linkText: 'Shipping & Returns Policy',
  },
  {
    q: 'How does TrendVolt safeguard my personal data?',
    a: 'We employ strict TLS encryption and tokenized authentication. We never sell your personal data or store raw payment credentials on our servers.',
    link: '/privacy',
    linkText: 'Privacy Policy',
  },
]

function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [referenceId, setReferenceId] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = () => {
    const errs = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!formData.name.trim()) {
      errs.name = 'Please provide your full name.'
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.'
    }

    if (!formData.email.trim()) {
      errs.email = 'Please provide your email address.'
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.'
    }

    if (!formData.message.trim()) {
      errs.message = 'Please enter your message.'
    } else if (formData.message.trim().length < 15) {
      errs.message = 'Message must be at least 15 characters so we can assist you effectively.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!validate()) return

    setIsSubmitting(true)

    // Simulate realistic frontend submission processing
    setTimeout(() => {
      setIsSubmitting(false)
      const generatedRef = `TVC-${Math.floor(100000 + Math.random() * 900000)}`
      setReferenceId(generatedRef)
      setSubmitSuccess(true)
      setFormData({
        name: '',
        email: '',
        subject: 'General Inquiry',
        message: '',
      })
      setErrors({})
    }, 700)
  }

  const handleReset = () => {
    setSubmitSuccess(false)
    setReferenceId('')
  }

  return (
    <div className="bg-[#F5F0E8] text-[#1F211C] min-h-screen">
      <SEO
        title="Client Concierge & Support"
        description="Get in touch with TrendVolt client services for styling advice, order inquiries, sizing counsel, and customer support."
        canonical="/contact"
        ogType="website"
      />
      {/* =========================================================================
          1. CONTACT HERO
         ========================================================================= */}
      <section className="border-b border-[#DED7CA] pt-12 sm:pt-16 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Eyebrow variant="terracotta" className="mb-4">
            Client Concierge &bull; At Your Service
          </Eyebrow>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-[#1F211C] uppercase">
            Let's Talk
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[#52524E] max-w-2xl mx-auto font-medium leading-relaxed">
            Whether you seek personal styling counsel, assistance with an active
            order, or atelier inquiries, our concierge desk is at your service.
          </p>
        </div>
      </section>

      {/* =========================================================================
          2. CONTACT INFORMATION & FORM (2-Column Grid)
         ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Contact Cards */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-[#A65332]">
                Support Concierge
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-serif font-bold text-[#1F211C]">
                Get in Touch
              </h2>
              <p className="mt-2 text-sm text-[#52524E] leading-relaxed">
                Our support team is available during standard studio hours to provide
                personalized assistance for any catalog or order requirements.
              </p>
            </div>

            {/* Information Cards */}
            <div className="space-y-4">
              {/* Card 1: Email */}
              <a
                href="mailto:concierge@trendvolt.internal"
                className="p-5 bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl flex items-start gap-4 shadow-xs hover:border-[#34452F] transition-all group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <div className="h-10 w-10 rounded-full bg-[#34452F]/10 text-[#34452F] group-hover:bg-[#34452F] group-hover:text-[#FFFDF8] flex items-center justify-center shrink-0 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[#85857A]">
                    Concierge Email
                  </h3>
                  <p className="mt-1 text-base font-semibold text-[#1F211C] group-hover:text-[#34452F] transition-colors underline-offset-2 group-hover:underline">
                    concierge@trendvolt.internal
                  </p>
                  <span className="mt-1 inline-block text-[11px] text-[#A65332] font-mono">
                    Official Demo Support Desk &bull; Tap to email
                  </span>
                </div>
              </a>

              {/* Card 2: Phone */}
              <a
                href="tel:+918049201800"
                className="p-5 bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl flex items-start gap-4 shadow-xs hover:border-[#34452F] transition-all group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <div className="h-10 w-10 rounded-full bg-[#34452F]/10 text-[#34452F] group-hover:bg-[#34452F] group-hover:text-[#FFFDF8] flex items-center justify-center shrink-0 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[#85857A]">
                    Client Hotline
                  </h3>
                  <p className="mt-1 text-base font-semibold text-[#1F211C] group-hover:text-[#34452F] transition-colors underline-offset-2 group-hover:underline">
                    +91 (0) 80 4920 1800
                  </p>
                  <p className="text-xs text-[#52524E]">
                    Toll-free customer guidance &bull; Tap to call
                  </p>
                </div>
              </a>

              {/* Card 3: Business Hours */}
              <div className="p-5 bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl flex items-start gap-4 shadow-xs">
                <div className="h-10 w-10 rounded-full bg-[#34452F]/10 text-[#34452F] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[#85857A]">
                    Studio Hours
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#1F211C]">
                    Monday – Friday: 09:00 – 18:00 IST
                  </p>
                  <p className="text-xs text-[#52524E]">
                    Saturday: 10:00 – 16:00 IST (Styling Support)
                  </p>
                </div>
              </div>

              {/* Card 4: Atelier Studio */}
              <div className="p-5 bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl flex items-start gap-4 shadow-xs">
                <div className="h-10 w-10 rounded-full bg-[#34452F]/10 text-[#34452F] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[#85857A]">
                    TrendVolt Atelier
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#1F211C]">
                    100 Feet Road, Indiranagar
                  </p>
                  <p className="text-xs text-[#52524E]">
                    Bengaluru, Karnataka 560038, India
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl p-6 sm:p-10 shadow-sm">
            {submitSuccess ? (
              <div className="py-8 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="h-16 w-16 mx-auto rounded-full bg-[#34452F]/10 text-[#34452F] flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <Eyebrow variant="olive" className="mb-3">
                  Inquiry Dispatched
                </Eyebrow>

                <h3 className="text-2xl sm:text-3xl font-serif font-black text-[#1F211C]">
                  Thank You for Contacting TrendVolt
                </h3>

                <p className="mt-3 text-sm sm:text-base text-[#52524E] max-w-md mx-auto leading-relaxed">
                  Your inquiry has been successfully lodged with our client concierge desk.
                  A specialist will review your note and respond within one business day.
                </p>

                <div className="mt-6 p-4 rounded-xl bg-[#FAF7F0] border border-[#DED7CA] inline-block">
                  <span className="text-xs font-mono text-[#85857A] block">
                    Inquiry Reference Identifier
                  </span>
                  <span className="text-lg font-mono font-bold text-[#34452F] tracking-wider">
                    {referenceId}
                  </span>
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-2.5 rounded-full bg-[#34452F] text-[#FFFDF8] hover:bg-[#263722] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Send Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1F211C]">
                    Send a Direct Note
                  </h2>
                  <p className="mt-1 text-xs text-[#85857A]">
                    Fill out the form below. All fields marked with * are required.
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {/* Name Field */}
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-mono font-bold uppercase tracking-wider text-[#1F211C] mb-1.5"
                    >
                      Your Full Name *
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      aria-required="true"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'contact-name-error' : undefined}
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 text-sm rounded-xl bg-[#FAF7F0] border transition-colors focus:outline-none ${
                        errors.name
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[#DED7CA] focus:border-[#34452F]'
                      }`}
                    />
                    {errors.name && (
                      <p id="contact-name-error" role="alert" className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-mono font-bold uppercase tracking-wider text-[#1F211C] mb-1.5"
                    >
                      Your Email Address *
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      aria-required="true"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'contact-email-error' : undefined}
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="e.g. eleanor.vance@example.com"
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 text-sm rounded-xl bg-[#FAF7F0] border transition-colors focus:outline-none ${
                        errors.email
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[#DED7CA] focus:border-[#34452F]'
                      }`}
                    />
                    {errors.email && (
                      <p id="contact-email-error" role="alert" className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Subject Dropdown */}
                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block text-xs font-mono font-bold uppercase tracking-wider text-[#1F211C] mb-1.5"
                    >
                      Topic / Subject *
                    </label>
                    <div className="relative">
                      <select
                        id="contact-subject"
                        name="subject"
                        value={formData.subject}
                        onChange={(e) => handleChange('subject', e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 text-sm rounded-xl bg-[#FAF7F0] border border-[#DED7CA] focus:border-[#34452F] appearance-none focus:outline-none cursor-pointer pr-10"
                      >
                        {SUBJECT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#85857A] pointer-events-none" />
                    </div>
                  </div>

                  {/* Message Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-mono font-bold uppercase tracking-wider text-[#1F211C]"
                      >
                        Message Details *
                      </label>
                      <span className={`text-[11px] font-mono ${formData.message.length > 900 ? 'text-[#A65332] font-bold' : 'text-[#85857A]'}`}>
                        {formData.message.length} / 1000 characters
                      </span>
                    </div>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      maxLength={1000}
                      aria-required="true"
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? 'contact-message-error' : undefined}
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      placeholder="Please share details about your inquiry, order reference number if relevant, or styling preference..."
                      disabled={isSubmitting}
                      className={`w-full px-4 py-3 text-sm rounded-xl bg-[#FAF7F0] border transition-colors focus:outline-none resize-y ${
                        errors.message
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-[#DED7CA] focus:border-[#34452F]'
                      }`}
                    />
                    {errors.message && (
                      <p id="contact-message-error" role="alert" className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#34452F] text-[#FFFDF8] hover:bg-[#263722] disabled:opacity-60 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="h-4 w-4 border-2 border-[#FFFDF8] border-t-transparent rounded-full animate-spin" />
                          <span>Transmitting Note...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Transmit Message</span>
                        </>
                      )}
                    </button>
                    <span className="mt-2 block text-[11px] text-[#85857A]">
                      Direct client desk simulation. Inquiries logged immediately.
                    </span>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. FAQ / HELP STRIP
         ========================================================================= */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-[#DED7CA]">
        <div className="text-center mb-10">
          <Eyebrow variant="olive" className="mb-3">
            Common Inquiries
          </Eyebrow>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#1F211C]">
            Frequently Addressed Questions
          </h2>
          <p className="mt-2 text-sm text-[#52524E]">
            Quick answers to frequent inquiries regarding orders, logistics, and account care.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <div
                key={faq.q}
                className="bg-[#FFFDF8] border border-[#DED7CA] rounded-2xl overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  id={`faq-btn-${index}`}
                  aria-controls={`faq-panel-${index}`}
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[#FAF7F0] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] rounded-2xl"
                >
                  <span className="font-serif font-bold text-base sm:text-lg text-[#1F211C]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#85857A] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#34452F]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-btn-${index}`}
                    className="px-5 pb-5 pt-1 text-sm text-[#52524E] border-t border-[#EAE4D9] animate-in fade-in duration-200"
                  >
                    <p className="leading-relaxed">{faq.a}</p>
                    <div className="mt-4">
                      <Link
                        to={faq.link}
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A65332] hover:text-[#7D3D24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A65332] rounded"
                      >
                        <span>{faq.linkText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* =========================================================================
          4. NEWSLETTER CTA
         ========================================================================= */}
      <NewsletterCTA />
    </div>
  )
}

export default ContactPage
