import { Outlet } from 'react-router-dom'
import { CustomerFooter } from '../../features/customer/components/CustomerFooter'
import { AppTopbar } from '../components/AppTopbar'
import { RouteTransition } from '../../shared/ui/RouteTransition'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppTopbar actor="customer" />
      <RouteTransition><Outlet /></RouteTransition>
      <CustomerFooter />
    </div>
  )
}
