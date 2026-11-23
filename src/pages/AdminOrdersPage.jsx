import { useCallback, useEffect, useState } from 'react'
import { createReturnRequest, getAllOrders, refundOrder } from '../api/orders'
import PageHero from '../components/PageHero'
import ReturnRequestsPanel from '../components/ReturnRequestsPanel'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/apiError'
import {
  buildOrderQuery, canRefund, canRequestReturn, filterStaffOrders, hasNextPage, isStaff, matchesSearch, PAYMENT_FILTERS,
  MAX_REFUND_REASON_LENGTH, refundDetails, refundErrorMessage, refundNextStep, replaceOrder, returnErrorMessage, STAFF_TABS, validateDays, validateReason,
} from '../utils/adminOrders'
import { orderState } from '../utils/myOrders'
import { addressLine } from '../utils/sellerOrders'

const money = (value) => `${Number(value).toLocaleString('vi-VN')} đ`
const when = (value) => new Date(value).toLocaleString('vi-VN')

// Staff: every order of every buyer. A paid order can be refunded here; the money goes back through the payment
// provider. The reason is required and is kept with the refund.
export default function AdminOrdersPage() {
  const { user } = useAuth()
  const staff = isStaff(user)
  const [section, setSection] = useState('ORDERS') // ORDERS | RETURNS
  const [tab, setTab] = useState('PAID')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [fromDay, setFromDay] = useState('')
  const [toDay, setToDay] = useState('')
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', orders: [], received: 0, message: '' })
  const [refunding, setRefunding] = useState(null) // { id, reason, error }
  const [returning, setReturning] = useState(null) // { id, reason, error }
  const [returnsKey, setReturnsKey] = useState(0)
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!staff || validateDays(fromDay, toDay)) return undefined
    let cancelled = false
    getAllOrders(buildOrderQuery({ tab, paymentMethod, fromDay, toDay, page }))
      .then(({ data }) => {
        const orders = Array.isArray(data) ? data : []
        if (!cancelled) setState({ status: 'ready', orders, received: orders.length, message: '' })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', orders: [], received: 0, message: errorMessage(err, 'Không tải được danh sách đơn, vui lòng thử lại.') })
      })
    return () => {
      cancelled = true
    }
  }, [staff, attempt, tab, paymentMethod, fromDay, toDay, page])

  // Any change of the filters starts again from the first page.
  function choose(setter) {
    return (value) => {
      setter(value)
      setPage(0)
      setState((current) => ({ ...current, status: 'loading' }))
    }
  }
  const chooseTab = choose(setTab)
  const choosePayment = choose(setPaymentMethod)
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

  async function refund(order) {
    const problem = validateReason(refunding?.reason, MAX_REFUND_REASON_LENGTH)
    if (problem) {
      setRefunding((current) => ({ ...current, error: problem }))
      return
    }
    setBusyId(order.id)
    setNotice(null)
    try {
      const { data } = await refundOrder(order.id, refunding.reason.trim())
      setState((current) => ({ ...current, orders: replaceOrder(current.orders, data) }))
      setNotice({ kind: 'success', text: `Đã hoàn tiền đơn #${order.id.slice(0, 8)}. ${refundNextStep(data)}` })
      setRefunding(null)
    } catch (err) {
      const text = refundErrorMessage(err)
      setNotice({ kind: 'error', text })
      setRefunding(null)
      if (err?.response?.data?.error?.code) reload()
    } finally {
      setBusyId('')
    }
  }

  async function openReturn(order) {
    const problem = validateReason(returning?.reason)
    if (problem) {
      setReturning((current) => ({ ...current, error: problem }))
      return
    }
    setBusyId(order.id)
    setNotice(null)
    try {
      await createReturnRequest(order.id, returning.reason.trim())
      setReturnsKey((value) => value + 1)
      setNotice({ kind: 'success', text: `Đã mở yêu cầu trả hàng cho đơn #${order.id.slice(0, 8)}. Xem và xử lý ở mục "Trả hàng".` })
      setReturning(null)
    } catch (err) {
      setNotice({ kind: 'error', text: returnErrorMessage(err) })
      setReturning(null)
    } finally {
      setBusyId('')
    }
  }

  if (!staff) {
    return (
      <>
        <PageHero eyebrow="Quản trị" title="Quản lý đơn hàng" />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p role="alert" className="text-sm text-gray-700">Chỉ quản trị viên hoặc nhân viên hỗ trợ mới xem được trang này.</p>
        </div>
      </>
    )
  }

  const daysProblem = validateDays(fromDay, toDay)
  const shown = filterStaffOrders(state.orders, tab).filter((order) => matchesSearch(order, search))

  return (
    <>
      <PageHero eyebrow="Quản trị" title="Quản lý đơn hàng" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div role="tablist" aria-label="Mục quản lý" className="mb-6 flex gap-6 border-b border-gray-200">
          {[['ORDERS', 'Đơn hàng'], ['RETURNS', 'Trả hàng']].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={section === value}
              onClick={() => { setSection(value); setNotice(null) }}
              className={`pb-2 text-sm font-medium border-b-2 -mb-px ${section === value ? 'border-brand text-cocoa' : 'border-transparent text-gray-500 hover:text-cocoa'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {section === 'RETURNS' ? <ReturnRequestsPanel reloadKey={returnsKey} /> : <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Trạng thái đơn" className="flex flex-wrap gap-2">
            {STAFF_TABS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                role="tab"
                aria-selected={tab === entry.value}
                onClick={() => chooseTab(entry.value)}
                className={`text-sm rounded-full border px-4 py-1.5 ${tab === entry.value ? 'bg-brand text-white border-brand' : 'border-gray-300 text-gray-700 hover:border-brand'}`}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, người mua, phiên..."
            aria-label="Tìm đơn"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-full sm:w-72"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm text-gray-700">
          <select
            aria-label="Cách thanh toán"
            value={paymentMethod}
            onChange={(e) => choosePayment(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 bg-white"
          >
            {PAYMENT_FILTERS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
          </select>
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
          {(paymentMethod || fromDay || toDay) && (
            <button type="button" onClick={() => { choosePayment(''); setFromDay(''); setToDay('') }} className="text-sm underline text-gray-600 pb-2">
              Xóa lọc
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
        {state.status === 'ready' && shown.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">
            {state.received === 0 ? 'Không có đơn nào khớp bộ lọc.' : 'Trang này không có đơn nào ở mục này, xem trang tiếp theo.'}
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {shown.map((order) => {
            const info = orderState(order)
            const open = refunding?.id === order.id
            return (
              <li key={order.id} className="border border-gray-200 bg-white rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">Đơn #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Người mua #{String(order.buyerId).slice(0, 8)} · đặt lúc {when(order.createdAt)}
                      {order.auctionId && ' · từ phiên đấu giá'}
                    </p>
                  </div>
                  <span className={`text-xs border rounded-full px-3 py-1 ${info.className}`}>{info.label}</span>
                </div>

                <ul className="mt-3 text-sm text-gray-800 divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <li key={item.productId} className="flex justify-between gap-4 py-1.5">
                      <span>{item.productName} × {item.quantity}</span>
                      <span>{money(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-gray-900 text-right">Tổng cộng: <strong>{money(order.totalAmount)}</strong></p>
                <p className="mt-3 text-sm text-gray-600"><span className="text-gray-500">Giao tới: </span>{addressLine(order.shippingAddress)}</p>
                {order.paidAt && <p className="mt-1 text-xs text-gray-500">Đã thanh toán lúc {when(order.paidAt)}</p>}
                {order.shippedAt && <p className="mt-1 text-xs text-green-700">Người bán đã giao lúc {when(order.shippedAt)}</p>}
                {order.status === 'REFUNDED' && <p className="mt-1 text-sm text-gray-700">{refundNextStep(order)}</p>}
                {refundDetails(order) && (
                  <p className="mt-1 text-xs text-gray-500">
                    Lý do hoàn tiền: {refundDetails(order).reason}
                    {refundDetails(order).by && ` · bởi #${refundDetails(order).by.slice(0, 8)}`}
                    {` · lúc ${when(refundDetails(order).at)}`}
                    {refundDetails(order).stripeRefundId && ` · mã Stripe ${refundDetails(order).stripeRefundId}`}
                  </p>
                )}

                {canRefund(order) && !open && (
                  <button
                    type="button"
                    onClick={() => { setNotice(null); setRefunding({ id: order.id, reason: '', error: '' }) }}
                    className="mt-4 border border-red-400 text-red-600 rounded px-4 py-1.5 text-sm hover:bg-red-50"
                  >
                    Hoàn tiền
                  </button>
                )}
                {canRequestReturn(order) && returning?.id !== order.id && (
                  <button
                    type="button"
                    onClick={() => { setNotice(null); setReturning({ id: order.id, reason: '', error: '' }) }}
                    className="mt-4 border border-gray-300 text-gray-700 rounded px-4 py-1.5 text-sm hover:border-brand"
                  >
                    Mở yêu cầu trả hàng
                  </button>
                )}
                {returning?.id === order.id && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); openReturn(order) }}
                    noValidate
                    className="mt-4 border border-gray-200 rounded-lg p-4"
                  >
                    <fieldset disabled={busyId === order.id}>
                      <legend className="text-sm font-medium text-gray-900">Yêu cầu người mua trả hàng</legend>
                      <label className="mt-3 flex flex-col gap-1 text-sm text-gray-700">
                        Lý do trả hàng
                        <textarea
                          value={returning.reason}
                          onChange={(e) => setReturning((current) => ({ ...current, reason: e.target.value, error: '' }))}
                          rows={2}
                          className="border border-gray-300 rounded px-3 py-2"
                          aria-invalid={Boolean(returning.error)}
                        />
                        {returning.error && <span role="alert" className="text-xs text-red-600">{returning.error}</span>}
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button type="submit" className="bg-brand text-white rounded px-4 py-1.5 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
                          {busyId === order.id ? 'Đang gửi...' : 'Mở yêu cầu'}
                        </button>
                        <button type="button" onClick={() => setReturning(null)} className="text-sm text-gray-600 px-3">Hủy</button>
                      </div>
                    </fieldset>
                  </form>
                )}
                {open && (
                  <form
                    onSubmit={(e) => { e.preventDefault(); refund(order) }}
                    noValidate
                    className="mt-4 border border-gray-200 rounded-lg p-4"
                  >
                    <fieldset disabled={busyId === order.id}>
                      <legend className="text-sm font-medium text-gray-900">Hoàn {money(order.totalAmount)} cho người mua?</legend>
                      <p className="text-xs text-gray-500 mt-1">Tiền được hoàn qua cổng thanh toán và không hoàn tác được.</p>
                      <label className="mt-3 flex flex-col gap-1 text-sm text-gray-700">
                        Lý do hoàn tiền
                        <textarea
                          value={refunding.reason}
                          onChange={(e) => setRefunding((current) => ({ ...current, reason: e.target.value, error: '' }))}
                          maxLength={MAX_REFUND_REASON_LENGTH + 20}
                          rows={2}
                          className="border border-gray-300 rounded px-3 py-2"
                          aria-invalid={Boolean(refunding.error)}
                        />
                        {refunding.error && <span role="alert" className="text-xs text-red-600">{refunding.error}</span>}
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button type="submit" className="bg-brand text-white rounded px-4 py-1.5 text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
                          {busyId === order.id ? 'Đang hoàn tiền...' : 'Xác nhận hoàn tiền'}
                        </button>
                        <button type="button" onClick={() => setRefunding(null)} className="text-sm text-gray-600 px-3">Hủy</button>
                      </div>
                    </fieldset>
                  </form>
                )}
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
        </>}
      </div>
    </>
  )
}
