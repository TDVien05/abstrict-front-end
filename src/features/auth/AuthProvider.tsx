import { useCallback, useMemo, useState, type PropsWithChildren } from 'react'
import type { AuthUser } from '../../entities/auth'
import { setAccessToken } from '../../shared/api/access-token'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: PropsWithChildren) {
  const demoCustomer = import.meta.env.DEV && import.meta.env.VITE_DEMO_CUSTOMER === 'true'
  const demoPartner = import.meta.env.DEV && import.meta.env.VITE_DEMO_PARTNER === 'true'
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(() =>
    demoPartner ? { id: 'partner-preview', displayName: 'Nguyễn Thu Hà', actor: 'freelancer' } : demoCustomer ? { id: 'customer-preview', displayName: 'Nguyễn Thu Hà', actor: 'customer' } : null,
  )
  const setSession = useCallback((nextUser: AuthUser, accessToken: string) => {
    setAccessToken(accessToken)
    setAuthenticatedUser(nextUser)
  }, [])
  const value = useMemo<AuthContextValue>(
    () => ({
      user: authenticatedUser,
      isAuthenticated: authenticatedUser !== null,
      hasActor: (actors) => authenticatedUser !== null && actors.includes(authenticatedUser.actor),
      setSession,
    }),
    [authenticatedUser, setSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
