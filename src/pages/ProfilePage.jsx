import { useAuth } from '../context/AuthContext'

// Example of a protected page -- gated by PrivateRoute in App.jsx.
export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <div className="max-w-sm mx-auto mt-12 px-4">
      <h1 className="text-2xl font-semibold mb-4">Tài khoản</h1>
      <p className="text-sm text-gray-600">User ID: {user?.sub}</p>
    </div>
  )
}
