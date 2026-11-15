import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyBid, bidLadder, endingSoon, mergeBid, myStanding, nextMinBid, timeLeft } from './auctionLive.js'

const auction = { startingPrice: '100', bidIncrement: '10', currentHighestBid: null, status: 'ACTIVE' }

test('the first bid only has to reach the starting price', () => {
  assert.equal(nextMinBid(auction), 100)
})

test('later bids must beat the current price by one increment', () => {
  assert.equal(nextMinBid({ ...auction, currentHighestBid: '130' }), 140)
})

test('a pushed bid becomes the shown price and leader', () => {
  const next = applyBid(auction, { amount: 120, bidderId: 'u1' })
  assert.equal(next.currentHighestBid, 120)
  assert.equal(next.currentHighestBidderId, 'u1')
})

test('a pushed bid lower than the price on screen is ignored', () => {
  const current = { ...auction, currentHighestBid: 200, currentHighestBidderId: 'u2' }
  assert.equal(applyBid(current, { amount: 150, bidderId: 'u1' }), current)
})

test('applyBid does not change the object it was given', () => {
  applyBid(auction, { amount: 120, bidderId: 'u1' })
  assert.equal(auction.currentHighestBid, null)
})

test('mergeBid puts a new bid first and never repeats one', () => {
  const list = [{ id: 'b1' }]
  assert.deepEqual(mergeBid(list, { id: 'b2' }).map((b) => b.id), ['b2', 'b1'])
  assert.equal(mergeBid(list, { id: 'b1' }), list)
})

test('standing is LEADING or OUTBID while active, WON or LOST once ended', () => {
  const active = { status: 'ACTIVE', currentHighestBidderId: 'me' }
  assert.equal(myStanding(active, 'me', true), 'LEADING')
  assert.equal(myStanding({ ...active, currentHighestBidderId: 'other' }, 'me', true), 'OUTBID')
  assert.equal(myStanding({ status: 'ENDED', winnerId: 'me' }, 'me', true), 'WON')
  assert.equal(myStanding({ status: 'ENDED', winnerId: 'other' }, 'me', true), 'LOST')
})

test('standing is null for someone who has not taken part, is signed out, or a pending auction', () => {
  const active = { status: 'ACTIVE', currentHighestBidderId: 'other' }
  assert.equal(myStanding(active, 'me', false), null)
  assert.equal(myStanding(active, undefined, true), null)
  assert.equal(myStanding({ status: 'PENDING' }, 'me', true), null)
})

test('bidLadder starts at the least allowed bid and climbs by whole increments', () => {
  const live = { currentHighestBid: 100000, bidIncrement: 10000, startingPrice: 50000 }
  assert.deepEqual(bidLadder(live), [
    { amount: 110000, delta: 10000 },
    { amount: 120000, delta: 20000 },
    { amount: 150000, delta: 50000 },
    { amount: 200000, delta: 100000 },
  ])
  assert.equal(bidLadder(live)[0].amount, nextMinBid(live))
})

test('bidLadder for a first bid begins at the starting price', () => {
  const first = { currentHighestBid: null, bidIncrement: 5000, startingPrice: 100000 }
  const ladder = bidLadder(first)
  assert.equal(ladder[0].amount, 100000)
  assert.equal(ladder[0].delta, 0)
  assert.deepEqual(ladder.map((step) => step.amount), [100000, 105000, 125000, 150000])
  // every offer is one the server accepts: not below nextMinBid
  assert.ok(ladder.every((step) => step.amount >= nextMinBid(first)))
})

test('bidLadder offers nothing when the increment is unusable', () => {
  assert.deepEqual(bidLadder({ currentHighestBid: 1, bidIncrement: 0, startingPrice: 1 }), [])
  assert.deepEqual(bidLadder({ currentHighestBid: 1, bidIncrement: 'x', startingPrice: 1 }), [])
  assert.deepEqual(bidLadder({ currentHighestBid: 1, startingPrice: 1 }), [])
})

test('timeLeft counts down in days and a clock, and says when it is over', () => {
  const end = Date.UTC(2026, 10, 15, 12, 0, 0)
  const at = (ms) => timeLeft(new Date(end).toISOString(), end - ms)
  assert.equal(at(4 * 60 * 1000 + 12 * 1000), '00:04:12')
  assert.equal(at(3600 * 1000 + 5 * 1000), '01:00:05')
  assert.equal(at(2 * 86400 * 1000 + 3 * 3600 * 1000 + 4 * 60 * 1000 + 5 * 1000), '2 ngày 03:04:05')
  assert.equal(at(0), 'Đã hết giờ')
  assert.equal(at(-1000), 'Đã hết giờ')
  assert.equal(timeLeft('not a date'), '')
})

test('endingSoon is true only in the last five minutes before the end', () => {
  const end = Date.UTC(2026, 10, 15, 12, 0, 0)
  const iso = new Date(end).toISOString()
  assert.equal(endingSoon(iso, end - 4 * 60 * 1000), true)
  assert.equal(endingSoon(iso, end - 6 * 60 * 1000), false)
  assert.equal(endingSoon(iso, end), false)
  assert.equal(endingSoon(iso, end + 1000), false)
})
