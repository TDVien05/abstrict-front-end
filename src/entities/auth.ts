export type Actor = 'customer' | 'freelancer' | 'company' | 'admin'

export interface AuthUser {
  id: string
  displayName: string
  actor: Actor
  phoneNumber?: string
  avatarUrl?: string | null
}
