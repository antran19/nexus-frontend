import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FORGOT_SENT_TEXT, buildResetBody, forgotErrorMessage, resetErrorMessage, resetFieldErrors, validateForgotEmail, validateReset,
} from './passwordReset.js'

const form = (over = {}) => ({ token: '3f6c1e0a-5b2d-4f7e-9a10-aaaaaaaaaaaa', newPassword: 'Matkhau#2026', confirmNewPassword: 'Matkhau#2026', ...over })
const failure = (status, code, extra = {}) => ({ response: { status, data: { error: { code, ...extra } } } })

test('the email must look like an email', () => {
  assert.equal(validateForgotEmail('ban@example.com'), '')
  assert.equal(validateForgotEmail('  ban@example.com  '), '')
  for (const bad of ['', '   ', 'ban', 'ban@', '@example.com', 'ban@example']) assert.ok(validateForgotEmail(bad), bad)
})

test('a valid reset form has no errors', () => {
  assert.deepEqual(validateReset(form()), {})
})

test('the code is required, and surrounding spaces from copy and paste do not matter', () => {
  assert.ok(validateReset(form({ token: '   ' })).token)
  assert.deepEqual(validateReset(form({ token: '  3f6c1e0a-5b2d-4f7e-9a10-aaaaaaaaaaaa \n' })), {})
})

test('the new password needs 8 to 72 characters', () => {
  assert.ok(validateReset(form({ newPassword: '1234567', confirmNewPassword: '1234567' })).newPassword)
  assert.deepEqual(validateReset(form({ newPassword: '12345678', confirmNewPassword: '12345678' })), {})
  const longest = 'a'.repeat(72)
  assert.deepEqual(validateReset(form({ newPassword: longest, confirmNewPassword: longest })), {})
  const tooLong = 'a'.repeat(73)
  assert.ok(validateReset(form({ newPassword: tooLong, confirmNewPassword: tooLong })).newPassword)
})

test('the limit is 72 bytes, not 72 characters: accented letters count for more', () => {
  // 30 Vietnamese letters with a tone mark take 3 bytes each in UTF-8, so 90 bytes: over the limit the server enforces.
  const accented = 'ế'.repeat(30)
  assert.ok(validateReset(form({ newPassword: accented, confirmNewPassword: accented })).newPassword)
  const fits = 'ế'.repeat(24)
  assert.deepEqual(validateReset(form({ newPassword: fits, confirmNewPassword: fits })), {})
})

test('the confirmation has to match, and is only judged once the password itself is fine', () => {
  assert.ok(validateReset(form({ confirmNewPassword: 'Khac#2026' })).confirmNewPassword)
  const errors = validateReset(form({ newPassword: 'short', confirmNewPassword: 'other' }))
  assert.ok(errors.newPassword)
  assert.equal(errors.confirmNewPassword, undefined)
})

test('the request body trims the code and sends both password fields', () => {
  assert.deepEqual(buildResetBody(form({ token: ' abc ' })), { token: 'abc', newPassword: 'Matkhau#2026', confirmNewPassword: 'Matkhau#2026' })
})

test('the confirmation after asking for a code never says whether the account exists', () => {
  assert.match(FORGOT_SENT_TEXT, /Nếu có tài khoản/)
  assert.match(FORGOT_SENT_TEXT, /30 phút/)
})

test('a wrong, expired or used code gets one clear sentence', () => {
  assert.match(resetErrorMessage(failure(401, 'INVALID_RESET_TOKEN')), /không đúng, đã hết hạn hoặc đã được dùng/)
})

test('field messages from the server come first, then a fallback', () => {
  const withField = failure(400, 'VALIDATION_ERROR', { fieldErrors: [{ field: 'newPassword', message: 'Password must be between 8 and 72 characters' }] })
  assert.equal(resetErrorMessage(withField), 'Password must be between 8 and 72 characters')
  assert.equal(resetErrorMessage({}), 'Không đặt lại được mật khẩu, vui lòng thử lại.')
})

test('server field errors are mapped to the form fields', () => {
  const err = failure(400, 'VALIDATION_ERROR', { fieldErrors: [{ field: 'confirmNewPassword', message: 'must match' }, { field: 'newPassword', message: 'too short' }, { field: 'newPassword', message: 'ignored second' }] })
  assert.deepEqual(resetFieldErrors(err), { confirmNewPassword: 'must match', newPassword: 'too short' })
  assert.deepEqual(resetFieldErrors({}), {})
})

test('asking for a code fails with a plain sentence that reveals nothing about the account', () => {
  assert.equal(forgotErrorMessage(failure(500, 'INTERNAL')), 'Chưa gửi được yêu cầu, vui lòng thử lại sau.')
  assert.equal(forgotErrorMessage({}), 'Chưa gửi được yêu cầu, vui lòng thử lại sau.')
})
