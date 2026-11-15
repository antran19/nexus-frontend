import { apiClient } from './client'

export function getMyProfile() {
  return apiClient.get('/api/v1/users/me')
}

// Only the full name and the phone can be changed (API.md 2.11). An empty phone removes it.
export function updateMyProfile({ fullName, phone }) {
  return apiClient.put('/api/v1/users/me', { fullName, phone })
}

// One user by id: { id, email, fullName }. Needs the USER.VIEW privilege (admin and support staff).
export function getUserById(id) {
  return apiClient.get(`/api/v1/users/${id}`)
}

// Staff (admin, support): every account, newest first is up to the caller (user-service, needs USER.LIST).
export function getUsers() {
  return apiClient.get('/api/v1/users')
}

// Staff: the automatic penalties a person got, for example for not paying an auction in time.
export function getPenalties(userId) {
  return apiClient.get(`/api/v1/users/${userId}/reputation/penalties`)
}

// Admin only: the manual changes admins made to a person's score, with who and why.
export function getAdjustments(userId) {
  return apiClient.get(`/api/v1/users/${userId}/reputation/adjustments`)
}

// Admin only: moves the score by delta (a whole number that is not zero, positive or negative; the score stays
// between 0 and 100) and records the reason. Answers the new reputation.
export function adjustReputation(userId, { delta, reason }) {
  return apiClient.post(`/api/v1/users/${userId}/reputation/adjust`, { delta, reason })
}
