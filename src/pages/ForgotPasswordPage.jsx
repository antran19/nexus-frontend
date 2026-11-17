import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import LabeledField from '../components/auth/LabeledField'
import RegisterShell from '../components/auth/RegisterShell'
import { FORGOT_SENT_TEXT, forgotErrorMessage, validateForgotEmail } from '../utils/passwordReset'

const POINTS = [
  'Mã đặt lại được gửi tới email của tài khoản và có hiệu lực trong 30 phút.',
  'Mỗi mã chỉ dùng được một lần.',
  'Chúng tôi không cho biết email nào đã đăng ký, để bảo vệ tài khoản của mọi người.',
]

// Step one: the person gives their email and the server emails a reset code. The page says the same thing whether or
// not an account exists. Step two is /reset-password, where the code is typed in with the new password.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const problem = validateForgotEmail(email)
    setError(problem)
    if (problem) return
    setSubmitting(true)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(forgotErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RegisterShell
      badge="Quên mật khẩu"
      title="Lấy lại quyền vào tài khoản"
      intro="Nhập email của bạn, chúng tôi sẽ gửi một mã để đặt mật khẩu mới."
      points={POINTS}
      footer={
        <>
          Nhớ mật khẩu rồi?{' '}
          <Link to="/login" className="font-medium text-brand underline">Đăng nhập</Link>
        </>
      }
    >
      <h2 className="font-display text-xl font-bold text-cocoa">Yêu cầu mã đặt lại</h2>
      {sent ? (
        <div className="mt-6">
          <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{FORGOT_SENT_TEXT}</p>
          <Link
            to="/reset-password"
            className="mt-5 inline-block bg-brand text-white rounded-full px-6 py-3 font-semibold hover:bg-brand-dark transition-colors"
          >
            Tôi đã có mã, đặt mật khẩu mới
          </Link>
          <button type="button" onClick={() => setSent(false)} className="ml-4 text-sm text-gray-600 underline">Gửi lại tới email khác</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
          <LabeledField
            label="Địa chỉ email" required type="email" autoComplete="email" placeholder="ban@example.com"
            value={email} onChange={(e) => { setEmail(e.target.value); setError('') }}
          />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand text-white rounded-full py-3 font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi mã đặt lại'}
          </button>
          <Link to="/reset-password" className="text-center text-sm text-gray-600 underline">Tôi đã có mã</Link>
        </form>
      )}
    </RegisterShell>
  )
}
