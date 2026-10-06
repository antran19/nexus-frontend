import { createContext, useContext, useEffect, useState } from 'react'
import { login as loginRequest } from '../api/auth'

const AuthContext = createContext(null)

function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('token')
    return stored ? decodeJwtPayload(stored) : null
  })

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
    setToken(data.token)
  }

  function logout() {
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: Boolean(token), login, logout }}>
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
