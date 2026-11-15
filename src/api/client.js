import axios from 'axios'
import { shouldEndSession } from '../utils/session'

let sessionEndedHandler = null

// The auth context registers what to do when the server says the session is over; returns the way to unregister.
export function onSessionEnded(handler) {
  sessionEndedHandler = handler
  return () => {
    if (sessionEndedHandler === handler) sessionEndedHandler = null
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Every backend endpoint wraps its payload in ApiResponse<T> --
// { success, data, error } -- so unwrap it here once, instead of in
// every call site. Error responses (non-2xx) are untouched: axios routes
// those to the rejection path, where callers read err.response.data.error.
apiClient.interceptors.response.use(
  (response) => {
    response.data = response.data?.data
    return response
  },
  (error) => {
    // A 401 on a request that carried our token means the session ended (the token ran out): tell the auth context
    // once, here, instead of every page showing a raw "Authentication required".
    if (shouldEndSession(error, localStorage.getItem('token'))) sessionEndedHandler?.()
    return Promise.reject(error)
  },
)
