import { createContext, useContext } from 'react'
import type { Actor, AuthUser } from '../../entities/auth'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Đang hỏi server xem phiên cũ còn dùng được không (lúc mới tải trang). */
  isRestoring: boolean
  hasActor: (actors: Actor[]) => boolean
  setSession: (user: AuthUser, accessToken: string) => void
  updateUser: (patch: Partial<AuthUser>) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider')
  }

  return context
}
