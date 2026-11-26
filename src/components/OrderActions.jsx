import { useState } from 'react'
import GhnShippingFields from './GhnShippingFields'
import { cancelOrder, createCheckoutSession, setPaymentMethod, setShippingAddress } from '../api/orders'
import {
  addressBody, addressFieldErrors, canCancel, canPay, EMPTY_ADDRESS, needsAddress, orderActionError, paymentUrls,
  validateAddress,
} from '../utils/myOrders'
import { canChooseCash, CARD, CASH, isCash, paymentChoiceError } from '../utils/paymentMethod'

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
  const [shipping, setShipping] = useState({ ready: false, fields: {} })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const isSingleSeller = Boolean(order.items?.[0]?.sellerId)
    && order.items.every((item) => item.sellerId === order.items[0].sellerId)
  const supplementGhnAddress = isSingleSeller && order.status === 'PAID' && !order.shippedAt
    && order.shippingAddress && !order.shippingAddress.districtId
  if (!canPay(order) && !supplementGhnAddress) return null

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
    if ((isSingleSeller && !shipping.ready) || (supplementGhnAddress && !shipping.fields.districtId)) return
    const destination = { ...address, city: shipping.city ?? address.city }
    const found = validateAddress(destination)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    onNotice(null)
    try {
      const { data: updated } = await setShippingAddress(order.id, { ...addressBody(destination), ...shipping.fields })
      onChanged(updated)
      if (supplementGhnAddress) {
        setMode('idle')
        setBusy(false)
        onNotice({ kind: 'success', text: 'Đã bổ sung địa chỉ GHN cho đơn hàng.' })
        return
      }
      await startPayment()
    } catch (err) {
      const byField = addressFieldErrors(err)
      if (Object.keys(byField).length > 0) setErrors(byField)
      else fail(err, 'Không lưu được địa chỉ hoặc mở trang thanh toán. Vui lòng thử lại.')
      setBusy(false)
    }
  }

  // Switches between card and cash. The server decides whether cash is allowed (one seller, an address) and says why not.
  async function chooseMethod(method) {
    setBusy(true)
    onNotice(null)
    try {
      const { data: updated } = await setPaymentMethod(order.id, method)
      onChanged(updated)
      onNotice({
        kind: 'success',
        text: method === CASH ? 'Đã chọn thanh toán tiền mặt khi nhận hàng.' : 'Đã chuyển sang thanh toán thẻ.',
      })
    } catch (err) {
      const code = err?.response?.data?.error?.code
      onNotice({ kind: 'error', text: paymentChoiceError(err, 'Không đổi được phương thức thanh toán. Vui lòng thử lại.') })
      if (code === 'ORDER_NOT_AWAITING_PAYMENT' || code === 'ORDER_NOT_FOUND') onStale()
    } finally {
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
                  value={name === 'city' ? shipping.city ?? address[name] : address[name]}
                  readOnly={name === 'city' && Boolean(shipping.city)}
                  maxLength={name === 'recipientName' ? 100 : undefined}
                  aria-invalid={Boolean(errors[name])}
                  onChange={(e) => setAddress((current) => ({ ...current, [name]: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                {errors[name] && <span className="text-xs text-red-600">{errors[name]}</span>}
              </label>
            ))}
          </div>
          {isSingleSeller && <GhnShippingFields quantity={order.items.reduce((total, item) => total + item.quantity, 0)}
            onChange={setShipping} showFee={!supplementGhnAddress}
            inputClass="w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm" />}
          {!supplementGhnAddress && shipping.fields.quotedFee != null && <p className="text-sm font-medium text-cocoa">
            Tổng thanh toán {(Number(order.totalAmount) - Number(order.shippingAddress?.shippingFee ?? 0)
              + Number(shipping.fields.quotedFee)).toLocaleString('vi-VN')} đ
          </p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={(isSingleSeller && !shipping.ready) || (supplementGhnAddress && !shipping.fields.districtId)}
              className="bg-brand text-white rounded px-4 py-2 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
              {busy ? 'Đang xử lý...' : supplementGhnAddress ? 'Lưu địa chỉ GHN' : 'Lưu địa chỉ và thanh toán'}
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

  if (supplementGhnAddress) {
    return <button type="button" className="mt-3 rounded border border-tray px-3 py-2 text-sm"
      onClick={() => { setAddress(addressBody(order.shippingAddress)); setMode('address') }}>
      Bổ sung địa chỉ GHN
    </button>
  }

  const cash = isCash(order)

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {cash && (
        <p role="status" className="basis-full text-sm text-gray-700">
          Bạn trả tiền mặt khi nhận hàng. Đơn chuyển sang đã thanh toán khi người bán xác nhận đã nhận tiền.
        </p>
      )}
      {cash ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => chooseMethod(CARD)}
          className="bg-brand text-white rounded px-4 py-1.5 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          Chuyển sang thanh toán thẻ
        </button>
      ) : needsAddress(order) ? (
        <button
          type="button"
          onClick={() => { onNotice(null); setMode('address') }}
          className="bg-brand text-white rounded px-4 py-1.5 text-sm hover:bg-brand-dark transition-colors"
        >
          Nhập địa chỉ và thanh toán
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={pay}
          className="bg-brand text-white rounded px-4 py-1.5 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {busy ? 'Đang mở thanh toán...' : 'Thanh toán'}
        </button>
      )}
      {!cash && canChooseCash(order) && !needsAddress(order) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => chooseMethod(CASH)}
          className="border border-gray-300 text-gray-700 rounded px-4 py-1.5 text-sm hover:border-brand hover:text-brand disabled:opacity-50"
        >
          Trả tiền mặt khi nhận hàng
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
