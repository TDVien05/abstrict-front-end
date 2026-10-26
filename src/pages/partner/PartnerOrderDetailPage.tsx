import { Link, useParams } from 'react-router-dom'
import { bookingErrorMessage, bookingStatusLabels, timelineLabel } from '../../entities/booking'
import { useFreelancerBooking } from '../../features/partner/api/bookings'
import { BookingResponseActions } from '../../features/partner/components/BookingResponseActions'
import { CheckInHint, CheckInPanel, ChecklistPanel, CompleteWorkPanel, PhotosPanel } from '../../features/partner/components/FieldWorkPanels'
import { PartnerPage, PartnerPanel } from '../../features/partner/components/PartnerPrimitives'
import { formatVnd } from '../../shared/lib/format-currency'
import { durationHours, vnDateLabel, vnDateTime, vnTimeRange } from '../../shared/lib/vn-time'

export function PartnerOrderDetailPage() {
  const { id } = useParams()
  const { data: order, error, isPending } = useFreelancerBooking(id)
  const time = order ? `${vnTimeRange(order.startsAtUtc, order.endsAtUtc)} · ${durationHours(order.startsAtUtc, order.endsAtUtc)} giờ` : ''
  const canRespond = Boolean(order?.allowedActions.some((action) => action === 'Confirm' || action === 'Reject'))

  return <PartnerPage title="Xử lý đơn hàng" description="Kiểm tra thời gian, địa điểm và công việc trước khi phản hồi khách hàng." action={<Link className="font-semibold text-brand-purple" to="/partner/orders">← Danh sách đơn</Link>}>
    {isPending ? <p className="text-brand-muted" role="status">Đang tải chi tiết đơn...</p>
      : !order ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(error)}</p>
      : <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <PartnerPanel>
            <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">{order.customerName}</h2><p className="text-sm text-brand-muted">#{order.bookingNumber} · {order.serviceCategoryName}</p></div><span className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{bookingStatusLabels[order.status]}</span></div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-brand-sand p-4"><dt className="text-brand-muted">Thời gian làm việc</dt><dd className="mt-1 font-semibold first-letter:uppercase">{vnDateLabel(order.startsAtUtc)}</dd><dd className="text-brand-purple">{time}</dd></div>
              <div className="rounded-xl bg-brand-sand p-4"><dt className="text-brand-muted">Địa chỉ · {order.areaLabel}</dt><dd className="mt-1 font-semibold">{order.addressSnapshot ?? 'Địa chỉ đầy đủ hiển thị sau khi đơn được xác nhận.'}</dd></div>
            </dl>
            {order.customerNote && <div className="mt-4 rounded-xl bg-brand-sand p-4"><p className="text-sm font-semibold">Ghi chú từ khách hàng</p><p className="mt-2 text-sm text-brand-muted">{order.customerNote}</p></div>}
          </PartnerPanel>
          <ChecklistPanel order={order} />
          <PhotosPanel order={order} />
          <PartnerPanel title="Lịch sử đơn"><ol className="space-y-3 text-sm">{order.timeline.map((entry) => <li className="flex justify-between gap-4" key={`${entry.atUtc}-${entry.toStatus}`}><span><span className="font-semibold">{timelineLabel(entry)}</span>{entry.note && <span className="block text-brand-muted">“{entry.note}”</span>}</span><time className="shrink-0 text-brand-muted" dateTime={entry.atUtc}>{vnDateTime(entry.atUtc)}</time></li>)}</ol></PartnerPanel>
        </div>
        <div className="h-fit space-y-6">
          <PartnerPanel title="Thù lao">
            <dl className="space-y-4 text-sm"><div className="flex justify-between gap-3"><dt>Giá trị ca</dt><dd className="text-2xl font-semibold text-brand-purple">{formatVnd(order.baseAmountVnd)}</dd></div><div className="flex justify-between gap-3"><dt>Khách đã ký quỹ</dt><dd>{formatVnd(order.depositAmountVnd)}</dd></div></dl>
            {canRespond && <>
              {order.providerConfirmationDeadlineUtc && <p className="mt-4 text-sm text-brand-muted">Hạn phản hồi: {vnDateTime(order.providerConfirmationDeadlineUtc)}</p>}
              <div className="mt-5"><BookingResponseActions allowedActions={order.allowedActions} bookingId={order.id} summary={`${time} tại ${order.areaLabel}`} /></div>
            </>}
          </PartnerPanel>
          {order.allowedActions.includes('CheckIn') ? <CheckInPanel order={order} /> : order.status === 'Confirmed' ? <CheckInHint order={order} /> : null}
          {order.allowedActions.includes('UploadPhotos') || order.allowedActions.includes('CompleteWork') ? <CompleteWorkPanel order={order} /> : null}
        </div>
      </div>}
  </PartnerPage>
}
