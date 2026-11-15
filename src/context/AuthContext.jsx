import { createContext, useContext, useEffect, useState } from 'react'
import { login as loginRequest } from '../api/auth'
import { onSessionEnded } from '../api/client'
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
  const [initial] = useState(() => readStoredSession(localStorage.getItem('token')))
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

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      setUser(decodeJwtPayload(token))
    } else {
      localStorage.removeItem('token')
      setUser(null)
    }
  }, [token])

  async function login(credentials) {
    const { data } = await loginRequest(credentials)
    setSessionExpired(false)
    setToken(data.token)
  }

  function logout() {
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
