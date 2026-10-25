import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'

const SAMPLE_CATALOG = [
  {
    id: 'sample-1',
    name: 'Rolex Submariner Date 126610LN',
    description: 'Thép Oystersteel, mặt số đen, bezel Cerachrom, tình trạng hoàn hảo.',
    price: 345000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/watch.jpg'],
  },
  {
    id: 'sample-2',
    name: 'Leica M3 Single Stroke (1958)',
    description: 'Kèm ống kính Summicron 50mm f/2, cơ chế hoạt động mượt mà.',
    price: 89000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/camera.jpg'],
  },
  {
    id: 'sample-3',
    name: 'Nhẫn Kim Cương Solitaire 2.5ct GIA',
    description: 'Vàng trắng 18K, độ sạch VVS1, nước D, giác cắt xuất sắc.',
    price: 520000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/jewelry.jpg'],
  },
  {
    id: 'sample-4',
    name: 'Bình Gốm Hoa Lam Thời Lê Sơ (Thế kỷ XV)',
    description: 'Họa tiết hoa cúc lam cổ, men thuỷ tinh trong suốt có chứng thư.',
    price: 180000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/antique.jpg'],
  },
  {
    id: 'sample-5',
    name: 'Patek Philippe Calatrava 5227R',
    description: 'Vàng hồng 18K, nắp lưng cậy sĩ quan, dây da cá sấu đen.',
    price: 680000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/watch.jpg'],
  },
  {
    id: 'sample-6',
    name: 'Tranh Sơn Mài Cổ Điển “Hồ Gươm Sớm Thu”',
    description: 'Chất liệu sơn mài truyền thống thếp vàng và bạc vỏ trứng.',
    price: 125000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/art.jpg'],
  },
]

export default function ProductListPage() {
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get('categoryId') ?? undefined
  const [keyword, setKeyword] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getProducts({ q: keyword || undefined, categoryId })
      .then(({ data }) => {
        if (!cancelled) {
          const list = data?.content ?? data ?? []
          setProducts(list.length > 0 ? list : SAMPLE_CATALOG)
        }
      })
      .catch(() => {
        if (!cancelled) setProducts(SAMPLE_CATALOG)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [keyword, categoryId])

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
