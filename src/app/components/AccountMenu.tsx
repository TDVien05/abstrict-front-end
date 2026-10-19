import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/auth-context'
import { initialsOf } from '../../features/customer/api/freelancers'
import { useAvatarImage } from '../../features/customer/api/profile'

const itemClass = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-charcoal hover:bg-slate-50'

export function AccountMenu({ roleLabel, cardMode = false }: { roleLabel: string; cardMode?: boolean }) {
  const { signOut, user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const avatar = useAvatarImage(user?.avatarUrl)
  const displayName = user?.displayName || user?.phoneNumber || ''

  async function leave() {
    await signOut()
    queryClient.clear()
    navigate('/login')
  }

  const trigger = cardMode ? (
    /* Card mode: hiển thị avatar + tên + role + mũi tên trong một card bo tròn */
    <button
      aria-expanded={open} aria-haspopup="menu"
      className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100 transition hover:ring-slate-200"
      onClick={() => setOpen(!open)} type="button"
    >
      {avatar
        ? <img alt="" className="h-9 w-9 rounded-xl object-cover" src={avatar} />
        : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">{initialsOf(displayName)}</span>}
      <span className="hidden text-left sm:block">
        <span className="block text-sm font-semibold leading-5">{displayName}</span>
        <span className="block text-xs text-brand-muted">{roleLabel}</span>
      </span>
      <ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-brand-muted sm:block" />
    </button>
  ) : (
    /* Default: compact avatar */
    <button aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50" onClick={() => setOpen(!open)} type="button">
      {avatar
        ? <img alt="" className="h-8 w-8 rounded-full object-cover" src={avatar} />
        : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple text-xs font-semibold text-white">{initialsOf(displayName)}</span>}
      <span className="hidden text-left sm:block"><span className="block text-xs font-semibold leading-4">{displayName}</span><span className="block text-[10px] text-brand-muted">{roleLabel}</span></span>
      <ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-brand-muted sm:block" />
    </button>
  )

  return (
    <div className="relative">
      {trigger}
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-brand-border bg-white p-1 shadow-lg" role="menu">
          {/* Hồ sơ và ảnh đại diện hiện chỉ có API cho khách hàng. */}
          {user?.actor === 'customer' ? <Link className={itemClass} onClick={() => setOpen(false)} role="menuitem" to="/profile"><UserRound aria-hidden="true" className="h-4 w-4" />Hồ sơ của tôi</Link> : null}
          <button className={itemClass} onClick={() => void leave()} role="menuitem" type="button"><LogOut aria-hidden="true" className="h-4 w-4" />Đăng xuất</button>
        </div>
      ) : null}
    </div>
  )
}
