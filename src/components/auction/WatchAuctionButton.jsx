import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { followAuction, getWatchStatus, unfollowAuction } from '../../api/auctions'
import { useAuth } from '../../context/AuthContext'

export default function WatchAuctionButton({ auctionId }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  const [followed, setFollowed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const userId = user?.sub

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    getWatchStatus(auctionId)
      .then(({ data }) => { if (active) setFollowed(data.followed) })
      .catch(() => { if (active) setError('Không tải được trạng thái theo dõi.') })
    return () => { active = false }
  }, [isAuthenticated, userId, auctionId, attempt])

  const buttonClass = 'inline-flex min-h-10 items-center rounded-lg border border-tray px-3 py-1.5 text-sm font-medium text-cocoa hover:border-brand hover:text-brand disabled:opacity-50'
  if (!isAuthenticated) {
    return <Link to="/login" state={{ from: location.pathname + location.search }} className={buttonClass}>Theo dõi phiên</Link>
  }

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      await (followed ? unfollowAuction(auctionId) : followAuction(auctionId))
      setFollowed(!followed)
    } catch {
      setError('Không cập nhật được danh sách theo dõi. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="flex flex-wrap items-center gap-2">
    {followed == null && error ? (
      <button type="button" className={buttonClass} onClick={() => {
        setError('')
        setAttempt((value) => value + 1)
      }}>Thử tải lại</button>
    ) : (
      <button type="button" disabled={busy || followed == null} aria-pressed={followed === true}
        className={buttonClass} onClick={toggle}>
        {followed == null ? 'Đang tải…' : followed ? 'Đang theo dõi' : 'Theo dõi phiên'}
      </button>
    )}
    {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
  </div>
}
