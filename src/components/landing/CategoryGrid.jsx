import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { useCategories } from './useLandingData'

export default function CategoryGrid() {
  const categories = useCategories()

  if (categories.length === 0) return null

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <Reveal as="div" className="mb-10">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Danh mục</p>
        <h2 className="mt-2 text-3xl font-bold text-ink">Tìm theo danh mục</h2>
        <p className="mt-2 text-gray-600">Tất cả những gì bạn có thể đặt giá trên Nexus.</p>
      </Reveal>

      <Reveal
        as="div"
        stagger={0.08}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/products?categoryId=${category.id}`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 py-7 hover:border-gold hover:shadow-lg transition-[border-color,box-shadow]"
          >
            <span className="w-14 h-14 rounded-full bg-ink text-gold-soft flex items-center justify-center text-xl font-semibold group-hover:scale-110 transition-transform">
              {category.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-medium text-gray-800 text-center">{category.name}</span>
          </Link>
        ))}
      </Reveal>
    </section>
  )
}
