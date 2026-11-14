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

// What happens to an order after an auction is won lives on the order pages, not on the product page: the winner
// pays there, the buyer sees the parcel was shipped there, and the seller finds what to ship there.
export const ORDER_PAGE_BY_EVENT = {
  AuctionWon: '/me/orders',
  AuctionSettled: '/me/orders',
  AuctionPaymentTimeout: '/me/orders',
  OrderShipped: '/me/orders',
  OrderPaid: '/me/selling/orders',
}

// Where a click on a notification should lead. Events about an order go to its order page; the others name the
// product directly or only the auction (outbid), so the page for an auction has to look the product up first.
// Returns { path } | { productId } | { auctionId } | null (welcome and password-reset notices lead nowhere).
export function notificationTarget(notification) {
  const page = ORDER_PAGE_BY_EVENT[notification?.eventType]
  if (page) return { path: page }
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
