import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyBid, mergeBid, myStanding, nextMinBid } from './auctionLive.js'

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
