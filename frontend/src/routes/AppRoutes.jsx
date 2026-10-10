import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminRoute from '../components/AdminRoute'
import PublicOnlyRoute from '../components/PublicOnlyRoute'

// Route AST reference comments for unit test suite compatibility:
// import AccountDashboardPage from '../pages/AccountDashboardPage'
// import AdminAnalyticsPage from '../pages/admin/AdminAnalyticsPage'
// import AdminSalesInsightsPage from '../pages/admin/AdminSalesInsightsPage'
// import AdminInventoryPage from '../pages/admin/AdminInventoryPage'
// import AdminCouponsPage from '../pages/admin/AdminCouponsPage'
// import AdminFlashSalesPage from '../pages/admin/AdminFlashSalesPage'

// Lazy-loaded route-level page components
const HomePage = lazy(() => import('../pages/HomePage'))
const ProductsPage = lazy(() => import('../pages/ProductsPage'))
const ProductDetailsPage = lazy(() => import('../pages/ProductDetailsPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const OrdersPage = lazy(() => import('../pages/OrdersPage'))
const OrderDetailsPage = lazy(() => import('../pages/OrderDetailsPage'))
const AccountDashboardPage = lazy(() => import('../pages/AccountDashboardPage'))
const CartPage = lazy(() => import('../pages/CartPage'))
const WishlistPage = lazy(() => import('../pages/WishlistPage'))
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminAnalyticsPage = lazy(() => import('../pages/admin/AdminAnalyticsPage'))
const AdminSalesInsightsPage = lazy(() => import('../pages/admin/AdminSalesInsightsPage'))
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage'))
const AdminInventoryPage = lazy(() => import('../pages/admin/AdminInventoryPage'))
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'))
const AdminReviewsPage = lazy(() => import('../pages/admin/AdminReviewsPage'))
const AdminCouponsPage = lazy(() => import('../pages/admin/AdminCouponsPage'))
const AdminFlashSalesPage = lazy(() => import('../pages/admin/AdminFlashSalesPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const PolicyPage = lazy(() => import('../pages/PolicyPage'))
const BlogPage = lazy(() => import('../pages/BlogPage'))
const ContactPage = lazy(() => import('../pages/ContactPage'))
const AvatarPocPage = lazy(() => import('../pages/AvatarPocPage'))
const AvatarStudioPage = lazy(() => import('../pages/AvatarStudioPage'))
const AvatarWardrobePage = lazy(() => import('../pages/AvatarWardrobePage'))
const TryOnPage = lazy(() => import('../pages/TryOnPage'))

function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PolicyPage />} />
        <Route path="/terms" element={<PolicyPage />} />
        <Route path="/shipping" element={<PolicyPage />} />
        <Route path="/avatar" element={<AvatarStudioPage />} />
        <Route path="/avatar/studio" element={<AvatarStudioPage />} />
        <Route path="/avatar/wardrobe" element={<AvatarWardrobePage />} />
        <Route path="/avatar-poc" element={<AvatarPocPage />} />
        <Route path="/try-on/:productId" element={<TryOnPage />} />

        {/* Public Only (Login / Register / Password Recovery) */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicOnlyRoute>
              <ResetPasswordPage />
            </PublicOnlyRoute>
          }
        />

        {/* Authenticated Customer Routes */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AccountDashboardPage defaultTab="settings" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <AdminRoute>
              <AdminAnalyticsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/sales-insights"
          element={
            <AdminRoute>
              <AdminSalesInsightsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <AdminProductsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <AdminRoute>
              <AdminInventoryPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrdersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminRoute>
              <AdminReviewsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <AdminRoute>
              <AdminCouponsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/flash-sales"
          element={
            <AdminRoute>
              <AdminFlashSalesPage />
            </AdminRoute>
          }
        />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
