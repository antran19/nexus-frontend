import assert from 'node:assert/strict'
import test from 'node:test'
import { canChooseCash, isCash, needsCashConfirmation, paymentChoiceError, paymentMethodOf, PAYMENT_LABEL } from './paymentMethod.js'

const awaiting = (extra = {}) => ({ status: 'AWAITING_PAYMENT', auctionId: null, ...extra })

test('an order without a method counts as paid by card', () => {
  assert.equal(paymentMethodOf({}), 'STRIPE_CARD')
  assert.equal(paymentMethodOf(null), 'STRIPE_CARD')
  assert.equal(paymentMethodOf({ paymentMethod: 'CASH' }), 'CASH')
  assert.equal(isCash({ paymentMethod: 'CASH' }), true)
  assert.equal(isCash({ paymentMethod: 'STRIPE_CARD' }), false)
})

test('both methods have a label', () => {
  assert.ok(PAYMENT_LABEL.STRIPE_CARD && PAYMENT_LABEL.CASH)
})

test('cash can be chosen only for an unpaid order that is not from an auction', () => {
  assert.equal(canChooseCash(awaiting()), true)
  assert.equal(canChooseCash(awaiting({ auctionId: 'a1' })), false)
  assert.equal(canChooseCash({ status: 'PAID', auctionId: null }), false)
  assert.equal(canChooseCash({ status: 'CANCELLED' }), false)
  assert.equal(canChooseCash(undefined), false)
})

test('the seller confirms only a cash order that is still waiting', () => {
  assert.equal(needsCashConfirmation(awaiting({ paymentMethod: 'CASH' })), true)
  assert.equal(needsCashConfirmation(awaiting({ paymentMethod: 'STRIPE_CARD' })), false)
  assert.equal(needsCashConfirmation({ status: 'PAID', paymentMethod: 'CASH' }), false)
})

test('every answer of the server has its own sentence, else the fallback', () => {
  const answer = (code, status = 409) => ({ response: { status, data: { error: { code } } } })
  for (const code of ['CASH_NOT_AVAILABLE_FOR_AUCTION_ORDER', 'CASH_REQUIRES_SINGLE_SELLER', 'SHIPPING_ADDRESS_REQUIRED', 'PAYMENT_METHOD_NOT_STRIPE', 'PAYMENT_METHOD_NOT_CASH', 'ORDER_NOT_AWAITING_PAYMENT', 'NOT_THE_SELLER', 'NOT_THE_BUYER', 'ORDER_NOT_FOUND']) {
    assert.notEqual(paymentChoiceError(answer(code), 'fallback'), 'fallback', code)
  }
  assert.match(paymentChoiceError(answer('X', 401), 'fallback'), /hết hạn/)
  assert.equal(paymentChoiceError(answer('SOMETHING_ELSE'), 'fallback'), 'fallback')
  assert.equal(paymentChoiceError(new Error('network'), 'fallback'), 'fallback')
})
