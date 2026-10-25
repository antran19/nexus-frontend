import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { useCategories } from './useLandingData'

const DEFAULT_CATEGORY_CARDS = [
  { id: 'watches', name: 'Đồng hồ cao cấp', image: '/images/scenes/watch.jpg', count: '12 phiên' },
  { id: 'jewelry', name: 'Trang sức & Đá quý', image: '/images/scenes/jewelry.jpg', count: '8 phiên' },
  { id: 'antiques', name: 'Đồ cổ & Sưu tầm', image: '/images/scenes/antique.jpg', count: '15 phiên' },
  { id: 'cameras', name: 'Máy ảnh cổ điển', image: '/images/scenes/camera.jpg', count: '6 phiên' },
  { id: 'art', name: 'Nghệ thuật & Tranh', image: '/images/scenes/art.jpg', count: '9 phiên' },
]

function getCategoryCard(cat, index) {
  const nameLower = (cat?.name || '').toLowerCase()
  let image = DEFAULT_CATEGORY_CARDS[index % DEFAULT_CATEGORY_CARDS.length].image
  if (nameLower.includes('watch') || nameLower.includes('đồng hồ')) {
    image = '/images/scenes/watch.jpg'
  } else if (nameLower.includes('jewelry') || nameLower.includes('trang sức')) {
    image = '/images/scenes/jewelry.jpg'
  } else if (nameLower.includes('antique') || nameLower.includes('cổ')) {
    image = '/images/scenes/antique.jpg'
  } else if (nameLower.includes('camera') || nameLower.includes('máy ảnh')) {
    image = '/images/scenes/camera.jpg'
  } else if (nameLower.includes('art') || nameLower.includes('nghệ thuật') || nameLower.includes('tranh')) {
    image = '/images/scenes/art.jpg'
  }

  return {
    id: cat.id,
    name: cat.name,
    image,
    count: 'Phiên đang mở',
  }
}

export default function CategoryGrid() {
  const backendCategories = useCategories()
  const displayCategories =
    backendCategories.length > 2
      ? backendCategories.map((c, i) => getCategoryCard(c, i))
      : DEFAULT_CATEGORY_CARDS

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <Reveal as="div" className="mb-10">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Bộ sưu tập</p>
        <h2 className="mt-2 text-3xl font-bold text-ink">Tìm theo danh mục</h2>
        <p className="mt-2 text-gray-600">Tuyển tập những món đồ giá trị được bảo chứng bởi Nexus.</p>
      </Reveal>

      <Reveal
        as="div"
        stagger={0.08}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        {displayCategories.map((category) => (
          <Link
            key={category.id}
            to={`/products?categoryId=${category.id}`}
            className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm hover:border-gold hover:shadow-xl transition-[border-color,box-shadow] duration-500"
          >
            <img
              src={category.image}
              alt={category.name}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent group-hover:via-ink/40 transition-colors" />

            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-gold-soft block mb-1">
                {category.count}
              </span>
              <h3 className="text-base font-bold text-white group-hover:text-gold transition-colors leading-snug">
                {category.name}
              </h3>
            </div>
          </Link>
        ))}
      </Reveal>
    </section>
  )
}
