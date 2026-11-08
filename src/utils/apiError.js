// The backend wraps failures as { success: false, error: { code, message, fieldErrors } }.
// Show the most specific text it gave (a field message first), else the caller's fallback.
export function errorMessage(err, fallback) {
  const apiError = err.response?.data?.error
  return apiError?.fieldErrors?.[0]?.message || apiError?.message || fallback
}

// Cart and checkout calls: turn the status/code pairs a shopper can actually hit into Vietnamese
// sentences. Only BUYER holds the CART/CHECKOUT privileges, so a seller or staff account gets a
// 403 PRIVILEGE_DENIED whose English text would otherwise be shown (or the generic fallback).
export function cartErrorMessage(err, fallback) {
  const status = err.response?.status
  const apiError = err.response?.data?.error

  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  if (status === 403) {
    return 'Chỉ tài khoản người mua mới dùng được giỏ hàng. Tài khoản người bán hoặc nhân viên không mua hàng được.'
  }
  if (apiError?.code === 'INSUFFICIENT_STOCK') {
    // The server text is like "Only 5 left of product <id>, requested 6".
    const left = /Only (\d+) left/.exec(apiError.message ?? '')
    return left ? `Kho chỉ còn ${left[1]} sản phẩm.` : 'Số lượng sản phẩm trong kho không đủ.'
  }
  if (apiError?.code === 'PRODUCT_NOT_AVAILABLE') return 'Sản phẩm này hiện không được bán.'
  return errorMessage(err, fallback)
}

// Placing a bid or a maximum: the status/code pairs a bidder can hit, in Vietnamese. A bid below the
// minimum is a 400 whose useful text is in fieldErrors, which errorMessage already prefers.
export function bidErrorMessage(err, fallback) {
  const status = err.response?.status
  const code = err.response?.data?.error?.code

  if (status === 401) return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'
  if (code === 'INSUFFICIENT_TRUST_TO_BID') return 'Điểm uy tín của bạn chưa đủ để đặt giá ở phiên này.'
  if (code === 'AUCTION_NOT_ACTIVE') return 'Phiên đấu giá này không còn nhận giá.'
  if (code === 'AUCTION_ENDED') return 'Phiên đấu giá đã hết giờ.'
  if (code === 'SELLER_CANNOT_BID_OWN_AUCTION') return 'Người bán không thể đặt giá phiên của chính mình.'
  if (code === 'AUTO_BID_CANNOT_BE_LOWERED') return 'Mức tối đa chỉ được nâng lên, không được hạ xuống.'
  if (status === 403) return 'Tài khoản của bạn không có quyền đặt giá.'
  return errorMessage(err, fallback)
}
