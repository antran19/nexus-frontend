import { Outlet } from 'react-router-dom'
import Footer from './landing/Footer'

// Frame for every page except the landing page and the login/register screens:
// cream background under the page, the landing footer at the bottom.
export default function SiteLayout() {
  return (
    <>
      <main className="min-h-[60vh] bg-cream/40">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
