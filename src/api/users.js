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
