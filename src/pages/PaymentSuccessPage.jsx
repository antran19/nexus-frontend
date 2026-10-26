import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmPayment } from '../api/orders'
import { errorMessage } from '../utils/apiError'

const MAX_ATTEMPTS = 5
const RETRY_DELAY_MS = 1500

// Stripe sends the buyer here after paying (successUrl). confirm-payment is safe to repeat, and
// can answer PAYMENT_NOT_CONFIRMED for a moment while Stripe is still recording the payment.
export default function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  const sessionId = params.get('session_id')
  const missingParams = !orderId || !sessionId

  const [state, setState] = useState({ phase: 'checking', order: null, message: '' })

  useEffect(() => {
    if (missingParams) return undefined
    let cancelled = false
    let timer

    async function attempt(n) {
      try {
        const { data: order } = await confirmPayment(orderId, sessionId)
        if (!cancelled) setState({ phase: 'done', order, message: '' })
      } catch (err) {
        if (cancelled) return
        const code = err.response?.data?.error?.code
        if (code === 'PAYMENT_NOT_CONFIRMED' && n < MAX_ATTEMPTS) {
          timer = setTimeout(() => attempt(n + 1), RETRY_DELAY_MS)
        } else {
          setState({
            phase: 'failed',
            order: null,
            message: errorMessage(err, 'Chưa xác nhận được thanh toán.'),
          })
        }
      }
    }
    attempt(1)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [orderId, sessionId, missingParams])

  let body
  if (missingParams) {
    body = <Message tone="error" title="Liên kết không hợp lệ" text="Thiếu mã đơn hàng hoặc mã phiên thanh toán." />
  } else if (state.phase === 'checking') {
    body = <Message title="Đang xác nhận thanh toán..." text="Vui lòng chờ trong giây lát, đừng đóng trang." />
  } else if (state.phase === 'failed') {
    body = (
      <Message
        tone="error"
        title="Chưa xác nhận được thanh toán"
        text={`${state.message} Nếu bạn đã bị trừ tiền, đơn sẽ tự cập nhật sau ít phút.`}
      />
    )
  } else if (state.order.status === 'REFUNDED') {
    body = (
      <Message tone="error" title="Đơn đã hết hạn" text="Đơn đã hết hạn, tiền đã được hoàn lại cho bạn." />
    )
  } else {
    body = (
      <Message
        title="Thanh toán thành công"
        text={`Đơn hàng của bạn đã được ghi nhận. Tổng tiền: ${Number(state.order.totalAmount).toLocaleString('vi-VN')} đ.`}
      />
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      {body}
      <Link
        to="/products"
        className="mt-8 inline-block px-6 py-2.5 rounded bg-ink text-white text-sm font-medium hover:bg-ink-soft transition-colors"
      >
        Tiếp tục mua sắm
      </Link>
    </div>
  )
}

function Message({ title, text, tone }) {
  return (
    <>
      <h1 className={`text-2xl font-bold ${tone === 'error' ? 'text-red-700' : 'text-ink'}`}>{title}</h1>
      <p className="mt-3 text-sm text-gray-600">{text}</p>
    </>
  )
}
