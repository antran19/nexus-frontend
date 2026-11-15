import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getAuctionsByProduct } from '../api/auctions'
import AuctionPanel from '../components/auction/AuctionPanel'
import { addToCart } from '../api/cart'
import { getProductById } from '../api/products'
import { useAuth } from '../context/AuthContext'
import { cartErrorMessage } from '../utils/apiError'
import { productImages, SCENE_FALLBACKS } from '../utils/images'

// Product page after the Stitch design: the gallery on the left, the product, the direct purchase and the auction
// on the right.
export default function ProductDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [auction, setAuction] = useState(null)
  const [selectedImage, setSelectedImage] = useState('')
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

  if (loading) return <p role="status" className="text-sm text-gray-500 px-6 py-12 max-w-6xl mx-auto">Đang tải...</p>
  if (!product) {
    return (
      <p className="text-sm text-gray-600 px-6 py-12 max-w-6xl mx-auto">
        Không tìm thấy sản phẩm.{' '}
        <Link to="/products" className="font-medium text-brand underline">Xem tất cả sản phẩm</Link>
      </p>
    )
  }

  const images = productImages(product)
  // The picture the person chose, else the first; a choice that no longer exists (another product) falls back.
  const mainImage = images.includes(selectedImage) ? selectedImage : images[0]

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <nav aria-label="Vị trí" className="text-sm text-gray-600">
        <Link to="/products" className="hover:text-brand">Sản phẩm</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-cocoa">{product.name}</span>
      </nav>

      <div className="mt-6 grid md:grid-cols-2 gap-10">
        <div>
          <div className="aspect-[4/3] bg-tray rounded-2xl overflow-hidden border border-tray shadow-sm">
            <img
              src={mainImage}
              alt={product.name}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = SCENE_FALLBACKS[0]
              }}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Ảnh sản phẩm">
              {images.map((url, index) => (
                <li key={url}>
                  <button
                    type="button"
                    onClick={() => setSelectedImage(url)}
                    aria-label={`Xem ảnh ${index + 1}`}
                    aria-pressed={url === mainImage}
                    className={`h-16 w-20 overflow-hidden rounded-lg border-2 ${url === mainImage ? 'border-brand' : 'border-transparent hover:border-tray'}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight text-cocoa">{product.name}</h1>
          <p className="text-gray-600 mt-3">{product.description}</p>

          {product.price != null && (
            <div className="mt-6 rounded-2xl border border-tray bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-brand">Mua trực tiếp</p>
              <p className="font-display text-3xl font-extrabold text-cocoa mt-1">
                {Number(product.price).toLocaleString('vi-VN')} đ
              </p>

              {!isAuthenticated ? (
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="inline-block mt-3 text-sm font-medium text-brand underline"
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
                    aria-label="Số lượng"
                    className="border border-gray-300 rounded-lg px-3 py-2 w-20 text-sm text-center"
                  />
                  <button
                    type="button"
                    disabled={addingToCart}
                    onClick={handleAddToCart}
                    className="bg-amber text-cocoa text-sm font-semibold rounded-lg px-5 py-2.5 hover:brightness-95 disabled:opacity-50 transition"
                  >
                    {addingToCart ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
                  </button>
                </div>
              )}

              {cartSuccess && (
                <p role="status" className="text-xs text-green-700 mt-2">
                  Đã thêm sản phẩm vào giỏ.{' '}
                  <Link to="/cart" className="underline font-semibold ml-1">
                    Xem giỏ hàng
                  </Link>
                </p>
              )}

              {cartError && <p role="alert" className="text-xs text-red-600 mt-2">{cartError}</p>}
            </div>
          )}

          {!auction ? (
            <p className="text-sm text-gray-600 mt-6">Sản phẩm này chưa có phiên đấu giá nào.</p>
          ) : (
            <AuctionPanel key={auction.id} initial={auction} />
          )}
        </div>
      </div>
    </div>
  )
}
