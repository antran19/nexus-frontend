import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import FormField from '../components/auth/FormField'
import { LockIcon, MailIcon } from '../components/auth/icons'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
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
    <AuthLayout title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục đấu giá trên Nexus.">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Đăng nhập</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField
          icon={MailIcon}
          type="email"
          placeholder="Địa chỉ email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <FormField
          icon={LockIcon}
          type="password"
          placeholder="Mật khẩu"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 bg-gray-900 text-white rounded-full py-2.5 font-medium disabled:opacity-50 hover:bg-gray-700 transition-colors"
        >
          {submitting ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-6">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-gray-900 font-medium underline">
          Đăng ký
        </Link>
      </p>
    </AuthLayout>
  )
}
