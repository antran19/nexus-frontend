// Pure helpers for the sign-up page, kept apart from React so `npm test` can cover them. The server checks every
// rule again; this only saves a round trip for the obvious mistakes.

export const MIN_AGE = 18
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

export const EMPTY_REGISTRATION = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  birthDate: '',
  termsAccepted: false,
  escrowAcknowledged: false,
}

// Whole years between an ISO date (2000-12-31) and today; `now` is a parameter so tests do not depend on the clock.
export function ageOn(isoDate, now = new Date()) {
  const born = new Date(isoDate)
  let age = now.getFullYear() - born.getFullYear()
  const hadBirthday = now.getMonth() > born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate())
  if (!hadBirthday) age -= 1
  return age
}

// Spaces, dots and dashes are allowed while typing, the server gets the digits only.
export function cleanPhone(phone) {
  return String(phone ?? '').replace(/[\s.-]/g, '')
}

// A map field -> message; empty when the form can be sent. The first problem of each field wins.
export function validateRegistration(form, now = new Date()) {
  const errors = {}
  if (!String(form.fullName ?? '').trim()) errors.fullName = 'Vui lòng nhập họ và tên'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email không đúng định dạng'
  if (form.password.length < PASSWORD_MIN || form.password.length > PASSWORD_MAX) {
    errors.password = `Mật khẩu phải có từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự`
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
  }
  const phone = cleanPhone(form.phone)
  if (phone && !/^(0\d{9}|\+84\d{9})$/.test(phone)) {
    errors.phone = 'Số điện thoại phải là số Việt Nam (0xxxxxxxxx hoặc +84xxxxxxxxx)'
  }
  if (form.birthDate && ageOn(form.birthDate, now) < MIN_AGE) errors.birthDate = `Bạn cần đủ ${MIN_AGE} tuổi để tham gia đấu giá`
  if (!form.termsAccepted) errors.termsAccepted = 'Bạn cần đồng ý Điều khoản Dịch vụ'
  if (!form.escrowAcknowledged) errors.escrowAcknowledged = 'Bạn cần xác nhận đã hiểu quy chế ký quỹ'
  return errors
}

// What the server answers for a refused sign-up: fieldErrors per field when it sent them, else one sentence.
export function registerFieldErrors(err) {
  const map = {}
  for (const item of err?.response?.data?.error?.fieldErrors ?? []) {
    if (item.field && !map[item.field]) map[item.field] = item.message
  }
  return map
}

export function registerErrorMessage(err) {
  if (err?.response?.status === 409) return 'Email đã được sử dụng'
  return err?.response?.data?.error?.message || 'Đăng ký thất bại, vui lòng thử lại'
}
