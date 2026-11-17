import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import LabeledField from '../components/auth/LabeledField'
import RegisterShell from '../components/auth/RegisterShell'
import { buildResetBody, resetErrorMessage, resetFieldErrors, validateReset } from '../utils/passwordReset'

const POINTS = [
  'Dán mã bạn nhận được trong email.',
  'Mật khẩu mới dài từ 8 đến 72 ký tự.',
  'Sau khi đổi, mọi lần đăng nhập mới dùng mật khẩu mới.',
]

// Step two: the code from the email and the new password. A wrong, old or used code gets one clear sentence and the
// link to ask for a new one; success sends the person to the login page with a note.
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ token: '', newPassword: '', confirmNewPassword: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const change = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value })
    setErrors({ ...errors, [field]: undefined })
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const found = validateReset(form)
    setErrors(found)
    setMessage('')
    if (Object.keys(found).length > 0) return
    setSubmitting(true)
    try {
      await resetPassword(buildResetBody(form))
      navigate('/login', { state: { passwordReset: true } })
    } catch (err) {
      const fields = resetFieldErrors(err)
      setErrors(fields)
      if (Object.keys(fields).length === 0) setMessage(resetErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RegisterShell
      badge="Đặt lại mật khẩu"
      title="Tạo mật khẩu mới"
      intro="Nhập mã trong email và mật khẩu mới của bạn."
      points={POINTS}
      footer={
        <>
          Chưa có mã hoặc mã hết hạn?{' '}
          <Link to="/forgot-password" className="font-medium text-brand underline">Gửi mã mới</Link>
        </>
      }
    >
      <h2 className="font-display text-xl font-bold text-cocoa">Mật khẩu mới</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <LabeledField label="Mã đặt lại" required autoComplete="one-time-code" placeholder="Dán mã trong email" value={form.token} onChange={change('token')} error={errors.token} />
        <LabeledField label="Mật khẩu mới" required type="password" autoComplete="new-password" value={form.newPassword} onChange={change('newPassword')} error={errors.newPassword} />
        <LabeledField label="Nhập lại mật khẩu mới" required type="password" autoComplete="new-password" value={form.confirmNewPassword} onChange={change('confirmNewPassword')} error={errors.confirmNewPassword} />
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-white rounded-full py-3 font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {submitting ? 'Đang xử lý...' : 'Đặt mật khẩu mới'}
        </button>
      </form>
    </RegisterShell>
  )
}
