import test from 'node:test'
import assert from 'node:assert/strict'
import { canShowInvoice, invoiceErrorMessage, invoiceIssuedAt, invoiceStatusText, invoiceTotals } from './invoice.js'

const invoice = (over = {}) => ({
  invoiceNumber: 'INV-2026-3F9A1C2B', orderId: 'o1', buyerId: 'b1', orderStatus: 'PAID', issuedAt: '2026-11-16T10:30:00Z',
  totalAmount: 350000,
  items: [{ productName: 'Ví da', unitPrice: 160000, quantity: 2, subtotal: 320000 }],
  ...over,
})

test('an invoice exists only once the order is paid, and stays after a refund', () => {
  assert.equal(canShowInvoice({ status: 'PAID' }), true)
  assert.equal(canShowInvoice({ status: 'REFUNDED' }), true)
  for (const status of ['PENDING_PAYMENT', 'CANCELLED', 'SHIPPED_UNPAID', undefined]) assert.equal(canShowInvoice({ status }), false, String(status))
  assert.equal(canShowInvoice(null), false)
})

test('totals separate the goods from everything else the order charged, such as shipping', () => {
  assert.deepEqual(invoiceTotals(invoice()), { itemsTotal: 320000, otherAmount: 30000, total: 350000 })
  assert.deepEqual(invoiceTotals(invoice({ totalAmount: 320000 })), { itemsTotal: 320000, otherAmount: 0, total: 320000 })
})

test('totals add several lines and tolerate numbers sent as text', () => {
  const many = invoice({ totalAmount: '500000', items: [{ subtotal: '200000' }, { subtotal: 300000 }] })
  assert.deepEqual(invoiceTotals(many), { itemsTotal: 500000, otherAmount: 0, total: 500000 })
})

test('a discount shows as a negative amount', () => {
  assert.equal(invoiceTotals(invoice({ totalAmount: 300000 })).otherAmount, -20000)
})

test('the status line says whether the order was later refunded', () => {
  assert.equal(invoiceStatusText('PAID'), 'Đã thanh toán')
  assert.equal(invoiceStatusText('REFUNDED'), 'Đã hoàn tiền')
  assert.equal(invoiceStatusText('SOMETHING_NEW'), 'SOMETHING_NEW')
})

test('the issue date is shown in Vietnam time, day first', () => {
  // 17:30 UTC on 16/11 is already 00:30 on 17/11 in Vietnam (UTC+7).
  assert.equal(invoiceIssuedAt('2026-11-16T17:30:00Z'), '00:30 17/11/2026')
  assert.equal(invoiceIssuedAt(null), '')
  assert.equal(invoiceIssuedAt('not a date'), '')
})

test('server refusals become sentences the person can act on', () => {
  const fail = (status, code) => ({ response: { status, data: { error: { code } } } })
  assert.match(invoiceErrorMessage(fail(409, 'INVOICE_NOT_AVAILABLE')), /chưa thanh toán/)
  assert.match(invoiceErrorMessage(fail(403, 'NOT_ALLOWED_TO_VIEW_INVOICE')), /không có quyền/)
  assert.match(invoiceErrorMessage(fail(404, 'ORDER_NOT_FOUND')), /không tìm thấy/i)
  assert.match(invoiceErrorMessage(fail(401, 'UNAUTHENTICATED')), /đăng nhập/)
  assert.equal(invoiceErrorMessage({}), 'Không tải được hóa đơn, vui lòng thử lại.')
})
