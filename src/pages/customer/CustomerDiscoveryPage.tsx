import { BadgeCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CustomerContainer } from '../../features/customer/components/CustomerPrimitives'
import { ProviderCard } from '../../features/customer/components/ProviderCard'
import { providers } from '../../features/customer/customer-content'

const filterClass = 'h-11 w-full rounded-xl border border-brand-border bg-white px-3.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-charcoal focus:ring-1 focus:ring-brand-charcoal'

export function CustomerDiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const providerType = searchParams.get('type') ?? 'all'
  const sort = searchParams.get('sort') ?? 'nearby'

  const visibleProviders = useMemo(
    () => providers.filter((provider) => providerType === 'all' || provider.kind === providerType),
    [providerType],
  )

  function updateParam(name: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(name, value)
    else next.delete(name)
    next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <main className="pb-20">
      <section className="border-b border-brand-border bg-white py-9 sm:py-12">
        <CustomerContainer>
          <div className="max-w-3xl"><p className="text-sm font-semibold text-brand-purple">Khám phá dịch vụ</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-brand-charcoal sm:text-4xl">Tìm đối tác phù hợp cho căn hộ của bạn</h1><p className="mt-3 text-base leading-7 text-brand-muted">Đối tác đã được kiểm định danh tính, kỹ năng chuyên môn và đánh giá thực tế từ khách hàng ABSTRICT.</p></div>
          <div className="mt-7 grid gap-3 rounded-2xl bg-[#f7f8fa] p-4 sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1.15fr_auto]">
            <label className="text-xs font-semibold text-brand-charcoal"><span className="mb-1.5 flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand-muted" />Khu vực / Tòa nhà</span><input className={filterClass} defaultValue={searchParams.get('location') ?? ''} onBlur={(event) => updateParam('location', event.currentTarget.value.trim())} placeholder="Vinhomes Grand Park" /></label>
            <label className="text-xs font-semibold text-brand-charcoal"><span className="mb-1.5 flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-brand-muted" />Khung giờ làm</span><input className={filterClass} defaultValue="Hôm nay, 14:00 – 18:00" /></label>
            <label className="text-xs font-semibold text-brand-charcoal"><span className="mb-1.5 flex items-center gap-1.5"><Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-brand-muted" />Gói dịch vụ</span><select className={filterClass} defaultValue="standard"><option value="standard">Dọn dẹp căn hộ tiêu chuẩn</option><option value="deep">Tổng vệ sinh chuyên sâu</option><option value="cooking">Nấu ăn gia đình</option></select></label>
            <button className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-5 text-sm font-semibold text-white hover:bg-black" type="button"><Search aria-hidden="true" className="h-4 w-4" />Tìm kiếm</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[['all', 'Tất cả đối tác', 45], ['freelancer', 'Freelancer', 32], ['company', 'Công ty đối tác', 13]].map(([value, label, count]) => <button className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${providerType === value ? 'bg-brand-charcoal text-white' : 'border border-brand-border bg-white text-brand-muted hover:text-brand-charcoal'}`} key={String(value)} onClick={() => updateParam('type', String(value))} type="button">{label} <span className="ml-1 opacity-60">{count}</span></button>)}
            <button className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted hover:text-brand-charcoal" type="button">Đánh giá 4.8★ trở lên</button>
            <button className="rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-muted hover:text-brand-charcoal" type="button">Lịch rảnh hôm nay</button>
          </div>
        </CustomerContainer>
      </section>

      <CustomerContainer className="py-8">
        <div className="grid gap-3 rounded-2xl border border-brand-border bg-white p-4 text-xs text-brand-muted sm:grid-cols-2 lg:grid-cols-4">
          <span className="flex items-center gap-2"><BadgeCheck aria-hidden="true" className="h-4 w-4 text-emerald-600" />100% xác minh danh tính</span><span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="h-4 w-4 text-brand-purple" />Khớp đối tác trong 8 phút</span><span className="flex items-center gap-2"><Sparkles aria-hidden="true" className="h-4 w-4 text-amber-500" />98,6% đánh giá 5★</span><span className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-blue-600" />Bảo hiểm tài sản</span>
        </div>

        <div className="mt-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div><h2 className="text-2xl font-semibold tracking-[-0.02em] text-brand-charcoal">Đối tác phù hợp với bạn</h2><p className="mt-1 text-sm text-brand-muted">Các lựa chọn sẵn sàng tại Vinhomes Grand Park và khu vực lân cận.</p></div>
          <div className="flex w-fit rounded-xl bg-slate-200/70 p-1">{[['nearby', 'Gần bạn nhất'], ['rating', 'Đánh giá cao'], ['price', 'Giá tốt nhất']].map(([value, label]) => <button className={`rounded-lg px-3 py-2 text-xs font-semibold ${sort === value ? 'bg-white text-brand-charcoal shadow-sm' : 'text-brand-muted'}`} key={value} onClick={() => updateParam('sort', value)} type="button">{label}</button>)}</div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visibleProviders.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}</div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-brand-border pt-5 text-sm text-brand-muted sm:flex-row"><span>Hiển thị 1–{visibleProviders.length} trong 45 đối tác</span><div className="flex items-center gap-1"><button aria-label="Trang trước" className="rounded-lg border border-brand-border p-2 disabled:opacity-40" disabled type="button"><ChevronLeft className="h-4 w-4" /></button>{[1, 2, 3, 4].map((page) => <button className={`h-9 min-w-9 rounded-lg text-sm font-semibold ${page === 1 ? 'bg-brand-charcoal text-white' : 'hover:bg-white'}`} key={page} type="button">{page}</button>)}<button aria-label="Trang sau" className="rounded-lg border border-brand-border p-2" type="button"><ChevronRight className="h-4 w-4" /></button></div></div>

        <section className="mt-12 overflow-hidden rounded-3xl bg-brand-charcoal p-6 text-white sm:p-8 lg:p-10"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-semibold text-brand-blue-pastel">Quy chuẩn an toàn ABSTRICT</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">An tâm khi bàn giao căn hộ</h2><p className="mt-3 text-sm leading-6 text-white/65">Mỗi đối tác được xác thực và tuân thủ quy trình minh bạch từ lúc nhận ca đến khi nghiệm thu.</p><div className="mt-6 flex gap-8"><div><strong className="text-2xl">100%</strong><p className="mt-1 text-xs text-white/55">Định danh</p></div><div><strong className="text-2xl">3 bước</strong><p className="mt-1 text-xs text-white/55">Quy trình chuẩn</p></div></div></div><div className="grid gap-3 sm:grid-cols-3">{[[CalendarDays, 'Check-in bằng QR', 'Ghi nhận đúng người và thời điểm bắt đầu.'], [BadgeCheck, 'Checklist minh bạch', 'Phạm vi công việc được hai bên thống nhất.'], [ShieldCheck, 'Ảnh trước & sau', 'Đối chứng trực tiếp trước khi nghiệm thu.']].map(([Icon, title, description]) => { const ItemIcon = Icon as typeof CalendarDays; return <div className="rounded-2xl bg-white/8 p-4" key={String(title)}><ItemIcon aria-hidden="true" className="h-5 w-5 text-brand-blue-pastel" /><h3 className="mt-4 text-sm font-semibold">{String(title)}</h3><p className="mt-1 text-xs leading-5 text-white/55">{String(description)}</p></div> })}</div></div></section>
      </CustomerContainer>
    </main>
  )
}
