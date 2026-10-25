import { Link } from 'react-router-dom'
import ProductCard from '../ProductCard'
import Reveal from './Reveal'
import { useDiscoverProducts } from './useLandingData'

const CURATED_FEATURED = [
  {
    id: 'curated-1',
    name: 'Rolex Submariner Date 126610LN',
    description: 'Thép Oystersteel, mặt số đen, bezel Cerachrom, tình trạng hoàn hảo.',
    price: 345000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/watch.jpg'],
  },
  {
    id: 'curated-2',
    name: 'Leica M3 Single Stroke (1958)',
    description: 'Kèm ống kính Summicron 50mm f/2, cơ chế hoạt động mượt mà.',
    price: 89000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/camera.jpg'],
  },
  {
    id: 'curated-3',
    name: 'Nhẫn Kim Cương Solitaire 2.5ct GIA',
    description: 'Vàng trắng 18K, độ sạch VVS1, nước D, giác cắt xuất sắc.',
    price: 520000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/jewelry.jpg'],
  },
  {
    id: 'curated-4',
    name: 'Bình Gốm Hoa Lam Thời Lê Sơ (Thế kỷ XV)',
    description: 'Họa tiết hoa cúc lam cổ, men thuỷ tinh trong suốt có chứng thư.',
    price: 180000000,
    status: 'ACTIVE',
    imageUrls: ['/images/scenes/antique.jpg'],
  },
]

export default function FeaturedAuctions() {
  const backendProducts = useDiscoverProducts()
  const products =
    backendProducts.length >= 4
      ? backendProducts.slice(0, 8)
      : backendProducts.length > 0
        ? [...backendProducts, ...CURATED_FEATURED].slice(0, 4)
        : CURATED_FEATURED

  return (
    <section className="bg-gray-50/70 py-20 border-t border-b border-gray-200/60">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal as="div" className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Tiêu điểm</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Phiên đấu giá nổi bật</h2>
          </div>
          <Link
            to="/products"
            className="text-xs font-semibold uppercase tracking-wider text-ink underline underline-offset-4 hover:text-gold transition-colors"
          >
            Xem tất cả phiên
          </Link>
        </Reveal>

        <Reveal
          as="div"
          stagger={0.08}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </Reveal>
      </div>
    </section>
  )
}
