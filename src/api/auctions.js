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
