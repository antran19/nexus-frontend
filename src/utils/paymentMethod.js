// Pure helpers for paying an order by card or in cash, kept apart from React so `npm test` can cover them.

export const CARD = 'STRIPE_CARD'
export const CASH = 'CASH'

export const PAYMENT_LABEL = {
  [CARD]: 'Thẻ (Stripe)',
  [CASH]: 'Tiền mặt khi nhận hàng',
}

// Orders from before the choice existed have no method: they were paid by card.
export function paymentMethodOf(order) {
  return order?.paymentMethod === CASH ? CASH : CARD
}

export function isCash(order) {
  return paymentMethodOf(order) === CASH
}

// Cash can be chosen for an order that still waits for payment and was not won at an auction (an auction order has its
// own payment deadline). The server also needs one seller and an address, and says so if they are missing.
export function canChooseCash(order) {
  return order?.status === 'AWAITING_PAYMENT' && !order.auctionId
}

// The seller has something to do on a cash order only while it waits: confirm that the money arrived.
export function needsCashConfirmation(order) {
  return order?.status === 'AWAITING_PAYMENT' && isCash(order)
}

// The sentences for the answers choosing a method or confirming cash can get.
export function paymentChoiceError(err, fallback) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  switch (code) {
    case 'CASH_NOT_AVAILABLE_FOR_AUCTION_ORDER':
      return 'Đơn thắng từ phiên đấu giá phải thanh toán bằng thẻ trước hạn thanh toán của phiên.'
    case 'CASH_REQUIRES_SINGLE_SELLER':
      return 'Thanh toán tiền mặt chỉ dùng được khi tất cả sản phẩm trong đơn thuộc cùng một người bán.'
    case 'SHIPPING_ADDRESS_REQUIRED':
      return 'Hãy nhập địa chỉ giao hàng trước khi chọn thanh toán tiền mặt.'
    case 'PAYMENT_METHOD_NOT_STRIPE':
      return 'Đơn này đang chọn thanh toán tiền mặt. Hãy chuyển sang thanh toán thẻ nếu muốn trả qua Stripe.'
    case 'PAYMENT_METHOD_NOT_CASH':
      return 'Đơn này không thanh toán bằng tiền mặt.'
    case 'ORDER_NOT_AWAITING_PAYMENT':
      return 'Đơn này không còn ở trạng thái chờ thanh toán (đã thanh toán, đã hủy hoặc hết hạn). Danh sách sẽ được tải lại.'
    case 'NOT_THE_SELLER':
      return 'Chỉ người bán của đơn này mới xác nhận được tiền mặt.'
    case 'NOT_THE_BUYER':
      return 'Đơn này không phải của bạn.'
    case 'ORDER_NOT_FOUND':
      return 'Không tìm thấy đơn này. Danh sách sẽ được tải lại.'
    default:
      return fallback
  }
}
