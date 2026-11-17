// Pure helpers for the invoice page, kept apart from React so `npm test` covers them.

// The server builds an invoice only from a paid order, and keeps it after a refund (it was still issued).
export function canShowInvoice(order) {
  return order?.status === 'PAID' || order?.status === 'REFUNDED'
}

// The invoice lists the goods and one total. Anything the order charged besides the goods (shipping) or took off
// (a discount) is the difference, so the page can show a line for it without the server sending a breakdown.
export function invoiceTotals(invoice) {
  const itemsTotal = (invoice.items ?? []).reduce((sum, item) => sum + Number(item.subtotal), 0)
  const total = Number(invoice.totalAmount)
  return { itemsTotal, otherAmount: total - itemsTotal, total }
}

const STATUS_TEXT = { PAID: 'Đã thanh toán', REFUNDED: 'Đã hoàn tiền' }

export function invoiceStatusText(status) {
  return STATUS_TEXT[status] ?? status
}

const issuedFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

// "00:30 17/11/2026", in Vietnam time whatever the browser's own zone is; '' when there is no usable date.
export function invoiceIssuedAt(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(issuedFormat.formatToParts(date).map((part) => [part.type, part.value]))
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`
}

export function invoiceErrorMessage(err) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  if (code === 'INVOICE_NOT_AVAILABLE') return 'Đơn này chưa thanh toán nên chưa có hóa đơn.'
  if (code === 'NOT_ALLOWED_TO_VIEW_INVOICE' || status === 403) return 'Bạn không có quyền xem hóa đơn của đơn này.'
  if (status === 404) return 'Không tìm thấy đơn hàng này.'
  return 'Không tải được hóa đơn, vui lòng thử lại.'
}
