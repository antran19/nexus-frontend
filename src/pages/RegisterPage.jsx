import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import AuthLayout from '../components/auth/AuthLayout'
import FormField from '../components/auth/FormField'
import { LockIcon, MailIcon, UserIcon } from '../components/auth/icons'

// The server checks these rules again; this only saves a round trip for the obvious mistakes.
function ageOn(isoDate) {
  const born = new Date(isoDate)
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const hadBirthday = now.getMonth() > born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate())
  if (!hadBirthday) age -= 1
  return age
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
    termsAccepted: false,
    escrowAcknowledged: false,
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Email không đúng định dạng'
    }
    if (form.password.length < 8 || form.password.length > 72) {
      return 'Mật khẩu phải có từ 8 đến 72 ký tự'
    }
    if (form.password !== form.confirmPassword) {
      return 'Mật khẩu xác nhận không khớp'
    }
    const phone = form.phone.replace(/[\s.-]/g, '')
    if (phone && !/^(0\d{9}|\+84\d{9})$/.test(phone)) {
      return 'Số điện thoại phải là số Việt Nam (0xxxxxxxxx hoặc +84xxxxxxxxx)'
    }
    if (form.birthDate && ageOn(form.birthDate) < 18) {
      return 'Bạn cần đủ 18 tuổi để tham gia đấu giá'
    }
    if (!form.termsAccepted) {
      return 'Bạn cần đồng ý Điều khoản Dịch vụ'
    }
    if (!form.escrowAcknowledged) {
      return 'Bạn cần xác nhận đã hiểu quy chế ký quỹ'
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
      await register({ ...form, phone: form.phone.replace(/[\s.-]/g, '') })
      navigate('/login')
    } catch (err) {
      // A 400 carries the rule that failed per field; show it instead of the generic message.
      const apiError = err.response?.data?.error
      const message = apiError?.fieldErrors?.[0]?.message || apiError?.message
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
        <FormField
          icon={UserIcon}
          type="tel"
          placeholder="Số điện thoại (không bắt buộc)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Ngày sinh (không bắt buộc, cần đủ 18 tuổi)
          <FormField
            icon={UserIcon}
            type="date"
            aria-label="Ngày sinh"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.termsAccepted}
            onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
          />
          Tôi đồng ý với Điều khoản Dịch vụ của Nexus
        </label>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.escrowAcknowledged}
            onChange={(e) => setForm({ ...form, escrowAcknowledged: e.target.checked })}
          />
          Tôi đã hiểu quy chế ký quỹ khi tham gia đấu giá
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 bg-ink text-white rounded-full py-2.5 font-medium disabled:opacity-50 hover:bg-gold hover:text-ink transition-colors"
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
