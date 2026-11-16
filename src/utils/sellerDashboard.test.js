import assert from 'node:assert/strict'
import test from 'node:test'
import { orderStatsForSeller, sellerTodo, sellingStats } from './sellerDashboard.js'

const NOW = new Date('2026-11-16T10:00:00Z')
const ME = 'seller-1'
const auction = (auctionId, fields) => ({ auctionId, productId: `p-${auctionId}`, bidCount: 0, ...fields })
const order = (id, status, subtotal, extra = {}) => ({ id, status, items: [{ sellerId: ME, subtotal }, { sellerId: 'other', subtotal: 1000 }], ...extra })

test('sellingStats counts live auctions with their bids and what the finished ones left', () => {
  const items = [
    auction('a', { status: 'ACTIVE', bidCount: 4 }),
    auction('b', { status: 'ACTIVE', bidCount: 1 }),
    auction('c', { status: 'PENDING' }),
    auction('d', { status: 'ENDED', winnerId: 'w', paidAt: '2026-11-15T00:00:00Z', finalPrice: 100 }),
    auction('e', { status: 'ENDED', winnerId: 'w', paymentDeadline: '2026-11-17T00:00:00Z', finalPrice: 100 }),
    auction('f', { status: 'ENDED', winnerId: 'w', paymentDeadline: '2026-11-15T00:00:00Z', finalPrice: 100 }),
    auction('g', { status: 'ENDED' }),
    auction('h', { status: 'CANCELLED' }),
  ]
  assert.deepEqual(sellingStats(items, NOW), { live: 2, liveBids: 5, pending: 1, paid: 1, awaitingPayment: 1, overdue: 1, unsold: 1 })
})

test('orderStatsForSeller counts by state and adds only my own lines', () => {
  const orders = [
    order('1', 'PAID', 200000, { shippedAt: null }),
    order('2', 'PAID', 300000, { shippedAt: '2026-11-15T00:00:00Z' }),
    order('3', 'AWAITING_PAYMENT', 50000),
    order('4', 'CANCELLED', 70000),
    order('5', 'REFUNDED', 90000),
  ]
  assert.deepEqual(orderStatsForSeller(orders, ME), { toShip: 1, shipped: 1, revenue: 500000, awaitingAmount: 50000 })
  assert.deepEqual(orderStatsForSeller([], ME), { toShip: 0, shipped: 0, revenue: 0, awaitingAmount: 0 })
})

test('the todo list has orders to ship first, then overdue payments, and links to the right pages', () => {
  const todo = sellerTodo(
    {
      items: [auction('f', { status: 'ENDED', winnerId: 'w', paymentDeadline: '2026-11-15T00:00:00Z', finalPrice: 100000, productName: 'Đồng hồ' })],
      orders: [order('abcdef123456', 'PAID', 200000, { shippedAt: null }), order('x', 'PAID', 1, { shippedAt: '2026-11-15T00:00:00Z' })],
    },
    ME,
    NOW,
  )
  assert.deepEqual(todo.map((item) => item.tone), ['ship', 'late'])
  assert.equal(todo[0].text, 'Đơn #abcdef12 đã thanh toán 200.000 đ, cần giao')
  assert.equal(todo[0].to, '/me/selling/orders')
  assert.equal(todo[1].text, 'Người thắng Đồng hồ đã quá hạn thanh toán 100.000 đ')
  assert.equal(todo[1].to, '/me/selling')
})

test('nothing to do gives an empty list', () => {
  assert.deepEqual(sellerTodo({}, ME, NOW), [])
})
