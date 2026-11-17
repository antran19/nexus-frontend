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

// The server answers the same sentence for every address; the reset code only ever goes out by email.
export function forgotPassword(email) {
  return apiClient.post('/api/v1/auth/forgot-password', { email })
}

// token is the code from the email (valid 30 minutes, once). 401 INVALID_RESET_TOKEN when it is wrong, old or used.
export function resetPassword({ token, newPassword, confirmNewPassword }) {
  return apiClient.post('/api/v1/auth/reset-password', { token, newPassword, confirmNewPassword })
}

export function changePassword({ oldPassword, newPassword, confirmNewPassword }) {
  return apiClient.put('/api/v1/users/me/password', { oldPassword, newPassword, confirmNewPassword })
}
