import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/auth-context'
import { AppTopbar } from '../components/AppTopbar'
import { RouteTransition } from '../../shared/ui/RouteTransition'

export function PublicLayout() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const registration = pathname.startsWith('/partners/register')
  return (
    <div className="min-h-screen bg-brand-sand">
      {/* Khách đã đăng nhập giữ nguyên thanh điều hướng của mình khi ghé các trang công khai. */}
      {user?.actor === 'customer' ? <AppTopbar actor="customer" /> : <AppTopbar registration={registration} />}
      <RouteTransition><Outlet /></RouteTransition>
    </div>
  )
}
