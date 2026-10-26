import PageHero from '../components/PageHero'
import { useAuth } from '../context/AuthContext'

// Example of a protected page -- gated by PrivateRoute in App.jsx.
export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <>
      <PageHero eyebrow="Hồ sơ" title="Tài khoản" />
      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-sm text-gray-600">User ID: {user?.sub}</p>
      </div>
    </>
  )
}
