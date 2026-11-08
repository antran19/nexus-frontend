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
