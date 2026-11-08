import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getAuctionsByProduct } from '../api/auctions'
import AuctionPanel from '../components/auction/AuctionPanel'
import { addToCart } from '../api/cart'
import { getProductById } from '../api/products'
import { useAuth } from '../context/AuthContext'
import { cartErrorMessage } from '../utils/apiError'
import { resolveProductImage } from '../utils/images'

export default function ProductDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [auction, setAuction] = useState(null)
  const [cartQuantity, setCartQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartSuccess, setCartSuccess] = useState(false)
  const [cartError, setCartError] = useState('')

  useEffect(() => {
    let cancelled = false
    getProductById(id)
      .then(({ data }) => {
        if (!cancelled) setProduct(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    getAuctionsByProduct(id)
      .then(({ data: auctions }) => {
        if (!cancelled) setAuction(auctions.find((a) => a.status === 'ACTIVE') ?? auctions[0] ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleAddToCart() {
    setAddingToCart(true)
    setCartError('')
    setCartSuccess(false)
    try {
      await addToCart(product.id, Number(cartQuantity))
      setCartSuccess(true)
    } catch (err) {
      setCartError(cartErrorMessage(err, 'Không thể thêm sản phẩm vào giỏ.'))
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500 px-4 py-8">Đang tải...</p>
  if (!product) return <p className="text-sm text-gray-500 px-4 py-8">Không tìm thấy sản phẩm.</p>

  const mainImage = product.imageUrls?.[0] || resolveProductImage(product)

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-10">
      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200/80 shadow-sm">
        <img
          src={mainImage}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = '/images/scenes/watch.jpg'
          }}
          className="w-full h-full object-cover"
        />
      </div>

      <div>
        <h1 className="text-3xl font-light text-ink">{product.name}</h1>
        <p className="text-gray-600 mt-2">{product.description}</p>

        {product.price != null && (
          <div className="mt-6 border-t border-b border-gray-200 py-4">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Mua trực tiếp</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">
              {Number(product.price).toLocaleString('vi-VN')} đ
            </p>

            {!isAuthenticated ? (
              <Link
                to="/login"
                state={{ from: location.pathname }}
                className="inline-block mt-3 text-sm text-gray-900 underline"
              >
                Đăng nhập để mua hàng
              </Link>
            ) : (
              <div className="flex items-center gap-3 mt-4">
                <input
                  type="number"
                  min="1"
                  value={cartQuantity}
                  onChange={(e) => setCartQuantity(Math.max(1, Number(e.target.value)))}
                  className="border border-gray-300 rounded px-3 py-2 w-20 text-sm text-center"
                />
                <button
                  type="button"
                  disabled={addingToCart}
                  onClick={handleAddToCart}
                  className="bg-ink text-white text-sm font-medium rounded px-5 py-2 hover:bg-gold hover:text-ink disabled:opacity-50 transition-colors"
                >
                  {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
                </button>
              </div>
            )}

            {cartSuccess && (
              <p className="text-xs text-green-700 mt-2">
                Đã thêm sản phẩm vào giỏ.{' '}
                <Link to="/cart" className="underline font-semibold ml-1">
                  Xem giỏ hàng
                </Link>
              </p>
            )}

            {cartError && <p className="text-xs text-red-600 mt-2">{cartError}</p>}
          </div>
        )}

        {!auction ? (
          <p className="text-sm text-gray-500 mt-6">Sản phẩm này chưa có phiên đấu giá nào.</p>
        ) : (
          <AuctionPanel key={auction.id} initial={auction} />
        )}
      </div>
    </div>
  )
}
