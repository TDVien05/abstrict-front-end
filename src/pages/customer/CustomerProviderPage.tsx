import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check, CheckCircle2, Clock3, HeartHandshake, MapPin, ShieldCheck, Star, Timer, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProviderAvailability } from '../../features/customer/api/bookings'
import { initialsOf, useFreelancer } from '../../features/customer/api/freelancers'
import { CustomerCard, CustomerContainer, SectionHeading, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { ApiError } from '../../shared/api/problem-details'
import { bookingErrorMessage } from '../../entities/booking'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateLabel, vnIsoDate, vnTime } from '../../shared/lib/vn-time'

const maxDurationMs = 12 * 3_600_000

const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const chipClass = (selected: boolean) => `rounded-xl border text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple ${selected ? 'border-brand-charcoal bg-brand-charcoal text-white' : 'border-brand-border bg-white text-brand-charcoal hover:border-brand-charcoal'}`

// `date` là ngày lịch theo giờ Việt Nam (YYYY-MM-DD) do server trả.
function dayLabel(date: string, today: string) {
  const noon = new Date(`${date}T12:00:00+07:00`)
  const tomorrow = vnIsoDate(Date.parse(`${today}T12:00:00+07:00`) + 86_400_000)
  return { weekday: date === today ? 'Hôm nay' : date === tomorrow ? 'Ngày mai' : weekdays[noon.getUTCDay()], day: date.slice(8), month: `Th${Number(date.slice(5, 7))}` }
}

function periodOf(startMs: number) {
  const hour = Number(vnTime(startMs).slice(0, 2))
  return hour < 12 ? 'Buổi sáng' : hour < 18 ? 'Buổi chiều' : 'Buổi tối'
}

function hoursLabel(durationMs: number) {
  return `${(durationMs / 3_600_000).toLocaleString('vi-VN')} giờ`
}

function steps(from: number, to: number, stepMs: number) {
  const values: number[] = []
  for (let value = from; value <= to; value += stepMs) values.push(value)
  return values
}

