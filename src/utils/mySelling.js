// Pure helpers for the seller's "my auctions" page, kept apart from React so `npm test` can cover them.

// The status filter sent to the server (API.md 5.11). An empty value means every status.
export const STATUS_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Đang diễn ra' },
  { value: 'PENDING', label: 'Chưa bắt đầu' },
  { value: 'ENDED', label: 'Đã kết thúc' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

export const STATUS_BADGE = {
  ACTIVE: { text: 'Đang diễn ra', className: 'bg-green-50 text-green-800 border-green-200' },
  PENDING: { text: 'Chưa bắt đầu', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  ENDED: { text: 'Đã kết thúc', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  CANCELLED: { text: 'Đã hủy', className: 'bg-gray-50 text-gray-700 border-gray-200' },
}

// Only a seller can create auctions, so only a seller gets the page (the server refuses anyone else with 403).
export function isSeller(user) {
  return user?.role === 'SELLER'
}

// What the seller most wants to know about a finished auction: nobody bought, or who owes what and by when.
// Returns { kind, ... } so the page can word it; null for an auction that is not over.
export function saleOutcome(item, now = new Date()) {
  if (item.status !== 'ENDED') return null
  if (!item.winnerId) return { kind: 'NO_WINNER' }
  if (item.paidAt) return { kind: 'PAID', amount: item.finalPrice }
  const overdue = item.paymentDeadline != null && new Date(item.paymentDeadline) < now
  return { kind: overdue ? 'OVERDUE' : 'AWAITING_PAYMENT', amount: item.finalPrice, deadline: item.paymentDeadline }
}

// The line above the list: how many are live and how many bids they have drawn so far.
export function summarizeSelling(items) {
  const live = items.filter((item) => item.status === 'ACTIVE')
  return { live: live.length, liveBids: live.reduce((sum, item) => sum + item.bidCount, 0) }
}
