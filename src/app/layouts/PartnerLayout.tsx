import { Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/auth-context'
import { AppTopbar } from '../components/AppTopbar'
import { RouteTransition } from '../../shared/ui/RouteTransition'

export function PartnerLayout() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <AppTopbar actor={user?.actor === 'company' ? 'company' : 'freelancer'} />
      <RouteTransition><Outlet /></RouteTransition>
    </div>
  )
}
