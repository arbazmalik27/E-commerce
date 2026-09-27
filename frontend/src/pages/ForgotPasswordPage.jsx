import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: trimmedEmail })
      setIsSubmitted(true)
    } catch (err) {
      if (err.response?.status === 429) {
        setErrorMessage(
          err.response?.data?.message ||
            'Too many requests. Please wait a few minutes and try again.'
        )
      } else if (err.response?.status === 400) {
        setErrorMessage(
          err.response?.data?.message ||
            (err.response?.data?.errors
              ? Object.values(err.response.data.errors).join(', ')
              : 'Please provide a valid email address.')
        )
      } else if (!err.response) {
        setErrorMessage('Network error. Please check your connection and try again.')
      } else {
        setErrorMessage(
          err.response?.data?.message || 'Something went wrong. Please try again later.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-[#F5F0E8]">
      <div className="w-full max-w-md space-y-8 bg-[#FFFDF8] p-8 sm:p-10 rounded-2xl shadow-xs border border-[#DED7CA]">
        <div className="text-center">
          <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#34452F] bg-[#34452F]/10 px-3 py-1 rounded-full mb-3">
            SECURITY &amp; RECOVERY
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1F211C]">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-[#5F6057]">
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-semibold text-[#34452F] hover:text-[#263722] underline underline-offset-4 transition"
            >
              Sign in
            </Link>
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl bg-[#A65332]/10 p-4 border border-[#A65332]/25 text-xs text-[#A65332] flex items-start gap-2.5 leading-relaxed"
          >
            <svg
              className="h-4 w-4 shrink-0 mt-0.5 text-[#A65332]"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="space-y-6">
            <div
              role="status"
              className="rounded-xl bg-[#3F6B45]/10 p-4 border border-[#3F6B45]/25 text-xs text-[#3F6B45] flex items-start gap-3"
            >
              <svg
                className="h-5 w-5 text-[#3F6B45] shrink-0 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="space-y-1 text-[#1F211C]">
                <p className="font-bold text-sm text-[#3F6B45]">Check your inbox</p>
                <p className="text-xs text-[#5F6057]">
                  If an account exists for this email, password reset instructions have been sent.
                </p>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex justify-center items-center rounded-xl bg-[#34452F] hover:bg-[#263722] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] shadow-xs transition cursor-pointer"
              >
                Return to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email-address"
                className="block text-xs font-semibold uppercase tracking-wider text-[#5F6057] mb-1.5"
              >
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="block w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] focus:border-[#34452F] focus:outline-none focus:ring-1 focus:ring-[#34452F] disabled:bg-[#EEE7DC] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] shadow-xs active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                {loading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#FFFDF8] border-t-transparent" />
                )}
                <span>{loading ? 'Sending instructions...' : 'Send reset link'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordPage
