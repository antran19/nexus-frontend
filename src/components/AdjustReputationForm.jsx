import { useState } from 'react'
import { adjustReputation } from '../api/users'
import {
  adjustErrorMessage, adjustFieldErrors, adjustmentBody, formatDelta, MAX_REASON_LENGTH, previewScore, trustLevelFor, validateAdjustment,
} from '../utils/adminUsers'
import { TRUST_LABEL } from '../utils/ratings'

// Admin only. Changes a person's score by a whole number (plus or minus) with a reason that is kept in the history.
// The preview uses the same rule as the server (kept between 0 and 100). "Áp dụng" asks once more because the change
// is written to the history and cannot be taken back, only offset by another adjustment. onApplied tells the page to
// reload the reputation shown above.
export default function AdjustReputationForm({ userId, currentScore, onApplied }) {
  const [form, setForm] = useState({ delta: '', reason: '' })
  const [errors, setErrors] = useState({})
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)

  const found = validateAdjustment(form)
  const valid = Object.keys(found).length === 0
  const after = previewScore(currentScore, form.delta)
  const level = trustLevelFor(after)

  function change(field, value) {
    setForm({ ...form, [field]: value })
    setErrors({ ...errors, [field]: undefined })
    setConfirming(false)
    setNotice(null)
  }

  function ask(event) {
    event.preventDefault()
    setErrors(found)
    if (valid) setConfirming(true)
  }

  async function apply() {
    setSubmitting(true)
    setNotice(null)
    try {
      await adjustReputation(userId, adjustmentBody(form))
      setNotice({ kind: 'success', text: 'Đã điều chỉnh điểm. Điểm mới có tác dụng khi người này đăng nhập lại.' })
      setForm({ delta: '', reason: '' })
      setErrors({})
      onApplied?.()
    } catch (err) {
      const fields = adjustFieldErrors(err)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setNotice({ kind: 'error', text: adjustErrorMessage(err) })
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  const inputClass = (field) => `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30 ${errors[field] ? 'border-red-400' : 'border-gray-300 focus:border-brand'}`

  return (
    <form onSubmit={ask} noValidate className="mt-5 rounded-xl border border-tray bg-peach p-4">
      <h3 className="text-sm font-semibold text-cocoa">Điều chỉnh điểm</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <label className="text-sm text-gray-800">
          Thay đổi
          <input
            type="text"
            inputMode="numeric"
            value={form.delta}
            onChange={(e) => change('delta', e.target.value)}
            placeholder="+5 hoặc -10"
            aria-invalid={errors.delta ? 'true' : undefined}
            className={inputClass('delta')}
          />
          {errors.delta && <span role="alert" className="mt-1 block text-xs text-red-600">{errors.delta}</span>}
        </label>
        <label className="text-sm text-gray-800">
          Lý do
          <input
            type="text"
            value={form.reason}
            maxLength={MAX_REASON_LENGTH + 50}
            onChange={(e) => change('reason', e.target.value)}
            placeholder="Ví dụ: đã giải quyết khiếu nại"
            aria-invalid={errors.reason ? 'true' : undefined}
            className={inputClass('reason')}
          />
          {errors.reason && <span role="alert" className="mt-1 block text-xs text-red-600">{errors.reason}</span>}
        </label>
      </div>

      {form.delta.trim() !== '' && !found.delta && (
        <p className="mt-3 text-sm text-gray-700">
          Sau khi áp dụng: {currentScore} {formatDelta(Number(form.delta))} → <strong className="text-cocoa">{after}</strong> / 100
          {' '}({TRUST_LABEL[level] ?? level})
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <span className="text-sm text-gray-700">Ghi vào lịch sử và áp dụng điểm này?</span>
            <button type="button" onClick={apply} disabled={submitting} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50">
              {submitting ? 'Đang áp dụng...' : 'Xác nhận'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={submitting} className="px-2 text-sm text-gray-600">Hủy</button>
          </>
        ) : (
          <button type="submit" className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">Áp dụng</button>
        )}
      </div>

      {notice && (
        <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${notice.kind === 'error' ? 'text-red-600' : 'text-green-700'}`}>{notice.text}</p>
      )}
    </form>
  )
}
