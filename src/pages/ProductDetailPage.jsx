import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProductById } from '../api/products'

export default function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getProductById(id)
      .then(({ data }) => {
        if (!cancelled) setProduct(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) return <p className="text-sm text-gray-500 px-4 py-8">Đang tải...</p>
  if (!product) return <p className="text-sm text-gray-500 px-4 py-8">Không tìm thấy sản phẩm.</p>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-8">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
        {product.imageUrls?.[0] && (
          <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
        <p className="text-gray-600 mt-2">{product.description}</p>

        <button className="mt-6 bg-gray-900 text-white rounded px-4 py-2">
          Tham gia đấu giá
        </button>
      </div>
    </div>
  )
}
