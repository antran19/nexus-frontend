import { useCallback, useEffect, useState } from 'react'
import { approveSellerRequest, listSellerRequests, rejectSellerRequest } from '../api/sellerRequests'
import { getUserById } from '../api/users'
import PageHero from '../components/PageHero'
import { useAuth } from '../context/AuthContext'
import { displayName, isAdmin, removeRequest, reviewErrorMessage, STATUS_LABEL, STATUS_TABS } from '../utils/sellerRequests'

const BADGE = {
  PENDING: 'text-amber-700 border-amber-300 bg-amber-50',
  APPROVED: 'text-green-700 border-green-300 bg-green-50',
  REJECTED: 'text-red-700 border-red-300 bg-red-50',
}

// Admin: the people who asked to become sellers. Approving changes the person's role to SELLER (they sign in
// again to use it); the list shows who asked by name and email, looked up one by one.
export default function SellerRequestsAdminPage() {
  const { user } = useAuth()
  const admin = isAdmin(user)
  const [status, setStatus] = useState('PENDING')
  const [attempt, setAttempt] = useState(0)
  // forStatus tells which tab the data belongs to, so a tab change shows "loading" without setting state in an effect
  const [data, setData] = useState({ forStatus: null, failed: false, items: [], people: {} })
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!admin) return undefined
    let cancelled = false
    listSellerRequests(status)
      .then(async ({ data: items }) => {
        const list = Array.isArray(items) ? items : []
        const ids = [...new Set(list.map((item) => item.userId))]
        const found = await Promise.allSettled(ids.map((id) => getUserById(id)))
        const people = {}
        found.forEach((result, index) => {
          if (result.status === 'fulfilled') people[ids[index]] = result.value.data
        })
        if (!cancelled) setData({ forStatus: status, failed: false, items: list, people })
      })
      .catch(() => {
        if (!cancelled) setData({ forStatus: status, failed: true, items: [], people: {} })
      })
    return () => {
      cancelled = true
    }
  }, [admin, status, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  async function review(item, approve) {
    setBusyId(item.id)
    setNotice(null)
    try {
      await (approve ? approveSellerRequest(item.id) : rejectSellerRequest(item.id))
      setData((current) => ({ ...current, items: removeRequest(current.items, item.id) }))
      setNotice({ kind: 'success', text: `${approve ? 'Đã duyệt' : 'Đã từ chối'} yêu cầu của ${displayName(data.people[item.userId], item.userId)}.` })
    } catch (err) {
      setNotice({ kind: 'error', text: reviewErrorMessage(err) })
      reload()
    } finally {
      setBusyId('')
    }
  }

  if (!admin) {
    return (
      <>
        <PageHero eyebrow="Quản trị" title="Yêu cầu làm người bán" />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p role="alert" className="text-sm text-gray-700">Chỉ quản trị viên mới xem được trang này.</p>
        </div>
      </>
    )
  }

  const loading = data.forStatus !== status
  const shown = loading ? [] : data.items

  return (
    <>
      <PageHero eyebrow="Quản trị" title="Yêu cầu làm người bán" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div role="tablist" aria-label="Trạng thái yêu cầu" className="flex gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => { setStatus(tab.value); setNotice(null) }}
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
        {!loading && data.failed && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            Không tải được danh sách.{' '}
            <button type="button" onClick={reload} className="underline">Thử lại</button>
          </p>
        )}
        {!loading && !data.failed && shown.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">Không có yêu cầu nào ở mục này.</p>
        )}

        <ul className="mt-6 space-y-3">
          {shown.map((item) => (
            <li key={item.id} className="border border-gray-200 bg-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{displayName(data.people[item.userId], item.userId)}</p>
                <p className="text-xs text-gray-500 mt-1">Gửi lúc {new Date(item.requestedAt).toLocaleString('vi-VN')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs border rounded-full px-3 py-1 ${BADGE[item.status] ?? ''}`}>{STATUS_LABEL[item.status] ?? item.status}</span>
                {item.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => review(item, true)}
                      className="bg-ink text-white rounded px-4 py-1.5 text-sm hover:bg-gold hover:text-ink transition-colors disabled:opacity-50"
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => review(item, false)}
                      className="border border-gray-300 text-gray-700 rounded px-4 py-1.5 text-sm hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
