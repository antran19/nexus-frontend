import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addressBody, addressFieldErrors, canCancel, canPay, filterMyOrders, needsAddress, newestFirst, orderActionError,
  orderState, paymentUrls, validateAddress,
} from './myOrders.js'

const orders = [
  { id: 'a', status: 'AWAITING_PAYMENT', createdAt: '2026-11-13T10:00:00Z', shippingAddress: null },
  { id: 'b', status: 'PAID', shippedAt: null, createdAt: '2026-11-13T11:00:00Z' },
  { id: 'c', status: 'PAID', shippedAt: '2026-11-13T12:00:00Z', createdAt: '2026-11-12T11:00:00Z' },
  { id: 'd', status: 'CANCELLED', createdAt: '2026-11-11T11:00:00Z' },
  { id: 'e', status: 'REFUNDED', createdAt: '2026-11-10T11:00:00Z' },
]

test('a paid order is being prepared until it is shipped', () => {
  assert.equal(orderState(orders[1]).label, 'Đang chuẩn bị hàng')
  assert.equal(orderState(orders[2]).label, 'Đã giao')
  assert.equal(orderState(orders[0]).label, 'Chờ thanh toán')
  assert.equal(orderState(orders[3]).label, 'Đã hủy')
  assert.equal(orderState(orders[4]).label, 'Đã hoàn tiền')
})

test('the filters split the orders and ALL keeps every one', () => {
  assert.equal(filterMyOrders(orders, 'ALL').length, 5)
  assert.deepEqual(filterMyOrders(orders, 'AWAITING').map((o) => o.id), ['a'])
  assert.deepEqual(filterMyOrders(orders, 'PREPARING').map((o) => o.id), ['b'])
  assert.deepEqual(filterMyOrders(orders, 'SHIPPED').map((o) => o.id), ['c'])
  assert.deepEqual(filterMyOrders(orders, 'CLOSED').map((o) => o.id), ['d', 'e'])
})

test('newest orders come first and the original list is not changed', () => {
  const sorted = newestFirst(orders)
  assert.deepEqual(sorted.map((o) => o.id), ['b', 'a', 'c', 'd', 'e'])
  assert.equal(orders[0].id, 'a')
})

test('only an order waiting for payment can be paid or cancelled', () => {
  assert.equal(canPay(orders[0]), true)
  assert.equal(canCancel(orders[0]), true)
  assert.equal(canPay(orders[1]), false)
  assert.equal(canCancel(orders[3]), false)
})

test('an order without an address asks for one first', () => {
  assert.equal(needsAddress({ shippingAddress: null }), true)
  assert.equal(needsAddress({}), true)
  assert.equal(needsAddress({ shippingAddress: { recipientName: 'An' } }), false)
})

test('the address needs all four fields and a name of at most 100 characters', () => {
  assert.deepEqual(validateAddress({ recipientName: 'An', phone: '0901234567', addressLine: '1 Lê Lợi', city: 'TP.HCM' }), {})
  assert.deepEqual(Object.keys(validateAddress({ recipientName: ' ', phone: '', addressLine: '', city: ' ' })).sort(),
    ['addressLine', 'city', 'phone', 'recipientName'])
  assert.ok(validateAddress({ recipientName: 'a'.repeat(101), phone: '1', addressLine: 'x', city: 'y' }).recipientName)
})

test('the address body trims every field and fills the missing ones', () => {
  assert.deepEqual(addressBody({ recipientName: ' An ', phone: ' 0901 ', addressLine: ' 1 Lê Lợi ' }),
    { recipientName: 'An', phone: '0901', addressLine: '1 Lê Lợi', city: '' })
})

test('the return urls keep the order id and leave the session id for Stripe to fill', () => {
  const urls = paymentUrls('o1', 'http://localhost:5173')
  assert.equal(urls.successUrl, 'http://localhost:5173/payment/success?orderId=o1&session_id={CHECKOUT_SESSION_ID}')
  assert.equal(urls.cancelUrl, 'http://localhost:5173/payment/cancel?orderId=o1')
})

test('field errors from the server land on the matching field', () => {
  const err = { response: { data: { error: { fieldErrors: [
    { field: 'shippingAddress.phone', message: 'sai số' }, { field: 'phone', message: 'lặp' }, { field: 'other', message: 'x' },
  ] } } } }
  assert.deepEqual(addressFieldErrors(err), { phone: 'sai số' })
  assert.deepEqual(addressFieldErrors(undefined), {})
})

test('each answer of pay and cancel has its own sentence', () => {
  const fail = (code, status = 409) => ({ response: { status, data: { error: { code } } } })
  assert.match(orderActionError(fail('ORDER_NOT_CANCELLABLE'), 'x'), /không còn ở trạng thái chờ/)
  assert.match(orderActionError(fail('ORDER_NOT_AWAITING_PAYMENT'), 'x'), /không còn ở trạng thái chờ/)
  assert.match(orderActionError(fail('SHIPPING_ADDRESS_REQUIRED'), 'x'), /địa chỉ giao hàng/)
  assert.match(orderActionError(fail('NOT_THE_BUYER', 403), 'x'), /không phải của bạn/)
  assert.match(orderActionError({ response: { status: 401, data: {} } }, 'x'), /hết hạn/)
  assert.equal(orderActionError(fail('SOMETHING'), 'fallback'), 'fallback')
})
