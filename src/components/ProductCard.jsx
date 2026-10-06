import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="block rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100">
        {product.imageUrls?.[0] && (
          <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
        <p className="text-sm text-gray-600">{product.price}</p>
      </div>
    </Link>
  )
}
