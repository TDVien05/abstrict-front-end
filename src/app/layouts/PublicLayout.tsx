import { Outlet } from 'react-router-dom'
import { AppTopbar } from '../components/AppTopbar'
import { RouteTransition } from '../../shared/ui/RouteTransition'

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-brand-sand">
      <AppTopbar />
      <RouteTransition><Outlet /></RouteTransition>
    </div>
  )
}
