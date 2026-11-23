import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildOrderQuery, canRefund, canRequestReturn, endOfDay, filterStaffOrders, hasNextPage, isStaff, matchesSearch, newestFirst,
  PAGE_SIZE, refundDetails, refundErrorMessage, refundNextStep, startOfDay, validateDays, removeReturn, replaceOrder, returnErrorMessage, validateReason,
} from './adminOrders.js'

const orders = [
  { id: 'a1', buyerId: 'buyer-1', status: 'PAID', shippedAt: null, createdAt: '2026-11-13T10:00:00Z' },
  { id: 'b2', buyerId: 'buyer-2', status: 'PAID', shippedAt: '2026-11-13T12:00:00Z', createdAt: '2026-11-13T11:00:00Z' },
  { id: 'c3', buyerId: 'buyer-3', status: 'REFUNDED', shippedAt: '2026-11-12T12:00:00Z', createdAt: '2026-11-12T10:00:00Z' },
  { id: 'd4', buyerId: 'buyer-4', status: 'AWAITING_PAYMENT', createdAt: '2026-11-11T10:00:00Z' },
  { id: 'e5', buyerId: 'buyer-5', status: 'CANCELLED', createdAt: '2026-11-10T10:00:00Z', auctionId: 'auction-9' },
]

test('admin and support staff are staff, nobody else', () => {
  assert.equal(isStaff({ role: 'ADMIN' }), true)
  assert.equal(isStaff({ role: 'SUPPORT_STAFF' }), true)
  assert.equal(isStaff({ role: 'SELLER' }), false)
  assert.equal(isStaff({ role: 'BUYER' }), false)
  assert.equal(isStaff(null), false)
})

test('each tab holds its orders and ALL holds every one', () => {
  assert.deepEqual(filterStaffOrders(orders, 'PAID').map((o) => o.id), ['a1'])
  assert.deepEqual(filterStaffOrders(orders, 'SHIPPED').map((o) => o.id), ['b2'])
  assert.deepEqual(filterStaffOrders(orders, 'REFUNDED').map((o) => o.id), ['c3'])
  assert.deepEqual(filterStaffOrders(orders, 'AWAITING').map((o) => o.id), ['d4'])
  assert.deepEqual(filterStaffOrders(orders, 'CANCELLED').map((o) => o.id), ['e5'])
  assert.equal(filterStaffOrders(orders, 'ALL').length, 5)
})

test('search matches a piece of the order, buyer or auction id and an empty search keeps all', () => {
  assert.equal(matchesSearch(orders[0], 'A1'), true)
  assert.equal(matchesSearch(orders[1], 'buyer-2'), true)
  assert.equal(matchesSearch(orders[4], 'auction'), true)
  assert.equal(matchesSearch(orders[0], 'zzz'), false)
  assert.equal(matchesSearch(orders[0], '  '), true)
  assert.equal(matchesSearch(orders[0], undefined), true)
})

test('newest orders come first and the original list is not changed', () => {
  assert.deepEqual(newestFirst(orders).map((o) => o.id), ['b2', 'a1', 'c3', 'd4', 'e5'])
  assert.equal(orders[0].id, 'a1')
})

test('only a paid order is refunded, only a shipped refunded one is returned', () => {
  assert.equal(canRefund(orders[0]), true)
  assert.equal(canRefund(orders[2]), false)
  assert.equal(canRefund(orders[3]), false)
  assert.equal(canRequestReturn(orders[2]), true)
  assert.equal(canRequestReturn({ status: 'REFUNDED', shippedAt: null }), false)
  assert.equal(canRequestReturn(orders[1]), false)
})

test('a reason is needed and cannot be longer than 500 characters', () => {
  assert.equal(validateReason('Khách đổi ý'), '')
  assert.notEqual(validateReason(''), '')
  assert.notEqual(validateReason('   '), '')
  assert.notEqual(validateReason(undefined), '')
  assert.equal(validateReason('a'.repeat(500)), '')
  assert.notEqual(validateReason('a'.repeat(501)), '')
})

test('after a refund the staff is told whether the goods still have to come back', () => {
  assert.match(refundNextStep(orders[2]), /yêu cầu trả hàng/)
  assert.match(refundNextStep({ status: 'REFUNDED', shippedAt: null }), /tự động/)
  assert.equal(refundNextStep(orders[0]), '')
})

test('an answered return leaves the list and an updated order replaces the old one', () => {
  assert.deepEqual(removeReturn([{ id: 'r1' }, { id: 'r2' }], 'r1'), [{ id: 'r2' }])
  const next = replaceOrder(orders, { ...orders[0], status: 'REFUNDED' })
  assert.equal(next[0].status, 'REFUNDED')
  assert.equal(orders[0].status, 'PAID')
})

