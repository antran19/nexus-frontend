import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { addToWishlist, getWishlistStatus, removeFromWishlist } from '../api/wishlist'
import { useAuth } from '../context/AuthContext'

export default function WishlistButton({ productId }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const [saved, setSaved] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const userId = user?.sub

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    getWishlistStatus(productId)
      .then(({ data }) => { if (active) setSaved(data.saved) })
      .catch(() => { if (active) setError('Không tải được trạng thái yêu thích.') })
    return () => { active = false }
  }, [isAuthenticated, userId, productId, attempt])

  const buttonClass = 'inline-flex min-h-10 items-center rounded-lg border border-tray px-3 py-1.5 text-sm font-medium text-cocoa hover:border-brand hover:text-brand disabled:opacity-50'
  if (!isAuthenticated) {
    return <Link to="/login" state={{ from: location.pathname + location.search }} className={buttonClass}>♡ Lưu vào yêu thích</Link>
  }

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      await (saved ? removeFromWishlist(productId) : addToWishlist(productId))
      setSaved(!saved)
    } catch {
      setError('Không cập nhật được danh sách yêu thích. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="flex flex-wrap items-center gap-2">
    {saved == null && error ? (
      <button type="button" className={buttonClass} onClick={() => {
        setError('')
        setAttempt((value) => value + 1)
      }}>Thử tải lại</button>
    ) : (
      <button type="button" disabled={busy || saved == null} aria-pressed={saved === true}
        className={buttonClass} onClick={toggle}>
        {saved == null ? 'Đang tải…' : saved ? '♥ Đã lưu yêu thích' : '♡ Lưu vào yêu thích'}
      </button>
    )}
    {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
  </div>
}
