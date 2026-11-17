import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import LabeledField from '../components/auth/LabeledField'
import RegisterShell from '../components/auth/RegisterShell'
import { useAuth } from '../context/AuthContext'

const POINTS = [
  { title: 'Theo dõi phiên đang tham gia', text: 'Xem giá hiện tại và thời gian còn lại của từng phiên.' },
  { title: 'Đơn hàng và thanh toán', text: 'Phiên thắng thành đơn hàng, thanh toán trực tuyến ngay trên Nexus.' },
  { title: 'Thông báo khi bị vượt giá', text: 'Biết ngay khi có người đặt giá cao hơn bạn.' },
]

export default function LoginPage() {
  const { login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await login(form)
      navigate(location.state?.from ?? '/')
    } catch {
      setError('Email hoặc mật khẩu không đúng')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RegisterShell
      badge="Chào mừng trở lại"
      title="Đăng nhập vào Nexus"
      intro="Đăng nhập để tiếp tục đấu giá và quản lý đơn hàng của bạn."
      points={POINTS}
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-brand underline">Đăng ký</Link>
        </>
      }
    >
      <h2 className="font-display text-xl font-bold text-cocoa">Thông tin đăng nhập</h2>
      {location.state?.passwordReset && (
        <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.
        </p>
      )}
      {(location.state?.expired || sessionExpired) && (
        <p role="status" className="mt-4 rounded-lg border border-amber/60 bg-amber/10 px-3 py-2 text-sm text-cocoa">
          Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại để tiếp tục.
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        <LabeledField label="Địa chỉ email" required type="email" autoComplete="email" placeholder="ban@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <LabeledField label="Mật khẩu" required type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <Link to="/forgot-password" className="-mt-2 self-end text-sm text-brand underline">Quên mật khẩu?</Link>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-white rounded-full py-3 font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {submitting ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>
    </RegisterShell>
  )
}
