import { Link } from 'react-router-dom'
import ProductCard from '../ProductCard'
import Reveal from './Reveal'
import { useDiscoverProducts } from './useLandingData'

export default function FeaturedAuctions() {
  const products = useDiscoverProducts().slice(0, 8)

  // Nothing to feature (or the request failed): hide the section rather than show made-up items.
  if (products.length === 0) return null

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
