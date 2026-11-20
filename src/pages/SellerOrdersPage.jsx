import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { confirmCashPayment, getCarriers, getSellingOrders, markOrderShipped } from '../api/orders'
import ShipmentTracker from '../components/ShipmentTracker'
import PageHero from '../components/PageHero'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/apiError'
import { canShowInvoice } from '../utils/invoice'
import { isSeller } from '../utils/mySelling'
import { carrierName } from '../utils/shipment'
import { needsCashConfirmation, PAYMENT_LABEL, paymentChoiceError, paymentMethodOf } from '../utils/paymentMethod'
import {
  addressLine, countByTab, filterOrders, myItems, myTotal, ORDER_TABS, replaceOrder, shipErrorMessage, STATUS_LABEL,
} from '../utils/sellerOrders'

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`
const when = (value) => new Date(value).toLocaleString('vi-VN')

const BADGE = {
  AWAITING_PAYMENT: 'text-amber-700 border-amber-300 bg-amber-50',
  PAID: 'text-green-700 border-green-300 bg-green-50',
  CANCELLED: 'text-gray-600 border-gray-300 bg-gray-50',
  REFUNDED: 'text-red-700 border-red-300 bg-red-50',
}

// The orders that hold the signed-in seller's products. Only the seller's own lines are shown; the buyer's
// delivery address is there so the seller knows where to send them.
export default function SellerOrdersPage() {
  const { user } = useAuth()
  const sellerId = user?.sub
  const seller = isSeller(user)
  const [tab, setTab] = useState('TO_SHIP')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', orders: [], message: '' })
  // Shipping is a one-way step, so it asks once more: confirmingId is the order whose button was pressed.
  const [confirmingId, setConfirmingId] = useState('')
  const [cashConfirmingId, setCashConfirmingId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState(null)
  // The shipping companies to choose from; the simulated one is always there, the list from the server replaces it.
  const [carriers, setCarriers] = useState([{ code: 'SIMULATED', name: carrierName('SIMULATED') }])
  const [carrier, setCarrier] = useState('SIMULATED')

  useEffect(() => {
    if (!seller) return undefined
    let cancelled = false
    getSellingOrders()
      .then(({ data }) => {
        if (!cancelled) setState({ status: 'ready', orders: Array.isArray(data) ? data : [], message: '' })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', orders: [], message: errorMessage(err, 'Không tải được danh sách đơn, vui lòng thử lại.') })
      })
    return () => {
      cancelled = true
    }
  }, [seller, attempt])

  useEffect(() => {
    if (!seller) return undefined
    let cancelled = false
    getCarriers()
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data) || !data.length) return
        setCarriers(data)
        setCarrier((current) => (data.some((item) => item.code === current) ? current : data[0].code))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [seller])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((value) => value + 1)
  }, [])

  async function ship(order) {
    setBusyId(order.id)
    setNotice(null)
    try {
      const { data } = await markOrderShipped(order.id, carrier)
      setState((current) => ({ ...current, orders: replaceOrder(current.orders, data) }))
      setNotice({ kind: 'success', text: `Đã gửi hàng đơn #${order.id.slice(0, 8)}${data.shipment?.trackingCode ? `, mã vận đơn ${data.shipment.trackingCode}` : ''}. Người mua sẽ nhận được thông báo.` })
    } catch (err) {
      setNotice({ kind: 'error', text: shipErrorMessage(err) })
      reload()
    } finally {
      setBusyId('')
      setConfirmingId('')
    }
  }

  // "I received the cash": the order becomes PAID, and from then on it is shipped like any other paid order.
  async function confirmCash(order) {
    setBusyId(order.id)
    setNotice(null)
    try {
      const { data } = await confirmCashPayment(order.id)
      setState((current) => ({ ...current, orders: replaceOrder(current.orders, data) }))
      setNotice({ kind: 'success', text: `Đã xác nhận nhận tiền mặt của đơn #${order.id.slice(0, 8)}. Bạn có thể giao hàng.` })
    } catch (err) {
      setNotice({ kind: 'error', text: paymentChoiceError(err, 'Không xác nhận được tiền mặt. Vui lòng thử lại.') })
      reload()
    } finally {
      setBusyId('')
      setCashConfirmingId('')
    }
  }

  if (!seller) {
    return (
      <>
        <PageHero eyebrow="Bán hàng" title="Đơn cần giao" />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p role="alert" className="text-sm text-gray-700">Chỉ tài khoản người bán mới có trang này.</p>
        </div>
      </>
    )
  }

  const counts = countByTab(state.orders)
  const shown = filterOrders(state.orders, tab)

  return (
    <>
      <PageHero eyebrow="Bán hàng" title="Đơn cần giao" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div role="tablist" aria-label="Trạng thái đơn" className="flex flex-wrap gap-2">
          {ORDER_TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={tab === entry.value}
              onClick={() => setTab(entry.value)}
              className={`text-sm rounded-full border px-4 py-1.5 ${tab === entry.value ? 'bg-brand text-white border-brand' : 'border-gray-300 text-gray-700 hover:border-brand'}`}
            >
              {entry.label}
              {state.status === 'ready' && <span className="ml-1.5 opacity-70">{counts[entry.value]}</span>}
            </button>
          ))}
        </div>

        {notice && (
          <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-4 text-sm ${notice.kind === 'error' ? 'text-red-600' : 'text-green-700'}`}>
            {notice.text}
          </p>
        )}

        {state.status === 'loading' && <p role="status" className="mt-6 text-sm text-gray-500">Đang tải...</p>}
        {state.status === 'error' && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {state.message}{' '}
            <button type="button" onClick={reload} className="underline">Thử lại</button>
          </p>
        )}
        {state.status === 'ready' && shown.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">Không có đơn nào ở mục này.</p>
        )}

        <ul className="mt-6 space-y-3">
          {shown.map((order) => (
            <li key={order.id} className="border border-gray-200 bg-white rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">Đơn #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {order.paidAt ? `Thanh toán lúc ${when(order.paidAt)}` : `Tạo lúc ${when(order.createdAt)}`}
                    {order.auctionId && ' · từ phiên đấu giá'}
                  </p>
                </div>
                <span className={`text-xs border rounded-full px-3 py-1 ${BADGE[order.status] ?? ''}`}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <ul className="mt-3 text-sm text-gray-800 divide-y divide-gray-100">
                {myItems(order, sellerId).map((item) => (
                  <li key={item.productId} className="flex justify-between gap-4 py-1.5">
                    <span>{item.productName} × {item.quantity}</span>
                    <span>{money(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-gray-900 text-right">
                Phần của bạn: <strong>{money(myTotal(order, sellerId))}</strong>
              </p>

              <p className="mt-3 text-sm text-gray-600">
                <span className="text-gray-500">Giao tới: </span>{addressLine(order.shippingAddress)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Thanh toán: {PAYMENT_LABEL[paymentMethodOf(order)]}</p>
              <ShipmentTracker order={order} readOnly />
              {canShowInvoice(order) && (
                <Link to={`/me/orders/${order.id}/invoice`} className="mt-2 inline-block text-sm text-brand underline">Xem hóa đơn</Link>
              )}

              {needsCashConfirmation(order) && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <p className="basis-full text-sm text-gray-700">Người mua trả tiền mặt khi nhận hàng. Xác nhận khi bạn đã nhận đủ tiền.</p>
                  {cashConfirmingId === order.id ? (
                    <>
                      <span className="text-sm text-gray-700">Bạn đã nhận {money(myTotal(order, sellerId))} tiền mặt?</span>
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => confirmCash(order)}
                        className="bg-brand text-white rounded px-4 py-1.5 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
                      >
                        {busyId === order.id ? 'Đang xác nhận...' : 'Xác nhận đã nhận tiền'}
                      </button>
                      <button type="button" disabled={busyId === order.id} onClick={() => setCashConfirmingId('')} className="text-sm text-gray-600 px-2">
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setCashConfirmingId(order.id); setNotice(null) }}
                      className="border border-brand text-brand rounded px-4 py-1.5 text-sm hover:bg-brand hover:text-white transition-colors"
                    >
                      Đã nhận tiền mặt
                    </button>
                  )}
                </div>
              )}

              {order.status === 'PAID' && !order.shippedAt && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {confirmingId === order.id ? (
                    <>
                      <span className="text-sm text-gray-700">Gửi hàng cho người mua bằng:</span>
                      <select
                        aria-label="Đơn vị vận chuyển"
                        value={carrier}
                        disabled={busyId === order.id}
                        onChange={(event) => setCarrier(event.target.value)}
                        className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
                      >
                        {carriers.map((item) => <option key={item.code} value={item.code}>{item.name ?? carrierName(item.code)}</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => ship(order)}
                        className="bg-brand text-white rounded px-4 py-1.5 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
                      >
                        {busyId === order.id ? 'Đang gửi...' : 'Xác nhận gửi hàng'}
                      </button>
                      <button type="button" disabled={busyId === order.id} onClick={() => setConfirmingId('')} className="text-sm text-gray-600 px-2">
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setConfirmingId(order.id); setNotice(null) }}
                      className="border border-brand text-brand rounded px-4 py-1.5 text-sm hover:bg-brand hover:text-white transition-colors"
                    >
                      Đánh dấu đã giao
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
