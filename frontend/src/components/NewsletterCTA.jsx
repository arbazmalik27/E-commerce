import { useState } from 'react'
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import Eyebrow from './Eyebrow'
import api from '../services/api'

function NewsletterCTA() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'error' | 'success'
  const [errorMsg, setErrorMsg] = useState('')
  const [successHeading, setSuccessHeading] = useState("You're on the list.")
  const [successSub, setSuccessSub] = useState('Thanks for subscribing to TrendVolt.')

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status === 'submitting' || status === 'success') return

    const trimmed = email.trim()
    if (!trimmed) {
      setStatus('error')
      setErrorMsg('Please enter your email address.')
      return
    }

    if (!emailRegex.test(trimmed)) {
      setStatus('error')
      setErrorMsg('Please enter a valid email address.')
      return
    }

    try {
      setStatus('submitting')
      setErrorMsg('')

      const response = await api.post('/newsletter/subscribe', { email: trimmed })

      if (response.data?.alreadySubscribed) {
        setSuccessHeading("You're already subscribed.")
        setSuccessSub("You're already on our newsletter list.")
      } else {
        setSuccessHeading("You're subscribed. Welcome to TrendVolt.")
        setSuccessSub('Thanks for subscribing to TrendVolt.')
      }
      setStatus('success')
    } catch (err) {
      setStatus('error')
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email ||
        'Unable to subscribe right now. Please try again later.'
      setErrorMsg(serverMsg)
    }
  }

  const handleReset = () => {
    setEmail('')
    setStatus('idle')
    setErrorMsg('')
    setSuccessHeading("You're on the list.")
    setSuccessSub('Thanks for subscribing to TrendVolt.')
  }

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-heading"
      className="relative w-full bg-[#EEE7DC] py-16 sm:py-20 lg:py-24 text-[#1F211C] border-b border-[#DED7CA] overflow-hidden scroll-mt-32"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative w-full overflow-hidden rounded-3xl border border-[#DED7CA] bg-[#FFFDF8] p-8 sm:p-12 lg:p-16 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Area */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="mb-4">
                <Eyebrow variant="olive">STAY IN THE LOOP</Eyebrow>
              </div>

              <h2
                id="newsletter-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[#1F211C] leading-tight"
              >
                Curated for your inbox.
              </h2>

              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-[#5F6057] font-normal leading-relaxed max-w-xl">
                Get occasional updates on new arrivals, fresh seasonal collections, and what&apos;s new at the TrendVolt atelier.
              </p>

              <p className="mt-3 text-xs font-mono tracking-wider text-[#85857A] uppercase">
                No spam. Unsubscribe anytime with one click.
              </p>
            </div>

            {/* Right Form Area */}
            <div className="lg:col-span-5 w-full">
              {status === 'success' ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-2xl border border-[#3F6B45]/25 bg-[#3F6B45]/8 p-6 text-left"
                >
                  <div className="flex items-center gap-2.5 text-[#3F6B45] mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-xs font-mono font-bold tracking-widest uppercase">
                      CONFIRMED
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1F211C] mb-1">
                    {successHeading}
                  </h3>
                  <p className="text-xs text-[#5F6057] mb-4">
                    {successSub}
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-semibold text-[#34452F] hover:underline cursor-pointer"
                  >
                    Subscribe another email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (status === 'error') setStatus('idle')
                      }}
                      placeholder="Enter your email address"
                      aria-label="Email address"
                      aria-invalid={status === 'error'}
                      className="flex-1 min-h-[48px] px-4 py-3 rounded-full bg-[#FAF7F0] border border-[#DED7CA] text-sm text-[#1F211C] placeholder-[#85857A] focus:outline-none focus:border-[#34452F] focus:ring-1 focus:ring-[#34452F] transition-all"
                    />

                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="min-h-[48px] inline-flex items-center justify-center gap-2 rounded-full bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-7 py-3 text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {status === 'submitting' ? (
                        <span>Joining...</span>
                      ) : (
                        <>
                          <span>Join List</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {status === 'error' && (
                    <div className="flex items-center gap-1.5 text-xs text-[#B7473A] mt-1">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default NewsletterCTA
