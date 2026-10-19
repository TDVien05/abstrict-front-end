import { Bell, type LucideIcon } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandLogo } from '../../shared/ui/BrandLogo'
import { RouteTransition } from '../../shared/ui/RouteTransition'
import { AccountMenu } from './AccountMenu'

export interface SidebarItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

interface SidebarShellProps {
  items: SidebarItem[]
  navLabel: string
  roleLabel: string
}


function TopbarGreeting({ items }: { items: SidebarItem[] }) {
  const { pathname } = useLocation()
  const active = items.find(({ to, end }) => end ? pathname === to : pathname.startsWith(to))
  return active
    ? <span className="text-sm font-semibold text-brand-charcoal">{active.label}</span>
    : null
}

export function SidebarShell({ items, navLabel, roleLabel }: SidebarShellProps) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-100 bg-white px-4 py-6 lg:flex">
        <NavLink aria-label="ABSTRICT - Trang chủ" className="mb-8 px-2" to="/"><BrandLogo size="sm" /></NavLink>
        <nav aria-label={navLabel} className="space-y-1">
          {items.map(({ end, icon: Icon, label, to }) => (
            <NavLink className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-blue-50 text-blue-600 before:absolute before:-left-4 before:top-2 before:h-6 before:w-1 before:rounded-r-full before:bg-blue-600' : 'text-brand-muted hover:bg-slate-50 hover:text-brand-charcoal'}`} end={end} key={to} to={to}>
              <Icon aria-hidden="true" className="h-[18px] w-[18px]" />{label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 bg-[#f4f7fb]/90 px-4 backdrop-blur sm:px-6 lg:px-8">
        {/* Tên trang hiện tại */}
        <TopbarGreeting items={items} />

        <div className="ml-auto flex items-center gap-3">
          <button aria-label="Thông báo" className="relative rounded-xl bg-white p-2.5 text-brand-muted shadow-sm ring-1 ring-slate-100 hover:text-brand-charcoal" type="button">
            <Bell aria-hidden="true" className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#f4f7fb]" />
          </button>
          {/* Card người dùng + dropdown đăng xuất */}
          <div className="relative">
            <AccountMenu roleLabel={roleLabel} cardMode />
          </div>
        </div>
      </header>

      <nav aria-label={navLabel} className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:hidden">
        {items.map(({ end, label, to }) => <NavLink className={({ isActive }) => `shrink-0 rounded-xl px-3 py-2 text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-600' : 'text-brand-muted'}`} end={end} key={to} to={to}>{label}</NavLink>)}
      </nav>

      <RouteTransition>
        <main className="px-4 pb-10 pt-2 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </RouteTransition>
    </div>
  )
}
