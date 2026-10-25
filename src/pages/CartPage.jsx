import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCart, removeCartItem, updateCartItem } from '../api/cart'
import { resolveProductImage } from '../utils/images'

export default function CartPage() {
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
      .catch(() => {
        if (!cancelled) setErrorMessage('Không thể tải thông tin giỏ hàng. Vui lòng thử lại sau.')
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
    } catch {
      setErrorMessage('Không thể tải thông tin giỏ hàng. Vui lòng thử lại sau.')
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
      const apiError = err.response?.data?.error
      const message =
        apiError?.code === 'INSUFFICIENT_STOCK'
          ? 'Số lượng sản phẩm trong kho không đủ.'
          : apiError?.message || 'Không thể cập nhật số lượng.'
      setErrorMessage(message)
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
      const apiError = err.response?.data?.error
      setErrorMessage(apiError?.message || 'Không thể xóa sản phẩm khỏi giỏ.')
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
  const totalAmount = cart?.totalAmount ?? 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Túi đồ của bạn</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Giỏ hàng</h1>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200 rounded-lg">
          <p className="text-base text-gray-600 mb-6">Giỏ hàng của bạn đang trống.</p>
          <Link
            to="/products"
            className="inline-block px-6 py-2.5 rounded bg-ink text-white text-sm font-medium hover:bg-ink-soft transition-colors"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:col-span-2 divide-y divide-gray-200 border-t border-b border-gray-200">
            {items.map((item) => {
              const isUpdating = updatingId === item.productId
              return (
                <div key={item.productId} className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200/80 shrink-0">
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
                        className="text-base font-semibold text-ink hover:text-gold transition-colors block"
                      >
                        {item.productName || 'Sản phẩm'}
                      </Link>
                      <p className="mt-1 text-sm text-gray-500">
                        Đơn giá: {Number(item.unitPrice).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 text-sm font-medium min-w-8 text-center text-ink">
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

                    <p className="text-sm font-semibold text-ink min-w-28 text-right">
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

          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/50">
            <h2 className="text-lg font-bold text-ink mb-4">Tóm tắt đơn hàng</h2>

            <div className="space-y-3 text-sm text-gray-600 border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between">
                <span>Số lượng món</span>
                <span className="font-medium text-ink">{items.reduce((acc, i) => acc + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <span className="font-medium text-ink">{Number(totalAmount).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div className="flex justify-between text-base font-bold text-ink mb-6">
              <span>Tổng thanh toán</span>
              <span>{Number(totalAmount).toLocaleString('vi-VN')} đ</span>
            </div>

            <button
              type="button"
              className="w-full py-3 rounded bg-ink text-white text-sm font-medium hover:bg-ink-soft transition-colors"
            >
              Tiến hành đặt hàng
            </button>

            <Link
              to="/products"
              className="block mt-4 text-center text-xs uppercase tracking-wider text-gray-500 hover:text-gold transition-colors"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