test('each answer of the refund call has its own sentence', () => {
  const fail = (code, status = 409) => ({ response: { status, data: { error: { code } } } })
  assert.match(refundErrorMessage(fail('ORDER_NOT_REFUNDABLE')), /không hoàn tiền được/)
  assert.match(refundErrorMessage(fail('ORDER_NOT_FOUND', 404)), /Không tìm thấy/)
  assert.match(refundErrorMessage({ response: { status: 403, data: {} } }), /quản trị viên/)
  assert.match(refundErrorMessage({ response: { status: 400, data: {} } }), /lý do/)
  assert.match(refundErrorMessage({ response: { status: 401, data: {} } }), /hết hạn/)
  assert.match(refundErrorMessage({ response: { status: 502, data: {} } }), /cổng thanh toán/)
})

test('each answer of the return calls has its own sentence', () => {
  const fail = (code, status = 409) => ({ response: { status, data: { error: { code } } } })
  assert.match(returnErrorMessage(fail('RETURN_NOT_APPLICABLE')), /đã giao và đã hoàn tiền/)
  assert.match(returnErrorMessage(fail('RETURN_ALREADY_REQUESTED')), /đang chờ xử lý/)
  assert.match(returnErrorMessage(fail('RETURN_REQUEST_NOT_FOUND', 404)), /Không tìm thấy yêu cầu/)
  assert.match(returnErrorMessage({ response: { status: 403, data: {} } }), /quản trị viên/)
  assert.match(returnErrorMessage(undefined), /Không xử lý được/)
})

test('the query asks the server for the tab status, payment method, days and page, leaving out what was not chosen', () => {
  assert.deepEqual(buildOrderQuery({ tab: 'ALL', paymentMethod: '', page: 0 }), { page: 0, size: PAGE_SIZE })
  assert.deepEqual(buildOrderQuery({ tab: 'REFUNDED', paymentMethod: 'CASH', page: 2 }),
    { page: 2, size: PAGE_SIZE, status: 'REFUNDED', paymentMethod: 'CASH' })
  assert.equal(buildOrderQuery({ tab: 'AWAITING' }).status, 'AWAITING_PAYMENT')
  assert.equal(buildOrderQuery({ tab: 'nonsense' }).status, 'PAID')
})

test('paid and shipped are the same status for the server, split afterwards by the seller shipping', () => {
  assert.equal(buildOrderQuery({ tab: 'PAID' }).status, 'PAID')
  assert.equal(buildOrderQuery({ tab: 'SHIPPED' }).status, 'PAID')
})

test('a chosen day covers it from its first to its last moment in local time', () => {
  const query = buildOrderQuery({ tab: 'ALL', fromDay: '2026-11-20', toDay: '2026-11-21' })

  assert.equal(query.from, new Date(2026, 10, 20, 0, 0, 0, 0).toISOString())
  assert.equal(query.to, new Date(2026, 10, 21, 23, 59, 59, 999).toISOString())
  assert.equal(startOfDay(''), undefined)
  assert.equal(endOfDay(undefined), undefined)
})

test('a full page means there may be a next one, a short page is the last', () => {
  assert.equal(hasNextPage(PAGE_SIZE), true)
  assert.equal(hasNextPage(PAGE_SIZE - 1), false)
  assert.equal(hasNextPage(0), false)
})

test('the first day may not come after the last day', () => {
  assert.match(validateDays('2026-11-21', '2026-11-20'), /trước hoặc bằng/)
  assert.equal(validateDays('2026-11-20', '2026-11-20'), '')
  assert.equal(validateDays('2026-11-20', ''), '')
  assert.equal(validateDays('', ''), '')
})

test('a refund reason is held to the 255 characters the server keeps', () => {
  assert.equal(validateReason('a'.repeat(255), 255), '')
  assert.match(validateReason('a'.repeat(256), 255), /tối đa 255/)
  assert.equal(validateReason('a'.repeat(256)), '')
})

test('the refund details are shown only for a refunded order that has them', () => {
  const refunded = { status: 'REFUNDED', refund: { reason: 'Hàng lỗi', refundedBy: 'support-9', refundedAt: '2026-11-20T10:00:00Z', stripeRefundId: 're_1' } }

  assert.deepEqual(refundDetails(refunded), { reason: 'Hàng lỗi', by: 'support-9', at: '2026-11-20T10:00:00Z', stripeRefundId: 're_1' })
  assert.equal(refundDetails({ status: 'REFUNDED', refund: null }), null)
  assert.equal(refundDetails({ status: 'PAID', refund: refunded.refund }), null)
  assert.equal(refundDetails(null), null)
  assert.equal(refundDetails({ status: 'REFUNDED', refund: { reason: 'x', refundedAt: '2026-11-20T10:00:00Z' } }).stripeRefundId, '')
})
