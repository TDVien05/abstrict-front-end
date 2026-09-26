import { Outlet } from 'react-router-dom'
import { AppTopbar } from '../components/AppTopbar'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-brand-sand">
      <AppTopbar />
      <Outlet />
    </div>
  )
}
