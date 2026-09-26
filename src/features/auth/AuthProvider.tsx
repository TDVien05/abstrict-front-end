import { useMemo, useState, type PropsWithChildren } from 'react'
import type { AuthUser } from '../../entities/auth'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  // TODO: AUTH - hydrate this value from the backend session endpoint.
  const [user] = useState<AuthUser | null>(null)
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      hasActor: (actors) => user !== null && actors.includes(user.actor),
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
