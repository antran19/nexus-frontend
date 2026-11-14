// Pure helpers for the staff's order page (all orders, refunds, returns), kept apart from React so `npm test`
// can cover them.

export const MAX_REASON_LENGTH = 500

// Admin and support staff see every order and handle refunds and returns; the server checks the privilege again.
export function isStaff(user) {
  return user?.role === 'ADMIN' || user?.role === 'SUPPORT_STAFF'
}

// One tab per thing the staff has to decide. An order that was paid and not shipped, or shipped, can be refunded.
export const STAFF_TABS = [
  { value: 'PAID', label: 'Đã thanh toán', matches: (order) => order.status === 'PAID' && !order.shippedAt },
  { value: 'SHIPPED', label: 'Đã giao', matches: (order) => order.status === 'PAID' && Boolean(order.shippedAt) },
  { value: 'REFUNDED', label: 'Đã hoàn tiền', matches: (order) => order.status === 'REFUNDED' },
  { value: 'AWAITING', label: 'Chờ thanh toán', matches: (order) => order.status === 'AWAITING_PAYMENT' },
  { value: 'CANCELLED', label: 'Đã hủy', matches: (order) => order.status === 'CANCELLED' },
  { value: 'ALL', label: 'Tất cả', matches: () => true },
]

export function filterStaffOrders(orders, tabValue) {
  const tab = STAFF_TABS.find((entry) => entry.value === tabValue) ?? STAFF_TABS[0]
  return orders.filter(tab.matches)
}

export function countByStaffTab(orders) {
  return Object.fromEntries(STAFF_TABS.map((tab) => [tab.value, orders.filter(tab.matches).length]))
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
export function validateReason(reason) {
  const text = String(reason ?? '').trim()
  if (!text) return 'Vui lòng nhập lý do.'
  if (text.length > MAX_REASON_LENGTH) return `Lý do tối đa ${MAX_REASON_LENGTH} ký tự.`
  return ''
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
