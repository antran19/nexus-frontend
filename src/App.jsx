import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import PrivateRoute from './components/PrivateRoute'
import SiteLayout from './components/SiteLayout'
import { AuthProvider } from './context/AuthContext'
import BuyerDashboardPage from './pages/BuyerDashboardPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LandingPage from './pages/LandingPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MyBiddingPage from './pages/MyBiddingPage'
import AuctionWatchlistPage from './pages/AuctionWatchlistPage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import AdminCategoriesPage from './pages/AdminCategoriesPage'
import AdminUsersPage from './pages/AdminUsersPage'
import MyOrdersPage from './pages/MyOrdersPage'
import InvoicePage from './pages/InvoicePage'
import MySellingPage from './pages/MySellingPage'
import SellerDashboardPage from './pages/SellerDashboardPage'
import SellerOrdersPage from './pages/SellerOrdersPage'
import SellerRequestsAdminPage from './pages/SellerRequestsAdminPage'
import NotFoundPage from './pages/NotFoundPage'
import PaymentCancelPage from './pages/PaymentCancelPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductListPage from './pages/ProductListPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import SellerRegisterPage from './pages/SellerRegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/seller" element={<SellerRegisterPage />} />

          <Route element={<SiteLayout />}>
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />

            <Route element={<PrivateRoute />}>
              <Route path="/me" element={<ProfilePage />} />
              <Route path="/me/dashboard" element={<BuyerDashboardPage />} />
              <Route path="/me/bidding" element={<MyBiddingPage />} />
              <Route path="/me/auction-watchlist" element={<AuctionWatchlistPage />} />
              <Route path="/me/orders" element={<MyOrdersPage />} />
              <Route path="/me/orders/:orderId/invoice" element={<InvoicePage />} />
              <Route path="/me/selling" element={<MySellingPage />} />
              <Route path="/me/selling/dashboard" element={<SellerDashboardPage />} />
              <Route path="/me/selling/orders" element={<SellerOrdersPage />} />
              <Route path="/admin/seller-requests" element={<SellerRequestsAdminPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/categories" element={<AdminCategoriesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/payment/cancel" element={<PaymentCancelPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
