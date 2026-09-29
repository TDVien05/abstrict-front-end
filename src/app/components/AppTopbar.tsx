import { Bell, ChevronDown, Search } from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import type { Actor } from '../../entities/auth'
import { BrandLogo } from '../../shared/ui/BrandLogo'

interface AppTopbarProps {
  actor?: Actor | 'public'
  registration?: boolean
}

const navByActor: Record<Actor | 'public', { label: string; to: string }[]> = {
  public: [
    { label: 'Dịch vụ', to: '/#services' },
    { label: 'Tìm người làm', to: '/#partners' },
    { label: 'Cách đặt dịch vụ', to: '/#booking-options' },
    { label: 'Cách hoạt động', to: '/#how-it-works' },
    { label: 'Theo dõi ca dọn', to: '/#workflow' },
    { label: 'Hỏi đáp', to: '/#trust-and-faq' },
  ],
  customer: [
    { label: 'Khám phá dịch vụ', to: '/discover' },
    { label: 'Đơn của tôi', to: '/orders' },
    { label: 'Cổng đối tác', to: '/partners/register' },
  ],
  freelancer: [
    { label: 'Tổng quan', to: '/partner/dashboard' },
    { label: 'Đơn đặt lịch', to: '/partner/orders' },
    { label: 'Lịch làm việc', to: '/partner/schedule' },
    { label: 'Gói hiển thị', to: '/partner/plans' },
  ],
  company: [
    { label: 'Tổng quan', to: '/partner/dashboard' },
    { label: 'Đơn đặt lịch', to: '/partner/orders' },
    { label: 'Gói hiển thị', to: '/partner/plans' },
  ],
  admin: [
    { label: 'Duyệt hồ sơ', to: '/admin/approvals' },
    { label: 'Khiếu nại', to: '/admin/disputes' },
  ],
}

export function AppTopbar({ actor = 'public', registration = false }: AppTopbarProps) {
  if (registration) {
    return (
      <header className="sticky top-0 z-40 border-b border-brand-border bg-white/95 backdrop-blur-xl">
        <div className="flex min-h-16 w-full flex-wrap items-center justify-between gap-4 px-6 py-3 sm:px-8 lg:px-10 2xl:px-12">
          <NavLink aria-label="ABSTRICT - Trang chủ" className="shrink-0" to="/"><BrandLogo size="sm" /></NavLink>
          <nav aria-label="Điều hướng cổng đối tác" className="order-3 flex w-full flex-wrap items-center gap-1 text-sm lg:order-none lg:w-auto">
            {[{ label: 'Khám phá dịch vụ', to: '/' }, { label: 'Đơn của tôi', to: '/orders' }, { label: 'Cổng đối tác', to: '/partners/register' }].map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-lg px-3 py-2 font-semibold ${isActive ? 'bg-brand-blue-pastel-soft text-brand-blue-ink' : 'text-brand-muted hover:bg-brand-sand'}`}>{item.label}</NavLink>)}
            <a className="rounded-lg px-3 py-2 text-brand-muted hover:bg-brand-sand" href="mailto:support@abstrict.vn">Hỗ trợ</a>
          </nav>
          <div className="flex items-center gap-3">
            <NavLink className="rounded-lg bg-brand-charcoal px-3 py-2 text-sm font-semibold text-white hover:bg-black" to="/partners/login">Đăng nhập</NavLink>
          </div>
        </div>
      </header>
    )
  }
  if (actor === 'public') {
    return (
      <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-sand/90 backdrop-blur-md">
        <div className="flex h-20 w-full items-center justify-between px-6 sm:px-8 lg:px-8 xl:px-10 2xl:px-12">
          <NavLink aria-label="ABSTRICT - Trang chủ" className="group" to="/">
            <span className="transition-transform duration-200 group-hover:scale-[1.02]">
              <BrandLogo />
            </span>
          </NavLink>
          <nav aria-label="Điều hướng chính" className="hidden items-center gap-5 text-[14px] font-medium text-brand-muted lg:gap-7 lg:text-[15px] xl:gap-9 md:flex">
            {navByActor.public.map((item) => (
              <a className="transition-colors hover:text-brand-charcoal" href={item.to} key={item.to}>
                {item.label}
              </a>
            ))}
            <Link className="transition-colors hover:text-brand-charcoal" to="/partners/register">Trở thành đối tác</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <NavLink className="hidden px-2 py-2 text-[15px] font-semibold text-brand-charcoal transition-opacity hover:opacity-70 sm:block sm:px-3" to="/login">
              Đăng nhập
            </NavLink>
            <NavLink className="inline-flex items-center justify-center rounded-xl bg-brand-charcoal px-3 py-2.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-black sm:px-5" to="/register">
              Đặt lịch ngay
            </NavLink>
          </div>
        </div>
      </header>
    )
  }

  if (actor === 'customer') {
    return (
      <header className="sticky top-0 z-40 border-b border-brand-border bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-5 lg:gap-8">
            <NavLink aria-label="ABSTRICT - Trang chủ" className="shrink-0" to="/discover"><BrandLogo size="sm" /></NavLink>
            <nav aria-label="Điều hướng khách hàng" className="hidden items-center gap-1 md:flex">
              {navByActor.customer.map((item) => (
                <NavLink className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-slate-100 text-brand-charcoal' : 'text-brand-muted hover:bg-slate-50 hover:text-brand-charcoal'}`} key={item.to} to={item.to}>{item.label}</NavLink>
              ))}
              <a className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-muted hover:bg-slate-50 hover:text-brand-charcoal" href="mailto:support@abstrict.vn">Hỗ trợ</a>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="relative hidden lg:block"><span className="sr-only">Tìm kiếm</span><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" /><input className="h-9 w-60 rounded-xl bg-slate-100 pl-9 pr-3 text-xs outline-none transition focus:bg-white focus:ring-1 focus:ring-brand-charcoal" placeholder="Tìm căn hộ, ca làm việc..." /></label>
            <button aria-label="Thông báo" className="relative rounded-lg p-2 text-brand-muted hover:bg-slate-100 hover:text-brand-charcoal" type="button"><Bell aria-hidden="true" className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" /></button>
            <span className="hidden h-5 w-px bg-brand-border sm:block" />
            <button className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50" type="button"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple text-xs font-semibold text-white">TH</span><span className="hidden text-left sm:block"><span className="block text-xs font-semibold leading-4">Nguyễn Thu Hà</span><span className="block text-[10px] text-brand-muted">Khách hàng Pro</span></span><ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-brand-muted sm:block" /></button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 lg:px-8">
        <NavLink aria-label="ABSTRICT - Trang chủ" to="/">
          <BrandLogo />
        </NavLink>
        <nav aria-label="Điều hướng chính" className="flex flex-wrap items-center gap-1 sm:gap-3">
          {navByActor[actor].map((item) => (
            <NavLink
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
