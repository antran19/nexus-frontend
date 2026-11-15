import { useEffect, useState } from 'react'
import { getAdjustments, getPenalties } from '../api/users'
import { getReputation } from '../api/ratings'
import AdjustReputationForm from './AdjustReputationForm'
import { formatDelta, MAX_SCORE, NORMAL_FROM, totalPenaltyPoints, TRUSTED_FROM, TRUST_NOTE } from '../utils/adminUsers'
import { reputationSummary, TRUST_LABEL } from '../utils/ratings'

const when = (value) => new Date(value).toLocaleString('vi-VN')

const LEVEL_COLOR = { LOW: 'bg-red-500', NORMAL: 'bg-amber-500', TRUSTED: 'bg-green-600' }

// The reputation of one person: the score with its level, what the ratings say, the automatic penalties and, for an
// admin, the manual changes and the form to make one. The score is read from the server each time the panel opens
// and again after an adjustment (the old numbers stay on screen until the new ones arrive). A part the person
// looking may not see is left out, not shown as an error.
export default function UserReputationPanel({ userId, seesAdjustments }) {
  const [reloads, setReloads] = useState(0)
  const [state, setState] = useState({ forKey: null, status: 'loading', reputation: null, penalties: null, adjustments: null })
  const key = `${userId}:${reloads}`

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      getReputation(userId),
      getPenalties(userId),
      seesAdjustments ? getAdjustments(userId) : Promise.resolve(null),
    ]).then(([reputation, penalties, adjustments]) => {
      if (cancelled) return
      if (reputation.status === 'rejected') {
        setState({ forKey: key, status: 'error', reputation: null, penalties: null, adjustments: null })
        return
      }
      setState({
        forKey: key,
        status: 'ready',
        reputation: reputation.value.data,
        penalties: penalties.status === 'fulfilled' ? penalties.value.data : null,
        adjustments: adjustments.status === 'fulfilled' && adjustments.value ? adjustments.value.data : null,
      })
    })
    return () => {
      cancelled = true
    }
  }, [userId, seesAdjustments, key])

  if (state.forKey === null) return <p role="status" className="text-sm text-gray-500">Đang tải uy tín...</p>
  if (state.status === 'error') return <p role="alert" className="text-sm text-red-600">Không tải được điểm uy tín của người này.</p>

  const { reputation, penalties, adjustments } = state
  const level = reputation.trustLevel
  const percent = Math.max(0, Math.min(100, (reputation.score / MAX_SCORE) * 100))

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-gray-700">
          Điểm uy tín: <strong className="text-lg text-gray-900">{reputation.score}</strong> / {MAX_SCORE}
        </p>
        {TRUST_LABEL[level] && <span className="text-xs border rounded-full px-3 py-1">{TRUST_LABEL[level]}</span>}
      </div>
      <div className="relative mt-2 h-2 rounded bg-gray-200" role="img" aria-label={`Điểm ${reputation.score} trên ${MAX_SCORE}`}>
        <div className={`h-2 rounded ${LEVEL_COLOR[level] ?? 'bg-gray-400'}`} style={{ width: `${percent}%` }} />
        <span className="absolute top-0 h-2 w-px bg-gray-500" style={{ left: `${NORMAL_FROM}%` }} aria-hidden="true" />
        <span className="absolute top-0 h-2 w-px bg-gray-500" style={{ left: `${TRUSTED_FROM}%` }} aria-hidden="true" />
      </div>
      <p className="mt-2 text-xs text-gray-600">{TRUST_NOTE[level]}</p>
      <p className="mt-1 text-xs text-gray-500">Đánh giá từ người mua và bán: {reputationSummary(reputation)}</p>
      <p className="mt-1 text-xs text-gray-500">
        Mức uy tín được ghi vào mã đăng nhập, nên điểm mới chỉ có tác dụng khi người này đăng nhập lại.
      </p>

      {seesAdjustments && (
        <AdjustReputationForm userId={userId} currentScore={reputation.score} onApplied={() => setReloads((n) => n + 1)} />
      )}

      <h3 className="mt-5 text-sm font-medium text-gray-900">Hình phạt tự động</h3>
      {penalties === null && <p className="mt-1 text-xs text-gray-500">Bạn không có quyền xem hình phạt.</p>}
      {penalties && penalties.length === 0 && <p className="mt-1 text-xs text-gray-500">Chưa có hình phạt nào.</p>}
      {penalties && penalties.length > 0 && (
        <>
          <p className="mt-1 text-xs text-gray-500">{penalties.length} lần, tổng cộng trừ {totalPenaltyPoints(penalties)} điểm.</p>
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {penalties.map((penalty) => (
              <li key={penalty.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span className="text-gray-800">{penalty.reason}</span>
                <span className="text-gray-500">
                  <strong className="text-red-600">{formatDelta(-penalty.points)}</strong> · {when(penalty.appliedAt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {seesAdjustments && (
        <>
          <h3 className="mt-5 text-sm font-medium text-gray-900">Lịch sử chỉnh điểm</h3>
          {adjustments === null && <p className="mt-1 text-xs text-gray-500">Không tải được lịch sử chỉnh điểm.</p>}
          {adjustments && adjustments.length === 0 && <p className="mt-1 text-xs text-gray-500">Chưa có lần chỉnh điểm nào.</p>}
          {adjustments && adjustments.length > 0 && (
            <ul className="mt-2 divide-y divide-gray-100 text-sm">
              {adjustments.map((adjustment) => (
                <li key={adjustment.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                  <span className="text-gray-800">{adjustment.reason}</span>
                  <span className="text-gray-500">
                    <strong className={adjustment.delta > 0 ? 'text-green-700' : 'text-red-600'}>{formatDelta(adjustment.delta)}</strong>
                    {' '}· bởi #{String(adjustment.adminId).slice(0, 8)} · {when(adjustment.appliedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