export function CustomerProviderPage() {
  const { providerId } = useParams()
  const navigate = useNavigate()
  const { data: provider, error, isError, isPending } = useFreelancer(providerId)
  const availability = useProviderAvailability(providerId)
  const [serviceCode, setServiceCode] = useState('')
  const [pickedDate, setPickedDate] = useState('')
  const [pickedStart, setPickedStart] = useState<number | null>(null)
  const [pickedDurationMs, setPickedDurationMs] = useState<number | null>(null)

  const service = provider?.services.find((item) => item.code === serviceCode) ?? provider?.services[0]

  // Khách chỉ chọn được giờ theo bước của server, nằm trọn trong một khoảng rảnh.
  const stepMs = (availability.data?.slotStepMinutes ?? 30) * 60_000
  const minDurationMs = (availability.data?.minimumDurationMinutes ?? 120) * 60_000
  const freeDays = (availability.data?.days ?? []).filter((day) => day.free.length > 0)
  const day = freeDays.find((item) => item.date === pickedDate) ?? freeDays[0]
  const ranges = (day?.free ?? []).map((range) => ({ start: Date.parse(range.startsAtUtc), end: Date.parse(range.endsAtUtc) }))
  const startOptions = ranges.flatMap((range) => steps(range.start, range.end - minDurationMs, stepMs))
  const start = pickedStart !== null && startOptions.includes(pickedStart) ? pickedStart : startOptions[0]
  const range = ranges.find((item) => start !== undefined && start >= item.start && start < item.end)
  const endOptions = range && start !== undefined ? steps(start + minDurationMs, Math.min(range.end, start + maxDurationMs), stepMs) : []
  // Giữ thời lượng đã chọn khi khách đổi giờ bắt đầu, miễn là còn nằm trong khoảng rảnh.
  const end = pickedDurationMs !== null && start !== undefined && endOptions.includes(start + pickedDurationMs) ? start + pickedDurationMs : endOptions[0]
  const today = vnIsoDate()
  const hasSlot = start !== undefined && end !== undefined
  const duration = hasSlot ? (end - start) / 3_600_000 : 0
  const total = service ? service.hourlyRateVnd * duration : 0
  const canContinue = Boolean(service && hasSlot && provider?.isAcceptingBookings)

  function continueBooking() {
    if (!provider || !service) return
    if (!hasSlot) return
    navigate(`/book/${provider.providerId}`, { state: { endsAtUtc: new Date(end).toISOString(), serviceCode: service.code, startsAtUtc: new Date(start).toISOString() } })
  }

  if (isPending) {
    return <main className="pb-20"><CustomerContainer className="py-10"><p className="text-sm text-brand-muted" role="status">Đang tải hồ sơ đối tác...</p></CustomerContainer></main>
  }

  if (isError || !provider) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <main className="pb-20"><CustomerContainer className="py-10">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to="/discover"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Danh sách đối tác</Link>
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{notFound ? 'Không tìm thấy hồ sơ đối tác này hoặc hồ sơ chưa được duyệt.' : error instanceof Error ? error.message : 'Không tải được hồ sơ đối tác.'}</p>
      </CustomerContainer></main>
    )
  }

  return (
    <main className="pb-20">
      <CustomerContainer className="py-6 sm:py-8">
        <div className="mb-5"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to="/discover"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Danh sách đối tác</Link></div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <CustomerCard className="overflow-hidden p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="relative shrink-0"><span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-brand-charcoal text-3xl font-semibold text-white">{initialsOf(provider.displayName)}</span><span className="absolute -bottom-2 -right-2 rounded-lg bg-brand-purple p-1.5 text-white"><BadgeCheck aria-hidden="true" className="h-4 w-4" /></span></div>
                <div className="flex-1"><div className="flex flex-wrap gap-2"><StatusPill tone="purple">Freelancer</StatusPill>{provider.isAcceptingBookings ? <StatusPill tone="green">Đang nhận đặt lịch</StatusPill> : <StatusPill tone="neutral">Tạm nghỉ nhận đơn</StatusPill>}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-charcoal">{provider.displayName}</h1><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-brand-muted"><span className="inline-flex items-center gap-1.5 font-semibold text-amber-700"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{provider.averageRating} ({provider.ratingCount} đánh giá)</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{provider.completedBookingCount} ca hoàn thành</span><span className="inline-flex items-center gap-1.5"><Timer className="h-4 w-4" />{provider.experienceYears} năm kinh nghiệm</span></div>{provider.bio ? <p className="mt-4 text-sm leading-6 text-brand-muted">{provider.bio}</p> : null}</div>
              </div>
            </CustomerCard>

            <CustomerCard className="p-6 sm:p-8"><SectionHeading description="Giá theo giờ do đối tác niêm yết." title="Dịch vụ & bảng giá" />{provider.services.length === 0 ? <p className="mt-5 text-sm text-brand-muted">Đối tác chưa mở dịch vụ nào.</p> : <div className="mt-5 space-y-3">{provider.services.map((item) => { const selected = service?.code === item.code; return <button aria-pressed={selected} className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition ${selected ? 'border-brand-purple bg-brand-50/50' : 'border-brand-border hover:border-slate-300'}`} key={item.code} onClick={() => setServiceCode(item.code)} type="button"><span className="flex gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-brand-purple bg-brand-purple text-white' : 'border-slate-300'}`}>{selected ? <Check className="h-3 w-3" /> : null}</span><span><span className="font-semibold text-brand-charcoal">{item.name}</span>{item.description ? <span className="mt-1 block text-xs leading-5 text-brand-muted">{item.description}</span> : null}</span></span><strong className="shrink-0 text-sm text-brand-charcoal">{formatVnd(item.hourlyRateVnd)}<span className="font-normal text-brand-muted">/giờ</span></strong></button> })}</div>}</CustomerCard>

            <CustomerCard className="p-6 sm:p-8"><SectionHeading description="Khu vực đối tác nhận phục vụ." title="Khu vực phục vụ" />{provider.serviceAreas.length === 0 ? <p className="mt-5 text-sm text-brand-muted">Đối tác chưa cập nhật khu vực phục vụ.</p> : <ul className="mt-5 grid gap-3 sm:grid-cols-2">{provider.serviceAreas.map((area) => <li className="flex gap-3 rounded-xl bg-[#f7f8fa] p-4" key={area.id}><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" /><div><p className="text-sm font-semibold text-brand-charcoal">{area.district}, {area.city}</p>{area.wardOrComplex ? <p className="text-xs text-brand-muted">{area.wardOrComplex}</p> : null}<p className="mt-1 text-xs text-brand-muted">Bán kính di chuyển {area.travelRadiusKm} km</p></div></li>)}</ul>}</CustomerCard>

            <CustomerCard className="p-6 sm:p-8">
              <SectionHeading description={`Chọn trong lịch rảnh của đối tác, tối thiểu ${minDurationMs / 3_600_000} giờ liên tục.`} title="Thời gian đặt ca" />
              {availability.isPending ? <p className="mt-5 text-sm text-brand-muted" role="status">Đang tải lịch rảnh...</p> : availability.isError ? <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(availability.error)}</p> : !day ? <p className="mt-5 text-sm text-brand-muted">Đối tác chưa mở lịch rảnh trong 14 ngày tới.</p> : (
                <div className="mt-6 space-y-7">
                  <div>
                    <p className="text-sm font-semibold text-brand-charcoal">1. Chọn ngày</p>
                    <div aria-label="Ngày làm" className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group">
                      {freeDays.map((item) => {
                        const label = dayLabel(item.date, today)
                        const selected = item.date === day.date
                        return <button aria-label={vnDateLabel(item.free[0].startsAtUtc)} aria-pressed={selected} className={`${chipClass(selected)} flex w-[72px] shrink-0 flex-col items-center px-2 py-2.5`} key={item.date} onClick={() => setPickedDate(item.date)} type="button"><span className={`text-[11px] font-medium ${selected ? 'text-white/80' : 'text-brand-muted'}`}>{label.weekday}</span><span className="text-xl leading-7">{label.day}</span><span className={`text-[11px] font-medium ${selected ? 'text-white/80' : 'text-brand-muted'}`}>{label.month}</span></button>
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-brand-charcoal">2. Giờ bắt đầu</p>
                    {startOptions.length === 0 ? <p className="mt-3 text-sm text-brand-muted">Ngày này không còn khung giờ đủ dài.</p> : (
                      <div aria-label="Giờ bắt đầu" className="mt-3 space-y-4" role="group">
                        {ranges.map((item) => (
                          <div key={item.start}>
                            <p className="text-xs text-brand-muted">{periodOf(item.start)} · đối tác rảnh {vnTime(item.start)} – {vnTime(item.end)}</p>
                            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-8">
                              {steps(item.start, item.end - minDurationMs, stepMs).map((value) => <button aria-pressed={value === start} className={`${chipClass(value === start)} h-10 tabular-nums`} key={value} onClick={() => setPickedStart(value)} type="button">{vnTime(value)}</button>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {hasSlot ? (
                    <div>
                      <p className="text-sm font-semibold text-brand-charcoal">3. Thời lượng</p>
                      <div aria-label="Thời lượng" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6" role="group">
                        {endOptions.map((value) => <button aria-pressed={value === end} className={`${chipClass(value === end)} flex flex-col items-center px-2 py-2`} key={value} onClick={() => setPickedDurationMs(value - start)} type="button"><span>{hoursLabel(value - start)}</span><span className={`text-[11px] font-medium tabular-nums ${value === end ? 'text-white/80' : 'text-brand-muted'}`}>đến {vnTime(value)}</span></button>)}
                      </div>
                    </div>
                  ) : null}

                  {hasSlot ? <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-charcoal" role="status"><Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-purple" /><span><span className="inline-block first-letter:uppercase">{vnDateLabel(new Date(start).toISOString())}</span> · {vnTime(start)} – {vnTime(end)} · {hoursLabel(end - start)}</span></p> : null}
                </div>
              )}
            </CustomerCard>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <CustomerCard className="p-5 sm:p-6"><p className="text-xs font-semibold text-brand-purple">Phiếu đặt trước</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Khởi tạo lịch làm việc</h2><div className="mt-5 rounded-xl bg-brand-50 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-brand-700"><CalendarDays className="h-4 w-4" />Khung giờ đã chọn</p><p className="mt-2 font-semibold text-brand-charcoal">{hasSlot ? vnDateLabel(new Date(start).toISOString()) : 'Chưa chọn ngày'}</p><p className="text-sm text-brand-muted">{hasSlot ? `${vnTime(start)} – ${vnTime(end)} (${duration} giờ)` : 'Chưa có khung giờ'}</p></div><div className="my-5 h-px bg-brand-border" /><div className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-brand-muted">{service?.name ?? 'Chưa chọn dịch vụ'}{hasSlot ? ` (${duration} giờ)` : ''}</span><span>{formatVnd(total)}</span></div><div className="flex justify-between border-t border-brand-border pt-3 font-semibold"><span>Tổng tạm tính</span><span>{formatVnd(total)}</span></div></div><div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><ShieldCheck className="mb-2 h-4 w-4" />Báo giá cuối cùng sẽ do server xác nhận khi tạo đơn.</div><button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50" disabled={!canContinue} onClick={continueBooking} type="button">Tiếp tục đặt lịch <ArrowRight className="h-4 w-4" /></button>{!provider.isAcceptingBookings ? <p className="mt-3 text-xs text-brand-muted">Đối tác hiện chưa nhận đặt lịch.</p> : null}<div className="mt-4 flex justify-center gap-4 text-[11px] text-brand-muted"><span className="inline-flex items-center gap-1"><UserRoundCheck className="h-3.5 w-3.5" />Đã xác minh</span><span className="inline-flex items-center gap-1"><HeartHandshake className="h-3.5 w-3.5" />Hỗ trợ 24/7</span></div></CustomerCard>
          </aside>
        </div>
      </CustomerContainer>
    </main>
  )
}
