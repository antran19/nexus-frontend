import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts } from '../api/products'
import PageHero from '../components/PageHero'
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
    <>
      <PageHero
        eyebrow="Danh mục sản phẩm"
        title="Khám phá các tuyệt phẩm"
        subtitle="Được thẩm định nghiêm ngặt và lưu trữ trên mạng lưới Nexus."
      >
        <div className="w-full md:w-80">
          <input
            type="search"
            placeholder="Tìm theo tên sản phẩm..."
            defaultValue={keyword}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setKeyword(e.currentTarget.value)
            }}
            className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
          />
        </div>
      </PageHero>

      <div className="max-w-6xl mx-auto px-6 py-12">
      {loading ? (
        <div className="py-20 text-center text-sm text-gray-500">Đang tải sản phẩm...</div>
      ) : failed ? (
        <div className="py-20 text-center border border-dashed border-red-200 rounded-xl">
          <p className="text-sm text-red-700">Không tải được danh sách sản phẩm.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 px-5 py-2 rounded bg-ink text-white text-sm font-medium hover:bg-gold hover:text-ink transition-colors"
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
    </>
  )
}
