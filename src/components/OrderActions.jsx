import { useState } from 'react'
import { cancelOrder, createCheckoutSession, setShippingAddress } from '../api/orders'
import {
  addressBody, addressFieldErrors, canCancel, canPay, EMPTY_ADDRESS, needsAddress, orderActionError, paymentUrls,
  validateAddress,
} from '../utils/myOrders'

const FIELDS = [
  ['recipientName', 'Người nhận', 'text'],
  ['phone', 'Số điện thoại', 'tel'],
  ['addressLine', 'Địa chỉ', 'text'],
  ['city', 'Tỉnh / thành phố', 'text'],
]

const STALE = ['ORDER_NOT_AWAITING_PAYMENT', 'ORDER_NOT_CANCELLABLE', 'ORDER_NOT_FOUND']

// What the buyer can do with an order that is waiting for payment: pay it, or cancel it. An order won at an
// auction has no address yet, and the server will not start a payment without one, so the address comes first.
// onChanged(order) gets the order the server answered; onStale() asks for a reload when the order had already
// changed; onNotice({ kind, text }) is the line shown above the list.
export default function OrderActions({ order, onChanged, onStale, onNotice }) {
  const [mode, setMode] = useState('idle')
  const [address, setAddress] = useState(EMPTY_ADDRESS)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (!canPay(order)) return null

  function fail(err, fallback) {
    const code = err?.response?.data?.error?.code
    onNotice({ kind: 'error', text: orderActionError(err, fallback) })
    if (STALE.includes(code)) onStale()
  }

  // Opens Stripe for this order. The page is left on purpose: Stripe sends the buyer back to /payment/success.
  async function startPayment() {
    const { successUrl, cancelUrl } = paymentUrls(order.id, window.location.origin)
    const { data: session } = await createCheckoutSession(order.id, successUrl, cancelUrl)
    window.location.assign(session.checkoutUrl)
  }

  async function pay() {
    setBusy(true)
    onNotice(null)
    try {
      await startPayment()
    } catch (err) {
      fail(err, 'Không mở được trang thanh toán. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  async function saveAddressAndPay(event) {
    event.preventDefault()
    const found = validateAddress(address)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    onNotice(null)
    try {
      const { data: updated } = await setShippingAddress(order.id, addressBody(address))
      onChanged(updated)
      await startPayment()
    } catch (err) {
      const byField = addressFieldErrors(err)
      if (Object.keys(byField).length > 0) setErrors(byField)
      else fail(err, 'Không lưu được địa chỉ hoặc mở trang thanh toán. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  async function cancel() {
    setBusy(true)
    onNotice(null)
    try {
      const { data: updated } = await cancelOrder(order.id)
      onChanged(updated)
      onNotice({ kind: 'success', text: `Đã hủy đơn #${order.id.slice(0, 8)}.` })
    } catch (err) {
      fail(err, 'Không hủy được đơn. Vui lòng thử lại.')
    } finally {
      setBusy(false)
      setMode('idle')
    }
  }

  if (mode === 'address') {
    return (
      <form onSubmit={saveAddressAndPay} noValidate className="mt-4 border border-gray-200 rounded-lg p-4">
        <fieldset disabled={busy}>
          <legend className="text-sm font-medium text-gray-900">Địa chỉ giao hàng</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([name, label, type]) => (
              <label key={name} className="flex flex-col gap-1 text-sm text-gray-700">
                {label}
                <input
                  type={type}
                  value={address[name]}
                  maxLength={name === 'recipientName' ? 100 : undefined}
                  aria-invalid={Boolean(errors[name])}
                  onChange={(e) => setAddress((current) => ({ ...current, [name]: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                {errors[name] && <span className="text-xs text-red-600">{errors[name]}</span>}
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="bg-ink text-white rounded px-4 py-2 text-sm hover:bg-gold hover:text-ink transition-colors disabled:opacity-50">
              {busy ? 'Đang xử lý...' : 'Lưu địa chỉ và thanh toán'}
            </button>
            <button type="button" onClick={() => setMode('idle')} className="text-sm text-gray-600 px-3">Quay lại</button>
          </div>
        </fieldset>
      </form>
    )
  }

  if (mode === 'cancel') {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-700">
          {order.auctionId ? 'Hủy đơn này nghĩa là bạn bỏ phiên đã thắng. Bạn chắc chứ?' : 'Bạn chắc muốn hủy đơn này?'}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={cancel}
          className="border border-red-400 text-red-600 rounded px-4 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50"
        >
          {busy ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
        </button>
        <button type="button" disabled={busy} onClick={() => setMode('idle')} className="text-sm text-gray-600 px-2">Không hủy</button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {needsAddress(order) ? (
        <button
          type="button"
          onClick={() => { onNotice(null); setMode('address') }}
          className="bg-ink text-white rounded px-4 py-1.5 text-sm hover:bg-gold hover:text-ink transition-colors"
        >
          Nhập địa chỉ và thanh toán
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={pay}
          className="bg-ink text-white rounded px-4 py-1.5 text-sm hover:bg-gold hover:text-ink transition-colors disabled:opacity-50"
        >
          {busy ? 'Đang mở thanh toán...' : 'Thanh toán'}
        </button>
      )}
      {canCancel(order) && (
        <button
          type="button"
          onClick={() => { onNotice(null); setMode('cancel') }}
          className="border border-gray-300 text-gray-700 rounded px-4 py-1.5 text-sm hover:border-red-400 hover:text-red-600"
        >
          Hủy đơn
        </button>
      )}
    </div>
  )
}
