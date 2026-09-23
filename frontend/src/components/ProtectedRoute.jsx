import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import {
  selectAuthInitialized,
  selectIsAuthenticated,
} from '../features/auth/authSlice'

function ProtectedRoute({ children }) {
  const initialized = useSelector(selectAuthInitialized)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const location = useLocation()

  if (!initialized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
