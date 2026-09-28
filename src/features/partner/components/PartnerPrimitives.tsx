import type { PropsWithChildren, ReactNode } from 'react'
import { Link } from 'react-router-dom'

const partnerInputBase = 'w-full min-h-11 rounded-xl border border-brand-border bg-white px-3 py-2 outline-none'
export const partnerInput = `${partnerInputBase} focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/15`
export const partnerInputBlue = `${partnerInputBase} focus:border-brand-blue-pastel-hover focus:ring-2 focus:ring-brand-blue-pastel`
export const partnerLink = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-charcoal px-4 py-2 text-sm font-semibold text-white hover:bg-black'

export function PartnerPage({ title, description, action, fullWidth = false, accent = 'purple', children }: PropsWithChildren<{ title: string; description: string; action?: ReactNode; fullWidth?: boolean; accent?: 'purple' | 'blue' }>) {
  return <main className={`w-full px-6 py-10 sm:py-14 ${fullWidth ? 'sm:px-8 lg:px-10 xl:px-12' : 'mx-auto max-w-[1200px]'}`}><header className="mb-12 flex flex-wrap items-end justify-between gap-6"><div><p className={`mb-3 text-sm font-semibold ${accent === 'blue' ? 'text-brand-blue-ink' : 'text-brand-purple'}`}>Cổng đối tác ABSTRICT</p><h1 className="page-title">{title}</h1><p className="page-intro mt-6">{description}</p></div>{action}</header>{children}<footer className="mt-14 flex flex-wrap justify-between gap-4 border-t border-brand-border pt-6 text-sm text-brand-muted"><span>ABSTRICT · Cùng chăm sóc tổ ấm</span><Link to="/partners/register">Hồ sơ đối tác</Link><a href="mailto:support@abstrict.vn">Liên hệ hỗ trợ</a></footer></main>
}

export function PartnerPanel({ title, children, className = '' }: PropsWithChildren<{ title?: string; className?: string }>) {
  return <section className={`min-w-0 rounded-2xl bg-white p-5 shadow-sm sm:p-7 ${className}`}>{title && <h2 className="mb-6 text-xl font-semibold">{title}</h2>}{children}</section>
}

export function PreviewNotice() {
  return <p className="mb-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">Bản xem trước với dữ liệu minh họa. Các thao tác chưa tạo giao dịch hoặc thay đổi đơn hàng thực tế.</p>
}

export function PartnerStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <PartnerPanel><p className="text-brand-muted">{label}</p><p className="my-3 text-3xl font-semibold">{value}</p><p className="text-sm text-brand-muted">{detail}</p></PartnerPanel>
}
