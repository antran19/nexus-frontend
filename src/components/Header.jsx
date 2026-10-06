import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { scrollToTop } from './landing/useSmoothScroll'

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // On the landing page the header floats transparently over the hero video
  // and turns solid once the user scrolls; every other page keeps the plain
  // white bar (those pages have white backgrounds, so white text would vanish).
  const overHero = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!overHero) return undefined
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  // Already on the landing page: a plain <Link to="/"> would do nothing, so
  // scroll back to the top. From another page, navigation happens as usual and
  // we only reset the scroll position.
  function handleBrandClick(event) {
    if (pathname === '/') {
      event.preventDefault()
      scrollToTop()
    } else {
      window.scrollTo({ top: 0 })
    }
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  const floatingSkin = scrolled
    ? 'bg-ink/85 backdrop-blur-md border-white/10'
    : 'bg-gradient-to-b from-black/50 to-transparent border-transparent'
  const barClass = overHero
    ? `fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${floatingSkin}`
    : 'border-b border-gray-200'
  const brandClass = overHero ? 'text-white' : 'text-gray-900'
  const linkClass = overHero
    ? 'text-sm text-white/80 hover:text-white'
    : 'text-sm text-gray-700 hover:text-gray-900'
  const buttonClass = overHero
    ? 'text-sm px-3 py-1.5 rounded-full bg-gold text-ink font-medium hover:bg-gold-soft'
    : 'text-sm px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-gray-700'

  return (
    <header className={`flex items-center justify-between px-6 py-4 ${barClass}`}>
      <Link to="/" onClick={handleBrandClick} className={`text-xl font-semibold ${brandClass}`}>
        Nexus
      </Link>

      <nav className="flex items-center gap-4">
        <Link to="/products" className={linkClass}>
          Sản phẩm
        </Link>

        {isAuthenticated ? (
          <>
            <span className={linkClass}>{user?.sub ?? 'Tài khoản'}</span>
            <button onClick={handleLogout} className={buttonClass}>
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={linkClass}>
              Đăng nhập
            </Link>
            <Link to="/register" className={buttonClass}>
              Đăng ký
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}
