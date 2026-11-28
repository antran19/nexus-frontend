import axios from 'axios'
import { retryPlan, shouldEndSession } from '../utils/session'

let sessionEndedHandler = null
let tokenRefreshedHandler = null

// The auth context registers what to do when the server says the session is over; returns the way to unregister.
export function onSessionEnded(handler) {
  sessionEndedHandler = handler
  return () => {
    if (sessionEndedHandler === handler) sessionEndedHandler = null
  }
}

// ...and what to do when the access token was silently replaced by a refresh, so what it shows follows the new token.
export function onTokenRefreshed(handler) {
  tokenRefreshedHandler = handler
  return () => {
    if (tokenRefreshedHandler === handler) tokenRefreshedHandler = null
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  // skipAuth: the refresh call itself is public; the expired token has no business being sent with it.
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Several requests can hit the same expired token at once; they all wait for ONE refresh. A second refresh with the
// same refresh token would be refused (each is good once), and the server would end the session.
let refreshing = null

function refreshAccessToken() {
  if (!refreshing) {
    refreshing = apiClient
      .post('/api/v1/auth/refresh', { refreshToken: localStorage.getItem('refreshToken') }, { skipAuth: true })
      .then(({ data }) => {
        localStorage.setItem('token', data.token)
        localStorage.setItem('refreshToken', data.refreshToken)
        tokenRefreshedHandler?.(data.token)
        return data.token
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

// Every backend endpoint wraps its payload in ApiResponse<T> --
// { success, data, error } -- so unwrap it here once, instead of in
// every call site. Error responses (non-2xx) are untouched: axios routes
// those to the rejection path, where callers read err.response.data.error.
apiClient.interceptors.response.use(
  (response) => {
    response.data = response.data?.data
    return response
  },
  async (error) => {
    if (error.config?.skipSessionHandling) return Promise.reject(error)

    const token = localStorage.getItem('token')
    const plan = retryPlan(error, token, localStorage.getItem('refreshToken'))
    if (plan) {
      let accessToken = token
      if (plan === 'refresh') {
        try {
          accessToken = await refreshAccessToken()
        } catch (refreshError) {
          // The server refused the refresh token (expired, used, revoked): the session really is over. No answer at
          // all (offline) says nothing about the session, so it is kept and the original failure is reported.
          if (refreshError.response) {
            localStorage.removeItem('refreshToken')
            sessionEndedHandler?.()
          }
          return Promise.reject(error)
        }
      }
      error.config._retried = true
      error.config.headers.Authorization = `Bearer ${accessToken}`
      return apiClient.request(error.config)
    }

    // A 401 on a request that carried our token and could not be refreshed means the session ended: tell the auth
    // context once, here, instead of every page showing a raw "Authentication required".
    if (shouldEndSession(error, token)) sessionEndedHandler?.()
    return Promise.reject(error)
  },
)
