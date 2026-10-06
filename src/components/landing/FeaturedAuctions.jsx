import { Link } from 'react-router-dom'
import ProductCard from '../ProductCard'
import Reveal from './Reveal'
import { useDiscoverProducts } from './useLandingData'

export default function FeaturedAuctions() {
  const products = useDiscoverProducts().slice(0, 8)

  if (products.length === 0) return null

  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal as="div" className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Nổi bật</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Đang đấu giá</h2>
          </div>
          <Link to="/products" className="text-sm font-medium text-ink underline underline-offset-4 hover:text-gold">
            Xem tất cả
          </Link>
        </Reveal>

        <Reveal
          as="div"
          stagger={0.08}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </Reveal>
      </div>
    </section>
  )
}
