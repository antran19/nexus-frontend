// Pure helpers for the buyer's order page, kept apart from React so `npm test` can cover them.

// What the buyer sees for an order. A paid order that has not been shipped yet is "being prepared".
export function orderState(order) {
  switch (order.status) {
    case 'AWAITING_PAYMENT':
      return { key: 'AWAITING', label: 'Chờ thanh toán', className: 'text-amber-700 border-amber-300 bg-amber-50' }
    case 'PAID':
      return order.shippedAt
        ? { key: 'SHIPPED', label: 'Đã giao', className: 'text-green-700 border-green-300 bg-green-50' }
        : { key: 'PREPARING', label: 'Đang chuẩn bị hàng', className: 'text-blue-700 border-blue-300 bg-blue-50' }
    case 'REFUNDED':
      return { key: 'CLOSED', label: 'Đã hoàn tiền', className: 'text-red-700 border-red-300 bg-red-50' }
    case 'CANCELLED':
      return { key: 'CLOSED', label: 'Đã hủy', className: 'text-gray-600 border-gray-300 bg-gray-50' }
    default:
      return { key: 'CLOSED', label: order.status, className: 'text-gray-600 border-gray-300 bg-gray-50' }
  }
}

export const ORDER_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'AWAITING', label: 'Chờ thanh toán' },
  { value: 'PREPARING', label: 'Đang chuẩn bị' },
  { value: 'SHIPPED', label: 'Đã giao' },
  { value: 'CLOSED', label: 'Đã hủy / hoàn tiền' },
]

export function filterMyOrders(orders, filterValue) {
  if (filterValue === 'ALL') return orders
  return orders.filter((order) => orderState(order).key === filterValue)
}

// Newest first, whatever order the server answered in. The list given is not changed.
export function newestFirst(orders) {
  return [...orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

// Only an order still waiting for payment can be paid or cancelled.
export function canPay(order) {
  return order.status === 'AWAITING_PAYMENT'
}

export const canCancel = canPay

// An order won at an auction is created without an address; the server refuses to start the payment until
// one is set (SHIPPING_ADDRESS_REQUIRED).
export function needsAddress(order) {
  return !order.shippingAddress
}

export const EMPTY_ADDRESS = { recipientName: '', phone: '', addressLine: '', city: '' }

// A map field -> message; empty when the address can be sent. The server needs all four.
export function validateAddress(address) {
  const errors = {}
  if (!address.recipientName?.trim()) errors.recipientName = 'Vui lòng nhập tên người nhận.'
  else if (address.recipientName.trim().length > 100) errors.recipientName = 'Tên người nhận tối đa 100 ký tự.'
  if (!address.phone?.trim()) errors.phone = 'Vui lòng nhập số điện thoại.'
  if (!address.addressLine?.trim()) errors.addressLine = 'Vui lòng nhập địa chỉ.'
  if (!address.city?.trim()) errors.city = 'Vui lòng nhập tỉnh hoặc thành phố.'
  return errors
}

// The body of the address call: every field trimmed.
export function addressBody(address) {
  return Object.fromEntries(Object.keys(EMPTY_ADDRESS).map((key) => [key, String(address[key] ?? '').trim()]))
}

// Where Stripe sends the buyer back to after paying or leaving. Stripe fills in {CHECKOUT_SESSION_ID} itself.
export function paymentUrls(orderId, origin) {
  return {
    successUrl: `${origin}/payment/success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/payment/cancel?orderId=${orderId}`,
  }
}

// The server names the field that failed in error.fieldErrors; turn it into a map for the form.
export function addressFieldErrors(err) {
  const map = {}
  for (const item of err?.response?.data?.error?.fieldErrors ?? []) {
    const name = String(item.field ?? '').replace(/^shippingAddress\./, '')
    if (name in EMPTY_ADDRESS && !map[name]) map[name] = item.message
  }
  return map
}

// The sentences for the answers paying or cancelling can get.
export function orderActionError(err, fallback) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  switch (code) {
    case 'ORDER_NOT_AWAITING_PAYMENT':
    case 'ORDER_NOT_CANCELLABLE':
      return 'Đơn này không còn ở trạng thái chờ thanh toán (đã thanh toán, đã hủy hoặc hết hạn). Danh sách sẽ được tải lại.'
    case 'SHIPPING_ADDRESS_REQUIRED':
      return 'Hãy nhập địa chỉ giao hàng trước khi thanh toán.'
    case 'NOT_THE_BUYER':
      return 'Đơn này không phải của bạn.'
    case 'ORDER_NOT_FOUND':
      return 'Không tìm thấy đơn này. Danh sách sẽ được tải lại.'
    default:
      return fallback
  }
}
