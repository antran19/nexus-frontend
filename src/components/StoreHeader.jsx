import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { displayUserName, navLinks, roleLabel, searchPath, sellEntry } from '../utils/storeNav'
import { badgeLabel } from '../utils/notifications'
import { formatMoney } from '../utils/dashboard'
import { useCategories } from './landing/useLandingData'
import NotificationBell from './NotificationBell'
import useCartSummary from './useCartSummary'

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6.2M9 20.5h.01M17 20.5h.01" />
    </svg>
  )
}

// The header of every page except the landing page, after the Stitch design: the brand and a search bar (with the
// category) on top, the person's own links below. The links depend on the role, see utils/storeNav.js.
export default function StoreHeader() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const categories = useCategories()
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const sell = sellEntry(user)
  const cart = useCartSummary(isAuthenticated)
  const cartBadge = badgeLabel(cart.count)

  function search(event) {
    event.preventDefault()
    navigate(searchPath({ q, categoryId }))
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-tray bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link to="/" onClick={() => window.scrollTo({ top: 0 })} className="font-display text-2xl font-extrabold tracking-tight text-brand">
          NEXUS
        </Link>

        <form onSubmit={search} role="search" className="order-last md:order-none w-full md:w-auto md:flex-1 md:max-w-xl flex items-stretch rounded-xl border border-tray bg-peach">
          <select
            aria-label="Danh mục"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="max-w-[9rem] rounded-l-xl bg-transparent pl-3 pr-1 text-sm text-cocoa outline-none"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên sản phẩm..."
            aria-label="Tìm sản phẩm"
            className="min-w-0 flex-1 border-l border-tray bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-gray-400"
          />
          <button type="submit" className="rounded-r-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">
            Tìm kiếm
          </button>
        </form>

        <div className="ml-auto flex items-center gap-3">
          <Link to={sell.to} className="hidden sm:inline-block rounded-lg bg-amber px-4 py-2 text-sm font-semibold text-cocoa hover:brightness-95 transition">
            {sell.label}
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/cart"
                aria-label={cart.count > 0 ? `Giỏ hàng, ${cart.count} món, ${formatMoney(cart.total)}` : 'Giỏ hàng'}
                className="flex items-center gap-2 rounded-full px-2 py-1 text-cocoa hover:text-brand"
              >
                <span className="relative flex h-9 w-9 items-center justify-center">
                  <CartIcon />
                  {cartBadge && (
                    <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-4 text-white">{cartBadge}</span>
                  )}
                </span>
                {cart.count > 0 && <span className="hidden xl:block text-sm font-semibold tabular-nums">{formatMoney(cart.total)}</span>}
              </Link>
              <NotificationBell tone="light" />
              <div className="hidden lg:block text-right leading-tight">
                <p className="text-sm font-semibold text-cocoa">{displayUserName(user)}</p>
                <p className="text-[11px] text-gray-500">{roleLabel(user)}</p>
              </div>
              <button type="button" onClick={handleLogout} className="rounded-lg border border-tray px-3 py-1.5 text-sm font-medium text-cocoa hover:border-brand hover:text-brand">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-cocoa hover:text-brand">Đăng nhập</Link>
              <Link to="/register" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">Đăng ký</Link>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Điều hướng chính" className="border-t border-tray bg-peach">
        <ul className="max-w-6xl mx-auto px-6 flex gap-6 overflow-x-auto whitespace-nowrap text-sm">
          {navLinks(user).map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/me'}
                className={({ isActive }) => `block py-2.5 border-b-2 ${isActive ? 'border-brand font-semibold text-brand' : 'border-transparent text-cocoa hover:text-brand'}`}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
