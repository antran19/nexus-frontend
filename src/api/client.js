import axios from 'axios'

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
apiClient.interceptors.response.use((response) => {
  response.data = response.data?.data
  return response
})
