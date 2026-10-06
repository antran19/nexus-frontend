import { apiClient } from './client'

export function login({ email, password }) {
  return apiClient.post('/api/v1/auth/login', { email, password })
}

export function register({ fullName, email, password }) {
  return apiClient.post('/api/v1/users/register', { fullName, email, password })
}

export function changePassword({ oldPassword, newPassword }) {
  return apiClient.put('/api/v1/users/me/password', { oldPassword, newPassword })
}
