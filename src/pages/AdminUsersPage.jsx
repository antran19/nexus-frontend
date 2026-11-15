import { useCallback, useEffect, useState } from 'react'
import { getUsers } from '../api/users'
import PageHero from '../components/PageHero'
import UserReputationPanel from '../components/UserReputationPanel'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../utils/apiError'
import { canAdjust, countByRole, filterUsers, newestFirst, ROLE_LABEL, ROLE_TABS } from '../utils/adminUsers'
import { isStaff } from '../utils/adminOrders'

const ROLE_BADGE = {
  BUYER: 'text-gray-700 border-gray-300 bg-gray-50',
  SELLER: 'text-blue-700 border-blue-300 bg-blue-50',
  ADMIN: 'text-amber-700 border-amber-300 bg-amber-50',
  SUPPORT_STAFF: 'text-green-700 border-green-300 bg-green-50',
}

// Staff: every account with its role. From here the staff looks at a person's reputation (next to each account) and,
// for an admin, changes it.
export default function AdminUsersPage() {
  const { user } = useAuth()
  const staff = isStaff(user)
  const [role, setRole] = useState('ALL')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ status: 'loading', users: [], message: '' })

  useEffect(() => {
    if (!staff) return undefined
    let cancelled = false
    getUsers()
      .then(({ data }) => {
        if (!cancelled) setState({ status: 'ready', users: newestFirst(Array.isArray(data) ? data : []), message: '' })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', users: [], message: errorMessage(err, 'Không tải được danh sách người dùng, vui lòng thử lại.') })
      })
    return () => {
      cancelled = true
    }
  }, [staff, attempt])

  const reload = useCallback(() => {
    setState((current) => ({ ...current, status: 'loading' }))
    setAttempt((value) => value + 1)
  }, [])

  if (!staff) {
    return (
      <>
        <PageHero eyebrow="Quản trị" title="Người dùng và uy tín" />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p role="alert" className="text-sm text-gray-700">Chỉ quản trị viên hoặc nhân viên hỗ trợ mới xem được trang này.</p>
        </div>
      </>
    )
  }

  const counts = countByRole(state.users)
  const shown = filterUsers(state.users, role, search)

  return (
    <>
      <PageHero eyebrow="Quản trị" title="Người dùng và uy tín" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Lọc theo vai trò" className="flex flex-wrap gap-2">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={role === tab.value}
                onClick={() => setRole(tab.value)}
                className={`text-sm rounded-full border px-4 py-1.5 ${role === tab.value ? 'bg-ink text-white border-ink' : 'border-gray-300 text-gray-700 hover:border-gold'}`}
              >
                {tab.label}
                {state.status === 'ready' && <span className="ml-1.5 opacity-70">{counts[tab.value]}</span>}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email hoặc mã..."
            aria-label="Tìm người dùng"
            className="border border-gray-300 rounded px-3 py-2 text-sm w-full sm:w-72"
          />
        </div>

        {state.status === 'loading' && <p role="status" className="mt-6 text-sm text-gray-500">Đang tải...</p>}
        {state.status === 'error' && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {state.message}{' '}
            <button type="button" onClick={reload} className="underline">Thử lại</button>
          </p>
        )}
        {state.status === 'ready' && shown.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">Không có người dùng nào khớp.</p>
        )}
        {state.status === 'ready' && shown.length > 0 && (
          <p className="mt-6 text-xs text-gray-500">{shown.length} người dùng</p>
        )}

        <ul className="mt-3 space-y-3">
          {shown.map((account) => (
            <li key={account.id} className="border border-gray-200 bg-white rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 break-words">{account.fullName || '(chưa có tên)'}</p>
                  <p className="text-sm text-gray-600 break-all">{account.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mã #{account.id.slice(0, 8)} · tham gia {new Date(account.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <span className={`text-xs border rounded-full px-3 py-1 ${ROLE_BADGE[account.roleCode] ?? 'text-gray-600 border-gray-300'}`}>
                  {ROLE_LABEL[account.roleCode] ?? account.roleCode}
                </span>
              </div>
              <button
                type="button"
                aria-expanded={openId === account.id}
                onClick={() => setOpenId(openId === account.id ? '' : account.id)}
                className="mt-3 text-sm text-gray-700 underline hover:text-gold"
              >
                {openId === account.id ? 'Ẩn uy tín' : 'Xem uy tín'}
              </button>
              {openId === account.id && <UserReputationPanel userId={account.id} seesAdjustments={canAdjust(user)} />}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
