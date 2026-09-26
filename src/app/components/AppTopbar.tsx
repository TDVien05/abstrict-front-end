import { NavLink } from 'react-router-dom'
import type { Actor } from '../../entities/auth'
import { BrandLogo } from '../../shared/ui/BrandLogo'

interface AppTopbarProps {
  actor?: Actor | 'public'
}

const navByActor: Record<Actor | 'public', { label: string; to: string }[]> = {
  public: [
    { label: 'Dịch vụ', to: '/#services' },
    { label: 'Tìm người làm', to: '/#partners' },
    { label: 'Cách hoạt động', to: '/#how-it-works' },
    { label: 'Trở thành đối tác', to: '/dang-ky-doi-tac' },
  ],
  customer: [{ label: 'Đơn hàng', to: '/don-hang' }],
  freelancer: [
    { label: 'Tổng quan', to: '/doi-tac/dashboard' },
    { label: 'Lịch làm việc', to: '/doi-tac/lich' },
    { label: 'Gói hiển thị', to: '/doi-tac/goi' },
  ],
  company: [
    { label: 'Tổng quan', to: '/doi-tac/dashboard' },
    { label: 'Gói hiển thị', to: '/doi-tac/goi' },
  ],
  admin: [
    { label: 'Duyệt hồ sơ', to: '/admin/duyet' },
    { label: 'Khiếu nại', to: '/admin/khieu-nai' },
  ],
}

export function AppTopbar({ actor = 'public' }: AppTopbarProps) {
  if (actor === 'public') {
    return (
      <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-sand/90 backdrop-blur-md">
        <div className="flex h-20 w-full items-center justify-between px-6 sm:px-8 lg:px-8 xl:px-10 2xl:px-12">
          <NavLink aria-label="ABSTRICT - Trang chủ" className="group" to="/">
            <span className="transition-transform duration-200 group-hover:scale-[1.02]">
              <BrandLogo />
            </span>
          </NavLink>
          <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 text-[15px] font-medium text-brand-muted md:flex">
            {navByActor.public.map((item) => (
              <a className="transition-colors hover:text-brand-charcoal" href={item.to} key={item.to}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <NavLink className="px-2 py-2 text-[15px] font-semibold text-brand-charcoal transition-opacity hover:opacity-70 sm:px-3" to="/dang-nhap">
              Đăng nhập
            </NavLink>
            <a className="inline-flex items-center justify-center rounded-xl bg-brand-charcoal px-4 py-2.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-black sm:px-5" href="/#hero-search">
              Đặt lịch ngay
            </a>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <NavLink aria-label="ABSTRICT - Trang chủ" to="/">
          <BrandLogo />
        </NavLink>
        <nav aria-label="Điều hướng chính" className="flex items-center gap-1 sm:gap-3">
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
