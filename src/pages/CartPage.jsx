import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCart, removeCartItem, updateCartItem } from '../api/cart'
import PageHero from '../components/PageHero'
import { cartErrorMessage } from '../utils/apiError'
import { cartSummary } from '../utils/cartSummary'
import { resolveProductImage } from '../utils/images'

export default function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    getCart()
      .then(({ data }) => {
        if (!cancelled) setCart(data)
      })
      .catch((err) => {
        if (!cancelled) setErrorMessage(cartErrorMessage(err, 'Không thể tải thông tin giỏ hàng. Vui lòng thử lại sau.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function reloadCart() {
    try {
      const { data } = await getCart()
      setCart(data)
    } catch (err) {
      setErrorMessage(cartErrorMessage(err, 'Không thể tải thông tin giỏ hàng. Vui lòng thử lại sau.'))
    }
  }

  async function handleQuantityChange(productId, newQuantity) {
    if (newQuantity < 1) {
      handleRemoveItem(productId)
      return
    }

    setUpdatingId(productId)
    setErrorMessage('')
    try {
      const { data } = await updateCartItem(productId, newQuantity)
      setCart(data)
    } catch (err) {
      setErrorMessage(cartErrorMessage(err, 'Không thể cập nhật số lượng.'))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleRemoveItem(productId) {
    setUpdatingId(productId)
    setErrorMessage('')
    try {
      await removeCartItem(productId)
      await reloadCart()
    } catch (err) {
      setErrorMessage(cartErrorMessage(err, 'Không thể xóa sản phẩm khỏi giỏ.'))
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-sm text-gray-500">Đang tải giỏ hàng...</p>
      </div>
    )
  }

  const items = cart?.items || []
  const { count, total: totalAmount } = cartSummary(cart)

  return (
    <>
      <PageHero eyebrow="Túi đồ của bạn" title="Giỏ hàng" />

      <div className="max-w-6xl mx-auto px-6 py-10">
      {errorMessage && (
        <div role="alert" className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-tray rounded-2xl bg-white">
          <p className="text-base text-gray-600 mb-6">Giỏ hàng của bạn đang trống.</p>
          <Link
            to="/products"
            className="inline-block px-6 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const isUpdating = updatingId === item.productId
              return (
                <div key={item.productId} className="rounded-2xl border border-tray bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-tray border border-tray shrink-0">
                      <img
                        src={resolveProductImage({ id: item.productId })}
                        alt={item.productName || 'Sản phẩm'}
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = '/images/scenes/watch.jpg'
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <Link
                        to={`/products/${item.productId}`}
                        className="font-display text-base font-semibold text-cocoa hover:text-brand transition-colors block"
                      >
                        {item.productName || 'Sản phẩm'}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        Đơn giá: {Number(item.unitPrice).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-sm font-medium min-w-8 text-center text-cocoa">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-sm font-semibold text-cocoa min-w-28 text-right">
                      {Number(item.subtotal).toLocaleString('vi-VN')} đ
                    </p>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleRemoveItem(item.productId)}
                      className="text-xs uppercase tracking-wider text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border border-tray rounded-2xl p-6 bg-white shadow-sm lg:sticky lg:top-32">
            <h2 className="font-display text-lg font-bold text-cocoa mb-4">Tóm tắt đơn hàng</h2>

            <div className="space-y-3 text-sm text-gray-600 border-b border-tray pb-4 mb-4">
              <div className="flex justify-between">
                <span>Số lượng món</span>
                <span className="font-medium text-cocoa">{count}</span>
              </div>
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span className="font-medium text-cocoa">{Number(totalAmount).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline text-base font-bold text-cocoa mb-6">
              <span>Tổng thanh toán</span>
              <span className="font-display text-xl font-extrabold text-brand">{Number(totalAmount).toLocaleString('vi-VN')} đ</span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
            >
              Tiến hành đặt hàng
            </button>

            <Link
              to="/products"
              className="block mt-4 text-center text-xs uppercase tracking-wider text-gray-500 hover:text-brand transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
