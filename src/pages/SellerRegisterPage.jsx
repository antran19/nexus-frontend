import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestSellerUpgrade } from '../api/sellerRequests'
import RegisterShell from '../components/auth/RegisterShell'
import { useAuth } from '../context/AuthContext'
import { requestSellerMessage, sellerStep } from '../utils/sellerRequests'

const POINTS = [
  { title: 'Đăng sản phẩm và mở phiên đấu giá', text: 'Đặt giá khởi điểm, bước giá và thời gian của từng phiên.' },
  { title: 'Quản lý đơn bán', text: 'Xem đơn của người thắng và đánh dấu đã giao hàng khi gửi đi.' },
  { title: 'Uy tín được tích lũy', text: 'Đánh giá từ người mua hiện cạnh tên bạn trên mỗi phiên đấu giá.' },
]

const STEPS = [
  { number: 1, title: 'Tạo tài khoản', text: 'Đăng ký tài khoản người mua và đăng nhập.' },
  { number: 2, title: 'Gửi yêu cầu', text: 'Yêu cầu quyền bán hàng cho tài khoản của bạn.' },
  { number: 3, title: 'Chờ duyệt', text: 'Quản trị viên xem xét và cấp quyền bán.' },
]

const TONE = { success: 'text-green-700', info: 'text-gray-700', error: 'text-red-600' }

function Step({ step, current, done }) {
  const finished = done || step.number < current
  const active = !finished && step.number === current
  return (
    <li className={`flex gap-3 rounded-xl border p-4 ${active ? 'border-brand bg-peach' : 'border-gray-200'}`} aria-current={active ? 'step' : undefined}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${finished ? 'bg-green-600 text-white' : active ? 'bg-brand text-white' : 'bg-gray-200 text-gray-600'}`} aria-hidden="true">
        {finished ? '✓' : step.number}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{step.title}</p>
        <p className="mt-0.5 text-xs text-gray-600">{step.text}</p>
      </div>
    </li>
  )
}

// Becoming a seller is an upgrade of a buyer account: sign up, ask, wait for an admin. The page shows which of the
// three steps the person is on and offers the action for that step. Nothing here is collected beyond the request
// itself, because the server takes the person from the login token.
export default function SellerRegisterPage() {
  const { user } = useAuth()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState(null)
  const { current, done } = sellerStep(user, sent)

  async function send() {
    setSending(true)
    setMessage(null)
    try {
      await requestSellerUpgrade()
      setSent(true)
      setMessage({ kind: 'success', text: 'Đã gửi yêu cầu. Khi được duyệt, hãy đăng xuất rồi đăng nhập lại để dùng quyền bán hàng.' })
    } catch (err) {
      const answer = requestSellerMessage(err)
      // A request that is already waiting is as good as one just sent.
      if (answer.kind === 'info') setSent(true)
      setMessage(answer)
    } finally {
      setSending(false)
    }
  }

  return (
    <RegisterShell
      badge="Dành cho người bán"
      title="Trở thành người bán trên Nexus"
      intro="Bán sản phẩm của bạn qua đấu giá. Tài khoản vẫn là người mua cho đến khi quản trị viên duyệt."
      points={POINTS}
    >
      <h2 className="text-base font-semibold text-gray-900">Các bước để bắt đầu bán</h2>
      <ol className="mt-4 space-y-3">
        {STEPS.map((step) => <Step key={step.number} step={step} current={current} done={done} />)}
      </ol>

      <div className="mt-8">
        {!user && (
          <>
            <p className="text-sm text-gray-700">Bạn cần có tài khoản trước khi gửi yêu cầu làm người bán.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/register" className="bg-brand text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-brand-dark transition-colors">Tạo tài khoản</Link>
              <Link to="/login" className="border border-gray-300 text-gray-800 rounded-full px-6 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand transition-colors">Tôi đã có tài khoản</Link>
            </div>
          </>
        )}
        {user && done && (
          <p role="status" className="text-sm text-green-700">
            Tài khoản của bạn đã có quyền bán hàng.{' '}
            <Link to="/me/selling" className="font-medium underline">Đến trang bán hàng</Link>
          </p>
        )}
        {user && !done && !sent && (
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="w-full bg-brand text-white rounded-full py-3 font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {sending ? 'Đang gửi...' : 'Gửi yêu cầu làm người bán'}
          </button>
        )}
        {message && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-4 text-sm ${TONE[message.kind]}`}>{message.text}</p>
        )}
      </div>
    </RegisterShell>
  )
}
