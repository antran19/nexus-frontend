import { apiClient } from './client'

export function getAuctionsByProduct(productId) {
  return apiClient.get('/api/v1/auctions', { params: { productId } })
}

export function getAuction(auctionId) {
  return apiClient.get(`/api/v1/auctions/${auctionId}`)
}

export function getBidHistory(auctionId) {
  return apiClient.get(`/api/v1/auctions/${auctionId}/bids`)
}

export function placeBid(auctionId, amount) {
  return apiClient.post(`/api/v1/auctions/${auctionId}/bids`, { amount })
}

// 404 AUTO_BID_NOT_FOUND just means "no maximum set" -- the caller treats it as null.
export function getMyAutoBid(auctionId) {
  return apiClient.get(`/api/v1/auctions/${auctionId}/auto-bid`)
}

export function setAutoBid(auctionId, maxAmount) {
  return apiClient.put(`/api/v1/auctions/${auctionId}/auto-bid`, { maxAmount })
}

// The auctions the signed-in person has bid in, newest activity first (API.md 5.10).
export function getMyBidding(page, size) {
  return apiClient.get('/api/v1/auctions/mine/bidding', { params: { page, size } })
}

// The auctions the signed-in seller created, with bid counts (API.md 5.11). status '' means every status.
export function getMySelling({ status, page, size }) {
  return apiClient.get('/api/v1/auctions/mine/selling', { params: { status: status || undefined, page, size } })
}
