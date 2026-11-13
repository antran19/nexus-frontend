import { useEffect, useState } from 'react'
import { getMyProfile, updateMyProfile } from '../api/users'
import BecomeSeller from '../components/BecomeSeller'
import PageHero from '../components/PageHero'
import { errorMessage } from '../utils/apiError'
import { fieldErrorMap, isChanged, toUpdateBody, validateProfile } from '../utils/profileForm'
import { canRequestSeller } from '../utils/sellerRequests'

const ROLE_LABEL = {
  BUYER: 'Người mua',
  SELLER: 'Người bán',
  ADMIN: 'Quản trị viên',
  SUPPORT: 'Hỗ trợ',
}

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa có')
const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có')

function ReadOnlyRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-100 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 text-right">{value}</dd>
    </div>
  )
}

// The signed-in person's own profile (API.md 2.11). Only the name and the phone can be changed.
export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMyProfile()
      .then(({ data }) => {
        if (cancelled) return
        setProfile(data)
        setForm({ fullName: data.fullName ?? '', phone: data.phone ?? '' })
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, 'Không tải được hồ sơ, vui lòng thử lại.'))
      })
    return () => {
      cancelled = true
    }
  }, [])

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validateProfile(form)
    setErrors(found)
    setFormError('')
    setSaved(false)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const { data } = await updateMyProfile(toUpdateBody(form))
      setProfile(data)
      setForm({ fullName: data.fullName ?? '', phone: data.phone ?? '' })
      setSaved(true)
    } catch (err) {
      // A 400 names the field that failed; show it under that field, else as one message.
      const byField = fieldErrorMap(err.response?.data?.error)
      if (Object.keys(byField).length > 0) setErrors(byField)
      else setFormError(errorMessage(err, 'Không lưu được hồ sơ, vui lòng thử lại.'))
    } finally {
      setSaving(false)
    }
  }

  let body
  if (loadError) {
    body = <p className="text-sm text-red-600">{loadError}</p>
  } else if (!profile) {
    body = <p className="text-sm text-gray-500">Đang tải...</p>
  } else {
    body = (
      <div className="grid md:grid-cols-2 gap-10">
        <section>
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-gold">Thông tin tài khoản</h2>
          <dl className="mt-3">
            <ReadOnlyRow label="Email" value={profile.email} />
            <ReadOnlyRow label="Vai trò" value={ROLE_LABEL[profile.roleCode] ?? profile.roleCode} />
            <ReadOnlyRow label="Ngày sinh" value={formatDate(profile.birthDate)} />
            <ReadOnlyRow label="Đồng ý Điều khoản" value={formatDateTime(profile.termsAcceptedAt)} />
            <ReadOnlyRow label="Xác nhận quy chế ký quỹ" value={formatDateTime(profile.escrowAcknowledgedAt)} />
            <ReadOnlyRow label="Tham gia từ" value={formatDate(profile.createdAt)} />
          </dl>
          <p className="text-xs text-gray-500 mt-3">Email, vai trò và ngày sinh không đổi được ở đây.</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-gold">Chỉnh sửa</h2>
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Họ và tên
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => change('fullName', e.target.value)}
                aria-invalid={Boolean(errors.fullName)}
                className="border border-gray-300 rounded px-3 py-2"
              />
              {errors.fullName && <span className="text-xs text-red-600">{errors.fullName}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              Số điện thoại
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => change('phone', e.target.value)}
                placeholder="0901 234 567 (để trống để xoá số)"
                aria-invalid={Boolean(errors.phone)}
                className="border border-gray-300 rounded px-3 py-2"
              />
              {errors.phone && <span className="text-xs text-red-600">{errors.phone}</span>}
            </label>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {saved && <p className="text-sm text-green-700">Đã lưu hồ sơ.</p>}

            <button
              type="submit"
              disabled={saving || !isChanged(profile, form)}
              className="self-start bg-ink text-white rounded px-5 py-2 text-sm font-medium hover:bg-gold hover:text-ink transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </section>
      </div>
    )
  }

  const askToSell = canRequestSeller({ role: profile?.roleCode })

  return (
    <>
      <PageHero eyebrow="Hồ sơ" title={profile?.fullName || 'Tài khoản'} />
      <div className="max-w-5xl mx-auto px-6 py-12">
        {body}
        {askToSell && <BecomeSeller />}
      </div>
    </>
  )
}
