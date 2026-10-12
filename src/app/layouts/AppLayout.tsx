import { Outlet } from 'react-router-dom'
import { CustomerFooter } from '../../features/customer/components/CustomerFooter'
import { AppTopbar } from '../components/AppTopbar'
import { RouteTransition } from '../../shared/ui/RouteTransition'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppTopbar actor="customer" />
      <RouteTransition><Outlet /></RouteTransition>
      {/* Trang ngắn thì chân trang vẫn nằm sát đáy màn hình. */}
      <div className="mt-auto"><CustomerFooter /></div>
    </div>
  )
}
