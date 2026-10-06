import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

export default function AuthLayout({ title, subtitle, children }) {
  const scope = useRef(null)

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-auth-panel-text]', { y: 24, opacity: 0, duration: 0.7 })
        .from('[data-auth-form]', { y: 24, opacity: 0, duration: 0.7 }, '-=0.5')
    },
    { scope },
  )

  return (
    <div ref={scope} className="min-h-[calc(100vh-57px)] grid md:grid-cols-2">
      <div className="relative hidden md:flex items-center overflow-hidden bg-gray-900">
        <img
          src="/images/hero-poster.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-gray-900/20" />

        <Link
          to="/"
          className="absolute top-6 left-6 z-10 bg-white/90 text-gray-900 text-sm px-4 py-2 rounded-full hover:bg-white transition-colors"
        >
          Trang chủ
        </Link>

        <div data-auth-panel-text className="relative z-10 px-12 text-white max-w-sm">
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="text-white/80 mt-3">{subtitle}</p>
        </div>
      </div>

      <div data-auth-form className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
