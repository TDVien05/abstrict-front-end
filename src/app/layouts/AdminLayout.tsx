import { Outlet } from 'react-router-dom'
import { AppTopbar } from '../components/AppTopbar'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <AppTopbar actor="admin" />
      <Outlet />
    </div>
  )
}
