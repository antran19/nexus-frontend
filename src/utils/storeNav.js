// Pure helpers for the store header: which links a person sees, where the search goes and the role as a word.
import { ROLE_LABEL } from './adminUsers.js'

// The links of the second row, by role. The role comes from the login token; the server checks every page again.
export function navLinks(user) {
  const links = [{ to: '/products', label: 'Sản phẩm' }]
  if (!user) return links
  links.push(
    { to: '/me/dashboard', label: 'Tổng quan' },
    { to: '/me/bidding', label: 'Phiên của tôi' },
    { to: '/me/orders', label: 'Đơn của tôi' },
  )
  // The seller's overview page is for sellers only; an admin does not sell, so it would only refuse them.
  if (user.role === 'SELLER') links.push({ to: '/me/selling/dashboard', label: 'Tổng quan bán' })
  if (user.role === 'SELLER' || user.role === 'ADMIN') {
    links.push({ to: '/me/selling', label: 'Phiên đang bán' }, { to: '/me/selling/orders', label: 'Đơn cần giao' })
  }
  if (user.role === 'ADMIN') links.push({ to: '/admin/seller-requests', label: 'Duyệt người bán' })
  if (user.role === 'ADMIN' || user.role === 'SUPPORT_STAFF') {
    links.push({ to: '/admin/orders', label: 'Quản lý đơn' }, { to: '/admin/users', label: 'Người dùng' })
  }
  links.push({ to: '/me', label: 'Hồ sơ' })
  return links
}

// The amber button: people who already sell go to their auctions, everyone else to the page that explains how to start.
export function sellEntry(user) {
  if (user?.role === 'SELLER' || user?.role === 'ADMIN') return { to: '/me/selling', label: 'Kênh người bán' }
  return { to: '/register/seller', label: 'Bán hàng cùng Nexus' }
}

// The address of the product list for a search: only the parts that are filled in.
export function searchPath({ q, categoryId } = {}) {
  const params = new URLSearchParams()
  const text = String(q ?? '').trim()
  if (text) params.set('q', text)
  if (categoryId) params.set('categoryId', categoryId)
  const query = params.toString()
  return query ? `/products?${query}` : '/products'
}

export function roleLabel(user) {
  return ROLE_LABEL[user?.role] ?? ''
}

// The name the token carries; else the part of an email before the @ (the subject of the token is an id, never shown).
export function displayUserName(user) {
  if (user?.fullName) return user.fullName
  const email = [user?.email, user?.sub].find((value) => typeof value === 'string' && value.includes('@'))
  return email ? email.split('@')[0] : 'Tài khoản'
}
