import assert from 'node:assert/strict'
import test from 'node:test'
import { CART_CHANGED, cartSummary } from './cartSummary.js'

test('the count adds up quantities, not lines', () => {
  const cart = { items: [{ quantity: 2, subtotal: 200 }, { quantity: 3, subtotal: 300 }], totalAmount: 500 }
  assert.deepEqual(cartSummary(cart), { count: 5, total: 500 })
})

test('the total falls back to the line subtotals when the server sent none', () => {
  assert.deepEqual(cartSummary({ items: [{ quantity: 1, subtotal: 120 }, { quantity: 1, subtotal: '80' }] }), { count: 2, total: 200 })
})

test('a missing, empty or odd cart is zero', () => {
  assert.deepEqual(cartSummary(null), { count: 0, total: 0 })
  assert.deepEqual(cartSummary({}), { count: 0, total: 0 })
  assert.deepEqual(cartSummary({ items: [], totalAmount: 0 }), { count: 0, total: 0 })
  assert.deepEqual(cartSummary({ items: [{ quantity: 'x' }] }), { count: 0, total: 0 })
})

test('the server total wins even when it differs from the lines', () => {
  assert.equal(cartSummary({ items: [{ quantity: 1, subtotal: 100 }], totalAmount: 90 }).total, 90)
})

test('the event has a stable name', () => {
  assert.equal(CART_CHANGED, 'cart:changed')
})
