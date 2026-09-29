import { ArrowLeft, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PartnerCompanyPage() {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col items-center px-6 py-16 text-center sm:py-24">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue-pastel-soft text-brand-blue-ink">
        <Building2 aria-hidden className="h-7 w-7" />
      </span>
      <span className="mt-6 rounded-full bg-brand-sand px-3 py-1 text-xs font-medium text-brand-muted">Sắp ra mắt</span>
      <h1 className="page-title mt-4">Đăng ký doanh nghiệp</h1>
      <p className="page-intro mt-6">Quy trình đăng ký dành cho doanh nghiệp đang được hoàn thiện. Trong thời gian này, bạn có thể đăng ký với tư cách Freelancer hoặc liên hệ bộ phận tuyển dụng để được hỗ trợ.</p>
      <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
        <Link className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-5 text-sm font-semibold text-white transition-colors hover:bg-black sm:w-auto" to="/partners/register/freelancer">
          Đăng ký Freelancer
        </Link>
        <Link className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-blue-pastel px-5 text-sm font-semibold text-brand-charcoal transition-colors hover:bg-brand-blue-pastel-hover sm:w-auto" to="/partners/register">
          <ArrowLeft aria-hidden className="h-4 w-4" />Chọn hình thức khác
        </Link>
      </div>
      <a className="mt-6 text-sm font-medium text-brand-blue-ink hover:underline" href="mailto:support@abstrict.vn">Liên hệ bộ phận tuyển dụng</a>
    </main>
  )
}
