// Pure helpers for the seller-request pages, kept apart from React so `npm test` can cover them.

export const STATUS_TABS = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Đã từ chối' },
]

export const STATUS_LABEL = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối' }

// Only an admin reviews requests. The role comes from the token, the server checks the privilege again.
export function isAdmin(user) {
  return user?.role === 'ADMIN'
}

// A buyer can ask. A seller or an admin already can sell, so the server answers ALREADY_SELLER: the
// profile page does not offer the button to them at all.
export function canRequestSeller(user) {
  return user?.role === 'BUYER'
}

// The names of the people who asked are looked up one by one; a person who cannot be found is shown by the
// first 8 characters of the id instead of leaving a hole in the list.
export function displayName(user, userId) {
  if (user?.fullName) return user.email ? `${user.fullName} (${user.email})` : user.fullName
  return `Người dùng #${String(userId ?? '').slice(0, 8)}`
}

// Takes a reviewed request out of the list that is on screen. The other tabs list other statuses, so the
// reviewed one simply leaves this one.
export function removeRequest(list, id) {
  return list.filter((item) => item.id !== id)
}

// The sentences for the answers a buyer can get when asking to sell. After an approval the role in the
// login token is still the old one, so the person is told to sign in again.
export function requestSellerMessage(err) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (status === 401) return { kind: 'error', text: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' }
  switch (code) {
    case 'SELLER_REQUEST_ALREADY_PENDING':
      return { kind: 'info', text: 'Bạn đã gửi yêu cầu rồi, đang chờ quản trị viên duyệt.' }
    case 'ALREADY_SELLER':
      return { kind: 'info', text: 'Tài khoản của bạn đã có quyền bán hàng. Hãy đăng xuất rồi đăng nhập lại để cập nhật quyền.' }
    default:
      return { kind: 'error', text: 'Không gửi được yêu cầu. Vui lòng thử lại.' }
  }
}

// The sentences for the answers an admin can get when reviewing.
export function reviewErrorMessage(err) {
  const code = err?.response?.data?.error?.code
  switch (code) {
    case 'SELLER_REQUEST_ALREADY_REVIEWED':
      return 'Yêu cầu này đã được xử lý trước đó. Danh sách sẽ được tải lại.'
    case 'SELLER_REQUEST_NOT_FOUND':
      return 'Không tìm thấy yêu cầu này. Danh sách sẽ được tải lại.'
    case 'USER_NOT_FOUND':
      return 'Người dùng này không còn tồn tại nên không duyệt được.'
    default:
      return err?.response?.status === 403
        ? 'Chỉ quản trị viên mới duyệt được yêu cầu.'
        : 'Không xử lý được yêu cầu. Vui lòng thử lại.'
  }
}
