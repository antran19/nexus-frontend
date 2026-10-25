import { Link } from 'react-router-dom'
import { resolveProductImage, SCENE_FALLBACKS } from '../utils/images'

export default function ProductCard({ product }) {
  const imageUrl = resolveProductImage(product)
  const priceDisplay =
    product?.price != null
      ? `${Number(product.price).toLocaleString('vi-VN')} đ`
      : 'Đang đấu giá'

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block rounded-xl border border-gray-200/80 bg-white overflow-hidden hover:border-gold hover:shadow-lg transition-[border-color,box-shadow] duration-300"
    >
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name || 'Sản phẩm'}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = SCENE_FALLBACKS[0]
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-semibold tracking-wider uppercase bg-ink/80 text-gold-soft px-2.5 py-1 rounded-full backdrop-blur-sm">
            {product?.status === 'ACTIVE' ? 'Đang mở' : 'Đấu giá'}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-ink truncate group-hover:text-gold transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
          {product.description || 'Sản phẩm chính hãng'}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Giá</span>
          <span className="text-sm font-bold text-ink">{priceDisplay}</span>
        </div>
      </div>
    </Link>
  )
}
