import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import PrivateRoute from './components/PrivateRoute'
import SiteLayout from './components/SiteLayout'
import { AuthProvider } from './context/AuthContext'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import MyBiddingPage from './pages/MyBiddingPage'
import AdminOrdersPage from './pages/AdminOrdersPage'
import MyOrdersPage from './pages/MyOrdersPage'
import MySellingPage from './pages/MySellingPage'
import SellerOrdersPage from './pages/SellerOrdersPage'
import SellerRequestsAdminPage from './pages/SellerRequestsAdminPage'
import NotFoundPage from './pages/NotFoundPage'
import PaymentCancelPage from './pages/PaymentCancelPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProductListPage from './pages/ProductListPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<SiteLayout />}>
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />

            <Route element={<PrivateRoute />}>
              <Route path="/me" element={<ProfilePage />} />
              <Route path="/me/bidding" element={<MyBiddingPage />} />
              <Route path="/me/orders" element={<MyOrdersPage />} />
              <Route path="/me/selling" element={<MySellingPage />} />
              <Route path="/me/selling/orders" element={<SellerOrdersPage />} />
              <Route path="/admin/seller-requests" element={<SellerRequestsAdminPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
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
