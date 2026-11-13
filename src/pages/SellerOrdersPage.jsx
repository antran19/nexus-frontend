import { useCallback, useEffect, useState } from 'react'
import { getSellingOrders } from '../api/orders'
import PageHero from '../components/PageHero'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/apiError'
import { isSeller } from '../utils/mySelling'
import {
  addressLine, countByTab, filterOrders, myItems, myTotal, ORDER_TABS, STATUS_LABEL,
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

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((value) => value + 1)
  }, [])

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
              className={`text-sm rounded-full border px-4 py-1.5 ${tab === entry.value ? 'bg-ink text-white border-ink' : 'border-gray-300 text-gray-700 hover:border-gold'}`}
            >
              {entry.label}
              {state.status === 'ready' && <span className="ml-1.5 opacity-70">{counts[entry.value]}</span>}
            </button>
          ))}
        </div>

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
              {order.shippedAt && <p className="mt-1 text-sm text-green-700">Đã giao lúc {when(order.shippedAt)}</p>}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
