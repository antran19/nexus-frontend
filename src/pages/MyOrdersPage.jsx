import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getMyOrders } from '../api/orders'
import OrderActions from '../components/OrderActions'
import PageHero from '../components/PageHero'
import ShipmentTracker from '../components/ShipmentTracker'
import { errorMessage } from '../utils/apiError'
import { canShowInvoice } from '../utils/invoice'
import { buildMyOrdersQuery, filterMyOrders, ORDER_FILTERS, orderState, searchMyOrders } from '../utils/myOrders'
import { hasNextPage, validateDays } from '../utils/orderQuery'
import { PAYMENT_LABEL, paymentMethodOf } from '../utils/paymentMethod'
import { addressLine, replaceOrder } from '../utils/sellerOrders'

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`
const when = (value) => new Date(value).toLocaleString('vi-VN')

// Everything the signed-in person bought: direct purchases and the auctions they won, newest first.
export default function MyOrdersPage() {
  const location = useLocation()
  const [filter, setFilter] = useState('ALL')
  const [fromDay, setFromDay] = useState('')
  const [toDay, setToDay] = useState('')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', orders: [], received: 0, message: '' })
  // The checkout page can hand over a first line to show (an order placed to be paid in cash).
  const [notice, setNotice] = useState(() => location.state?.notice ?? null)

  useEffect(() => {
    if (validateDays(fromDay, toDay)) return undefined
    let cancelled = false
    getMyOrders(buildMyOrdersQuery({ filter, fromDay, toDay, page }))
      .then(({ data }) => {
        const orders = Array.isArray(data) ? data : []
        if (!cancelled) setState({ status: 'ready', orders, received: orders.length, message: '' })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', orders: [], received: 0, message: errorMessage(err, 'Không tải được đơn hàng, vui lòng thử lại.') })
      })
    return () => {
      cancelled = true
    }
  }, [attempt, filter, fromDay, toDay, page])

  // Any change of the filters starts again from the first page.
  function choose(setter) {
    return (value) => {
      setter(value)
      setPage(0)
      setState((current) => ({ ...current, status: 'loading' }))
    }
  }
  const chooseFilter = choose(setFilter)
  const chooseFromDay = choose(setFromDay)
  const chooseToDay = choose(setToDay)

  function goToPage(next) {
    setPage(next)
    setState((current) => ({ ...current, status: 'loading' }))
  }

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((value) => value + 1)
  }, [])

  // The order the server answered replaces the old one in the list.
  const changed = useCallback((updated) => {
    setState((current) => ({ ...current, orders: replaceOrder(current.orders, updated) }))
  }, [])

  const shown = searchMyOrders(filterMyOrders(state.orders, filter), search)
  const daysProblem = validateDays(fromDay, toDay)
  const filtered = filter !== 'ALL' || Boolean(fromDay) || Boolean(toDay) || page > 0

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
              onClick={() => chooseFilter(entry.value)}
              className={`text-sm rounded-full border px-4 py-1.5 ${filter === entry.value ? 'bg-brand text-white border-brand' : 'border-gray-300 text-gray-700 hover:border-brand'}`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="order-search" className="sr-only">Tìm đơn hàng</label>
          <input
            id="order-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            maxLength={100}
            placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
            className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          {search.trim() && (
            <>
              <span role="status" className="text-sm text-gray-500">{shown.length} đơn phù hợp</span>
              <button type="button" onClick={() => setSearch('')} className="text-sm underline text-gray-700">Xóa tìm kiếm</button>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm text-gray-700">
          <label className="flex flex-col gap-1">
            Từ ngày
            <input type="date" value={fromDay} max={toDay || undefined} onChange={(e) => chooseFromDay(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            Đến ngày
            <input type="date" value={toDay} min={fromDay || undefined} onChange={(e) => chooseToDay(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5" />
          </label>
          {(fromDay || toDay) && (
            <button type="button" onClick={() => { chooseFromDay(''); setToDay('') }} className="text-sm underline text-gray-600 pb-2">
              Xóa lọc ngày
            </button>
          )}
        </div>
        {daysProblem && <p role="alert" className="mt-2 text-sm text-red-600">{daysProblem}</p>}

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
        {state.status === 'ready' && state.orders.length === 0 && filtered && (
          <p className="mt-6 text-sm text-gray-500">Không có đơn nào khớp bộ lọc.</p>
        )}
        {state.status === 'ready' && state.orders.length === 0 && !filtered && (
          <p className="mt-6 text-sm text-gray-600">
            Bạn chưa có đơn hàng nào.{' '}
            <Link to="/products" className="underline text-gray-900">Xem sản phẩm</Link>
          </p>
        )}
        {state.status === 'ready' && state.orders.length > 0 && shown.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">{search.trim() ? 'Không có đơn nào khớp với từ khóa.' : 'Không có đơn nào ở mục này.'}</p>
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
                <p className="mt-1 text-xs text-gray-500">Thanh toán: {PAYMENT_LABEL[paymentMethodOf(order)]}</p>
                {order.paidAt && <p className="mt-1 text-xs text-gray-500">Đã thanh toán lúc {when(order.paidAt)}</p>}
                {canShowInvoice(order) && (
                  <Link to={`/me/orders/${order.id}/invoice`} className="mt-2 inline-block text-sm text-brand underline">Xem hóa đơn</Link>
                )}
                <ShipmentTracker order={order} onChanged={changed} onNotice={setNotice} />

                <OrderActions order={order} onChanged={changed} onStale={reload} onNotice={setNotice} />
              </li>
            )
          })}
        </ul>

        {state.status === 'ready' && (page > 0 || hasNextPage(state.received)) && (
          <nav aria-label="Phân trang" className="mt-6 flex items-center justify-center gap-4 text-sm">
            <button type="button" disabled={page === 0} onClick={() => goToPage(page - 1)}
              className="border border-gray-300 rounded px-4 py-1.5 disabled:opacity-40">
              Trang trước
            </button>
            <span aria-live="polite">Trang {page + 1}</span>
            <button type="button" disabled={!hasNextPage(state.received)} onClick={() => goToPage(page + 1)}
              className="border border-gray-300 rounded px-4 py-1.5 disabled:opacity-40">
              Trang sau
            </button>
          </nav>
        )}
      </div>
    </>
  )
}
