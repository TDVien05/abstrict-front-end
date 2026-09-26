import { Outlet } from 'react-router-dom'
import { AppTopbar } from '../components/AppTopbar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppTopbar actor="customer" />
      <Outlet />
    </div>
  )
}
