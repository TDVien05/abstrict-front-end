import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Actor } from '../../entities/auth'
import { useAuth } from '../../features/auth/auth-context'

interface RequireActorProps extends PropsWithChildren {
  allow: Actor[]
}

export function RequireActor({ allow, children }: RequireActorProps) {
  const { hasActor, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (!hasActor(allow)) {
    return <Navigate replace to="/forbidden" />
  }

  return children
}
