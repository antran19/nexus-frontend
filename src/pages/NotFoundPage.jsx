import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Lỗi 404</p>
      <h1 className="mt-3 text-3xl font-light text-ink">Trang không tồn tại</h1>
      <Link
        to="/"
        className="mt-8 inline-block px-6 py-2.5 rounded bg-ink text-white text-sm font-medium hover:bg-gold hover:text-ink transition-colors"
      >
        Về trang chủ
      </Link>
    </div>
  )
}
