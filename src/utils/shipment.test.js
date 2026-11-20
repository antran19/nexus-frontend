import assert from 'node:assert/strict'
import test from 'node:test'
import { canConfirmReceived, carrierName, confirmReceivedError, shipmentStatusLabel, shipmentSteps } from './shipment.js'

const sent = (over = {}) => ({
  shippedAt: '2026-11-20T10:00:00Z',
  shipment: { carrier: 'SIMULATED', trackingCode: 'NXS123', status: 'SHIPPED', deliveredAt: null, receivedAt: null, ...over },
})
const failure = (status, code) => ({ response: { status, data: { error: { code } } } })

test('every status has a Vietnamese label, and no status says it was not sent', () => {
  assert.equal(shipmentStatusLabel('SHIPPED'), 'Đã gửi hàng')
  assert.equal(shipmentStatusLabel('IN_TRANSIT'), 'Đang vận chuyển')
  assert.equal(shipmentStatusLabel('DELIVERED'), 'Đã giao tới nơi')
  assert.equal(shipmentStatusLabel('RECEIVED'), 'Đã nhận hàng')
  assert.equal(shipmentStatusLabel(undefined), 'Chưa gửi hàng')
})

test('carriers are shown by name, an unknown one by its own code', () => {
  assert.equal(carrierName('SIMULATED'), 'Nexus Express (mô phỏng)')
  assert.equal(carrierName('GHN'), 'Giao Hàng Nhanh')
  assert.equal(carrierName('OTHER'), 'OTHER')
  assert.equal(carrierName(null), '')
})

test('the buyer can confirm only a parcel that was delivered and not yet received', () => {
  assert.equal(canConfirmReceived(sent({ status: 'DELIVERED' })), true)
  assert.equal(canConfirmReceived(sent({ status: 'IN_TRANSIT' })), false)
  assert.equal(canConfirmReceived(sent({ status: 'RECEIVED' })), false)
  assert.equal(canConfirmReceived({ shippedAt: '2026-11-20T10:00:00Z' }), false)
  assert.equal(canConfirmReceived(null), false)
})

test('the steps follow the parcel and carry the time each one happened', () => {
  const delivered = sent({ status: 'DELIVERED', deliveredAt: '2026-11-20T10:01:00Z' })
  const steps = shipmentSteps(delivered)

  assert.deepEqual(steps.map((step) => step.key), ['SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RECEIVED'])
  assert.deepEqual(steps.map((step) => step.done), [true, true, true, false])
  assert.equal(steps[0].time, '2026-11-20T10:00:00Z')
  assert.equal(steps[1].time, null)
  assert.equal(steps[2].time, '2026-11-20T10:01:00Z')
})

test('a received parcel has every step done, with the time of the receipt', () => {
  const steps = shipmentSteps(sent({ status: 'RECEIVED', deliveredAt: 'd', receivedAt: 'r' }))

  assert.deepEqual(steps.map((step) => step.done), [true, true, true, true])
  assert.equal(steps[3].time, 'r')
})

test('an order shipped before carriers existed shows one done step, and an unshipped one shows none', () => {
  assert.deepEqual(shipmentSteps({ shippedAt: '2026-11-20T10:00:00Z' }).map((step) => step.done), [true, false, false, false])
  assert.deepEqual(shipmentSteps({}).map((step) => step.done), [false, false, false, false])
  assert.deepEqual(shipmentSteps(null).map((step) => step.done), [false, false, false, false])
})

test('confirming receipt explains the refusals a buyer can hit', () => {
  assert.match(confirmReceivedError(failure(409, 'SHIPMENT_NOT_DELIVERED')), /chưa giao tới nơi/)
  assert.match(confirmReceivedError(failure(403, 'NOT_YOUR_ORDER')), /không phải đơn của bạn/)
  assert.match(confirmReceivedError(failure(401)), /hết hạn/)
  assert.match(confirmReceivedError(failure(404, 'ORDER_NOT_FOUND')), /Không tìm thấy/)
  assert.match(confirmReceivedError({}), /Vui lòng thử lại/)
})
