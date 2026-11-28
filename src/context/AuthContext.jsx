import { createContext, useContext, useEffect, useState } from 'react'
import { login as loginRequest, logoutSession } from '../api/auth'
import { onSessionEnded, onTokenRefreshed } from '../api/client'
import { readStoredSession } from '../utils/session'

const AuthContext = createContext(null)

function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  // A token that already ran out is dropped at start, and the login page is told why.
  const [initial] = useState(() => readStoredSession(localStorage.getItem('token'), Date.now(), Boolean(localStorage.getItem('refreshToken'))))
  const [token, setToken] = useState(initial.token)
  const [sessionExpired, setSessionExpired] = useState(initial.expired)
  const [user, setUser] = useState(() => (initial.token ? decodeJwtPayload(initial.token) : null))

  // The server answered 401 to a request with our token: sign out and remember that it was the session running out.
  useEffect(
    () =>
      onSessionEnded(() => {
        setSessionExpired(true)
        setToken(null)
      }),
    [],
  )

  // The client swapped in a fresh access token behind the scenes (the old one ran out): follow it.
  useEffect(() => onTokenRefreshed((fresh) => setToken(fresh)), [])

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      setUser(decodeJwtPayload(token))
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      setUser(null)
    }
  }, [token])

  async function login(credentials) {
    const { data } = await loginRequest(credentials)
    setSessionExpired(false)
    localStorage.setItem('refreshToken', data.refreshToken)
    setToken(data.token)
  }

  function logout() {
    // Tell the server first, so the tokens stop working there too, not only in this browser.
    if (token) logoutSession({ token, refreshToken: localStorage.getItem('refreshToken') }).catch(() => {})
    setSessionExpired(false)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: Boolean(token), sessionExpired, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
