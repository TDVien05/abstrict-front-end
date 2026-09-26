import { createContext, useContext } from 'react'
import type { Actor, AuthUser } from '../../entities/auth'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  hasActor: (actors: Actor[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider')
  }

  return context
}
