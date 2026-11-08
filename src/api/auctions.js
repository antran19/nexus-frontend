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
