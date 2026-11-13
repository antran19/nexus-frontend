import { apiClient } from './client'

// A seller's reputation: { userId, score, trustLevel, totalRatings, averageRating } (user-service).
export function getReputation(userId) {
  return apiClient.get(`/api/v1/users/${userId}/reputation`)
}

// Rates the other party of a finished deal. transactionType is 'ORDER' or 'AUCTION'; the rater comes from the token.
export function rateTransaction({ ratedUserId, transactionType, transactionId, score, comment }) {
  return apiClient.post('/api/v1/ratings', { ratedUserId, transactionType, transactionId, score, comment })
}
