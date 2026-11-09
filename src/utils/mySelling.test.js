import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isSeller, saleOutcome, summarizeSelling } from './mySelling.js'

const now = new Date('2026-11-09T12:00:00Z')

test('only the SELLER role gets the page', () => {
  assert.equal(isSeller({ role: 'SELLER' }), true)
  assert.equal(isSeller({ role: 'BUYER' }), false)
  assert.equal(isSeller({ role: 'ADMIN' }), false)
  assert.equal(isSeller(null), false)
  assert.equal(isSeller(undefined), false)
})

test('an auction that is not over has no outcome yet', () => {
  assert.equal(saleOutcome({ status: 'ACTIVE' }, now), null)
  assert.equal(saleOutcome({ status: 'PENDING' }, now), null)
  assert.equal(saleOutcome({ status: 'CANCELLED' }, now), null)
})

test('an ended auction without a winner was not sold', () => {
  assert.deepEqual(saleOutcome({ status: 'ENDED', winnerId: null }, now), { kind: 'NO_WINNER' })
})

test('a paid auction is PAID with the final price', () => {
  const item = { status: 'ENDED', winnerId: 'w', finalPrice: 500, paidAt: '2026-11-09T10:00:00Z', paymentDeadline: '2026-11-10T00:00:00Z' }
  assert.deepEqual(saleOutcome(item, now), { kind: 'PAID', amount: 500 })
})

test('an unpaid auction is awaiting payment before the deadline and overdue after it', () => {
  const base = { status: 'ENDED', winnerId: 'w', finalPrice: 500, paidAt: null }
  assert.equal(saleOutcome({ ...base, paymentDeadline: '2026-11-10T00:00:00Z' }, now).kind, 'AWAITING_PAYMENT')
  assert.equal(saleOutcome({ ...base, paymentDeadline: '2026-11-08T00:00:00Z' }, now).kind, 'OVERDUE')
})

test('an ended auction with a winner but no deadline is still awaiting payment, not overdue', () => {
  const item = { status: 'ENDED', winnerId: 'w', finalPrice: 500, paidAt: null, paymentDeadline: null }
  assert.equal(saleOutcome(item, now).kind, 'AWAITING_PAYMENT')
})

test('the summary counts live auctions and the bids on them only', () => {
  const items = [
    { status: 'ACTIVE', bidCount: 4 },
    { status: 'ACTIVE', bidCount: 0 },
    { status: 'ENDED', bidCount: 9 },
    { status: 'PENDING', bidCount: 0 },
  ]
  assert.deepEqual(summarizeSelling(items), { live: 2, liveBids: 4 })
  assert.deepEqual(summarizeSelling([]), { live: 0, liveBids: 0 })
})
