import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { getProducts } from '../api/products'

export default function ProductListPage() {
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get('categoryId') ?? undefined
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getProducts({ q: keyword || undefined, categoryId })
      .then(({ data }) => {
        if (!cancelled) setProducts(data.content ?? data ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [keyword, categoryId])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <input
        type="search"
        placeholder="Tìm sản phẩm..."
        defaultValue={keyword}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setKeyword(e.currentTarget.value)
        }}
        className="w-full border border-gray-300 rounded px-3 py-2 mb-6"
      />

      {loading ? (
        <p className="text-sm text-gray-500">Đang tải...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500">Không tìm thấy sản phẩm nào.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
