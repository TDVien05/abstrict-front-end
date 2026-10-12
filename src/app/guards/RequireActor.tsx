import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Actor } from '../../entities/auth'
import { useAuth } from '../../features/auth/auth-context'

interface RequireActorProps extends PropsWithChildren {
  allow: Actor[]
}

export function RequireActor({ allow, children }: RequireActorProps) {
  const { hasActor, isAuthenticated, isRestoring } = useAuth()
  const location = useLocation()

  if (isRestoring) {
    return <p className="p-10 text-center text-sm text-brand-muted" role="status">Đang khôi phục phiên đăng nhập...</p>
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (!hasActor(allow)) {
    return <Navigate replace to="/forbidden" />
  }

  return children
}
