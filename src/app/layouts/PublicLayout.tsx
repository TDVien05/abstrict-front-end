import { Outlet, useLocation } from 'react-router-dom'
import { AppTopbar } from '../components/AppTopbar'
import { RouteTransition } from '../../shared/ui/RouteTransition'

export function PublicLayout() {
  const { pathname } = useLocation()
  const registration = pathname.startsWith('/partners/register')
  return (
    <div className="min-h-screen bg-brand-sand">
      <AppTopbar registration={registration} />
      <RouteTransition><Outlet /></RouteTransition>
    </div>
  )
}
