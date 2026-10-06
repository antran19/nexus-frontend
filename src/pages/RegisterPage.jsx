import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import AuthLayout from '../components/auth/AuthLayout'
import FormField from '../components/auth/FormField'
import { LockIcon, MailIcon, UserIcon } from '../components/auth/icons'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Email không đúng định dạng'
    }
    if (form.password.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự'
    }
    if (form.password !== form.confirmPassword) {
      return 'Mật khẩu xác nhận không khớp'
    }
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      const message = err.response?.data?.error?.message
      setError(
        err.response?.status === 409
          ? 'Email đã được sử dụng'
          : message || 'Đăng ký thất bại, vui lòng thử lại',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Bắt đầu nào" subtitle="Tạo tài khoản để theo dõi và đặt giá trên Nexus.">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Đăng ký</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField
          icon={UserIcon}
          type="text"
          placeholder="Họ và tên"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
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
        <FormField
          icon={LockIcon}
          type="password"
          placeholder="Nhập lại mật khẩu"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 bg-gray-900 text-white rounded-full py-2.5 font-medium disabled:opacity-50 hover:bg-gray-700 transition-colors"
        >
          {submitting ? 'Đang xử lý...' : 'Đăng ký'}
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-6">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-gray-900 font-medium underline">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}
