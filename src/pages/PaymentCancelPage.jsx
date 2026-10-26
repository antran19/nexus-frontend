import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { cancelOrder, createCheckoutSession } from '../api/orders'
import { errorMessage } from '../utils/apiError'

// Stripe sends the buyer here when they leave the payment page (cancelUrl). The order stays
// AWAITING_PAYMENT for 30 minutes, so they can pay again or cancel it.
export default function PaymentCancelPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const orderId = params.get('orderId')
  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState('')

  async function handleRetry() {
    setBusy(true)
    setErrorText('')
    try {
      const origin = window.location.origin
      const { data: session } = await createCheckoutSession(
        orderId,
        `${origin}/payment/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/payment/cancel?orderId=${orderId}`,
      )
      window.location.assign(session.checkoutUrl)
    } catch (err) {
      setErrorText(errorMessage(err, 'Không thể mở lại trang thanh toán.'))
      setBusy(false)
    }
  }

  async function handleCancel() {
    setBusy(true)
    setErrorText('')
    try {
      await cancelOrder(orderId)
      navigate('/cart')
    } catch (err) {
      setErrorText(errorMessage(err, 'Không thể hủy đơn hàng.'))
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-ink">Bạn chưa hoàn tất thanh toán</h1>
      <p className="mt-3 text-sm text-gray-600">
        Đơn hàng vẫn được giữ trong 30 phút. Bạn có thể thanh toán lại hoặc hủy đơn.
      </p>

      {errorText && <p className="mt-4 text-sm text-red-600">{errorText}</p>}

      {orderId ? (
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleRetry}
            className="px-6 py-2.5 rounded bg-ink text-white text-sm font-medium hover:bg-ink-soft transition-colors disabled:opacity-50"
          >
            Thanh toán lại
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleCancel}
            className="px-6 py-2.5 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Hủy đơn
          </button>
        </div>
      ) : (
        <Link to="/cart" className="mt-8 inline-block text-sm underline text-ink">
          Về giỏ hàng
        </Link>
      )}
    </div>
  )
}
