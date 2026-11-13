import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildRatingBody, canRate, ratingErrorMessage, reputationSummary, validateRating } from './ratings.js'

test('a seller nobody rated yet says so, others show average and count', () => {
  assert.equal(reputationSummary({ totalRatings: 0, averageRating: 0 }), 'Chưa có đánh giá')
  assert.equal(reputationSummary(null), 'Chưa có đánh giá')
  assert.equal(reputationSummary({ totalRatings: 12, averageRating: 4.5 }), '4.5 / 5 · 12 đánh giá')
  assert.equal(reputationSummary({ totalRatings: 3, averageRating: 4.3333 }), '4.3 / 5 · 3 đánh giá')
})

test('the stars must be a whole number from 1 to 5', () => {
  assert.equal(validateRating({ score: 5, comment: '' }), '')
  assert.notEqual(validateRating({ score: 0, comment: '' }), '')
  assert.notEqual(validateRating({ score: 6, comment: '' }), '')
  assert.notEqual(validateRating({ score: 3.5, comment: '' }), '')
  assert.notEqual(validateRating({ score: undefined, comment: '' }), '')
})

test('a comment of more than 500 characters is refused', () => {
  assert.equal(validateRating({ score: 4, comment: 'a'.repeat(500) }), '')
  assert.notEqual(validateRating({ score: 4, comment: 'a'.repeat(501) }), '')
})

test('the body trims the comment and leaves an empty one out', () => {
  assert.deepEqual(buildRatingBody({ score: '4', comment: '  Giao nhanh  ' }), { score: 4, comment: 'Giao nhanh' })
  assert.deepEqual(buildRatingBody({ score: 5, comment: '   ' }), { score: 5, comment: undefined })
})

test('each answer code gets its own sentence', () => {
  const err = (code, status = 409) => ({ response: { status, data: { error: { code } } } })
  assert.match(ratingErrorMessage(err('TRANSACTION_NOT_FOUND', 404)), /chưa giao hàng/)
  assert.match(ratingErrorMessage(err('RATING_ALREADY_SUBMITTED')), /đã đánh giá/)
  assert.match(ratingErrorMessage(err('NOT_A_PARTICIPANT', 403)), /tham gia/)
  assert.match(ratingErrorMessage(err('CANNOT_RATE_SELF')), /chính mình/)
  assert.match(ratingErrorMessage({ response: { status: 401, data: {} } }), /hết hạn/)
  assert.equal(ratingErrorMessage(err('SOMETHING_ELSE'), 'x'), 'x')
  assert.equal(ratingErrorMessage(undefined, 'x'), 'x')
})

test('only the winner of an auction can rate it', () => {
  assert.equal(canRate({ myStatus: 'WON' }), true)
  assert.equal(canRate({ myStatus: 'LOST' }), false)
  assert.equal(canRate({ myStatus: 'LEADING' }), false)
  assert.equal(canRate(undefined), false)
})
