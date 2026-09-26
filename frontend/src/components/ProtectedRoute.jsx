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
      <div className="flex min-h-screen bg-[#F5F0E8] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#34452F] border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
