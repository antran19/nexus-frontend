// Pure helpers for the notification bell, kept apart from React so `npm test` can cover them.

export const POLL_INTERVAL_MS = 30000

// The badge on the bell: nothing at 0, the number up to 9, "9+" above.
export function badgeLabel(count) {
  if (!Number.isFinite(count) || count <= 0) return ''
  return count > 9 ? '9+' : String(count)
}

// "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước"; older than a week shows the date.
export function timeAgo(isoTime, now = Date.now()) {
  const then = Date.parse(isoTime)
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.floor((now - then) / 1000))
  if (seconds < 60) return 'vừa xong'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return new Date(then).toLocaleDateString('vi-VN')
}

// The notification carries the whole event as a JSON string in `payload`. Anything unreadable gives {}.
export function parsePayload(notification) {
  try {
    const value = JSON.parse(notification?.payload ?? '')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

// Where a click on a notification should lead. Auction events name the product directly (won) or only the
// auction (outbid, paid, shipped), so the page for an auction has to look the product up first.
// Returns { productId } | { auctionId } | null (welcome and password-reset notices lead nowhere).
export function notificationTarget(notification) {
  const payload = parsePayload(notification)
  if (typeof payload.productId === 'string' && payload.productId) return { productId: payload.productId }
  if (typeof payload.auctionId === 'string' && payload.auctionId) return { auctionId: payload.auctionId }
  return null
}

// Marks one notification as read in a list that is already on screen, without touching the others.
export function markReadInList(list, id) {
  return list.map((item) => (item.id === id ? { ...item, read: true } : item))
}

// The server's text names auctions and orders by their full UUID, which is unreadable on screen:
// show the first 8 characters instead ("phiên đấu giá #1a2b3c4d").
export function shortenIds(text) {
  return String(text ?? '').replace(
    /\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    '#$1',
  )
}
