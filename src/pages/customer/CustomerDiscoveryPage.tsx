import { BadgeCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { serviceLabels, useFreelancers } from '../../features/customer/api/freelancers'
import { CustomerContainer } from '../../features/customer/components/CustomerPrimitives'
import { ProviderCard } from '../../features/customer/components/ProviderCard'

const filterClass = 'h-11 w-full rounded-xl border border-brand-border bg-white px-3.5 text-sm text-brand-charcoal outline-none transition focus:border-brand-charcoal focus:ring-1 focus:ring-brand-charcoal'
const chipClass = (active: boolean) => `rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-brand-charcoal text-white' : 'border border-brand-border bg-white text-brand-muted hover:text-brand-charcoal'}`

export function CustomerDiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const serviceCode = searchParams.get('serviceCode') ?? ''
  const city = searchParams.get('city') ?? ''
  const district = searchParams.get('district') ?? ''
  const minRating = Number(searchParams.get('minRating')) || undefined
  const acceptingBookings = searchParams.get('acceptingBookings') === 'true'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const { data, error, isError, isPending, isFetching } = useFreelancers({
    serviceCode: serviceCode || undefined,
    city: city || undefined,
    district: district || undefined,
    minRating,
    acceptingBookings: acceptingBookings || undefined,
    page,
    pageSize: 12,
  })

  function updateParam(name: string, value: string, resetPage = true) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(name, value)
    else next.delete(name)
    if (resetPage) next.set('page', '1')
    setSearchParams(next)
  }

  const items = data?.items ?? []
  const firstItem = data && data.totalItems > 0 ? (data.page - 1) * data.pageSize + 1 : 0

  return (
    <main className="pb-20">
      <section className="border-b border-brand-border bg-white py-9 sm:py-12">
        <CustomerContainer>
          <div className="max-w-3xl"><p className="text-sm font-semibold text-brand-purple">Khám phá dịch vụ</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-brand-charcoal sm:text-4xl">Tìm đối tác phù hợp cho căn hộ của bạn</h1><p className="mt-3 text-base leading-7 text-brand-muted">Đối tác đã được kiểm định danh tính, kỹ năng chuyên môn và đánh giá thực tế từ khách hàng ABSTRICT.</p></div>
          <div className="mt-7 grid gap-3 rounded-2xl bg-[#f7f8fa] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-brand-charcoal"><span className="mb-1.5 flex items-center gap-1.5"><Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-brand-muted" />Dịch vụ</span><select className={filterClass} onChange={(event) => updateParam('serviceCode', event.target.value)} value={serviceCode}><option value="">Tất cả dịch vụ</option>{Object.entries(serviceLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold text-brand-charcoal"><span className="mb-1.5 flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand-muted" />Thành phố</span><input className={filterClass} defaultValue={city} key={`city-${city}`} onBlur={(event) => updateParam('city', event.currentTarget.value.trim())} placeholder="Hồ Chí Minh" /></label>
            <label className="text-xs font-semibold text-brand-charcoal"><span className="mb-1.5 flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand-muted" />Quận / Huyện</span><input className={filterClass} defaultValue={district} key={`district-${district}`} onBlur={(event) => updateParam('district', event.currentTarget.value.trim())} placeholder="Quận 1" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button aria-pressed={minRating === 4.5} className={chipClass(minRating === 4.5)} onClick={() => updateParam('minRating', minRating === 4.5 ? '' : '4.5')} type="button">Đánh giá 4.5★ trở lên</button>
            <button aria-pressed={acceptingBookings} className={chipClass(acceptingBookings)} onClick={() => updateParam('acceptingBookings', acceptingBookings ? '' : 'true')} type="button">Đang nhận đơn</button>
          </div>
        </CustomerContainer>
      </section>

      <CustomerContainer className="py-8">
        <div className="grid gap-3 rounded-2xl border border-brand-border bg-white p-4 text-xs text-brand-muted sm:grid-cols-2 lg:grid-cols-4">
          <span className="flex items-center gap-2"><BadgeCheck aria-hidden="true" className="h-4 w-4 text-emerald-600" />100% xác minh danh tính</span><span className="flex items-center gap-2"><Clock3 aria-hidden="true" className="h-4 w-4 text-brand-purple" />Hồ sơ được ABSTRICT duyệt</span><span className="flex items-center gap-2"><Sparkles aria-hidden="true" className="h-4 w-4 text-amber-500" />Đánh giá thực tế</span><span className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-blue-600" />Thông tin cá nhân được bảo mật</span>
        </div>

        <div className="mt-9"><h2 className="text-2xl font-semibold tracking-[-0.02em] text-brand-charcoal">Đối tác phù hợp với bạn</h2><p className="mt-1 text-sm text-brand-muted">Sắp xếp theo đánh giá cao nhất và số ca đã hoàn thành.</p></div>

        {isPending ? <p className="mt-8 text-sm text-brand-muted" role="status">Đang tải danh sách đối tác...</p> : null}
        {isError ? <p className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error instanceof Error ? error.message : 'Không tải được danh sách đối tác.'}</p> : null}
        {data && items.length === 0 ? <p className="mt-8 rounded-xl border border-dashed border-brand-border p-8 text-center text-sm text-brand-muted">Không tìm thấy đối tác phù hợp với bộ lọc hiện tại.</p> : null}

        <div className={`mt-5 grid gap-5 transition-opacity md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${isFetching && !isPending ? 'opacity-60' : ''}`}>{items.map((provider) => <ProviderCard key={provider.providerId} provider={provider} />)}</div>

        {data && data.totalItems > 0 ? <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-brand-border pt-5 text-sm text-brand-muted sm:flex-row"><span>Hiển thị {firstItem}–{firstItem + items.length - 1} trong {data.totalItems} đối tác</span><div className="flex items-center gap-1"><button aria-label="Trang trước" className="rounded-lg border border-brand-border p-2 disabled:opacity-40" disabled={data.page <= 1} onClick={() => updateParam('page', String(data.page - 1), false)} type="button"><ChevronLeft className="h-4 w-4" /></button><span className="px-3 text-sm font-semibold text-brand-charcoal">{data.page} / {data.totalPages}</span><button aria-label="Trang sau" className="rounded-lg border border-brand-border p-2 disabled:opacity-40" disabled={data.page >= data.totalPages} onClick={() => updateParam('page', String(data.page + 1), false)} type="button"><ChevronRight className="h-4 w-4" /></button></div></div> : null}

        <section className="mt-12 overflow-hidden rounded-3xl bg-brand-charcoal p-6 text-white sm:p-8 lg:p-10"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-semibold text-brand-blue-pastel">Quy chuẩn an toàn ABSTRICT</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">An tâm khi bàn giao căn hộ</h2><p className="mt-3 text-sm leading-6 text-white/65">Mỗi đối tác được xác thực và tuân thủ quy trình minh bạch từ lúc nhận ca đến khi nghiệm thu.</p></div><div className="grid gap-3 sm:grid-cols-3">{[[CalendarDays, 'Check-in bằng QR', 'Ghi nhận đúng người và thời điểm bắt đầu.'], [BadgeCheck, 'Checklist minh bạch', 'Phạm vi công việc được hai bên thống nhất.'], [ShieldCheck, 'Ảnh trước & sau', 'Đối chứng trực tiếp trước khi nghiệm thu.']].map(([Icon, title, description]) => { const ItemIcon = Icon as typeof CalendarDays; return <div className="rounded-2xl bg-white/8 p-4" key={String(title)}><ItemIcon aria-hidden="true" className="h-5 w-5 text-brand-blue-pastel" /><h3 className="mt-4 text-sm font-semibold">{String(title)}</h3><p className="mt-1 text-xs leading-5 text-white/55">{String(description)}</p></div> })}</div></div></section>
      </CustomerContainer>
    </main>
  )
}
