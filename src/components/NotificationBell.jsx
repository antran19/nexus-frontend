import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuction } from '../api/auctions'
import { getMyNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead } from '../api/notifications'
import { badgeLabel, markReadInList, notificationTarget, POLL_INTERVAL_MS, shortenIds, timeAgo } from '../utils/notifications'

// Unread count for the badge: read once, then every 30 seconds and whenever the tab gets focus back.
// A failed poll keeps the last number; the bell must never break the header.
function useUnreadCount() {
  const [count, setCount] = useState(0)
  const refresh = useCallback(() => {
    getUnreadCount()
      .then(({ data }) => setCount(Number(data?.unreadCount) || 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  return [count, refresh]
}

export default function NotificationBell() {
  const [count, refreshCount] = useUnreadCount()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState({ status: 'idle', items: [] })
  const rootRef = useRef(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    setList((current) => ({ ...current, status: 'loading' }))
    getMyNotifications({ size: 10 })
      .then(({ data }) => setList({ status: 'ready', items: Array.isArray(data) ? data : [] }))
      .catch(() => setList({ status: 'error', items: [] }))
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      load()
      refreshCount()
    }
  }

  // Read it, then go where it points. An auction-only notice (outbid, paid, shipped) looks the product up first;
  // if that fails the notice is still marked read and the person stays where they are.
  async function openItem(item) {
    setList((current) => ({ ...current, items: markReadInList(current.items, item.id) }))
    if (!item.read) {
      markNotificationRead(item.id).then(refreshCount, () => refreshCount())
    }
    const target = notificationTarget(item)
    if (!target) return
    setOpen(false)
    if (target.path) {
      navigate(target.path)
      return
    }
    try {
      const productId = target.productId ?? (await getAuction(target.auctionId)).data?.productId
      if (productId) navigate(`/products/${productId}`)
    } catch {
      // the auction may be gone; nothing to open
    }
  }

  function readAll() {
    setList((current) => ({ ...current, items: current.items.map((entry) => ({ ...entry, read: true })) }))
    markAllNotificationsRead().then(refreshCount, () => {
      refreshCount()
      load()
    })
  }

  // Close on a click outside and on Escape.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const badge = badgeLabel(count)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={badge ? `Thông báo, ${count} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8Zm4.3 12a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {badge && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-gold px-1 text-center text-[10px] font-semibold leading-4 text-ink">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div role="region" aria-label="Thông báo" className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg bg-white text-ink shadow-xl">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <span className="text-sm font-semibold">Thông báo</span>
            {count > 0 && (
              <button type="button" onClick={readAll} className="text-xs text-black/60 underline hover:text-black">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {list.status === 'loading' && list.items.length === 0 && (
              <p role="status" className="px-4 py-6 text-center text-sm text-black/60">Đang tải…</p>
            )}
            {list.status === 'error' && (
              <div role="alert" className="px-4 py-6 text-center text-sm text-black/70">
                Không tải được thông báo.
                <button type="button" onClick={load} className="ml-1 underline">Thử lại</button>
              </div>
            )}
            {list.status === 'ready' && list.items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-black/60">Chưa có thông báo nào.</p>
            )}
            <ul>
              {list.items.map((item) => (
                <li key={item.id} className="border-b border-black/5">
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`block w-full px-4 py-3 text-left text-sm hover:bg-black/5 ${item.read ? 'text-black/60' : 'bg-gold/10'}`}
                  >
                    <span className={`block ${item.read ? '' : 'font-medium'}`}>{shortenIds(item.message)}</span>
                    <span className="mt-1 block text-xs text-black/50">{timeAgo(item.occurredAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
