import assert from 'node:assert/strict'
import test from 'node:test'
import { bidErrorMessage, cartErrorMessage, errorMessage } from './apiError.js'

// The shape axios gives for a failed call: err.response.status and err.response.data.error.
const failure = (status, error) => ({ response: { status, data: { success: false, error } } })

test('errorMessage prefers the first field message, then the error message, then the fallback', () => {
  assert.equal(errorMessage(failure(400, { message: 'Validation failed', fieldErrors: [{ message: 'Giá quá thấp' }] }), 'Lỗi'), 'Giá quá thấp')
  assert.equal(errorMessage(failure(409, { message: 'Conflict happened' }), 'Lỗi'), 'Conflict happened')
  assert.equal(errorMessage(failure(500, {}), 'Lỗi'), 'Lỗi')
  assert.equal(errorMessage({ response: undefined }, 'Lỗi'), 'Lỗi')
  assert.equal(errorMessage({}, 'Lỗi'), 'Lỗi')
})

test('errorMessage ignores an empty field-error list and uses the message instead', () => {
  assert.equal(errorMessage(failure(400, { message: 'Bad request', fieldErrors: [] }), 'Lỗi'), 'Bad request')
})

test('cartErrorMessage explains the login and role problems in Vietnamese', () => {
  assert.match(cartErrorMessage(failure(401, { message: 'Unauthorized' }), 'Lỗi'), /hết hạn/)
  assert.match(cartErrorMessage(failure(403, { code: 'PRIVILEGE_DENIED', message: 'Access denied' }), 'Lỗi'), /người mua/)
})

test('cartErrorMessage turns the stock error into the number that is left', () => {
  const stock = failure(409, { code: 'INSUFFICIENT_STOCK', message: 'Only 5 left of product abc, requested 6' })
  assert.equal(cartErrorMessage(stock, 'Lỗi'), 'Kho chỉ còn 5 sản phẩm.')
  const noNumber = failure(409, { code: 'INSUFFICIENT_STOCK', message: 'No stock' })
  assert.equal(cartErrorMessage(noNumber, 'Lỗi'), 'Số lượng sản phẩm trong kho không đủ.')
  const noMessage = failure(409, { code: 'INSUFFICIENT_STOCK' })
  assert.equal(cartErrorMessage(noMessage, 'Lỗi'), 'Số lượng sản phẩm trong kho không đủ.')
})

test('cartErrorMessage knows a product that is not for sale and falls back for anything else', () => {
  assert.equal(cartErrorMessage(failure(409, { code: 'PRODUCT_NOT_AVAILABLE' }), 'Lỗi'), 'Sản phẩm này hiện không được bán.')
  assert.equal(cartErrorMessage(failure(500, { message: 'Boom' }), 'Lỗi'), 'Boom')
  assert.equal(cartErrorMessage({}, 'Lỗi'), 'Lỗi')
})

test('bidErrorMessage maps each code a bidder can hit to its own sentence', () => {
  const cases = {
    INSUFFICIENT_TRUST_TO_BID: /uy tín/,
    AUCTION_NOT_ACTIVE: /không còn nhận giá/,
    AUCTION_ENDED: /hết giờ/,
    SELLER_CANNOT_BID_OWN_AUCTION: /Người bán không thể/,
    AUTO_BID_CANNOT_BE_LOWERED: /không được hạ/,
  }
  for (const [code, expected] of Object.entries(cases)) {
    assert.match(bidErrorMessage(failure(409, { code, message: 'english' }), 'Lỗi'), expected, code)
  }
})

test('bidErrorMessage handles an expired login and a missing privilege', () => {
  assert.match(bidErrorMessage(failure(401, {}), 'Lỗi'), /hết hạn/)
  assert.match(bidErrorMessage(failure(403, { code: 'PRIVILEGE_DENIED' }), 'Lỗi'), /không có quyền đặt giá/)
})

test('bidErrorMessage lets a specific code win over the generic 403 text', () => {
  assert.match(bidErrorMessage(failure(403, { code: 'SELLER_CANNOT_BID_OWN_AUCTION' }), 'Lỗi'), /Người bán không thể/)
})

test('bidErrorMessage shows the field text of a bid below the minimum, else the fallback', () => {
  const low = failure(400, { message: 'Validation failed', fieldErrors: [{ message: 'Giá tối thiểu là 120.000 ₫' }] })
  assert.equal(bidErrorMessage(low, 'Lỗi'), 'Giá tối thiểu là 120.000 ₫')
  assert.equal(bidErrorMessage({}, 'Không đặt giá được'), 'Không đặt giá được')
})
