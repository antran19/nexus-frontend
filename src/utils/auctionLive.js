// Pure helpers for the live auction panel, kept apart from React so they can be tested with `npm test`.

// The least a new bid may be: the first bid only has to reach the starting price, later ones must
// beat the current price by one increment (API.md 5.5).
export function nextMinBid(auction) {
  if (auction.currentHighestBid == null) return Number(auction.startingPrice)
  return Number(auction.currentHighestBid) + Number(auction.bidIncrement)
}

// A bid pushed over SSE becomes the price shown, unless a higher one is already on screen.
export function applyBid(auction, bid) {
  if (auction.currentHighestBid != null && Number(bid.amount) < Number(auction.currentHighestBid)) {
    return auction
  }
  return { ...auction, currentHighestBid: bid.amount, currentHighestBidderId: bid.bidderId }
}

// Newest first, and a bid already in the list (the same one arriving by SSE and by a refresh) is not repeated.
export function mergeBid(bids, bid) {
  if (bids.some((b) => b.id === bid.id)) return bids
  return [bid, ...bids]
}

// Where the signed-in person stands. null when they have not taken part, so nothing is shown.
export function myStanding(auction, userId, hasTakenPart) {
  if (!userId || !hasTakenPart) return null
  if (auction.status === 'ACTIVE') return auction.currentHighestBidderId === userId ? 'LEADING' : 'OUTBID'
  if (auction.status === 'ENDED') return auction.winnerId === userId ? 'WON' : 'LOST'
  return null
}

// The quick-bid buttons, as amounts the server accepts. A price already on the auction: 1, 2, 5 and 10 increments above
// it (1 increment is the least allowed bid). A first bid: the starting price itself, then 1, 5 and 10 increments above
// it. The server stays the judge of every bid; the buttons only fill the box. Each has `delta`, how far it is above
// the price now (0 for a first bid at the starting price). Nothing when the increment is unusable, so no button
// offers an amount the server would refuse.
export function bidLadder(auction) {
  const increment = Number(auction.bidIncrement)
  if (!Number.isFinite(increment) || increment <= 0) return []
  const firstBid = auction.currentHighestBid == null
  const price = firstBid ? Number(auction.startingPrice) : Number(auction.currentHighestBid)
  return (firstBid ? [0, 1, 5, 10] : [1, 2, 5, 10]).map((steps) => ({ amount: price + steps * increment, delta: steps * increment }))
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const two = (n) => String(n).padStart(2, '0')

// The time left until the end: "2 ngày 03:04:05", "00:04:12", or "Đã hết giờ" once it has passed. '' for a bad date.
export function timeLeft(endTime, now = Date.now()) {
  const end = Date.parse(endTime)
  if (Number.isNaN(end)) return ''
  const left = end - now
  if (left <= 0) return 'Đã hết giờ'
  const days = Math.floor(left / DAY)
  const clock = `${two(Math.floor((left % DAY) / HOUR))}:${two(Math.floor((left % HOUR) / MINUTE))}:${two(Math.floor((left % MINUTE) / SECOND))}`
  return days > 0 ? `${days} ngày ${clock}` : clock
}

// True in the last five minutes (and not yet over): the countdown turns red so the person notices.
export function endingSoon(endTime, now = Date.now(), limit = 5 * MINUTE) {
  const left = Date.parse(endTime) - now
  return left > 0 && left <= limit
}
