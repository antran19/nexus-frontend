import assert from 'node:assert/strict'
import { test } from 'node:test'
import { badgeLabel, markReadInList, notificationTarget, parsePayload, timeAgo } from './notifications.js'

test('the badge is empty at zero and caps at 9+', () => {
  assert.equal(badgeLabel(0), '')
  assert.equal(badgeLabel(undefined), '')
  assert.equal(badgeLabel(3), '3')
  assert.equal(badgeLabel(9), '9')
  assert.equal(badgeLabel(10), '9+')
})

test('time ago counts minutes, hours and days', () => {
  const now = Date.parse('2026-11-13T12:00:00Z')
  assert.equal(timeAgo('2026-11-13T11:59:40Z', now), 'vừa xong')
  assert.equal(timeAgo('2026-11-13T11:55:00Z', now), '5 phút trước')
  assert.equal(timeAgo('2026-11-13T09:00:00Z', now), '3 giờ trước')
  assert.equal(timeAgo('2026-11-11T12:00:00Z', now), '2 ngày trước')
  assert.equal(timeAgo('not a date', now), '')
})

test('a broken payload reads as empty instead of throwing', () => {
  assert.deepEqual(parsePayload({ payload: '{bad' }), {})
  assert.deepEqual(parsePayload({ payload: '"text"' }), {})
  assert.deepEqual(parsePayload({}), {})
  assert.deepEqual(parsePayload({ payload: '{"auctionId":"a1"}' }), { auctionId: 'a1' })
})

test('a won auction leads to its product, an outbid one to its auction', () => {
  assert.deepEqual(notificationTarget({ payload: '{"auctionId":"a1","productId":"p1"}' }), { productId: 'p1' })
  assert.deepEqual(notificationTarget({ payload: '{"auctionId":"a1","newHighestBid":120}' }), { auctionId: 'a1' })
})

test('events about an order lead to the order pages', () => {
  const payload = '{"auctionId":"a1","productId":"p1","orderId":"o1"}'
  assert.deepEqual(notificationTarget({ eventType: 'OrderShipped', payload }), { path: '/me/orders' })
  assert.deepEqual(notificationTarget({ eventType: 'AuctionWon', payload }), { path: '/me/orders' })
  assert.deepEqual(notificationTarget({ eventType: 'AuctionSettled', payload }), { path: '/me/orders' })
  assert.deepEqual(notificationTarget({ eventType: 'AuctionPaymentTimeout', payload }), { path: '/me/orders' })
  assert.deepEqual(notificationTarget({ eventType: 'OrderPaid', payload }), { path: '/me/selling/orders' })
})

test('an outbid or bid notice still leads to the auction, whatever its event name', () => {
  assert.deepEqual(notificationTarget({ eventType: 'Outbid', payload: '{"auctionId":"a1"}' }), { auctionId: 'a1' })
  assert.deepEqual(notificationTarget({ eventType: 'BidPlaced', payload: '{"auctionId":"a1"}' }), { auctionId: 'a1' })
})

test('a welcome notice leads nowhere', () => {
  assert.equal(notificationTarget({ payload: '{"userId":"u1","fullName":"An"}' }), null)
  assert.equal(notificationTarget({ payload: null }), null)
})

test('marking one as read leaves the others and the original list alone', () => {
  const list = [{ id: 'a', read: false }, { id: 'b', read: false }]
  const next = markReadInList(list, 'a')
  assert.deepEqual(next, [{ id: 'a', read: true }, { id: 'b', read: false }])
  assert.equal(list[0].read, false)
})

test('full ids in a message are shortened to their first 8 characters', async () => {
  const { shortenIds } = await import('./notifications.js')
  assert.equal(
    shortenIds('Bạn đã bị vượt giá trong phiên 6a320d9e-5841-4908-9720-066780e0bafc, giá hiện tại là 130000'),
    'Bạn đã bị vượt giá trong phiên #6a320d9e, giá hiện tại là 130000',
  )
  assert.equal(shortenIds('Chào mừng An'), 'Chào mừng An')
  assert.equal(shortenIds(null), '')
})
