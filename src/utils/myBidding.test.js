import assert from 'node:assert/strict'
import { test } from 'node:test'
import { appendPage, filterItems, hasMorePages, summarize } from './myBidding.js'

const item = (auctionId, myStatus) => ({ auctionId, myStatus })

test('the next page is added after the ones shown', () => {
  const merged = appendPage([item('a', 'LEADING')], [item('b', 'OUTBID')])
  assert.deepEqual(merged.map((i) => i.auctionId), ['a', 'b'])
})

test('an auction that moved onto a later page is kept once, where it first appeared', () => {
  const shown = [item('a', 'LEADING'), item('b', 'OUTBID')]
  const merged = appendPage(shown, [item('b', 'OUTBID'), item('c', 'WON')])
  assert.deepEqual(merged.map((i) => i.auctionId), ['a', 'b', 'c'])
})

test('appendPage does not change the list it was given', () => {
  const shown = [item('a', 'LEADING')]
  appendPage(shown, [item('b', 'OUTBID')])
  assert.equal(shown.length, 1)
})

test('a full page may have a next one, a short page is the last', () => {
  assert.equal(hasMorePages(new Array(20).fill(item('x', 'WON'))), true)
  assert.equal(hasMorePages(new Array(19).fill(item('x', 'WON'))), false)
  assert.equal(hasMorePages([], 5), false)
  assert.equal(hasMorePages(new Array(5).fill(item('x', 'WON')), 5), true)
})

test('the filters split live from ended, and ALL keeps everything', () => {
  const items = [item('a', 'LEADING'), item('b', 'OUTBID'), item('c', 'WON'), item('d', 'LOST'), item('e', 'CANCELLED')]
  assert.deepEqual(filterItems(items, 'ACTIVE').map((i) => i.auctionId), ['a', 'b'])
  assert.deepEqual(filterItems(items, 'ENDED').map((i) => i.auctionId), ['c', 'd'])
  assert.equal(filterItems(items, 'ALL').length, 5)
})

test('an unknown filter falls back to everything', () => {
  assert.equal(filterItems([item('a', 'WON')], 'nonsense').length, 1)
})

test('the summary counts live auctions and the ones I lead', () => {
  const items = [item('a', 'LEADING'), item('b', 'OUTBID'), item('c', 'LEADING'), item('d', 'WON')]
  assert.deepEqual(summarize(items), { live: 3, leading: 2 })
  assert.deepEqual(summarize([]), { live: 0, leading: 0 })
})
