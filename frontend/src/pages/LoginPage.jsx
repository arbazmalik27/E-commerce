import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SEO from '../components/SEO'
import {
  clearAuthError,
  login,
  selectAuthError,
  selectAuthLoading,
  selectIsAuthenticated,
  selectUser,
} from '../features/auth/authSlice'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const loading = useSelector(selectAuthLoading)
  const serverError = useSelector(selectAuthError)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)

  // Clear previous server error on mount or unmount
  useEffect(() => {
    dispatch(clearAuthError())
    return () => {
      dispatch(clearAuthError())
    }
  }, [dispatch])

  // Redirect once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fromPath = location.state?.from?.pathname
      const destination = fromPath || (user?.role === 'admin' ? '/admin' : '/')
      navigate(destination, { replace: true })
    }
  }, [isAuthenticated, user, navigate, location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.')
      return
    }

    dispatch(login({ email: email.trim(), password }))
  }

  const errorMessage = localError || serverError

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-[#F5F0E8]">
      <SEO
        title="Sign In"
        description="Sign in to your TrendVolt account to access orders, saved wishlist items, and personal preferences."
        canonical="/login"
        noindex={true}
      />
      <div className="w-full max-w-md space-y-8 bg-[#FFFDF8] p-8 sm:p-10 rounded-2xl shadow-xs border border-[#DED7CA]">
        <div className="text-center">
          <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#34452F] bg-[#34452F]/10 px-3 py-1 rounded-full mb-3">
            ACCOUNT ACCESS
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1F211C]">
            Sign in to TrendVolt
          </h1>
          <p className="mt-2 text-sm text-[#5F6057]">
            Or{' '}
            <Link
              to="/register"
              className="font-semibold text-[#34452F] hover:text-[#263722] underline underline-offset-4 transition"
            >
              create a new account
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

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#5F6057]"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#34452F] hover:text-[#263722] hover:underline transition"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="block w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] focus:border-[#34452F] focus:outline-none focus:ring-1 focus:ring-[#34452F] disabled:bg-[#EEE7DC] transition-colors"
                placeholder="••••••••"
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
              <span>{loading ? 'Signing in...' : 'Sign in'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
