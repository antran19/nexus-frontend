// Pure helpers for the seller's order page, kept apart from React so `npm test` can cover them.

// An order is in exactly one tab: paid and not yet shipped is what the seller must act on.
export const ORDER_TABS = [
  { value: 'TO_SHIP', label: 'Cần giao', matches: (order) => order.status === 'PAID' && !order.shippedAt },
  { value: 'SHIPPED', label: 'Đã giao', matches: (order) => order.status === 'PAID' && Boolean(order.shippedAt) },
  { value: 'AWAITING', label: 'Chờ thanh toán', matches: (order) => order.status === 'AWAITING_PAYMENT' },
  { value: 'CLOSED', label: 'Đã hủy / hoàn tiền', matches: (order) => order.status === 'CANCELLED' || order.status === 'REFUNDED' },
]

export const STATUS_LABEL = {
  AWAITING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
}

export function filterOrders(orders, tabValue) {
  const tab = ORDER_TABS.find((entry) => entry.value === tabValue) ?? ORDER_TABS[0]
  return orders.filter(tab.matches)
}

// How many orders each tab holds, for the numbers on the tabs.
export function countByTab(orders) {
  return Object.fromEntries(ORDER_TABS.map((tab) => [tab.value, orders.filter(tab.matches).length]))
}

// An order can hold products of several sellers. This seller ships, and is shown, only their own lines.
export function myItems(order, sellerId) {
  return (order.items ?? []).filter((item) => item.sellerId === sellerId)
}

// What this seller's lines add up to (the order total also holds other sellers' lines).
export function myTotal(order, sellerId) {
  return myItems(order, sellerId).reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
}

// "Nguyễn Văn A · 0901234567 · 1 Lê Lợi, Quận 1, TP.HCM"; whatever is missing is left out.
export function addressLine(address) {
  if (!address) return 'Chưa có địa chỉ giao hàng'
  return [address.recipientName, address.phone, [address.addressLine, address.city].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ')
}

// Puts the order the server answered back in the list, leaving the others and the original list alone.
export function replaceOrder(orders, updated) {
  return orders.map((order) => (order.id === updated.id ? updated : order))
}

// The sentences for the answers marking an order as shipped can get.
export function shipErrorMessage(err) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  switch (code) {
    case 'ORDER_ALREADY_SHIPPED':
      return 'Đơn này đã được đánh dấu đã giao rồi. Danh sách sẽ được tải lại.'
    case 'ORDER_NOT_SHIPPABLE':
      return 'Đơn này chưa thanh toán hoặc đã bị hủy nên chưa giao được. Danh sách sẽ được tải lại.'
    case 'NOT_THE_SELLER':
      return 'Đơn này không có sản phẩm của bạn.'
    case 'ORDER_NOT_FOUND':
      return 'Không tìm thấy đơn này. Danh sách sẽ được tải lại.'
    default:
      return status === 403 ? 'Chỉ người bán mới đánh dấu đã giao được.' : 'Không đánh dấu được. Vui lòng thử lại.'
  }
}
