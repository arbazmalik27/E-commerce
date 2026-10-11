import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, Lock, ArrowRight, Eye, EyeOff, Store } from 'lucide-react'
import SEO from '../../components/SEO'
import {
  clearAuthError,
  login,
  logout,
  selectAuthError,
  selectAuthInitialized,
  selectAuthLoading,
  selectIsAuthenticated,
  selectUser,
} from '../../features/auth/authSlice'

function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const initialized = useSelector(selectAuthInitialized)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectUser)
  const loading = useSelector(selectAuthLoading)
  const serverError = useSelector(selectAuthError)

  // Clear server errors on mount/unmount
  useEffect(() => {
    dispatch(clearAuthError())
    return () => {
      dispatch(clearAuthError())
    }
  }, [dispatch])

  // If already authenticated as admin, safely navigate to intended admin page or /admin
  useEffect(() => {
    if (initialized && isAuthenticated && user?.role === 'admin') {
      const from = location.state?.from
      const fromPath = from?.pathname
      const destination =
        fromPath && fromPath.startsWith('/admin') && fromPath !== '/admin/login'
          ? `${fromPath}${from?.search || ''}${from?.hash || ''}`
          : '/admin'
      navigate(destination, { replace: true })
    }
  }, [initialized, isAuthenticated, user, navigate, location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLocalError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setLocalError('Please enter both administrative email and password.')
      return
    }

    try {
      const resultAction = await dispatch(login({ email: trimmedEmail, password }))
      if (login.fulfilled.match(resultAction)) {
        const loggedInUser = resultAction.payload?.user
        if (loggedInUser?.role !== 'admin') {
          // Immediately revoke session cookie so no customer session persists in admin flow
          await dispatch(logout())
          setLocalError(
            'Access Denied: This account does not possess administrator privileges. Please sign in with an authorized administrator account or return to the customer store.'
          )
        } else {
          const from = location.state?.from
          const fromPath = from?.pathname
          const destination =
            fromPath && fromPath.startsWith('/admin') && fromPath !== '/admin/login'
              ? `${fromPath}${from?.search || ''}${from?.hash || ''}`
              : '/admin'
          navigate(destination, { replace: true })
        }
      }
    } catch {
      setLocalError('An unexpected authentication error occurred. Please try again.')
    }
  }

  const handleSignOutAndSwitch = async () => {
    await dispatch(logout())
    setLocalError('')
    setEmail('')
    setPassword('')
  }

  // Loading state while verifying auth initialization
  if (!initialized) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-[#F5F0E8]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-[#34452F] border-t-transparent"
          role="status"
          aria-label="Checking administrator session status"
        />
      </div>
    )
  }

  // Requirement 6: If an authenticated customer visits /admin/login, do not grant admin access;
  // show a clear access-denied message and return them to a safe customer route.
  if (isAuthenticated && user?.role !== 'admin') {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-[#F5F0E8]">
        <SEO
          title="Admin Access Denied"
          description="Access to TrendVolt administration portal is restricted to authorized administrative accounts."
          canonical="/admin/login"
          noindex={true}
        />
        <div className="w-full max-w-md bg-[#FFFDF8] p-8 sm:p-10 rounded-2xl shadow-xs border border-[#DED7CA] text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#A65332]/10 text-[#A65332] border border-[#A65332]/25">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>

          <div>
            <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#A65332] bg-[#A65332]/10 px-3 py-1 rounded-full mb-3">
              ACCESS RESTRICTED
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1F211C]">
              Administrator Privileges Required
            </h1>
            <p className="mt-3 text-sm text-[#5F6057] leading-relaxed">
              You are currently signed in as a customer account (
              <span className="font-semibold text-[#1F211C]">{user?.email || 'Customer'}</span>
              ). This portal is strictly restricted to authorized platform administrators.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to="/"
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] shadow-xs active:scale-98 transition-all"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              <span>Return to Storefront</span>
            </Link>
            <button
              type="button"
              onClick={handleSignOutAndSwitch}
              className="flex w-full justify-center items-center gap-2 rounded-xl border border-[#DED7CA] hover:bg-[#FAF7F0] px-4 py-3 text-xs font-semibold text-[#5F6057] hover:text-[#1F211C] transition-colors cursor-pointer"
            >
              <span>Sign In with Different Account</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const errorMessage = localError || serverError

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16 sm:px-6 lg:px-8 bg-[#F5F0E8]">
      <SEO
        title="Admin Portal Login"
        description="Secure administrator authentication portal for TrendVolt management controls."
        canonical="/admin/login"
        noindex={true}
      />
      <div className="w-full max-w-md space-y-8 bg-[#FFFDF8] p-8 sm:p-10 rounded-2xl shadow-xs border border-[#DED7CA]">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#34452F]/10 text-[#34452F] border border-[#34452F]/20 mb-4">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#34452F] bg-[#34452F]/10 px-3 py-1 rounded-full mb-3">
            ADMINISTRATIVE PORTAL
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1F211C]">
            TrendVolt Operations
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#5F6057]">
            Enter verified administrator credentials to access management controls.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl bg-[#A65332]/10 p-4 border border-[#A65332]/25 text-xs text-[#A65332] flex items-start gap-2.5 leading-relaxed"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-[#A65332]" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#5F6057] mb-1.5"
              >
                Administrator Email
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="block w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-3 text-sm text-[#1F211C] placeholder-[#85857A] focus:border-[#34452F] focus:outline-none focus:ring-1 focus:ring-[#34452F] disabled:bg-[#EEE7DC] transition-colors"
                placeholder="admin@trendvolt.com"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#5F6057] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="block w-full rounded-xl border border-[#DED7CA] bg-[#FAF7F0] px-4 py-3 pr-11 text-sm text-[#1F211C] placeholder-[#85857A] focus:border-[#34452F] focus:outline-none focus:ring-1 focus:ring-[#34452F] disabled:bg-[#EEE7DC] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#85857A] hover:text-[#1F211C] p-1 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-[#FFFDF8] shadow-xs active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
            >
              {loading ? (
                <div
                  className="h-4 w-4 animate-spin rounded-full border-2 border-[#FFFDF8] border-t-transparent"
                  aria-hidden="true"
                />
              ) : (
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{loading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            </button>
          </div>
        </form>

        <div className="pt-2 border-t border-[#DED7CA] flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-[#5F6057]">
            Looking for regular customer account access?
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34452F] hover:text-[#263722] hover:underline transition"
          >
            <span>Proceed to Customer Login</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLoginPage
