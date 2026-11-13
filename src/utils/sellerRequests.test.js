import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  canRequestSeller, displayName, isAdmin, removeRequest, requestSellerMessage, reviewErrorMessage,
} from './sellerRequests.js'

const fail = (code, status = 409) => ({ response: { status, data: { error: { code } } } })

test('only a buyer is offered the request, only an admin reviews', () => {
  assert.equal(canRequestSeller({ role: 'BUYER' }), true)
  assert.equal(canRequestSeller({ role: 'SELLER' }), false)
  assert.equal(canRequestSeller({ role: 'ADMIN' }), false)
  assert.equal(canRequestSeller(null), false)
  assert.equal(isAdmin({ role: 'ADMIN' }), true)
  assert.equal(isAdmin({ role: 'SELLER' }), false)
})

test('a person is shown by name and email, or by a short id when unknown', () => {
  assert.equal(displayName({ fullName: 'An', email: 'an@nexus.vn' }, 'u1'), 'An (an@nexus.vn)')
  assert.equal(displayName({ fullName: 'An' }, 'u1'), 'An')
  assert.equal(displayName(undefined, '6a320d9e-5841-4908-9720-066780e0bafc'), 'Người dùng #6a320d9e')
})

test('a reviewed request leaves the list, the others and the original stay', () => {
  const list = [{ id: 'a' }, { id: 'b' }]
  assert.deepEqual(removeRequest(list, 'a'), [{ id: 'b' }])
  assert.equal(list.length, 2)
})

test('asking to sell: a repeated request is information, not an error', () => {
  assert.equal(requestSellerMessage(fail('SELLER_REQUEST_ALREADY_PENDING')).kind, 'info')
  assert.match(requestSellerMessage(fail('ALREADY_SELLER')).text, /đăng nhập lại/)
  assert.equal(requestSellerMessage(fail('OTHER', 500)).kind, 'error')
  assert.match(requestSellerMessage({ response: { status: 401, data: {} } }).text, /hết hạn/)
})

test('reviewing: each answer has its own sentence', () => {
  assert.match(reviewErrorMessage(fail('SELLER_REQUEST_ALREADY_REVIEWED')), /đã được xử lý/)
  assert.match(reviewErrorMessage(fail('SELLER_REQUEST_NOT_FOUND', 404)), /Không tìm thấy/)
  assert.match(reviewErrorMessage(fail('USER_NOT_FOUND', 404)), /không còn tồn tại/)
  assert.match(reviewErrorMessage({ response: { status: 403, data: {} } }), /quản trị viên/)
  assert.match(reviewErrorMessage(undefined), /Không xử lý được/)
})
