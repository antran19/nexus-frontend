// Pure helpers for "forgot password" and "reset password", kept apart from React so `npm test` covers them.
import { PASSWORD_MAX, PASSWORD_MIN } from './registerForm.js'

// The same words whether or not the address belongs to an account: the server answers every address alike so the
// form cannot be used to find out who is registered, and the page must not give it away either.
export const FORGOT_SENT_TEXT = 'Nếu có tài khoản với email này, mã đặt lại mật khẩu đã được gửi tới email đó. Mã có hiệu lực trong 30 phút.'

export function validateForgotEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? '').trim()) ? '' : 'Email không đúng định dạng'
}

// The server limits a password to 72 BYTES (BCrypt), so a letter with a tone mark counts for 2 or 3.
const PASSWORD_MAX_BYTES = 72
const byteLength = (text) => new TextEncoder().encode(text).length

// A map field -> message; empty when the form can be sent. The confirmation is only judged once the password is fine.
export function validateReset(form) {
  const errors = {}
  if (!String(form.token ?? '').trim()) errors.token = 'Vui lòng nhập mã đặt lại trong email'
  const password = String(form.newPassword ?? '')
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    errors.newPassword = `Mật khẩu phải có từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự`
  } else if (byteLength(password) > PASSWORD_MAX_BYTES) {
    errors.newPassword = `Mật khẩu quá dài (tối đa ${PASSWORD_MAX_BYTES} byte; chữ có dấu chiếm nhiều byte hơn), hãy rút ngắn lại`
  } else if (password !== form.confirmNewPassword) {
    errors.confirmNewPassword = 'Mật khẩu xác nhận không khớp'
  }
  return errors
}

// The code is copied out of an email, so spaces and a trailing newline are likely: cut them.
export function buildResetBody(form) {
  return { token: form.token.trim(), newPassword: form.newPassword, confirmNewPassword: form.confirmNewPassword }
}

// What the server says per field when it refuses the form; the first message of each field wins.
export function resetFieldErrors(err) {
  const map = {}
  for (const item of err?.response?.data?.error?.fieldErrors ?? []) {
    if (item.field && !map[item.field]) map[item.field] = item.message
  }
  return map
}

export function resetErrorMessage(err) {
  const error = err?.response?.data?.error
  if (error?.code === 'INVALID_RESET_TOKEN') return 'Mã đặt lại không đúng, đã hết hạn hoặc đã được dùng. Hãy yêu cầu mã mới.'
  return error?.fieldErrors?.[0]?.message || 'Không đặt lại được mật khẩu, vui lòng thử lại.'
}

// Never mention the account: only that the request itself did not go through.
export function forgotErrorMessage() {
  return 'Chưa gửi được yêu cầu, vui lòng thử lại sau.'
}
