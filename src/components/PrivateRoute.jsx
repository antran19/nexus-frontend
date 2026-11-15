import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { returnPath } from '../utils/session'

// Blocks access to nested routes when there is no logged-in user, and bounces to /login per issue 1.3's requirement.
// The login page gets the page the person wanted (to go back there) and whether the session just ran out.
export default function PrivateRoute() {
  const { isAuthenticated, sessionExpired } = useAuth()
  const location = useLocation()
  if (isAuthenticated) return <Outlet />
  return <Navigate to="/login" replace state={{ from: returnPath(location), expired: sessionExpired }} />
}
