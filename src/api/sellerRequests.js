import { apiClient } from './client'

// A buyer asks to become a seller. There is no body: the person comes from the token.
// Answers { id, userId, status: 'PENDING', requestedAt, ... }.
export function requestSellerUpgrade() {
  return apiClient.post('/api/v1/users/me/seller-requests')
}

// Admin only. status is PENDING, APPROVED or REJECTED; the server defaults to PENDING.
export function listSellerRequests(status = 'PENDING') {
  return apiClient.get('/api/v1/users/seller-requests', { params: { status } })
}

// Approving turns the person into a SELLER; both answer the reviewed request.
export function approveSellerRequest(id) {
  return apiClient.post(`/api/v1/users/seller-requests/${id}/approve`)
}

export function rejectSellerRequest(id) {
  return apiClient.post(`/api/v1/users/seller-requests/${id}/reject`)
}
