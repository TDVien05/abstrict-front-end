import { CheckCircle2, Clock3, ListChecks, MapPin, MessageSquareText, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { bookingErrorMessage } from '../../entities/booking'
import { useCustomerAddresses } from '../../features/customer/api/addresses'
import { useBookingQuote, useChecklist, useCreateBooking } from '../../features/customer/api/bookings'
import { useFreelancer } from '../../features/customer/api/freelancers'
import { AddressPicker } from '../../features/customer/components/AddressPicker'
import { CustomerCard, CustomerContainer, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { formatVnd } from '../../shared/lib/format-currency'
import { durationHours, vnDateLabel, vnTimeRange } from '../../shared/lib/vn-time'

interface BookingNavigationState {
  endsAtUtc?: string
  serviceCode?: string
  startsAtUtc?: string
}

export function BookingCreatePage() {
  const { providerId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { endsAtUtc, serviceCode, startsAtUtc } = (location.state as BookingNavigationState | null) ?? {}
  const { data: provider, error, isError, isPending } = useFreelancer(providerId)
  const { data: addresses } = useCustomerAddresses()
  const { data: checklist } = useChecklist(serviceCode)
  const createBooking = useCreateBooking()
  const [pickedAddressId, setPickedAddressId] = useState<string>()
  const [optionalItemIds, setOptionalItemIds] = useState<string[]>([])
  const [note, setNote] = useState('')

  const service = provider?.services.find((item) => item.code === serviceCode)
  // Sổ địa chỉ trả địa chỉ mặc định đứng đầu.
  const address = addresses?.find((item) => item.id === pickedAddressId) ?? addresses?.[0]
  const request = provider && service && address && startsAtUtc && endsAtUtc
    ? { providerId: provider.providerId, serviceCategoryId: service.serviceCategoryId, customerAddressId: address.id, startsAtUtc, endsAtUtc }
    : null
  const quote = useBookingQuote(request)

  if (isPending) {
    return <main className="pb-20"><CustomerContainer className="py-10"><p className="text-sm text-brand-muted" role="status">Đang tải thông tin đặt lịch...</p></CustomerContainer></main>
  }

  if (isError || !provider) {
    return <main className="pb-20"><CustomerContainer className="py-10"><p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error ? bookingErrorMessage(error) : 'Không tải được thông tin đối tác.'}</p></CustomerContainer></main>
  }

  if (!service || !startsAtUtc || !endsAtUtc) {
    return (
      <main className="pb-20"><CustomerContainer className="py-10">
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="alert">Chưa có thông tin dịch vụ hoặc thời gian. Vui lòng chọn lại trên hồ sơ đối tác.</p>
        <Link className="mt-4 inline-flex text-sm font-semibold text-brand-purple" to={`/discover/${provider.providerId}`}>Quay lại hồ sơ {provider.displayName}</Link>
      </CustomerContainer></main>
    )
  }

  const duration = durationHours(startsAtUtc, endsAtUtc)
  const requiredItems = checklist?.items.filter((item) => item.isRequired) ?? []
  const optionalItems = checklist?.items.filter((item) => !item.isRequired) ?? []

  function toggleItem(itemId: string) {
    setOptionalItemIds((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId])
  }

  function submit() {
    if (!request) return
    createBooking.mutate(
      { ...request, checklistItemIds: optionalItemIds, customerNote: note.trim() || undefined },
      { onSuccess: (booking) => navigate(`/orders/${booking.id}`) },
    )
  }

  return (
    <main className="pb-20">
      <CustomerContainer className="py-7 sm:py-10">
        <div className="mb-6"><StatusPill tone="purple">Xác nhận đặt dịch vụ</StatusPill><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-charcoal">Xác nhận đặt dịch vụ & ký quỹ</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">Chọn địa chỉ, kiểm tra công việc và báo giá trước khi giữ chỗ.</p></div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <CustomerCard className="p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="flex-1"><div className="flex items-center gap-2"><h2 className="font-semibold text-brand-charcoal">{provider.displayName}</h2><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><p className="mt-1 text-xs text-brand-muted">{provider.averageRating}★ · {provider.completedBookingCount} ca hoàn tất</p></div><div className="text-left sm:text-right"><p className="text-xs text-brand-muted">{service.name}</p><strong className="text-lg">{formatVnd(service.hourlyRateVnd)}<span className="text-xs font-normal text-brand-muted">/giờ</span></strong></div></div><div className="mt-5 flex gap-3 rounded-xl bg-[#f7f8fa] p-4"><Clock3 className="h-5 w-5 text-brand-purple" /><div><p className="text-xs text-brand-muted">Thời gian thực hiện</p><p className="mt-1 text-sm font-semibold">{vnTimeRange(startsAtUtc, endsAtUtc)} · {duration} giờ</p><p className="text-xs text-brand-muted first-letter:uppercase">{vnDateLabel(startsAtUtc)}</p></div></div></CustomerCard>

            <CustomerCard className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-brand-purple" />Địa chỉ thực hiện</h2><AddressPicker onSelect={setPickedAddressId} selectedId={address?.id} /></CustomerCard>

            {checklist && checklist.items.length > 0 ? (
              <CustomerCard className="p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-brand-purple" />Công việc trong ca</h2>
                <p className="mt-1 text-xs text-brand-muted">Các mục tùy chọn không làm thay đổi giá.</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {requiredItems.map((item) => <li className="flex gap-2 text-sm text-brand-charcoal" key={item.id}><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span><span className="text-brand-muted">{item.areaName}: </span>{item.description}</span></li>)}
                  {optionalItems.map((item) => <li key={item.id}><label className="flex cursor-pointer gap-2 text-sm text-brand-charcoal"><input checked={optionalItemIds.includes(item.id)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-charcoal" onChange={() => toggleItem(item.id)} type="checkbox" /><span><span className="text-brand-muted">{item.areaName}: </span>{item.description}</span></label></li>)}
                </ul>
              </CustomerCard>
            ) : null}

            <CustomerCard className="p-5 sm:p-6"><label className="block"><span className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="h-4 w-4 text-brand-purple" />Ghi chú riêng cho {provider.displayName}</span><textarea className="mt-3 min-h-24 w-full resize-y rounded-xl border border-brand-border bg-[#f7f8fa] p-3 text-sm leading-6 outline-none focus:border-brand-charcoal" onChange={(event) => setNote(event.target.value)} placeholder="Thú cưng, lưu ý khi đến..." value={note} /></label></CustomerCard>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <CustomerCard className="p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.02em]">Tóm tắt thanh toán</h2>
              {quote.data ? (
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-brand-muted">Chi phí ca ({quote.data.durationMinutes / 60} giờ × {formatVnd(quote.data.unitPriceVnd)})</span><span>{formatVnd(quote.data.baseAmountVnd)}</span></div>
                  {quote.data.surchargeAmountVnd > 0 ? <div className="flex justify-between gap-4"><span className="text-brand-muted">Phụ phí</span><span>{formatVnd(quote.data.surchargeAmountVnd)}</span></div> : null}
                  <div className="flex justify-between border-t border-brand-border pt-3 font-semibold"><span>Đặt cọc ngay ({quote.data.depositPercent}%)</span><span>{formatVnd(quote.data.depositAmountVnd)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-brand-muted">Thanh toán sau khi hoàn thành</span><span>{formatVnd(quote.data.remainingAmountVnd)}</span></div>
                </div>
              ) : quote.isError ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{bookingErrorMessage(quote.error)}</p>
                : <p className="mt-5 text-sm text-brand-muted" role="status">{address ? 'Đang lấy báo giá...' : 'Chọn địa chỉ để nhận báo giá.'}</p>}
              <div className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><ShieldCheck className="h-4 w-4 shrink-0" /><span>Sau khi đặt, chỗ được giữ {quote.data?.holdMinutes ?? 15} phút để bạn thanh toán cọc.</span></div>
              {createBooking.isError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{bookingErrorMessage(createBooking.error)}</p> : null}
              <button className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50" disabled={!quote.data || createBooking.isPending} onClick={submit} type="button">{createBooking.isPending ? 'Đang giữ chỗ...' : 'Đặt lịch & giữ chỗ'}</button>
            </CustomerCard>
          </aside>
        </div>
      </CustomerContainer>
    </main>
  )
}
