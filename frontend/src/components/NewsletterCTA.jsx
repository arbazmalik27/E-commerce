import { useState } from 'react'
import Eyebrow from './Eyebrow'

function NewsletterCTA() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'error' | 'success'
  const [errorMsg, setErrorMsg] = useState('')

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSubmit = (e) => {
    e.preventDefault()
    if (status === 'success') return

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

    setStatus('success')
    setErrorMsg('')
  }

  const handleReset = () => {
    setEmail('')
    setStatus('idle')
    setErrorMsg('')
  }

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-heading"
      className="relative w-full bg-neutral-950 py-16 sm:py-20 lg:py-24 text-white border-t border-white/5 overflow-hidden scroll-mt-32"
    >
      {/* Subtle lilac atmospheric ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[400px] bg-gradient-to-r from-purple-900/10 via-purple-950/5 to-transparent blur-3xl opacity-30 -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Contained Luxury Editorial Billboard Card (Matching Reference Layout) */}
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/80 p-8 sm:p-12 lg:p-14 shadow-2xl shadow-black/80 backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content Area (lg: 7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <div className="mb-3">
                <Eyebrow>STAY IN THE LOOP</Eyebrow>
              </div>

              <h2
                id="newsletter-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight"
              >
                Curated for your inbox.
              </h2>

              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-neutral-300 font-normal leading-relaxed max-w-xl">
                Get occasional updates on new arrivals, fresh collections, and what&apos;s new at TrendVolt.
              </p>

              <p className="mt-3 text-xs font-mono tracking-wider text-neutral-400 uppercase">
                No spam. Just the latest from TrendVolt.
              </p>
            </div>

            {/* Right Interactive Form Area (lg: 5 cols) */}
            <div className="lg:col-span-5 w-full">
              {status === 'success' ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 text-center backdrop-blur-md"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3.5 border border-emerald-500/30">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    You&apos;re on the list.
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-neutral-300">
                    Thanks for subscribing to TrendVolt.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-4 text-xs font-semibold text-neutral-400 hover:text-white underline underline-offset-4 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                  >
                    Subscribe with another email
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="w-full"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-2xl sm:rounded-full border border-white/20 bg-neutral-950/80 p-2 sm:p-1.5 focus-within:border-purple-400/50 focus-within:ring-2 focus-within:ring-purple-400/20 transition-all shadow-xl">
                    <label htmlFor="newsletter-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (status === 'error') {
                          setErrorMsg('')
                          setStatus('idle')
                        }
                      }}
                      placeholder="Enter your email address"
                      aria-invalid={status === 'error'}
                      aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
                      className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-neutral-400 focus:outline-none min-w-0"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] shrink-0 rounded-full bg-white px-7 py-3 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-all hover:bg-neutral-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-md"
                    >
                      Subscribe
                    </button>
                  </div>

                  {/* Validation Error Message */}
                  {status === 'error' && (
                    <div
                      id="newsletter-error"
                      role="alert"
                      className="mt-3 flex items-center gap-1.5 text-xs text-red-400"
                    >
                      <svg
                        className="h-4 w-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                      </svg>
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
