import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fieldErrorMap, isChanged, isVietnamesePhone, normalizePhone, toUpdateBody, validateProfile } from './profileForm.js'

test('a phone loses spaces, dots and dashes', () => {
  assert.equal(normalizePhone('0901 234.567'), '0901234567')
  assert.equal(normalizePhone('+84-901-234-567'), '+84901234567')
  assert.equal(normalizePhone(undefined), '')
})

test('Vietnamese phones are 0 plus nine digits or +84 plus nine digits', () => {
  assert.equal(isVietnamesePhone('0901 234 567'), true)
  assert.equal(isVietnamesePhone('+84901234567'), true)
  assert.equal(isVietnamesePhone('090123456'), false)
  assert.equal(isVietnamesePhone('abc'), false)
})

test('a good form has no errors, and an empty phone is allowed', () => {
  assert.deepEqual(validateProfile({ fullName: 'Nguyễn Văn A', phone: '0901234567' }), {})
  assert.deepEqual(validateProfile({ fullName: 'Nguyễn Văn A', phone: '' }), {})
})

test('a blank name and a bad phone are reported on their own fields', () => {
  const errors = validateProfile({ fullName: '   ', phone: '123' })
  assert.ok(errors.fullName)
  assert.ok(errors.phone)
})

test('a name longer than 255 characters is rejected', () => {
  assert.ok(validateProfile({ fullName: 'a'.repeat(256), phone: '' }).fullName)
  assert.deepEqual(validateProfile({ fullName: 'a'.repeat(255), phone: '' }), {})
})

test('the update body is trimmed and the phone is cleaned', () => {
  assert.deepEqual(toUpdateBody({ fullName: '  An  ', phone: '0988 777 666' }), { fullName: 'An', phone: '0988777666' })
})

test('clearing the phone sends an empty string, which removes it', () => {
  assert.deepEqual(toUpdateBody({ fullName: 'An', phone: '' }), { fullName: 'An', phone: '' })
})

test('isChanged compares against the saved profile, ignoring spacing and a null phone', () => {
  const profile = { fullName: 'An', phone: '0988777666' }
  assert.equal(isChanged(profile, { fullName: 'An', phone: '0988 777 666' }), false)
  assert.equal(isChanged(profile, { fullName: 'An ', phone: '0988777666' }), false)
  assert.equal(isChanged(profile, { fullName: 'Bình', phone: '0988777666' }), true)
  assert.equal(isChanged({ fullName: 'An', phone: null }, { fullName: 'An', phone: '' }), false)
})

test('fieldErrorMap keeps the first message of each field', () => {
  const map = fieldErrorMap({ fieldErrors: [{ field: 'phone', message: 'a' }, { field: 'phone', message: 'b' }, { field: 'fullName', message: 'c' }] })
  assert.deepEqual(map, { phone: 'a', fullName: 'c' })
  assert.deepEqual(fieldErrorMap(undefined), {})
})
