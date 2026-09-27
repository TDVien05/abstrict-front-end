import { Building2, CheckCircle2, Clock3, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatVnd } from '../../../shared/lib/format-currency'
import type { ProviderSummary } from '../customer-content'

export function ProviderCard({ provider }: { provider: ProviderSummary }) {
  const profilePath = `/kham-pha/${provider.id}`

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-[0_2px_8px_rgba(23,25,28,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg">
      {provider.image ? (
        <div className="relative h-48 overflow-hidden bg-slate-100">
          <img alt={provider.name} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]" src={provider.image} />
          <span className="absolute left-3 top-3 rounded-lg bg-brand-charcoal/85 px-2.5 py-1 text-xs font-semibold text-white">{provider.badge}</span>
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Rảnh hôm nay</span>
        </div>
      ) : (
        <div className={`flex h-48 flex-col justify-between p-5 text-white ${provider.accent === 'emerald' ? 'bg-gradient-to-br from-emerald-800 via-teal-900 to-brand-charcoal' : 'bg-gradient-to-br from-slate-800 via-slate-900 to-brand-charcoal'}`}>
          <div className="flex items-center justify-between"><span className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold">{provider.badge}</span><Building2 aria-hidden="true" className="h-5 w-5 text-white/80" /></div>
          <div className="flex items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-brand-charcoal shadow-lg">{provider.initials}</span><div><p className="font-semibold">{provider.name}</p><p className="mt-0.5 text-xs text-white/70">Pháp nhân đã xác minh</p></div></div>
          <p className="text-xs text-white/75">Bảo hiểm tài sản · Điều phối nhanh</p>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-semibold text-brand-charcoal transition-colors group-hover:text-brand-purple">{provider.name}</h3><p className="mt-0.5 text-xs text-brand-muted">{provider.subtitle}</p></div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"><Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{provider.rating}<span className="font-normal text-brand-muted">({provider.reviews})</span></span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-brand-muted"><MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{provider.location}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{provider.skills.map((skill) => <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600" key={skill}>{skill}</span>)}</div>
        <p className="mt-4 flex items-center gap-1.5 border-t border-brand-border pt-3 text-xs font-medium text-emerald-700"><Clock3 aria-hidden="true" className="h-4 w-4" />{provider.availability}</p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-brand-border px-5 py-4">
        <div><p className="text-[11px] text-brand-muted">Giá tham khảo</p><p className="font-semibold text-brand-charcoal">{formatVnd(provider.price)}<span className="text-xs font-normal text-brand-muted">{provider.priceUnit}</span></p></div>
        <div className="flex gap-2"><Link className="inline-flex h-9 items-center rounded-lg border border-brand-border px-3 text-xs font-semibold text-brand-charcoal hover:bg-slate-50" to={profilePath}>Xem hồ sơ</Link><Link className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-charcoal px-3 text-xs font-semibold text-white hover:bg-black" to={profilePath}><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />Đặt lịch</Link></div>
      </div>
    </article>
  )
}
