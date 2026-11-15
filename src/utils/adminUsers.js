// Pure helpers for the staff's user page (users, reputation, penalties, manual adjustments), kept apart from React so
// `npm test` can cover them.

export const MAX_REASON_LENGTH = 500
export const MIN_SCORE = 0
export const MAX_SCORE = 100
// Same cut-offs as user-service: under 40 is LOW, under 50 is NORMAL, from 50 is TRUSTED.
export const NORMAL_FROM = 40
export const TRUSTED_FROM = 50

export const ROLE_LABEL = {
  BUYER: 'Người mua',
  SELLER: 'Người bán',
  ADMIN: 'Quản trị viên',
  SUPPORT_STAFF: 'Nhân viên hỗ trợ',
}

export const ROLE_TABS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'BUYER', label: 'Người mua' },
  { value: 'SELLER', label: 'Người bán' },
  { value: 'ADMIN', label: 'Quản trị viên' },
  { value: 'SUPPORT_STAFF', label: 'Hỗ trợ' },
]

// Only an admin may change a score; support staff can look at it. The server checks the privilege again.
export function canAdjust(user) {
  return user?.role === 'ADMIN'
}

// A user matches when the role tab fits and the search is part of the email, name or id; empty search keeps all.
export function filterUsers(users, role, query) {
  const text = String(query ?? '').trim().toLowerCase()
  return users.filter((user) => {
    if (role !== 'ALL' && user.roleCode !== role) return false
    if (!text) return true
    return [user.email, user.fullName, user.id].some((value) => String(value ?? '').toLowerCase().includes(text))
  })
}

export function countByRole(users) {
  return Object.fromEntries(ROLE_TABS.map((tab) => [tab.value, tab.value === 'ALL' ? users.length : users.filter((u) => u.roleCode === tab.value).length]))
}

// Newest accounts first, whatever order the server answered in. The list given is not changed.
export function newestFirst(users) {
  return [...users].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export function clampScore(score) {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score))
}

export function trustLevelFor(score) {
  if (score < NORMAL_FROM) return 'LOW'
  if (score < TRUSTED_FROM) return 'NORMAL'
  return 'TRUSTED'
}

// What the score would be after an adjustment, the way the server computes it (kept between 0 and 100).
export function previewScore(current, delta) {
  const amount = Number(delta)
  if (!Number.isInteger(amount)) return clampScore(current)
  return clampScore(current + amount)
}

// "+5" or "−10" (a real minus sign); zero is "0".
export function formatDelta(delta) {
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `−${Math.abs(delta)}`
  return '0'
}

// A map field -> message; empty when the adjustment can be sent. The server refuses a zero change and a blank reason.
export function validateAdjustment({ delta, reason }) {
  const errors = {}
  const text = String(delta ?? '').trim()
  const amount = Number(text)
  if (text === '' || !Number.isInteger(amount)) errors.delta = 'Nhập một số nguyên, ví dụ 5 hoặc -10.'
  else if (amount === 0) errors.delta = 'Mức thay đổi không được bằng 0.'
  else if (Math.abs(amount) > MAX_SCORE) errors.delta = `Mức thay đổi tối đa ${MAX_SCORE} điểm.`
  const why = String(reason ?? '').trim()
  if (!why) errors.reason = 'Vui lòng nhập lý do.'
  else if (why.length > MAX_REASON_LENGTH) errors.reason = `Lý do tối đa ${MAX_REASON_LENGTH} ký tự.`
  return errors
}

// The body of the adjustment call: the change as a whole number, the reason trimmed.
export function adjustmentBody({ delta, reason }) {
  return { delta: Number(String(delta).trim()), reason: String(reason).trim() }
}

// Total points taken away by automatic penalties, for the one-line summary above the list.
export function totalPenaltyPoints(penalties) {
  return penalties.reduce((sum, penalty) => sum + Number(penalty.points || 0), 0)
}

// The server fills fieldErrors for a refused adjustment; turn it into a map for the form.
export function adjustFieldErrors(err) {
  const map = {}
  for (const item of err?.response?.data?.error?.fieldErrors ?? []) {
    if ((item.field === 'delta' || item.field === 'reason') && !map[item.field]) map[item.field] = item.message
  }
  return map
}

export function adjustErrorMessage(err) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  if (status === 403) return 'Chỉ quản trị viên mới chỉnh được điểm uy tín.'
  if (code === 'USER_NOT_FOUND' || status === 404) return 'Không tìm thấy người dùng này.'
  return 'Không chỉnh được điểm. Vui lòng thử lại.'
}

// A small note the page shows under the score: what the level means in the auction rules, and that a changed score
// reaches the person only when they sign in again (the level is written into the login token).
export const TRUST_NOTE = {
  LOW: 'Điểm dưới 40: không đặt giá được và không tạo được phiên đấu giá.',
  NORMAL: 'Điểm từ 40 đến dưới 50: đặt giá được nhưng chưa tạo được phiên đấu giá.',
  TRUSTED: 'Điểm từ 50 trở lên: đặt giá và tạo phiên đấu giá bình thường.',
}
