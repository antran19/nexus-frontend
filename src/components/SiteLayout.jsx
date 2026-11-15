import { Outlet } from 'react-router-dom'
import StoreFooter from './StoreFooter'

// Frame for every page except the landing page and the login/register screens:
// the warm page background under the page, the store footer at the bottom.
export default function SiteLayout() {
  return (
    <>
      <main className="min-h-[60vh] bg-peach">
        <Outlet />
      </main>
      <StoreFooter />
    </>
  )
}
