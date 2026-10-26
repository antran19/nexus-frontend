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
