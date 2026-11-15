import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getProducts } from '../api/products'
import { useCategories } from '../components/landing/useLandingData'
import ProductCard from '../components/ProductCard'

const itemClass = (active) =>
  `block rounded-lg px-3 py-2 text-sm ${active ? 'bg-tray font-semibold text-brand' : 'text-cocoa hover:bg-peach hover:text-brand'}`

// Product list after the Stitch design: the categories in a column on the left, the products as cards on the right.
// The search text and the category come from the address (the store header writes them), so a result can be shared.
export default function ProductListPage() {
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get('categoryId') ?? undefined
  const keyword = searchParams.get('q') ?? undefined
  const categories = useCategories()
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
    getProducts({ q: keyword, categoryId })
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

  const category = categories.find((item) => item.id === categoryId)
  let heading = category?.name ?? 'Tất cả sản phẩm'
  if (keyword) heading = `Kết quả cho "${keyword}"`

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside aria-label="Danh mục">
        <div className="rounded-2xl border border-tray bg-white p-4">
          <h2 className="font-display text-base font-bold text-cocoa">Danh mục</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <Link to="/products" aria-current={!categoryId ? 'page' : undefined} className={itemClass(!categoryId)}>Tất cả sản phẩm</Link>
            </li>
            {categories.map((item) => (
              <li key={item.id}>
                <Link to={`/products?categoryId=${item.id}`} aria-current={categoryId === item.id ? 'page' : undefined} className={itemClass(categoryId === item.id)}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section aria-labelledby="products-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 id="products-heading" className="font-display text-3xl font-bold text-cocoa">{heading}</h1>
          {!loading && !failed && <p className="text-sm text-gray-600">{products.length} sản phẩm</p>}
        </div>

        <div className="mt-6">
          {loading ? (
            <div role="status" className="py-20 text-center text-sm text-gray-500">Đang tải sản phẩm...</div>
          ) : failed ? (
            <div role="alert" className="py-20 text-center border border-dashed border-red-200 rounded-2xl bg-white">
              <p className="text-sm text-red-700">Không tải được danh sách sản phẩm.</p>
              <button
                type="button"
                onClick={retry}
                className="mt-4 px-5 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-tray rounded-2xl bg-white">
              <p className="text-sm text-gray-600">Không tìm thấy sản phẩm nào phù hợp.</p>
              {(keyword || categoryId) && (
                <Link to="/products" className="mt-3 inline-block text-sm font-medium text-brand underline">Xem tất cả sản phẩm</Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
