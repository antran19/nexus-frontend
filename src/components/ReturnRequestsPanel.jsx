import { useCallback, useEffect, useState } from 'react'
import { listReturnRequests, receiveReturn, rejectReturn } from '../api/orders'
import { errorMessage } from '../utils/apiError'
import { RETURN_STATUS_LABEL, RETURN_TABS, removeReturn, returnErrorMessage } from '../utils/adminOrders'

const when = (value) => new Date(value).toLocaleString('vi-VN')

const BADGE = {
  REQUESTED: 'text-amber-700 border-amber-300 bg-amber-50',
  RECEIVED: 'text-green-700 border-green-300 bg-green-50',
  REJECTED: 'text-gray-600 border-gray-300 bg-gray-50',
}

// Return requests for orders that were shipped and refunded. "Đã nhận hàng" says the goods came back, which puts
// them back in stock; "Từ chối" closes the request without restocking. Both ask once more because neither can be
// undone. reloadKey changes when a new request is opened on the orders tab, so the list shows it.
export default function ReturnRequestsPanel({ reloadKey }) {
  const [status, setStatus] = useState('REQUESTED')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ forStatus: null, failed: false, message: '', items: [] })
  const [confirming, setConfirming] = useState(null) // { id, action }
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let cancelled = false
    listReturnRequests(status)
      .then(({ data }) => {
        if (!cancelled) setState({ forStatus: status, failed: false, message: '', items: Array.isArray(data) ? data : [] })
      })
      .catch((err) => {
        if (!cancelled) setState({ forStatus: status, failed: true, message: errorMessage(err, 'Không tải được danh sách trả hàng.'), items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [status, attempt, reloadKey])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  async function answer(item, action) {
    setBusyId(item.id)
    setNotice(null)
    try {
      await (action === 'receive' ? receiveReturn(item.id) : rejectReturn(item.id))
      setState((current) => ({ ...current, items: removeReturn(current.items, item.id) }))
      setNotice({
        kind: 'success',
        text: action === 'receive'
          ? `Đã nhận hàng trả về của đơn #${item.orderId.slice(0, 8)}, hàng đã được nhập lại kho.`
          : `Đã từ chối yêu cầu trả hàng của đơn #${item.orderId.slice(0, 8)}.`,
      })
    } catch (err) {
      setNotice({ kind: 'error', text: returnErrorMessage(err) })
      if (err?.response?.data?.error?.code) reload()
    } finally {
      setBusyId('')
      setConfirming(null)
    }
  }

  const loading = state.forStatus !== status

  return (
    <div>
      <div role="tablist" aria-label="Trạng thái yêu cầu trả hàng" className="flex flex-wrap gap-2">
        {RETURN_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => { setStatus(tab.value); setNotice(null); setConfirming(null) }}
            className={`text-sm rounded-full border px-4 py-1.5 ${status === tab.value ? 'bg-ink text-white border-ink' : 'border-gray-300 text-gray-700 hover:border-gold'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-4 text-sm ${notice.kind === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {notice.text}
        </p>
      )}

      {loading && <p role="status" className="mt-6 text-sm text-gray-500">Đang tải...</p>}
      {!loading && state.failed && (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {state.message}{' '}
          <button type="button" onClick={reload} className="underline">Thử lại</button>
        </p>
      )}
      {!loading && !state.failed && state.items.length === 0 && (
        <p className="mt-6 text-sm text-gray-500">Không có yêu cầu trả hàng nào ở mục này.</p>
      )}

      <ul className="mt-6 space-y-3">
        {(loading ? [] : state.items).map((item) => (
          <li key={item.id} className="border border-gray-200 bg-white rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">Đơn #{item.orderId.slice(0, 8)}</p>
                <p className="text-xs text-gray-500 mt-1">Yêu cầu #{item.id.slice(0, 8)} · mở lúc {when(item.createdAt)}</p>
              </div>
              <span className={`text-xs border rounded-full px-3 py-1 ${BADGE[item.status] ?? ''}`}>{RETURN_STATUS_LABEL[item.status] ?? item.status}</span>
            </div>
            <p className="mt-3 text-sm text-gray-800"><span className="text-gray-500">Lý do: </span>{item.reason}</p>
            {item.resolvedAt && <p className="mt-1 text-xs text-gray-500">Xử lý lúc {when(item.resolvedAt)}</p>}

            {item.status === 'REQUESTED' && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {confirming?.id === item.id ? (
                  <>
                    <span className="text-sm text-gray-700">
                      {confirming.action === 'receive' ? 'Hàng đã về tới nơi và sẽ được nhập lại kho?' : 'Từ chối yêu cầu này, không nhập kho?'}
                    </span>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => answer(item, confirming.action)}
                      className="bg-ink text-white rounded px-4 py-1.5 text-sm hover:bg-gold hover:text-ink transition-colors disabled:opacity-50"
                    >
                      {busyId === item.id ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                    <button type="button" disabled={busyId === item.id} onClick={() => setConfirming(null)} className="text-sm text-gray-600 px-2">Hủy</button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setNotice(null); setConfirming({ id: item.id, action: 'receive' }) }}
                      className="bg-ink text-white rounded px-4 py-1.5 text-sm hover:bg-gold hover:text-ink transition-colors"
                    >
                      Đã nhận hàng trả về
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNotice(null); setConfirming({ id: item.id, action: 'reject' }) }}
                      className="border border-gray-300 text-gray-700 rounded px-4 py-1.5 text-sm hover:border-red-400 hover:text-red-600"
                    >
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
