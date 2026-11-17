import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAuctionBody, reserveNote, sellerReserveNote, toLocalInput, validateAuctionForm } from './auctionForm.js'

const NOW = Date.parse('2026-11-17T03:00:00Z')
const at = (minutes) => toLocalInput(new Date(NOW + minutes * 60000))
const form = (over = {}) => ({
  productId: 'p1', startingPrice: '500000', bidIncrement: '50000', reservePrice: '',
  startTime: at(10), endTime: at(10 + 24 * 60), ...over,
})

test('a complete form with no reserve price is valid', () => {
  assert.deepEqual(validateAuctionForm(form(), { now: NOW }), {})
})

test('the reserve price is optional, but when given it must reach the starting price', () => {
  assert.deepEqual(validateAuctionForm(form({ reservePrice: '800000' }), { now: NOW }), {})
  assert.deepEqual(validateAuctionForm(form({ reservePrice: '500000' }), { now: NOW }), {})
  assert.ok(validateAuctionForm(form({ reservePrice: '499999' }), { now: NOW }).reservePrice)
  assert.ok(validateAuctionForm(form({ reservePrice: '-1' }), { now: NOW }).reservePrice)
  assert.ok(validateAuctionForm(form({ reservePrice: 'abc' }), { now: NOW }).reservePrice)
})

test('a blank reserve price is the same as none, whitespace included', () => {
  assert.equal(validateAuctionForm(form({ reservePrice: '   ' }), { now: NOW }).reservePrice, undefined)
})

test('product and prices are required and must be positive', () => {
  const errors = validateAuctionForm(form({ productId: '', startingPrice: '0', bidIncrement: '' }), { now: NOW })
  assert.ok(errors.productId)
  assert.ok(errors.startingPrice)
  assert.ok(errors.bidIncrement)
})

test('end must follow the start, and the window must be 60 minutes to 7 days', () => {
  const start = at(10)
  const win = (minutes) => toLocalInput(new Date(NOW + (10 + minutes) * 60000))
  assert.ok(validateAuctionForm(form({ startTime: start, endTime: start }), { now: NOW }).endTime)
  assert.ok(validateAuctionForm(form({ endTime: win(59) }), { now: NOW }).endTime)
  assert.equal(validateAuctionForm(form({ endTime: win(60) }), { now: NOW }).endTime, undefined)
  assert.equal(validateAuctionForm(form({ endTime: win(168 * 60) }), { now: NOW }).endTime, undefined)
  assert.ok(validateAuctionForm(form({ endTime: win(168 * 60 + 1) }), { now: NOW }).endTime)
})

test('a start time in the past is refused, a little clock drift is not', () => {
  assert.ok(validateAuctionForm(form({ startTime: at(-30), endTime: at(24 * 60) }), { now: NOW }).startTime)
  assert.equal(validateAuctionForm(form({ startTime: toLocalInput(new Date(NOW - 20000)) }), { now: NOW }).startTime, undefined)
})

test('the request body carries numbers and ISO times, and the reserve price only when it is given', () => {
  const withReserve = buildAuctionBody(form({ reservePrice: '800000' }))
  assert.equal(withReserve.productId, 'p1')
  assert.equal(withReserve.startingPrice, 500000)
  assert.equal(withReserve.bidIncrement, 50000)
  assert.equal(withReserve.reservePrice, 800000)
  assert.match(withReserve.startTime, /^\d{4}-\d{2}-\d{2}T.*Z$/)
  assert.equal('reservePrice' in buildAuctionBody(form()), false)
  assert.equal('reservePrice' in buildAuctionBody(form({ reservePrice: '  ' })), false)
})

test('datetime-local value follows the local clock and pads every part', () => {
  assert.equal(toLocalInput(new Date(2026, 10, 7, 9, 5)), '2026-11-07T09:05')
})

test('bidders only learn whether a reserve exists and whether it is met, never its amount', () => {
  assert.equal(reserveNote({ status: 'ACTIVE', hasReserve: false, reserveMet: false }), null)
  assert.deepEqual(reserveNote({ status: 'ACTIVE', hasReserve: true, reserveMet: false }), { tone: 'warn', text: 'Phiên có giá sàn: giá hiện tại chưa đạt giá sàn.' })
  assert.deepEqual(reserveNote({ status: 'ACTIVE', hasReserve: true, reserveMet: true }), { tone: 'ok', text: 'Phiên có giá sàn: đã đạt giá sàn, người dẫn đầu sẽ thắng khi hết giờ.' })
})

test('an ended auction explains when bids never reached the reserve', () => {
  const ended = { status: 'ENDED', hasReserve: true, reserveMet: false }
  assert.match(reserveNote({ ...ended, currentHighestBid: 700000 }).text, /không có người thắng/)
  assert.equal(reserveNote({ ...ended, currentHighestBid: null }), null)
  assert.equal(reserveNote({ status: 'ENDED', hasReserve: true, reserveMet: true, currentHighestBid: 900000 }), null)
})

test('the seller sees the amount of the hidden reserve and whether it was met', () => {
  assert.equal(sellerReserveNote({ reservePrice: null, reserveMet: false }), null)
  assert.deepEqual(sellerReserveNote({ reservePrice: 800000, reserveMet: false }), { amount: 800000, met: false, text: 'Giá sàn 800.000 đ: chưa đạt' })
  assert.deepEqual(sellerReserveNote({ reservePrice: 800000, reserveMet: true }), { amount: 800000, met: true, text: 'Giá sàn 800.000 đ: đã đạt' })
})
