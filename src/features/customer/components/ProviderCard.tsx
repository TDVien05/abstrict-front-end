import { CheckCircle2, Clock3, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useServiceCategories } from '../../catalog/api/catalog'
import { formatVnd } from '../../../shared/lib/format-currency'
import { initialsOf, serviceLabel, type FreelancerSummary } from '../api/freelancers'

export function ProviderCard({ provider }: { provider: FreelancerSummary }) {
  const profilePath = `/discover/${provider.providerId}`
  const categories = useServiceCategories()
  const serviceLabelOf = (code: string) => categories.data?.find((category) => category.code === code)?.name ?? serviceLabel(code)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-[0_2px_8px_rgba(23,25,28,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex h-36 flex-col justify-between bg-gradient-to-br from-slate-800 via-slate-900 to-brand-charcoal p-5 text-white">
        <div className="flex items-center justify-between">
          <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold">Freelancer</span>
          {provider.isAcceptingBookings ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Đang nhận đơn</span> : <span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold">Tạm nghỉ</span>}
        </div>
        <div className="flex items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-brand-charcoal shadow-lg">{initialsOf(provider.displayName)}</span><p className="font-semibold">{provider.displayName}</p></div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-semibold text-brand-charcoal transition-colors group-hover:text-brand-purple">{provider.displayName}</h3><p className="mt-0.5 text-xs text-brand-muted">{provider.experienceYears} năm kinh nghiệm · {provider.completedBookingCount} ca hoàn thành</p></div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"><Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{provider.averageRating}<span className="font-normal text-brand-muted">({provider.ratingCount})</span></span>
        </div>
        {provider.bio ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-brand-muted">{provider.bio}</p> : null}
        <div className="mt-3 flex flex-wrap gap-1.5">{provider.serviceCodes.map((code) => <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600" key={code}>{serviceLabelOf(code)}</span>)}</div>
        <p className={`mt-4 flex items-center gap-1.5 border-t border-brand-border pt-3 text-xs font-medium ${provider.isAcceptingBookings ? 'text-emerald-700' : 'text-brand-muted'}`}><Clock3 aria-hidden="true" className="h-4 w-4" />{provider.isAcceptingBookings ? 'Đang nhận đặt lịch' : 'Hiện chưa nhận đặt lịch'}</p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-brand-border px-5 py-4">
        <div><p className="text-[11px] text-brand-muted">Giá từ</p><p className="font-semibold text-brand-charcoal">{provider.minHourlyRateVnd === null ? 'Liên hệ' : <>{formatVnd(provider.minHourlyRateVnd)}<span className="text-xs font-normal text-brand-muted">/giờ</span></>}</p></div>
        <div className="flex gap-2"><Link className="inline-flex h-9 items-center rounded-lg border border-brand-border px-3 text-xs font-semibold text-brand-charcoal hover:bg-slate-50" to={profilePath}>Xem hồ sơ</Link>{provider.isAcceptingBookings ? <Link className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-charcoal px-3 text-xs font-semibold text-white hover:bg-black" to={profilePath}><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />Đặt lịch</Link> : null}</div>
      </div>
    </article>
  )
}
