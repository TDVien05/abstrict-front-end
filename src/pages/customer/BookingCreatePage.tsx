import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, ListChecks, MapPin, MessageSquareText, ShieldCheck, Star, Timer } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { bookingErrorMessage } from '../../entities/booking'
import { useCustomerAddresses } from '../../features/customer/api/addresses'
import { useBookingQuote, useChecklist, useCreateBooking, useProviderAvailability } from '../../features/customer/api/bookings'
import { useFreelancer } from '../../features/customer/api/freelancers'
import { AddressPicker } from '../../features/customer/components/AddressPicker'
import { CustomerCard, CustomerContainer, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { formatVnd } from '../../shared/lib/format-currency'
import { durationHours, vnDateLabel, vnIsoDate, vnTime, vnTimeRange } from '../../shared/lib/vn-time'

const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const chipClass = (selected: boolean) =>
  `rounded-xl border text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple ${selected ? 'border-brand-charcoal bg-brand-charcoal text-white' : 'border-brand-border bg-white text-brand-charcoal hover:border-brand-charcoal'}`
const maxDurationMs = 12 * 3_600_000

function dayLabel(date: string, today: string) {
  const noon = new Date(`${date}T12:00:00+07:00`)
  const tomorrow = vnIsoDate(Date.parse(`${today}T12:00:00+07:00`) + 86_400_000)
  return { weekday: date === today ? 'Hôm nay' : date === tomorrow ? 'Ngày mai' : weekdays[noon.getUTCDay()], day: date.slice(8), month: `Th${Number(date.slice(5, 7))}` }
}

function periodOf(startMs: number) {
  const hour = Number(vnTime(startMs).slice(0, 2))
  return hour < 12 ? 'Buổi sáng' : hour < 18 ? 'Buổi chiều' : 'Buổi tối'
}

function stepsArr(from: number, to: number, stepMs: number) {
  const values: number[] = []
  for (let v = from; v <= to; v += stepMs) values.push(v)
  return values
}

type BookingStep = 'slot' | 'confirm'

export function BookingCreatePage() {
  const { providerId } = useParams()
  const navigate = useNavigate()
  const { data: provider, error, isError, isPending } = useFreelancer(providerId)
  const availability = useProviderAvailability(providerId)
  const { data: addresses } = useCustomerAddresses()
  const createBooking = useCreateBooking()

  // ── Bước 1: chọn dịch vụ & giờ ──
  const [serviceCode, setServiceCode] = useState('')
  const [pickedDate, setPickedDate] = useState('')
  const [pickedStart, setPickedStart] = useState<number | null>(null)
  const [pickedDurationMs, setPickedDurationMs] = useState<number | null>(null)

  // ── Bước 2: xác nhận ──
  const [step, setStep] = useState<BookingStep>('slot')
  const [pickedAddressId, setPickedAddressId] = useState<string>()
  const [optionalItemIds, setOptionalItemIds] = useState<string[]>([])
  const [note, setNote] = useState('')

  const service = provider?.services.find((s) => s.code === serviceCode) ?? provider?.services[0]

  const stepMs = (availability.data?.slotStepMinutes ?? 30) * 60_000
  const minDurationMs = (availability.data?.minimumDurationMinutes ?? 120) * 60_000
  const freeDays = (availability.data?.days ?? []).filter((d) => d.free.length > 0)
  const day = freeDays.find((d) => d.date === pickedDate) ?? freeDays[0]
  const ranges = (day?.free ?? []).map((r) => ({ start: Date.parse(r.startsAtUtc), end: Date.parse(r.endsAtUtc) }))
  const startOptions = ranges.flatMap((r) => stepsArr(r.start, r.end - minDurationMs, stepMs))
  const start = pickedStart !== null && startOptions.includes(pickedStart) ? pickedStart : startOptions[0]
  const range = ranges.find((r) => start !== undefined && start >= r.start && start < r.end)
  const endOptions = range && start !== undefined ? stepsArr(start + minDurationMs, Math.min(range.end, start + maxDurationMs), stepMs) : []
  const end = pickedDurationMs !== null && start !== undefined && endOptions.includes(start + pickedDurationMs) ? start + pickedDurationMs : endOptions[0]
  const today = vnIsoDate()
  const hasSlot = start !== undefined && end !== undefined
  const duration = hasSlot ? (end - start) / 3_600_000 : 0
  const canContinue = Boolean(service && hasSlot && provider?.isAcceptingBookings)

  const startsAtUtc = hasSlot ? new Date(start).toISOString() : undefined
  const endsAtUtc = hasSlot ? new Date(end).toISOString() : undefined

  const address = addresses?.find((a) => a.id === pickedAddressId) ?? addresses?.[0]
  const { data: checklist } = useChecklist(step === 'confirm' ? service?.code : undefined)
  const request = provider && service && address && startsAtUtc && endsAtUtc
    ? { providerId: provider.providerId, serviceCategoryId: service.serviceCategoryId, customerAddressId: address.id, startsAtUtc, endsAtUtc }
    : null
  const quote = useBookingQuote(step === 'confirm' ? request : null)

  function toggleItem(id: string) {
    setOptionalItemIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  function submit() {
    if (!request) return
    createBooking.mutate(
      { ...request, checklistItemIds: optionalItemIds, customerNote: note.trim() || undefined },
      { onSuccess: (booking) => navigate(`/orders/${booking.id}`) },
    )
  }

  if (isPending) {
    return <main className="pb-20"><CustomerContainer className="py-10"><p className="text-sm text-brand-muted" role="status">Đang tải thông tin...</p></CustomerContainer></main>
  }

  if (isError || !provider) {
    return <main className="pb-20"><CustomerContainer className="py-10"><p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error ? bookingErrorMessage(error) : 'Không tải được thông tin đối tác.'}</p></CustomerContainer></main>
  }

  // ─────────────────────────── Bước 1: chọn dịch vụ + giờ ───────────────────
  if (step === 'slot') {
    return (
      <main className="pb-20">
        <CustomerContainer className="py-6 sm:py-8">
          <div className="mb-5">
            <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to={`/discover/${providerId}`}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />Hồ sơ {provider.displayName}
            </Link>
          </div>
          <div className="mb-6">
            <StatusPill tone="purple">Đặt lịch</StatusPill>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-brand-charcoal">Chọn dịch vụ & thời gian</h1>
            <p className="mt-1 text-sm text-brand-muted">Chọn dịch vụ và khung giờ phù hợp với bạn.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              {/* Dịch vụ */}
              <CustomerCard className="p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-brand-charcoal">1. Chọn dịch vụ</h2>
                <div className="mt-4 space-y-3">
                  {provider.services.map((item) => {
                    const selected = (service?.code ?? '') === item.code
                    return (
                      <button aria-pressed={selected} className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition ${selected ? 'border-brand-purple bg-brand-50/50' : 'border-brand-border hover:border-slate-300'}`} key={item.code} onClick={() => setServiceCode(item.code)} type="button">
                        <span className="flex gap-3">
                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-brand-purple bg-brand-purple text-white' : 'border-slate-300'}`}>{selected ? <Check className="h-3 w-3" /> : null}</span>
                          <span><span className="font-semibold text-brand-charcoal">{item.name}</span>{item.description ? <span className="mt-1 block text-xs leading-5 text-brand-muted">{item.description}</span> : null}</span>
                        </span>
                        <strong className="shrink-0 text-sm text-brand-charcoal">{formatVnd(item.hourlyRateVnd)}<span className="font-normal text-brand-muted">/giờ</span></strong>
                      </button>
                    )
                  })}
                </div>
              </CustomerCard>

              {/* Chọn giờ */}
              <CustomerCard className="p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-brand-charcoal">2. Chọn thời gian</h2>
                {availability.isPending
                  ? <p className="mt-4 text-sm text-brand-muted" role="status">Đang tải lịch rảnh...</p>
                  : availability.isError
                    ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(availability.error)}</p>
                    : !day
                      ? <p className="mt-4 text-sm text-brand-muted">Đối tác chưa mở lịch rảnh trong 14 ngày tới.</p>
                      : (
                        <div className="mt-5 space-y-7">
                          <div>
                            <p className="text-xs font-medium text-brand-muted">Ngày làm</p>
                            <div aria-label="Ngày làm" className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group">
                              {freeDays.map((item) => {
                                const label = dayLabel(item.date, today)
                                const selected = item.date === day.date
                                return (
                                  <button aria-pressed={selected} className={`${chipClass(selected)} flex w-[72px] shrink-0 flex-col items-center px-2 py-2.5`} key={item.date} onClick={() => setPickedDate(item.date)} type="button">
                                    <span className={`text-[11px] font-medium ${selected ? 'text-white/80' : 'text-brand-muted'}`}>{label.weekday}</span>
                                    <span className="text-xl leading-7">{label.day}</span>
                                    <span className={`text-[11px] font-medium ${selected ? 'text-white/80' : 'text-brand-muted'}`}>{label.month}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-brand-muted">Giờ bắt đầu</p>
                            {startOptions.length === 0
                              ? <p className="mt-3 text-sm text-brand-muted">Ngày này không còn khung giờ đủ dài.</p>
                              : (
                                <div aria-label="Giờ bắt đầu" className="mt-3 space-y-4" role="group">
                                  {ranges.map((item) => (
                                    <div key={item.start}>
                                      <p className="text-xs text-brand-muted">{periodOf(item.start)} · rảnh {vnTime(item.start)} – {vnTime(item.end)}</p>
                                      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-8">
                                        {stepsArr(item.start, item.end - minDurationMs, stepMs).map((v) => (
                                          <button aria-pressed={v === start} className={`${chipClass(v === start)} h-10 tabular-nums`} key={v} onClick={() => setPickedStart(v)} type="button">{vnTime(v)}</button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>

                          {hasSlot && (
                            <div>
                              <p className="text-xs font-medium text-brand-muted">Thời lượng</p>
                              <div aria-label="Thời lượng" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6" role="group">
                                {endOptions.map((v) => (
                                  <button aria-pressed={v === end} className={`${chipClass(v === end)} flex flex-col items-center px-2 py-2`} key={v} onClick={() => setPickedDurationMs(v - start)} type="button">
                                    <span>{(v - start) / 3_600_000} giờ</span>
                                    <span className={`text-[11px] font-medium tabular-nums ${v === end ? 'text-white/80' : 'text-brand-muted'}`}>đến {vnTime(v)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
              </CustomerCard>
            </div>

            {/* Sidebar tóm tắt */}
            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <CustomerCard className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-charcoal text-sm font-semibold text-white">{provider.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                  <div>
                    <p className="font-semibold">{provider.displayName}</p>
                    <p className="flex items-center gap-1 text-xs text-brand-muted"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{provider.averageRating} · <Timer className="h-3 w-3" />{provider.experienceYears} năm</p>
                  </div>
                </div>
                <div className="my-4 h-px bg-brand-border" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-brand-muted">Dịch vụ</span><span className="font-medium">{service?.name ?? '—'}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-brand-muted">Ngày</span><span className="font-medium">{hasSlot ? vnDateLabel(new Date(start).toISOString()) : '—'}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-brand-muted">Giờ</span><span className="font-medium">{hasSlot ? `${vnTime(start)} – ${vnTime(end)}` : '—'}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-brand-muted">Thời lượng</span><span className="font-medium">{hasSlot ? `${duration} giờ` : '—'}</span></div>
                </div>
                {service && hasSlot && (
                  <>
                    <div className="my-4 h-px bg-brand-border" />
                    <div className="flex justify-between font-semibold">
                      <span>Tạm tính</span><span>{formatVnd(service.hourlyRateVnd * duration)}</span>
                    </div>
                  </>
                )}
                <button
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canContinue}
                  onClick={() => setStep('confirm')}
                  type="button"
                >
                  Tiếp tục <ArrowRight className="h-4 w-4" />
                </button>
                {!provider.isAcceptingBookings && <p className="mt-3 text-xs text-center text-brand-muted">Đối tác chưa nhận đặt lịch.</p>}
              </CustomerCard>
            </aside>
          </div>
        </CustomerContainer>
      </main>
    )
  }

  // ─────────────────────────── Bước 2: xác nhận đặt lịch ────────────────────
  const requiredItems = checklist?.items.filter((i) => i.isRequired) ?? []
  const optionalItems = checklist?.items.filter((i) => !i.isRequired) ?? []

  return (
    <main className="pb-20">
      <CustomerContainer className="py-7 sm:py-10">
        <div className="mb-5">
          <button className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" onClick={() => setStep('slot')} type="button">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />Chọn lại giờ
          </button>
        </div>
        <div className="mb-6">
          <StatusPill tone="purple">Xác nhận đặt dịch vụ</StatusPill>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-brand-charcoal">Xác nhận & đặt cọc</h1>
          <p className="mt-1 text-sm text-brand-muted">Chọn địa chỉ, kiểm tra công việc và báo giá trước khi giữ chỗ.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {/* Tóm tắt ca đã chọn */}
            <CustomerCard className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><p className="font-semibold">{provider.displayName}</p><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
                  <p className="mt-1 text-xs text-brand-muted">{provider.averageRating}★ · {provider.completedBookingCount} ca hoàn tất</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-brand-muted">{service?.name}</p>
                  <strong className="text-lg">{formatVnd(service?.hourlyRateVnd ?? 0)}<span className="text-xs font-normal text-brand-muted">/giờ</span></strong>
                </div>
              </div>
              {startsAtUtc && endsAtUtc && (
                <div className="mt-4 flex gap-3 rounded-xl bg-[#f7f8fa] p-4">
                  <Clock3 className="h-5 w-5 text-brand-purple" />
                  <div>
                    <p className="text-xs text-brand-muted">Thời gian thực hiện</p>
                    <p className="mt-1 text-sm font-semibold">{vnTimeRange(startsAtUtc, endsAtUtc)} · {durationHours(startsAtUtc, endsAtUtc)} giờ</p>
                    <p className="text-xs text-brand-muted first-letter:uppercase">{vnDateLabel(startsAtUtc)}</p>
                  </div>
                </div>
              )}
            </CustomerCard>

            <CustomerCard className="p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-brand-purple" />Địa chỉ thực hiện</h2>
              <AddressPicker onSelect={setPickedAddressId} selectedId={address?.id} />
            </CustomerCard>

            {checklist && checklist.items.length > 0 && (
              <CustomerCard className="p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-brand-purple" />Công việc trong ca</h2>
                <p className="mt-1 text-xs text-brand-muted">Các mục tùy chọn không làm thay đổi giá.</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {requiredItems.map((item) => <li className="flex gap-2 text-sm" key={item.id}><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><span className="text-brand-muted">{item.areaName}: </span>{item.description}</span></li>)}
                  {optionalItems.map((item) => <li key={item.id}><label className="flex cursor-pointer gap-2 text-sm"><input checked={optionalItemIds.includes(item.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-charcoal" onChange={() => toggleItem(item.id)} type="checkbox" /><span><span className="text-brand-muted">{item.areaName}: </span>{item.description}</span></label></li>)}
                </ul>
              </CustomerCard>
            )}

            <CustomerCard className="p-5 sm:p-6">
              <label className="block"><span className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="h-4 w-4 text-brand-purple" />Ghi chú cho {provider.displayName}</span><textarea className="mt-3 min-h-24 w-full resize-y rounded-xl border border-brand-border bg-[#f7f8fa] p-3 text-sm leading-6 outline-none focus:border-brand-charcoal" onChange={(e) => setNote(e.target.value)} placeholder="Thú cưng, lưu ý khi đến..." value={note} /></label>
            </CustomerCard>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <CustomerCard className="p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Tóm tắt thanh toán</h2>
              {quote.data ? (
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-brand-muted">Chi phí ca ({quote.data.durationMinutes / 60} giờ × {formatVnd(quote.data.unitPriceVnd)})</span><span>{formatVnd(quote.data.baseAmountVnd)}</span></div>
                  {quote.data.surchargeAmountVnd > 0 && <div className="flex justify-between gap-4"><span className="text-brand-muted">Phụ phí</span><span>{formatVnd(quote.data.surchargeAmountVnd)}</span></div>}
                  <div className="flex justify-between border-t border-brand-border pt-3 font-semibold"><span>Đặt cọc ngay ({quote.data.depositPercent}%)</span><span>{formatVnd(quote.data.depositAmountVnd)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-brand-muted">Thanh toán sau khi hoàn thành</span><span>{formatVnd(quote.data.remainingAmountVnd)}</span></div>
                </div>
              ) : quote.isError
                ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{bookingErrorMessage(quote.error)}</p>
                : <p className="mt-5 text-sm text-brand-muted" role="status">{address ? 'Đang lấy báo giá...' : 'Chọn địa chỉ để nhận báo giá.'}</p>}
              <div className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                <ShieldCheck className="h-4 w-4 shrink-0" /><span>Sau khi đặt, chỗ được giữ {quote.data?.holdMinutes ?? 15} phút để bạn thanh toán cọc.</span>
              </div>
              {createBooking.isError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{bookingErrorMessage(createBooking.error)}</p>}
              <button
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!quote.data || createBooking.isPending}
                onClick={submit}
                type="button"
              >
                {createBooking.isPending ? 'Đang giữ chỗ...' : 'Đặt lịch & giữ chỗ'}
              </button>
            </CustomerCard>
          </aside>
        </div>
      </CustomerContainer>
    </main>
  )
}
