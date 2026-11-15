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
      className="group block rounded-2xl border border-tray bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-brand/40 transition-[border-color,box-shadow] duration-300"
    >
      <div className="relative aspect-[4/3] bg-tray overflow-hidden">
        <img
          src={imageUrl}
          alt={product.name || 'Sản phẩm'}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = SCENE_FALLBACKS[0]
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <span className="absolute top-3 left-3 text-[11px] font-semibold bg-white/95 text-brand px-2.5 py-1 rounded-full">
          {product?.status === 'ACTIVE' ? 'Đang mở' : 'Đấu giá'}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-display text-base font-semibold text-cocoa truncate group-hover:text-brand transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-gray-600 mt-1 line-clamp-1">
          {product.description || 'Sản phẩm chính hãng'}
        </p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-gray-500">Giá</p>
            <p className="font-display text-lg font-extrabold text-brand">{priceDisplay}</p>
          </div>
          <span className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white group-hover:bg-brand-dark transition-colors">Xem chi tiết</span>
        </div>
      </div>
    </Link>
  )
}
