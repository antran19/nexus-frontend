import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCart } from '../api/cart'
import { createCheckoutSession, setShippingAddress, startCheckout } from '../api/orders'
import { cartErrorMessage, errorMessage } from '../utils/apiError'

const EMPTY_ADDRESS = { recipientName: '', phone: '', addressLine: '', city: '' }

const inputClass =
  'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors'

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [submitting, setSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [cartProblem, setCartProblem] = useState(false)

  // One key for this visit to the page: a retry after a network error reuses it, so the server
  // hands back the same order instead of creating a second one.
  const idempotencyKey = useRef(crypto.randomUUID())
  // The order already created by an earlier attempt (the cart is empty after checkout).
  const orderId = useRef(null)

  useEffect(() => {
    let cancelled = false
    getCart()
      .then(({ data }) => {
        if (!cancelled) setCart(data)
      })
      .catch(() => {
        if (!cancelled) setErrorText('Không thể tải giỏ hàng. Vui lòng thử lại sau.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function update(field, value) {
    setAddress((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErrorText('')
    setCartProblem(false)
    try {
      if (!orderId.current) {
        const { data: order } = await startCheckout(idempotencyKey.current)
        orderId.current = order.id
      }
      await setShippingAddress(orderId.current, address)

      const origin = window.location.origin
      const { data: session } = await createCheckoutSession(
        orderId.current,
        // Stripe fills in {CHECKOUT_SESSION_ID} itself; both URLs stay on this site's origin.
        `${origin}/payment/success?orderId=${orderId.current}&session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/payment/cancel?orderId=${orderId.current}`,
      )
      window.location.assign(session.checkoutUrl)
    } catch (err) {
      const code = err.response?.data?.error?.code
      if (code === 'CART_EMPTY') {
        navigate('/cart', { replace: true })
        return
      }
      if (code === 'CART_ITEM_UNAVAILABLE' || code === 'INSUFFICIENT_STOCK') {
        // The cart is kept as is: the buyer fixes it in the cart page, then comes back.
        setCartProblem(true)
        setErrorText(errorMessage(err, 'Giỏ hàng có sản phẩm không mua được.'))
      } else {
        setErrorText(cartErrorMessage(err, 'Không thể tạo đơn hàng. Vui lòng thử lại.'))
      }
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    )
  }

  const items = cart?.items || []

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <p className="text-base text-gray-600 mb-6">Giỏ hàng trống, chưa có gì để thanh toán.</p>
        <Link
          to="/products"
          className="inline-block px-6 py-2.5 rounded bg-ink text-white text-sm font-medium hover:bg-ink-soft transition-colors"
        >
          Khám phá sản phẩm
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase text-gold">Bước cuối</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Thanh toán</h1>
      </div>

      {errorText && (
        <div className="mb-6 p-4 rounded border border-red-200 bg-red-50 text-sm text-red-700">
          {errorText}{' '}
          {cartProblem && (
            <Link to="/cart" className="underline font-semibold">
              Chỉnh lại giỏ hàng
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-2 flex flex-col gap-5">
          <h2 className="text-lg font-bold text-ink">Địa chỉ giao hàng</h2>

          <label className="flex flex-col gap-1.5 text-sm text-gray-700">
            Người nhận
            <input
              className={inputClass}
              value={address.recipientName}
              onChange={(e) => update('recipientName', e.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-gray-700">
            Số điện thoại
            <input
              className={inputClass}
              type="tel"
              value={address.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="0901234567"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-gray-700">
            Địa chỉ
            <input
              className={inputClass}
              value={address.addressLine}
              onChange={(e) => update('addressLine', e.target.value)}
              placeholder="Số nhà, đường, phường, quận"
              maxLength={255}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-gray-700">
            Tỉnh / Thành phố
            <input
              className={inputClass}
              value={address.city}
              onChange={(e) => update('city', e.target.value)}
              maxLength={100}
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full py-3 rounded bg-ink text-white text-sm font-medium hover:bg-ink-soft transition-colors disabled:opacity-50"
          >
            {submitting ? 'Đang chuyển tới Stripe...' : 'Thanh toán với Stripe'}
          </button>
          <p className="text-xs text-gray-500">
            Bạn sẽ được chuyển sang trang thanh toán của Stripe để nhập thẻ. Nexus không lưu thông tin thẻ.
          </p>
        </form>

        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50/50">
          <h2 className="text-lg font-bold text-ink mb-4">Đơn hàng</h2>
          <ul className="space-y-3 text-sm text-gray-600 border-b border-gray-200 pb-4 mb-4">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-4">
                <span className="truncate">
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-medium text-ink shrink-0">
                  {Number(item.subtotal).toLocaleString('vi-VN')} đ
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-base font-bold text-ink">
            <span>Tổng</span>
            <span>{Number(cart?.totalAmount ?? 0).toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
