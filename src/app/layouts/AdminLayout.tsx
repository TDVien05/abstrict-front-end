import { Outlet } from 'react-router-dom'
import { AppTopbar } from '../components/AppTopbar'
import { RouteTransition } from '../../shared/ui/RouteTransition'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <AppTopbar actor="admin" />
      <RouteTransition><Outlet /></RouteTransition>
    </div>
  )
}
