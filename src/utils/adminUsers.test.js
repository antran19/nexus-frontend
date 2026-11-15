import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  adjustErrorMessage, adjustFieldErrors, adjustmentBody, canAdjust, clampScore, countByRole, filterUsers, formatDelta,
  newestFirst, previewScore, totalPenaltyPoints, trustLevelFor, validateAdjustment,
} from './adminUsers.js'

const users = [
  { id: 'u1', email: 'an@nexus.vn', fullName: 'Trần An', roleCode: 'BUYER', createdAt: '2026-11-10T10:00:00Z' },
  { id: 'u2', email: 'binh@nexus.vn', fullName: 'Lê Bình', roleCode: 'SELLER', createdAt: '2026-11-12T10:00:00Z' },
  { id: 'u3', email: 'admin@nexus.vn', fullName: 'Quản trị', roleCode: 'ADMIN', createdAt: '2026-11-01T10:00:00Z' },
  { id: 'u4', email: 'cuong@nexus.vn', fullName: 'Phạm Cường', roleCode: 'BUYER', createdAt: '2026-11-11T10:00:00Z' },
]

test('only an admin may change a score', () => {
  assert.equal(canAdjust({ role: 'ADMIN' }), true)
  assert.equal(canAdjust({ role: 'SUPPORT_STAFF' }), false)
  assert.equal(canAdjust({ role: 'SELLER' }), false)
  assert.equal(canAdjust(null), false)
})

test('the role tab and the search narrow the list together', () => {
  assert.equal(filterUsers(users, 'ALL', '').length, 4)
  assert.deepEqual(filterUsers(users, 'BUYER', '').map((u) => u.id), ['u1', 'u4'])
  assert.deepEqual(filterUsers(users, 'ALL', 'BINH').map((u) => u.id), ['u2'])
  assert.deepEqual(filterUsers(users, 'ALL', 'trần').map((u) => u.id), ['u1'])
  assert.deepEqual(filterUsers(users, 'BUYER', 'cuong').map((u) => u.id), ['u4'])
  assert.deepEqual(filterUsers(users, 'SELLER', 'cuong'), [])
  assert.deepEqual(filterUsers(users, 'ALL', 'u3').map((u) => u.id), ['u3'])
})

test('the tabs show how many people each role has', () => {
  assert.deepEqual(countByRole(users), { ALL: 4, BUYER: 2, SELLER: 1, ADMIN: 1, SUPPORT_STAFF: 0 })
})

test('newest accounts come first and the original list is not changed', () => {
  assert.deepEqual(newestFirst(users).map((u) => u.id), ['u2', 'u4', 'u1', 'u3'])
  assert.equal(users[0].id, 'u1')
})

test('the trust level follows the same cut-offs as the server', () => {
  assert.equal(trustLevelFor(0), 'LOW')
  assert.equal(trustLevelFor(39), 'LOW')
  assert.equal(trustLevelFor(40), 'NORMAL')
  assert.equal(trustLevelFor(49), 'NORMAL')
  assert.equal(trustLevelFor(50), 'TRUSTED')
  assert.equal(trustLevelFor(100), 'TRUSTED')
})

test('the previewed score stays between 0 and 100', () => {
  assert.equal(previewScore(50, 5), 55)
  assert.equal(previewScore(50, -10), 40)
  assert.equal(previewScore(95, 20), 100)
  assert.equal(previewScore(5, -20), 0)
  assert.equal(previewScore(50, 'abc'), 50)
  assert.equal(previewScore(50, 1.5), 50)
  assert.equal(clampScore(150), 100)
  assert.equal(clampScore(-3), 0)
})

test('a change is written with its sign', () => {
  assert.equal(formatDelta(5), '+5')
  assert.equal(formatDelta(-10), '−10')
  assert.equal(formatDelta(0), '0')
})

test('an adjustment needs a whole non-zero change within 100 and a reason', () => {
  assert.deepEqual(validateAdjustment({ delta: '5', reason: 'Giao hàng tốt' }), {})
  assert.deepEqual(validateAdjustment({ delta: -10, reason: 'Bỏ cuộc' }), {})
  assert.ok(validateAdjustment({ delta: '', reason: 'x' }).delta)
  assert.ok(validateAdjustment({ delta: '1.5', reason: 'x' }).delta)
  assert.ok(validateAdjustment({ delta: 'abc', reason: 'x' }).delta)
  assert.ok(validateAdjustment({ delta: '0', reason: 'x' }).delta)
  assert.ok(validateAdjustment({ delta: '101', reason: 'x' }).delta)
  assert.ok(validateAdjustment({ delta: '5', reason: '  ' }).reason)
  assert.ok(validateAdjustment({ delta: '5', reason: 'a'.repeat(501) }).reason)
  assert.deepEqual(Object.keys(validateAdjustment({ delta: '', reason: '' })).sort(), ['delta', 'reason'])
})

test('the adjustment body has a number and a trimmed reason', () => {
  assert.deepEqual(adjustmentBody({ delta: ' -10 ', reason: '  Bỏ cuộc  ' }), { delta: -10, reason: 'Bỏ cuộc' })
})

test('penalty points add up', () => {
  assert.equal(totalPenaltyPoints([{ points: 10 }, { points: '5' }, {}]), 15)
  assert.equal(totalPenaltyPoints([]), 0)
})

test('the server field errors land on the delta or reason field only', () => {
  const err = { response: { data: { error: { fieldErrors: [{ field: 'delta', message: 'khác 0' }, { field: 'x', message: 'y' }] } } } }
  assert.deepEqual(adjustFieldErrors(err), { delta: 'khác 0' })
  assert.deepEqual(adjustFieldErrors(undefined), {})
})

test('each answer of the adjust call has its own sentence', () => {
  assert.match(adjustErrorMessage({ response: { status: 403, data: {} } }), /quản trị viên/)
  assert.match(adjustErrorMessage({ response: { status: 404, data: {} } }), /Không tìm thấy/)
  assert.match(adjustErrorMessage({ response: { status: 401, data: {} } }), /hết hạn/)
  assert.match(adjustErrorMessage(undefined), /Không chỉnh được/)
})
