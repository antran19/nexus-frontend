import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addressLine, countByTab, filterOrders, myItems, myTotal, replaceOrder, shipErrorMessage,
} from './sellerOrders.js'

const orders = [
  { id: 'a', status: 'PAID', shippedAt: null },
  { id: 'b', status: 'PAID', shippedAt: '2026-11-13T10:00:00Z' },
  { id: 'c', status: 'AWAITING_PAYMENT', shippedAt: null },
  { id: 'd', status: 'CANCELLED', shippedAt: null },
  { id: 'e', status: 'REFUNDED', shippedAt: '2026-11-12T10:00:00Z' },
]

test('each order falls in exactly one tab', () => {
  assert.deepEqual(filterOrders(orders, 'TO_SHIP').map((o) => o.id), ['a'])
  assert.deepEqual(filterOrders(orders, 'SHIPPED').map((o) => o.id), ['b'])
  assert.deepEqual(filterOrders(orders, 'AWAITING').map((o) => o.id), ['c'])
  assert.deepEqual(filterOrders(orders, 'CLOSED').map((o) => o.id), ['d', 'e'])
  assert.deepEqual(countByTab(orders), { TO_SHIP: 1, SHIPPED: 1, AWAITING: 1, CLOSED: 2 })
})

test('an unknown tab falls back to the orders to ship', () => {
  assert.deepEqual(filterOrders(orders, 'nope').map((o) => o.id), ['a'])
})

test('only my own lines are shown and added up', () => {
  const order = {
    items: [
      { productId: 'p1', sellerId: 's1', subtotal: 100000 },
      { productId: 'p2', sellerId: 's2', subtotal: 50000 },
      { productId: 'p3', sellerId: 's1', subtotal: '25000' },
    ],
  }
  assert.deepEqual(myItems(order, 's1').map((i) => i.productId), ['p1', 'p3'])
  assert.equal(myTotal(order, 's1'), 125000)
  assert.equal(myTotal(order, 'nobody'), 0)
  assert.deepEqual(myItems({}, 's1'), [])
})

test('the address reads as one line and leaves out what is missing', () => {
  assert.equal(
    addressLine({ recipientName: 'An', phone: '0901234567', addressLine: '1 Lê Lợi', city: 'TP.HCM' }),
    'An · 0901234567 · 1 Lê Lợi, TP.HCM',
  )
  assert.equal(addressLine({ recipientName: 'An', addressLine: '1 Lê Lợi', city: null }), 'An · 1 Lê Lợi')
  assert.equal(addressLine(null), 'Chưa có địa chỉ giao hàng')
})

test('the order the server answered replaces the old one in the list', () => {
  const next = replaceOrder(orders, { id: 'a', status: 'PAID', shippedAt: '2026-11-13T12:00:00Z' })
  assert.equal(next[0].shippedAt, '2026-11-13T12:00:00Z')
  assert.equal(next.length, orders.length)
  assert.equal(orders[0].shippedAt, null)
})

test('each answer of the shipping call has its own sentence', () => {
  const fail = (code, status = 409) => ({ response: { status, data: { error: { code } } } })
  assert.match(shipErrorMessage(fail('ORDER_ALREADY_SHIPPED')), /đã giao rồi/)
  assert.match(shipErrorMessage(fail('ORDER_NOT_SHIPPABLE')), /chưa thanh toán/)
  assert.match(shipErrorMessage(fail('NOT_THE_SELLER', 403)), /không có sản phẩm/)
  assert.match(shipErrorMessage(fail('ORDER_NOT_FOUND', 404)), /Không tìm thấy/)
  assert.match(shipErrorMessage({ response: { status: 403, data: {} } }), /người bán/)
  assert.match(shipErrorMessage({ response: { status: 401, data: {} } }), /hết hạn/)
  assert.match(shipErrorMessage(undefined), /Không đánh dấu được/)
})
