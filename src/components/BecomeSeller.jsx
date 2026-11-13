import { useState } from 'react'
import { requestSellerUpgrade } from '../api/sellerRequests'
import { requestSellerMessage } from '../utils/sellerRequests'

const TONE = {
  success: 'text-green-700',
  info: 'text-gray-700',
  error: 'text-red-600',
}

// "Trở thành người bán" on the profile of a buyer. One click sends the request; an admin approves it and the
// person's role changes. The role is read from the login token, so after an approval the person signs in again.
export default function BecomeSeller() {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)
  const [sent, setSent] = useState(false)

  async function send() {
    setSending(true)
    setMessage(null)
    try {
      await requestSellerUpgrade()
      setSent(true)
      setMessage({ kind: 'success', text: 'Đã gửi yêu cầu. Quản trị viên sẽ xem xét; khi được duyệt, hãy đăng xuất rồi đăng nhập lại để dùng quyền bán hàng.' })
    } catch (err) {
      const answer = requestSellerMessage(err)
      // A request that is already waiting is as good as one just sent: do not offer the button again.
      if (answer.kind === 'info') setSent(true)
      setMessage(answer)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="mt-12 border-t border-gray-200 pt-8" aria-labelledby="become-seller-title">
      <h2 id="become-seller-title" className="text-sm font-semibold tracking-[0.2em] uppercase text-gold">Trở thành người bán</h2>
      <p className="mt-3 text-sm text-gray-600 max-w-xl">
        Muốn đăng sản phẩm và mở phiên đấu giá? Gửi yêu cầu để quản trị viên duyệt. Tài khoản của bạn vẫn là người mua cho đến khi được duyệt.
      </p>
      {!sent && (
        <button
          type="button"
          onClick={send}
          disabled={sending}
          className="mt-4 bg-ink text-white rounded px-5 py-2 text-sm font-medium hover:bg-gold hover:text-ink transition-colors disabled:opacity-50"
        >
          {sending ? 'Đang gửi...' : 'Gửi yêu cầu làm người bán'}
        </button>
      )}
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${TONE[message.kind]}`}>
          {message.text}
        </p>
      )}
    </section>
  )
}
