import { ArrowRight, Building2, User } from 'lucide-react'
import { Link } from 'react-router-dom'

const options = [
  {
    to: '/partners/register/freelancer',
    icon: User,
    title: 'Freelancer',
    description: 'Cá nhân nhận ca giúp việc, dọn dẹp theo khu vực và thời gian linh hoạt. Bạn tự định danh eKYC, chọn kỹ năng và nhận thù lao qua tài khoản ngân hàng.',
    cta: 'Đăng ký với tư cách cá nhân',
    available: true,
  },
  {
    to: '/partners/register/company',
    icon: Building2,
    title: 'Doanh nghiệp',
    description: 'Công ty cung cấp dịch vụ chăm sóc căn hộ, quản lý nhiều nhân sự và điều phối ca làm việc theo hợp đồng.',
    cta: 'Tìm hiểu đăng ký doanh nghiệp',
    available: false,
  },
]

export function PartnerTypeChoicePage() {
  return (
    <main className="mx-auto w-full max-w-[1000px] px-6 py-12 sm:py-16">
      <header className="max-w-2xl">
        <p className="mb-4 text-sm font-semibold text-brand-blue-ink">Cổng đối tác ABSTRICT</p>
        <h1 className="page-title">Đăng ký làm đối tác</h1>
        <p className="page-intro mt-6">Chọn hình thức tham gia phù hợp với bạn. Mỗi hình thức có quy trình xác thực và điều phối ca làm việc riêng.</p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {options.map(({ to, icon: Icon, title, description, cta, available }) => (
          <Link className="landing-card group flex flex-col gap-6 rounded-2xl bg-white p-8" key={to} to={to}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-pastel-soft text-brand-blue-ink">
              <Icon aria-hidden className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{title}</h2>
                {!available && <span className="rounded-full bg-brand-sand px-2.5 py-0.5 text-xs font-medium text-brand-muted">Sắp ra mắt</span>}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-brand-muted">{description}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-brand-charcoal transition-colors group-hover:text-brand-blue-ink">
              {cta}
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
