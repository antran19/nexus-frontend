import { apiClient } from './client'

export function login({ email, password }) {
  return apiClient.post('/api/v1/auth/login', { email, password })
}

// phone and birthDate are optional (sent only when filled in); the two consents are required.
// birthDate is an ISO date (2000-12-31), the value of an <input type="date">.
export function register({ fullName, email, password, confirmPassword, phone, birthDate, termsAccepted, escrowAcknowledged }) {
  return apiClient.post('/api/v1/users/register', {
    fullName,
    email,
    password,
    confirmPassword,
    phone: phone || undefined,
    birthDate: birthDate || undefined,
    termsAccepted,
    escrowAcknowledged,
  })
}

export function changePassword({ oldPassword, newPassword, confirmNewPassword }) {
  return apiClient.put('/api/v1/users/me/password', { oldPassword, newPassword, confirmNewPassword })
}
