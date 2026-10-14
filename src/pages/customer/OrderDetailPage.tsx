import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CheckCircle2, MapPin, QrCode, Timer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { bookingErrorMessage, bookingStatusLabels, bookingStatusTones, timelineLabel } from '../../entities/booking'
import { paymentMethods, requestCheckInToken, useBooking, useCancelBooking, useCancellationPreview, useConfirmSandboxPayment, useInitiateDeposit, type BookingDetail, type PaymentMethod } from '../../features/customer/api/bookings'
import { CustomerCard, CustomerContainer, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { formatVnd } from '../../shared/lib/format-currency'
import { durationHours, vnDateLabel, vnDateTime, vnTimeRange } from '../../shared/lib/vn-time'
import { Select } from '../../shared/ui/Select'

const primaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-charcoal hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const errorClass = 'mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700'

function Countdown({ offsetMs, until }: { offsetMs: number; until: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const seconds = Math.max(0, Math.floor((Date.parse(until) - now - offsetMs) / 1000))
  if (seconds === 0) return <span>đã hết hạn</span>
  return <span className="tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
}

function DepositPanel({ booking }: { booking: BookingDetail }) {
  const initiate = useInitiateDeposit(booking.id)
  const confirmSandbox = useConfirmSandboxPayment(booking.id)
  const [method, setMethod] = useState<PaymentMethod>('Momo')
  // Bấm lại khi mạng chập chờn không tạo giao dịch thứ hai. Nếu đơn đã có giao dịch đang chờ, server trả lại chính giao dịch đó dù khóa mới.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  // Giao dịch đang chờ lấy từ chi tiết đơn nên vẫn tiếp tục được sau khi tải lại trang.
  const payment = booking.depositPayment?.status === 'Pending' ? booking.depositPayment : null
  const failed = booking.depositPayment?.status === 'Failed'

  return (
    <CustomerCard className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Đặt cọc {formatVnd(booking.depositAmountVnd)}</h2>
      {booking.holdExpiresAtUtc ? <p className="mt-1 flex items-center gap-2 text-sm text-amber-800"><Timer aria-hidden="true" className="h-4 w-4" />Giữ chỗ còn <Countdown offsetMs={booking.clockOffsetMs} until={booking.holdExpiresAtUtc} /></p> : null}
      {payment === null ? (
        <>
          <label className="mt-4 block text-xs font-semibold text-brand-muted">Phương thức thanh toán<Select className="mt-1.5 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal" onChange={(event) => setMethod(event.target.value as PaymentMethod)} value={method}>{Object.entries(paymentMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
          {failed && !initiate.isPending ? <p className={errorClass} role="alert">Thanh toán không thành công. Bạn có thể thử lại trong thời gian giữ chỗ.</p> : null}
          {initiate.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(initiate.error)}</p> : null}
          <button className={`${primaryButton} mt-4 w-full`} disabled={initiate.isPending} onClick={() => initiate.mutate({ idempotencyKey: failed ? crypto.randomUUID() : idempotencyKey, method })} type="button">{initiate.isPending ? 'Đang khởi tạo...' : failed ? 'Thanh toán lại' : 'Thanh toán cọc'}</button>
        </>
      ) : payment.checkoutUrl ? (
        <a className={`${primaryButton} mt-4 w-full`} href={payment.checkoutUrl}>Mở trang thanh toán</a>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Cổng thanh toán giả lập</p>
          <p className="mt-1 text-xs leading-5 text-amber-900">Chưa có cổng thanh toán thật. Chọn kết quả để chốt giao dịch {formatVnd(payment.amountVnd)} qua {paymentMethods[payment.method as PaymentMethod] ?? payment.method}.</p>
          {confirmSandbox.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(confirmSandbox.error)}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2"><button className={primaryButton} disabled={confirmSandbox.isPending} onClick={() => confirmSandbox.mutate({ paymentId: payment.paymentId, succeeded: true })} type="button">Giả lập thành công</button><button className={secondaryButton} disabled={confirmSandbox.isPending} onClick={() => confirmSandbox.mutate({ paymentId: payment.paymentId, succeeded: false })} type="button">Giả lập thất bại</button></div>
        </div>
      )}
    </CustomerCard>
  )
}

function CheckInPanel({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false)
  // Mã sống ngắn và mã mới làm mã cũ hết hạn, nên không cache và tự lấy lại ngay trước khi hết hạn.
  const token = useQuery({
    queryKey: ['bookings', 'detail', bookingId, 'check-in-token'],
    queryFn: () => requestCheckInToken(bookingId),
    enabled: open,
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
    refetchInterval: (query) => query.state.data ? Math.max(Date.parse(query.state.data.expiresAtUtc) - Date.now() - query.state.data.clockOffsetMs - 10_000, 5_000) : false,
  })

  return (
    <CustomerCard className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><QrCode aria-hidden="true" className="h-5 w-5 text-brand-purple" />Mã QR check-in</h2>
      <p className="mt-1 text-sm text-brand-muted">Đưa mã này cho đối tác quét khi họ tới nơi. Mã tự đổi liên tục.</p>
      {!open ? <button className={`${primaryButton} mt-4 w-full`} onClick={() => setOpen(true)} type="button">Hiện mã QR</button>
        : token.isError ? <><p className={errorClass} role="alert">{bookingErrorMessage(token.error)}</p><button className={`${secondaryButton} mt-3 w-full`} onClick={() => void token.refetch()} type="button">Thử lại</button></>
        : token.data ? <div className="mt-4 flex flex-col items-center gap-3"><div className="rounded-xl bg-white p-3 ring-1 ring-brand-border"><QRCodeSVG size={200} title="Mã QR check-in" value={token.data.token} /></div><p className="text-xs text-brand-muted">Mã đổi sau <Countdown key={token.data.expiresAtUtc} offsetMs={token.data.clockOffsetMs} until={token.data.expiresAtUtc} /></p></div>
        : <p className="mt-4 text-sm text-brand-muted" role="status">Đang lấy mã...</p>}
    </CustomerCard>
  )
}

function CancelPanel({ booking }: { booking: BookingDetail }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const preview = useCancellationPreview(booking.id, open)
  const cancel = useCancelBooking(booking.id)

  if (!open) return <button className={`${secondaryButton} w-full text-red-700`} onClick={() => setOpen(true)} type="button">Hủy đơn</button>

  return (
    <CustomerCard className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Hủy đơn này?</h2>
      {preview.isPending ? <p className="mt-2 text-sm text-brand-muted" role="status">Đang tính tiền hoàn...</p>
        : preview.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(preview.error)}</p>
        : (
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-brand-muted">Hoàn lại cho bạn</dt><dd className="font-semibold">{formatVnd(preview.data.refundAmountVnd)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-brand-muted">Bị giữ lại</dt><dd className="font-semibold">{formatVnd(preview.data.retainedAmountVnd)}</dd></div>
            {preview.data.freeCancellationUntilUtc ? <div className="text-xs text-brand-muted"><dt className="inline">{preview.data.freeCancellation ? 'Hủy miễn phí đến' : 'Hạn hủy miễn phí đã qua lúc'} </dt><dd className="inline">{vnDateTime(preview.data.freeCancellationUntilUtc)}</dd></div> : null}
          </dl>
        )}
      <label className="mt-4 block text-xs font-semibold text-brand-muted">Lý do (không bắt buộc)<input className="mt-1.5 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal" maxLength={500} onChange={(event) => setReason(event.target.value)} value={reason} /></label>
      {cancel.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(cancel.error)}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2"><button className={`${primaryButton} bg-red-700 hover:bg-red-800`} disabled={cancel.isPending || preview.isPending} onClick={() => cancel.mutate(reason.trim())} type="button">{cancel.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}</button><button className={secondaryButton} onClick={() => setOpen(false)} type="button">Giữ đơn</button></div>
    </CustomerCard>
  )
}

export function OrderDetailPage() {
  const { id } = useParams()
  const { data: booking, error, isPending } = useBooking(id)

  return (
    <main className="pb-20">
      <CustomerContainer className="py-6 sm:py-8">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to="/orders"><ArrowLeft className="h-4 w-4" />Đơn của tôi</Link>
        {isPending ? <p className="mt-6 text-sm text-brand-muted" role="status">Đang tải chi tiết đơn...</p>
          : !booking ? <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(error)}</p>
          : (
            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <CustomerCard className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-brand-muted">Đơn #{booking.bookingNumber}</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{booking.serviceCategoryName}</h1><p className="mt-1 text-sm text-brand-muted">Đối tác: <Link className="font-semibold text-brand-purple hover:underline" to={`/discover/${booking.providerId}`}>{booking.providerDisplayName}</Link></p></div><StatusPill tone={bookingStatusTones[booking.status]}>{bookingStatusLabels[booking.status]}</StatusPill></div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="flex gap-3 rounded-xl bg-[#f7f8fa] p-4"><CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-purple" /><div><p className="text-xs text-brand-muted">Thời gian</p><p className="mt-1 text-sm font-semibold">{vnTimeRange(booking.startsAtUtc, booking.endsAtUtc)} · {durationHours(booking.startsAtUtc, booking.endsAtUtc)} giờ</p><p className="text-xs text-brand-muted first-letter:uppercase">{vnDateLabel(booking.startsAtUtc)}</p></div></div>
                    <div className="flex gap-3 rounded-xl bg-[#f7f8fa] p-4"><MapPin aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-purple" /><div><p className="text-xs text-brand-muted">Địa chỉ</p><p className="mt-1 text-sm leading-6">{booking.addressSnapshot}</p></div></div>
                  </div>
                  {booking.status === 'PendingProviderConfirmation' && booking.providerConfirmationDeadlineUtc ? <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Đã nhận cọc. Đối tác cần xác nhận trước {vnDateTime(booking.providerConfirmationDeadlineUtc)}; nếu không bạn được hoàn đủ cọc.</p> : null}
                  {booking.cancellationReason ? <p className="mt-4 text-sm text-brand-muted">Lý do hủy: {booking.cancellationReason}</p> : null}
                  {booking.customerNote ? <p className="mt-4 text-sm text-brand-muted">Ghi chú của bạn: {booking.customerNote}</p> : null}
                </CustomerCard>

                {booking.tasks.length > 0 ? <CustomerCard className="p-5 sm:p-6"><h2 className="text-lg font-semibold">Công việc trong ca</h2><ul className="mt-4 grid gap-2 sm:grid-cols-2">{[...booking.tasks].sort((a, b) => a.sortOrder - b.sortOrder).map((task) => <li className="flex gap-2 text-sm" key={task.id}><CheckCircle2 aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${task.status === 'Completed' ? 'text-emerald-600' : 'text-slate-300'}`} /><span><span className="text-brand-muted">{task.areaName}: </span>{task.description}</span></li>)}</ul></CustomerCard> : null}

                <CustomerCard className="p-5 sm:p-6"><h2 className="text-lg font-semibold">Lịch sử đơn</h2><ol className="mt-4 space-y-3">{booking.timeline.map((entry) => <li className="flex justify-between gap-4 text-sm" key={`${entry.atUtc}-${entry.toStatus}`}><span><span className="font-semibold">{timelineLabel(entry)}</span>{entry.note ? <span className="block text-brand-muted">“{entry.note}”</span> : null}</span><time className="shrink-0 text-brand-muted" dateTime={entry.atUtc}>{vnDateTime(entry.atUtc)}</time></li>)}</ol></CustomerCard>
              </div>

              <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
                <CustomerCard className="p-5 sm:p-6">
                  <h2 className="text-lg font-semibold">Thanh toán</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-4"><dt className="text-brand-muted">Chi phí ca ({formatVnd(booking.unitPriceVnd)}/giờ)</dt><dd>{formatVnd(booking.baseAmountVnd)}</dd></div>
                    {booking.surchargeAmountVnd > 0 ? <div className="flex justify-between gap-4"><dt className="text-brand-muted">Phụ phí</dt><dd>{formatVnd(booking.surchargeAmountVnd)}</dd></div> : null}
                    {booking.extensionAmountVnd > 0 ? <div className="flex justify-between gap-4"><dt className="text-brand-muted">Gia hạn</dt><dd>{formatVnd(booking.extensionAmountVnd)}</dd></div> : null}
                    <div className="flex justify-between gap-4 border-t border-brand-border pt-3 font-semibold"><dt>Tiền cọc{booking.depositPayment?.status === 'Succeeded' ? ' (đã thanh toán)' : ''}</dt><dd>{formatVnd(booking.depositAmountVnd)}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-brand-muted">Còn lại</dt><dd>{formatVnd(booking.remainingAmountVnd)}</dd></div>
                  </dl>
                </CustomerCard>
                {booking.allowedActions.includes('PayDeposit') ? <DepositPanel booking={booking} /> : null}
                {booking.allowedActions.includes('ShowCheckInQr') ? <CheckInPanel bookingId={booking.id} /> : null}
                {booking.allowedActions.includes('Cancel') ? <CancelPanel booking={booking} /> : null}
              </aside>
            </div>
          )}
      </CustomerContainer>
    </main>
  )
}
