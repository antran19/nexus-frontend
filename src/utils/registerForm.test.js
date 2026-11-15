import assert from 'node:assert/strict'
import test from 'node:test'
import { ageOn, cleanPhone, EMPTY_REGISTRATION, registerErrorMessage, registerFieldErrors, validateRegistration } from './registerForm.js'

const NOW = new Date(2026, 10, 15) // 15 Nov 2026
const valid = {
  ...EMPTY_REGISTRATION,
  fullName: 'Nguyễn Văn An',
  email: 'an@example.com',
  password: 'matkhau123',
  confirmPassword: 'matkhau123',
  termsAccepted: true,
  escrowAcknowledged: true,
}

test('ageOn counts a birthday only once it has come', () => {
  assert.equal(ageOn('2008-11-15', NOW), 18)
  assert.equal(ageOn('2008-11-16', NOW), 17)
  assert.equal(ageOn('2000-01-01', NOW), 26)
})

test('cleanPhone keeps the digits and the plus sign', () => {
  assert.equal(cleanPhone('0912 345.678'), '0912345678')
  assert.equal(cleanPhone('+84 912-345-678'), '+84912345678')
  assert.equal(cleanPhone(undefined), '')
})

test('a complete form has no errors, phone and birth date are optional', () => {
  assert.deepEqual(validateRegistration(valid, NOW), {})
})

test('every required field is reported on its own', () => {
  const errors = validateRegistration(EMPTY_REGISTRATION, NOW)
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'escrowAcknowledged', 'fullName', 'password', 'termsAccepted'])
})

test('password length is checked before the confirmation', () => {
  assert.match(validateRegistration({ ...valid, password: 'short', confirmPassword: 'other' }, NOW).password, /8 đến 72/)
  assert.equal(validateRegistration({ ...valid, password: 'short', confirmPassword: 'other' }, NOW).confirmPassword, undefined)
  assert.match(validateRegistration({ ...valid, confirmPassword: 'khac-hoan-toan' }, NOW).confirmPassword, /không khớp/)
})

test('phone must be a Vietnamese number when given', () => {
  assert.equal(validateRegistration({ ...valid, phone: '0912 345 678' }, NOW).phone, undefined)
  assert.equal(validateRegistration({ ...valid, phone: '+84912345678' }, NOW).phone, undefined)
  assert.match(validateRegistration({ ...valid, phone: '12345' }, NOW).phone, /số Việt Nam/)
})

test('a person under 18 is refused', () => {
  assert.match(validateRegistration({ ...valid, birthDate: '2010-01-01' }, NOW).birthDate, /18 tuổi/)
  assert.equal(validateRegistration({ ...valid, birthDate: '2000-01-01' }, NOW).birthDate, undefined)
})

test('server field errors become a map, the first one per field', () => {
  const err = { response: { data: { error: { fieldErrors: [{ field: 'email', message: 'A' }, { field: 'email', message: 'B' }, { field: 'phone', message: 'C' }] } } } }
  assert.deepEqual(registerFieldErrors(err), { email: 'A', phone: 'C' })
  assert.deepEqual(registerFieldErrors(new Error('x')), {})
})

test('a taken email gets its own sentence, others fall back to the server text', () => {
  assert.equal(registerErrorMessage({ response: { status: 409 } }), 'Email đã được sử dụng')
  assert.equal(registerErrorMessage({ response: { status: 400, data: { error: { message: 'Sai rồi' } } } }), 'Sai rồi')
  assert.equal(registerErrorMessage(new Error('network')), 'Đăng ký thất bại, vui lòng thử lại')
})
