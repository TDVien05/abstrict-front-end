import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { AuthUser } from '../../entities/auth'
import { setAccessToken } from '../../shared/api/access-token'
import { setSessionRenewer } from '../../shared/api/http-client'
import { logout, refreshSession, sessionUserOf } from './api/customer-session'
import { AuthContext, type AuthContextValue } from './auth-context'

const demoCustomer = import.meta.env.DEV && import.meta.env.VITE_DEMO_CUSTOMER === 'true'
const demoPartner = import.meta.env.DEV && import.meta.env.VITE_DEMO_PARTNER === 'true'
const demoUser: AuthUser | null = demoPartner
  ? { id: 'partner-preview', displayName: 'Nguyễn Thu Hà', actor: 'freelancer' }
  : demoCustomer ? { id: 'customer-preview', displayName: 'Nguyễn Thu Hà', actor: 'customer' } : null

export function AuthProvider({ children }: PropsWithChildren) {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(demoUser)
  const [isRestoring, setIsRestoring] = useState(demoUser === null)

  const setSession = useCallback((nextUser: AuthUser, accessToken: string) => {
    setAccessToken(accessToken)
    setAuthenticatedUser(nextUser)
  }, [])

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setAuthenticatedUser((current) => current && { ...current, ...patch })
  }, [])

  const signOut = useCallback(async () => {
    setAccessToken(null)
    setAuthenticatedUser(null)
    await logout().catch(() => undefined)
  }, [])

  useEffect(() => {
    if (demoUser) return

    // Nhiều request cùng gặp 401 thì chỉ refresh một lần.
    let pending: Promise<boolean> | null = null
    const renew = () => {
      pending ??= refreshSession()
        .then((response) => {
          setSession(sessionUserOf(response), response.accessToken)
          return true
        })
        .catch(() => {
          setAccessToken(null)
          setAuthenticatedUser(null)
          return false
        })
        .finally(() => { pending = null })
      return pending
    }

    setSessionRenewer(renew)
    void renew().finally(() => setIsRestoring(false))
    return () => setSessionRenewer(null)
  }, [setSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: authenticatedUser,
      isAuthenticated: authenticatedUser !== null,
      isRestoring,
      hasActor: (actors) => authenticatedUser !== null && actors.includes(authenticatedUser.actor),
      setSession,
      updateUser,
      signOut,
    }),
    [authenticatedUser, isRestoring, setSession, updateUser, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
