import assert from 'node:assert/strict'
import test from 'node:test'
import { biddingStats, formatMoney, MAX_TODO, orderStats, todoItems } from './dashboard.js'

const bid = (auctionId, myStatus, productName) => ({ auctionId, productId: `p-${auctionId}`, myStatus, productName })
const order = (id, status, totalAmount, shippedAt) => ({ id, status, totalAmount, shippedAt })

test('biddingStats counts live, leading, outbid and won', () => {
  const items = [bid('a', 'LEADING'), bid('b', 'OUTBID'), bid('c', 'OUTBID'), bid('d', 'WON'), bid('e', 'LOST'), bid('f', 'CANCELLED')]
  assert.deepEqual(biddingStats(items), { live: 3, leading: 1, outbid: 2, won: 1 })
  assert.deepEqual(biddingStats([]), { live: 0, leading: 0, outbid: 0, won: 0 })
})

test('orderStats counts by state and sums what is still to pay', () => {
  const orders = [
    order('1', 'AWAITING_PAYMENT', '190000'),
    order('2', 'AWAITING_PAYMENT', 100000),
    order('3', 'PAID', 50000, null),
    order('4', 'PAID', 70000, '2026-11-14T10:00:00Z'),
    order('5', 'CANCELLED', 10000),
    order('6', 'REFUNDED', 10000),
  ]
  assert.deepEqual(orderStats(orders), { awaiting: 2, awaitingTotal: 290000, preparing: 1, shipped: 1 })
  assert.deepEqual(orderStats([]), { awaiting: 0, awaitingTotal: 0, preparing: 0, shipped: 0 })
})

test('an order without a readable total adds nothing to the sum', () => {
  assert.equal(orderStats([order('1', 'AWAITING_PAYMENT', undefined)]).awaitingTotal, 0)
})

test('todo lists unpaid orders before outbid auctions and links each to its page', () => {
  const todo = todoItems({
    bidding: [bid('a', 'OUTBID', 'Đồng hồ cổ'), bid('b', 'LEADING', 'Máy ảnh')],
    orders: [order('abcdef123456', 'AWAITING_PAYMENT', 190000), order('z', 'PAID', 1, null)],
  })
  assert.deepEqual(todo.map((item) => item.tone), ['pay', 'outbid'])
  assert.equal(todo[0].text, 'Đơn #abcdef12 chờ thanh toán 190.000 đ')
  assert.equal(todo[0].to, '/me/orders')
  assert.equal(todo[1].text, 'Bạn bị vượt giá ở Đồng hồ cổ')
  assert.equal(todo[1].to, '/products/p-a')
})

test('an auction without a product name still gets a sentence', () => {
  assert.equal(todoItems({ bidding: [bid('a', 'OUTBID')] })[0].text, 'Bạn bị vượt giá ở một phiên đấu giá')
})

test('todo is empty when there is nothing to do and is cut to the limit', () => {
  assert.deepEqual(todoItems({}), [])
  assert.deepEqual(todoItems({ bidding: [bid('a', 'LEADING'), bid('b', 'WON')] }), [])
  const many = Array.from({ length: MAX_TODO + 4 }, (_, i) => bid(String(i), 'OUTBID', 'X'))
  assert.equal(todoItems({ bidding: many }).length, MAX_TODO)
})

test('money is shown in Vietnamese format', () => {
  assert.equal(formatMoney(1250000), '1.250.000 đ')
})
