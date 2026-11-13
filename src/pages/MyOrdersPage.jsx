import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyOrders } from '../api/orders'
import PageHero from '../components/PageHero'
import { errorMessage } from '../utils/apiError'
import { filterMyOrders, newestFirst, ORDER_FILTERS, orderState } from '../utils/myOrders'
import { addressLine } from '../utils/sellerOrders'

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`
const when = (value) => new Date(value).toLocaleString('vi-VN')

// Everything the signed-in person bought: direct purchases and the auctions they won, newest first.
export default function MyOrdersPage() {
  const [filter, setFilter] = useState('ALL')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', orders: [], message: '' })

  useEffect(() => {
    let cancelled = false
    getMyOrders()
      .then(({ data }) => {
        if (!cancelled) setState({ status: 'ready', orders: newestFirst(Array.isArray(data) ? data : []), message: '' })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', orders: [], message: errorMessage(err, 'Không tải được đơn hàng, vui lòng thử lại.') })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((value) => value + 1)
  }, [])

  const shown = filterMyOrders(state.orders, filter)

  return (
    <>
      <PageHero eyebrow="Tài khoản" title="Đơn hàng của tôi" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div role="tablist" aria-label="Lọc đơn hàng" className="flex flex-wrap gap-2">
          {ORDER_FILTERS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={filter === entry.value}
              onClick={() => setFilter(entry.value)}
              className={`text-sm rounded-full border px-4 py-1.5 ${filter === entry.value ? 'bg-ink text-white border-ink' : 'border-gray-300 text-gray-700 hover:border-gold'}`}
            >
              {entry.label}
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
        {state.status === 'ready' && state.orders.length === 0 && (
          <p className="mt-6 text-sm text-gray-600">
            Bạn chưa có đơn hàng nào.{' '}
            <Link to="/products" className="underline text-gray-900">Xem sản phẩm</Link>
          </p>
        )}
        {state.status === 'ready' && state.orders.length > 0 && shown.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">Không có đơn nào ở mục này.</p>
        )}

        <ul className="mt-6 space-y-3">
          {shown.map((order) => {
            const info = orderState(order)
            return (
              <li key={order.id} className="border border-gray-200 bg-white rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">Đơn #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Đặt lúc {when(order.createdAt)}
                      {order.auctionId && ' · thắng từ phiên đấu giá'}
                    </p>
                  </div>
                  <span className={`text-xs border rounded-full px-3 py-1 ${info.className}`}>{info.label}</span>
                </div>

                <ul className="mt-3 text-sm text-gray-800 divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <li key={item.productId} className="flex justify-between gap-4 py-1.5">
                      <Link to={`/products/${item.productId}`} className="hover:underline">
                        {item.productName} × {item.quantity}
                      </Link>
                      <span>{money(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-gray-900 text-right">
                  Tổng cộng: <strong>{money(order.totalAmount)}</strong>
                </p>

                <p className="mt-3 text-sm text-gray-600">
                  <span className="text-gray-500">Giao tới: </span>{addressLine(order.shippingAddress)}
                </p>
                {order.paidAt && <p className="mt-1 text-xs text-gray-500">Đã thanh toán lúc {when(order.paidAt)}</p>}
                {order.shippedAt && <p className="mt-1 text-sm text-green-700">Người bán đã giao lúc {when(order.shippedAt)}</p>}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
