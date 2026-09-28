import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SEO from '../components/SEO'
import api from '../services/api'

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (!token) {
      setErrorMessage('Missing or invalid reset token. Please request a new password reset link.')
      return
    }

    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        password,
      })
      setIsSuccess(true)
    } catch (err) {
      if (err.response?.status === 429) {
        setErrorMessage(
          err.response?.data?.message ||
            'Too many attempts. Please wait a few minutes and try again.'
        )
      } else if (err.response?.status === 400) {
        setErrorMessage(
          err.response?.data?.message ||
            (err.response?.data?.errors
              ? Object.values(err.response.data.errors).join(', ')
              : 'Invalid or expired password reset link.')
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
      <SEO
        title="Reset Password"
        description="Set a new secure password for your TrendVolt account."
        canonical="/reset-password"
        noindex={true}
      />
      <div className="w-full max-w-md space-y-8 bg-[#FFFDF8] p-8 sm:p-10 rounded-2xl shadow-xs border border-[#DED7CA]">
        <div className="text-center">
          <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#34452F] bg-[#34452F]/10 px-3 py-1 rounded-full mb-3">
            NEW CREDENTIALS
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1F211C]">
            Reset Your Password
          </h1>
          <p className="mt-2 text-sm text-[#5F6057]">
            Enter your new password below.
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

        {isSuccess ? (
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
                <p className="font-bold text-sm text-[#3F6B45]">Password Reset Successful</p>
                <p className="text-xs text-[#5F6057]">Your password has been changed. You can now log in with your new password.</p>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex justify-center items-center rounded-xl bg-[#34452F] hover:bg-[#263722] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] shadow-xs transition cursor-pointer"
              >
                Sign in with new password
              </Link>
            </div>
          </div>
        ) : !token ? (
          <div className="space-y-6">
            <div
              role="alert"
              className="rounded-xl bg-[#A65332]/10 p-4 border border-[#A65332]/25 text-xs text-[#A65332] flex items-start gap-3"
            >
              <svg
                className="h-5 w-5 text-[#A65332] shrink-0 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-bold text-sm text-[#A65332]">Invalid Link</p>
                <p className="text-xs text-[#5F6057]">No password reset token was provided in the URL.</p>
              </div>
            </div>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="inline-flex justify-center items-center rounded-xl bg-[#34452F] hover:bg-[#263722] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] shadow-xs transition cursor-pointer"
              >
                Request a new reset link
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#5F6057] mb-1.5"
                >
                  New Password
                </label>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] focus:border-[#34452F] focus:outline-none focus:ring-1 focus:ring-[#34452F] disabled:bg-[#EEE7DC] transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#5F6057] mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] focus:border-[#34452F] focus:outline-none focus:ring-1 focus:ring-[#34452F] disabled:bg-[#EEE7DC] transition-colors"
                  placeholder="Re-enter new password"
                />
              </div>
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
                <span>{loading ? 'Resetting password...' : 'Reset password'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordPage
