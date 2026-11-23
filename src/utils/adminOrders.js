// Pure helpers for the staff's order page (all orders, refunds, returns), kept apart from React so `npm test`
// can cover them.

import { endOfDay, PAGE_SIZE, startOfDay, withoutEmpty } from './orderQuery.js'

export { endOfDay, hasNextPage, PAGE_SIZE, startOfDay, validateDays } from './orderQuery.js'

export const MAX_REASON_LENGTH = 500
// The server keeps a refund reason in 255 characters; longer is refused (after nothing was refunded).
export const MAX_REFUND_REASON_LENGTH = 255

// Admin and support staff see every order and handle refunds and returns; the server checks the privilege again.
export function isStaff(user) {
  return user?.role === 'ADMIN' || user?.role === 'SUPPORT_STAFF'
}

// One tab per thing the staff has to decide. `status` is what the server filters by (no status = every order);
// PAID and SHIPPED are both PAID orders on the server, `matches` then splits them by whether the seller shipped.
export const STAFF_TABS = [
  { value: 'PAID', label: 'Đã thanh toán', status: 'PAID', matches: (order) => order.status === 'PAID' && !order.shippedAt },
  { value: 'SHIPPED', label: 'Đã giao', status: 'PAID', matches: (order) => order.status === 'PAID' && Boolean(order.shippedAt) },
  { value: 'REFUNDED', label: 'Đã hoàn tiền', status: 'REFUNDED', matches: (order) => order.status === 'REFUNDED' },
  { value: 'AWAITING', label: 'Chờ thanh toán', status: 'AWAITING_PAYMENT', matches: (order) => order.status === 'AWAITING_PAYMENT' },
  { value: 'CANCELLED', label: 'Đã hủy', status: 'CANCELLED', matches: (order) => order.status === 'CANCELLED' },
  { value: 'ALL', label: 'Tất cả', status: undefined, matches: () => true },
]

export const PAYMENT_FILTERS = [
  { value: '', label: 'Mọi cách thanh toán' },
  { value: 'STRIPE_CARD', label: 'Thẻ' },
  { value: 'CASH', label: 'Tiền mặt' },
]

// The query the server's GET /orders understands for the tab, payment method and days chosen; empty choices are left out.
export function buildOrderQuery({ tab, paymentMethod, fromDay, toDay, page = 0 }) {
  const status = (STAFF_TABS.find((entry) => entry.value === tab) ?? STAFF_TABS[0]).status
  return withoutEmpty({ page, size: PAGE_SIZE, status, paymentMethod: paymentMethod || undefined, from: startOfDay(fromDay), to: endOfDay(toDay) })
}

export function filterStaffOrders(orders, tabValue) {
  const tab = STAFF_TABS.find((entry) => entry.value === tabValue) ?? STAFF_TABS[0]
  return orders.filter(tab.matches)
}

// Search by a piece of the order id, the buyer id or the auction id; empty search keeps everything.
export function matchesSearch(order, query) {
  const text = String(query ?? '').trim().toLowerCase()
  if (!text) return true
  return [order.id, order.buyerId, order.auctionId].some((value) => String(value ?? '').toLowerCase().includes(text))
}

// Newest first, whatever order the server answered in. The list given is not changed.
export function newestFirst(orders) {
  return [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

// Only a paid order can be refunded; refunding one that is already refunded is harmless on the server.
export function canRefund(order) {
  return order.status === 'PAID'
}

// A return only makes sense for goods that left the seller and were refunded: refunded and shipped. An order refunded
// before shipping gets its goods back into stock by itself.
export function canRequestReturn(order) {
  return order.status === 'REFUNDED' && Boolean(order.shippedAt)
}

// A message for the reason box, or '' when it can be sent. Both refund and return need a reason.
export function validateReason(reason, limit = MAX_REASON_LENGTH) {
  const text = String(reason ?? '').trim()
  if (!text) return 'Vui lòng nhập lý do.'
  if (text.length > limit) return `Lý do tối đa ${limit} ký tự.`
  return ''
}

// What the server remembers of a refund: why, who, when and Stripe's id of it. null for an order that is not refunded or
// was refunded before this was kept (the buyer's page shows only the reason and the time, the staff page all of it).
export function refundDetails(order) {
  const refund = order?.refund
  if (order?.status !== 'REFUNDED' || !refund?.refundedAt) return null
  return { reason: refund.reason ?? '', by: refund.refundedBy ?? '', at: refund.refundedAt, stripeRefundId: refund.stripeRefundId ?? '' }
}

// What happens to the goods after a refund, so the staff knows whether there is a next step.
export function refundNextStep(order) {
  if (order.status !== 'REFUNDED') return ''
  return order.shippedAt
    ? 'Hàng đã giao nên chưa về kho: hãy mở yêu cầu trả hàng để nhận lại hàng.'
    : 'Hàng chưa giao nên đã được trả về kho tự động.'
}

export const RETURN_TABS = [
  { value: 'REQUESTED', label: 'Chờ xử lý' },
  { value: 'RECEIVED', label: 'Đã nhận hàng' },
  { value: 'REJECTED', label: 'Đã từ chối' },
]

export const RETURN_STATUS_LABEL = { REQUESTED: 'Chờ xử lý', RECEIVED: 'Đã nhận hàng', REJECTED: 'Đã từ chối' }

// Takes an answered return request out of the list that is on screen.
export function removeReturn(list, id) {
  return list.filter((item) => item.id !== id)
}

// Puts the order the server answered back in the list, leaving the others and the original list alone.
export function replaceOrder(orders, updated) {
  return orders.map((order) => (order.id === updated.id ? updated : order))
}

function codeOf(err) {
  return err?.response?.data?.error?.code
}

// The sentences for the answers a refund can get. The refund also goes to the payment provider, so a failure there
// is a different message from a refused state.
export function refundErrorMessage(err) {
  const status = err?.response?.status
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  switch (codeOf(err)) {
    case 'ORDER_NOT_REFUNDABLE':
      return 'Đơn này chưa thanh toán hoặc đã bị hủy nên không hoàn tiền được. Danh sách sẽ được tải lại.'
    case 'ORDER_NOT_FOUND':
      return 'Không tìm thấy đơn này. Danh sách sẽ được tải lại.'
    default:
      if (status === 403) return 'Chỉ quản trị viên hoặc nhân viên hỗ trợ mới hoàn tiền được.'
      if (status === 400) return 'Hãy nhập lý do hoàn tiền.'
      return 'Không hoàn tiền được (có thể cổng thanh toán đang lỗi). Vui lòng thử lại.'
  }
}

export function returnErrorMessage(err) {
  const status = err?.response?.status
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  switch (codeOf(err)) {
    case 'RETURN_NOT_APPLICABLE':
      return 'Chỉ đơn đã giao và đã hoàn tiền mới mở được yêu cầu trả hàng.'
    case 'RETURN_ALREADY_REQUESTED':
      return 'Đơn này đã có một yêu cầu trả hàng đang chờ xử lý (xem ở mục "Trả hàng").'
    case 'RETURN_REQUEST_NOT_FOUND':
      return 'Không tìm thấy yêu cầu trả hàng này. Danh sách sẽ được tải lại.'
    case 'ORDER_NOT_FOUND':
      return 'Không tìm thấy đơn của yêu cầu này.'
    default:
      if (status === 403) return 'Chỉ quản trị viên hoặc nhân viên hỗ trợ mới xử lý được trả hàng.'
      if (status === 400) return 'Hãy nhập lý do trả hàng.'
      return 'Không xử lý được yêu cầu trả hàng. Vui lòng thử lại.'
  }
}
