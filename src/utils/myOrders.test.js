import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  addressBody, addressFieldErrors, buildMyOrdersQuery, canCancel, canPay, filterMyOrders, needsAddress, newestFirst, orderActionError,
  orderState, paymentUrls, searchMyOrders, validateAddress,
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
  assert.equal(orderState(orders[2]).label, 'Đã gửi hàng')
  assert.equal(orderState(orders[0]).label, 'Chờ thanh toán')
  assert.equal(orderState(orders[3]).label, 'Đã hủy')
  assert.equal(orderState(orders[4]).label, 'Đã hoàn tiền')
})

test('a shipped order shows where its parcel is', () => {
  const at = (status) => ({ id: 'p', status: 'PAID', shippedAt: '2026-11-13T12:00:00Z', shipment: { carrier: 'SIMULATED', trackingCode: 'NXS1', status } })
  assert.equal(orderState(at('IN_TRANSIT')).label, 'Đang vận chuyển')
  assert.equal(orderState(at('DELIVERED')).label, 'Đã giao tới nơi')
  assert.equal(orderState(at('RECEIVED')).label, 'Đã nhận hàng')
  // every parcel state stays under the one SHIPPED filter
  for (const status of ['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED']) assert.equal(orderState(at(status)).key, 'SHIPPED')
})

test('the filters split the orders and ALL keeps every one', () => {
  assert.equal(filterMyOrders(orders, 'ALL').length, 5)
  assert.deepEqual(filterMyOrders(orders, 'AWAITING').map((o) => o.id), ['a'])
  assert.deepEqual(filterMyOrders(orders, 'PREPARING').map((o) => o.id), ['b'])
  assert.deepEqual(filterMyOrders(orders, 'SHIPPED').map((o) => o.id), ['c'])
  assert.deepEqual(filterMyOrders(orders, 'CANCELLED').map((o) => o.id), ['d'])
  assert.deepEqual(filterMyOrders(orders, 'REFUNDED').map((o) => o.id), ['e'])
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

const named = [
  { id: 'aa11bb22-0000-4000-8000-000000000001', items: [{ productName: 'Đồng hồ cổ Nexus' }, { productName: 'Ví da Nexus' }] },
  { id: 'cc33dd44-0000-4000-8000-000000000002', items: [{ productName: 'Giày thể thao' }] },
  { id: 'ee55ff66-0000-4000-8000-000000000003', items: [] },
]

test('an empty search keeps every order and the original list is not changed', () => {
  assert.equal(searchMyOrders(named, '').length, 3)
  assert.equal(searchMyOrders(named, '   ').length, 3)
  assert.equal(searchMyOrders(named, undefined).length, 3)
  assert.equal(named.length, 3)
})

test('the search finds an order by the product name, ignoring case and accents', () => {
  assert.deepEqual(searchMyOrders(named, 'dong ho').map((o) => o.id.slice(0, 4)), ['aa11'])
  assert.deepEqual(searchMyOrders(named, 'VÍ DA').map((o) => o.id.slice(0, 4)), ['aa11'])
  assert.deepEqual(searchMyOrders(named, 'nexus').map((o) => o.id.slice(0, 4)), ['aa11'])
  assert.deepEqual(searchMyOrders(named, 'giay').map((o) => o.id.slice(0, 4)), ['cc33'])
  assert.equal(searchMyOrders(named, 'khong co').length, 0)
})

test('the search finds an order by its id, with or without the # shown on the page', () => {
  assert.deepEqual(searchMyOrders(named, 'cc33dd44').map((o) => o.id.slice(0, 4)), ['cc33'])
  assert.deepEqual(searchMyOrders(named, '#CC33').map((o) => o.id.slice(0, 4)), ['cc33'])
  assert.deepEqual(searchMyOrders(named, 'ee55ff66-0000').map((o) => o.id.slice(0, 4)), ['ee55'])
})

test('an order without items does not break the search', () => {
  assert.deepEqual(searchMyOrders([{ id: 'zz99', items: undefined }], 'zz99').map((o) => o.id), ['zz99'])
  assert.equal(searchMyOrders([{ id: 'zz99' }], 'ao').length, 0)
})

test('the query asks the server for the status of the tab, the days and the page, leaving out what was not chosen', () => {
  assert.deepEqual(buildMyOrdersQuery({ filter: 'ALL' }), { page: 0, size: 20 })
  assert.deepEqual(buildMyOrdersQuery({ filter: 'REFUNDED', page: 2 }), { page: 2, size: 20, status: 'REFUNDED' })
  assert.equal(buildMyOrdersQuery({ filter: 'AWAITING' }).status, 'AWAITING_PAYMENT')
  assert.equal(buildMyOrdersQuery({ filter: 'CANCELLED' }).status, 'CANCELLED')
  assert.equal(buildMyOrdersQuery({ filter: 'nonsense' }).status, undefined)
})

test('preparing and shipped are the same status for the server, split afterwards by the seller shipping', () => {
  assert.equal(buildMyOrdersQuery({ filter: 'PREPARING' }).status, 'PAID')
  assert.equal(buildMyOrdersQuery({ filter: 'SHIPPED' }).status, 'PAID')
})

test('a chosen day covers it from its first to its last moment in local time', () => {
  const query = buildMyOrdersQuery({ filter: 'ALL', fromDay: '2026-11-20', toDay: '2026-11-21' })

  assert.equal(query.from, new Date(2026, 10, 20, 0, 0, 0, 0).toISOString())
  assert.equal(query.to, new Date(2026, 10, 21, 23, 59, 59, 999).toISOString())
})
