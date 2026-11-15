import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import LabeledField from '../components/auth/LabeledField'
import RegisterShell from '../components/auth/RegisterShell'
import { cleanPhone, EMPTY_REGISTRATION, registerErrorMessage, registerFieldErrors, validateRegistration } from '../utils/registerForm'

const POINTS = [
  { title: 'Đấu giá theo thời gian thực', text: 'Giá mới và thời gian còn lại cập nhật ngay trên màn hình.' },
  { title: 'Quy chế ký quỹ rõ ràng', text: 'Biết trước các điều kiện khi tham gia và khi thắng phiên.' },
  { title: 'Thanh toán an toàn', text: 'Thắng phiên là có đơn hàng, thanh toán trực tuyến qua cổng Stripe.' },
]

function Consent({ checked, onChange, error, children }) {
  return (
    <div>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" className="mt-1 accent-brand" checked={checked} onChange={onChange} />
        <span>{children}</span>
      </label>
      {error && <p role="alert" className="mt-1 ml-6 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_REGISTRATION)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validateRegistration(form)
    setErrors(found)
    setError('')
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await register({ ...form, fullName: form.fullName.trim(), phone: cleanPhone(form.phone) })
      navigate('/login')
    } catch (err) {
      // A 400 names the field that failed; show it under that field, and the sentence as well when no field matches.
      const fields = registerFieldErrors(err)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setError(registerErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RegisterShell
      badge="Dành cho người mua"
      title="Tạo tài khoản người mua Nexus"
      intro="Đăng ký để theo dõi sản phẩm, đặt giá và mua những món đồ bạn thích."
      points={POINTS}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
        <section aria-labelledby="reg-account" className="flex flex-col gap-4">
          <h2 id="reg-account" className="text-base font-semibold text-gray-900">1. Thông tin tài khoản</h2>
          <LabeledField label="Họ và tên" required placeholder="Nguyễn Văn An" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
          <LabeledField label="Địa chỉ email" required type="email" placeholder="ban@example.com" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <div className="grid sm:grid-cols-2 gap-4">
            <LabeledField label="Số điện thoại" type="tel" placeholder="0912 345 678" autoComplete="tel" hint="Không bắt buộc" value={form.phone} onChange={set('phone')} error={errors.phone} />
            <LabeledField label="Ngày sinh" type="date" hint="Không bắt buộc, cần đủ 18 tuổi" value={form.birthDate} onChange={set('birthDate')} error={errors.birthDate} />
          </div>
        </section>

        <section aria-labelledby="reg-security" className="flex flex-col gap-4">
          <h2 id="reg-security" className="text-base font-semibold text-gray-900">2. Bảo mật</h2>
          <LabeledField label="Mật khẩu" required type="password" autoComplete="new-password" hint="Từ 8 đến 72 ký tự" value={form.password} onChange={set('password')} error={errors.password} />
          <LabeledField label="Nhập lại mật khẩu" required type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        </section>

        <section aria-labelledby="reg-consent" className="flex flex-col gap-3">
          <h2 id="reg-consent" className="text-base font-semibold text-gray-900">3. Xác nhận</h2>
          <Consent checked={form.termsAccepted} onChange={set('termsAccepted')} error={errors.termsAccepted}>
            Tôi đồng ý với Điều khoản Dịch vụ của Nexus
          </Consent>
          <Consent checked={form.escrowAcknowledged} onChange={set('escrowAcknowledged')} error={errors.escrowAcknowledged}>
            Tôi đã hiểu quy chế ký quỹ khi tham gia đấu giá
          </Consent>
        </section>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand text-white rounded-full py-3 font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
          </button>
          <p className="mt-4 text-sm text-gray-600 text-center">
            Muốn bán hàng?{' '}
            <Link to="/register/seller" className="font-medium text-brand underline">Đăng ký người bán</Link>
          </p>
        </div>
      </form>
    </RegisterShell>
  )
}
