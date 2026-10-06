import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">404</h1>
      <p className="text-gray-600 mt-2">Trang không tồn tại.</p>
      <Link to="/" className="text-gray-900 underline mt-4 inline-block">
        Về trang chủ
      </Link>
    </div>
  )
}
