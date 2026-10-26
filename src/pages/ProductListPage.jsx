import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'

export default function ProductListPage() {
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get('categoryId') ?? undefined
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  function retry() {
    setLoading(true)
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    getProducts({ q: keyword || undefined, categoryId })
      .then(({ data }) => {
        if (!cancelled) {
          const list = data?.content ?? data ?? []
          setProducts(list)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([])
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [keyword, categoryId, attempt])

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Danh mục sản phẩm</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Khám phá các tuyệt phẩm</h1>
          <p className="mt-2 text-gray-600">Được thẩm định nghiêm ngặt và lưu trữ trên mạng lưới Nexus.</p>
        </div>

        <div className="w-full md:w-80">
          <input
            type="search"
            placeholder="Tìm theo tên sản phẩm..."
            defaultValue={keyword}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setKeyword(e.currentTarget.value)
            }}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-500">Đang tải sản phẩm...</div>
      ) : failed ? (
        <div className="py-20 text-center border border-dashed border-red-200 rounded-xl">
          <p className="text-sm text-red-700">Không tải được danh sách sản phẩm.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 px-5 py-2 rounded bg-ink text-white text-sm font-medium hover:bg-ink-soft transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-500">Không tìm thấy sản phẩm nào phù hợp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
