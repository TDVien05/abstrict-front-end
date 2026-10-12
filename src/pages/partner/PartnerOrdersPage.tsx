import { useState } from 'react'
import { CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookingErrorMessage, bookingStatusLabels, type BookingStatus } from '../../entities/booking'
import { useAuth } from '../../features/auth/auth-context'
import { initialsOf } from '../../features/customer/api/freelancers'
import { useFreelancerBookingCounts, useFreelancerBookings, type FreelancerBookingSummary } from '../../features/partner/api/bookings'
import { BookingResponseActions } from '../../features/partner/components/BookingResponseActions'
import { PartnerPage, PartnerPanel, partnerLink } from '../../features/partner/components/PartnerPrimitives'
import { formatVnd } from '../../shared/lib/format-currency'
import { durationHours, vnDateLabel, vnDateTime, vnTimeRange } from '../../shared/lib/vn-time'
import { Button } from '../../shared/ui/Button'

const statusTabs: { label: string; status: BookingStatus | undefined }[] = [
  { label: 'Chờ bạn xác nhận', status: 'PendingProviderConfirmation' },
  { label: 'Đã xác nhận & Sắp tới', status: 'Confirmed' },
  { label: 'Đã hoàn thành', status: 'Completed' },
  { label: 'Tất cả', status: undefined },
]

function OrderCard({ order }: { order: FreelancerBookingSummary }) {
  const time = `${vnTimeRange(order.startsAtUtc, order.endsAtUtc)} · ${durationHours(order.startsAtUtc, order.endsAtUtc)} giờ`
  return <PartnerPanel>
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border pb-5"><div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-charcoal font-semibold text-white">{initialsOf(order.customerName)}</span><div><h2 className="text-lg font-semibold">{order.customerName}</h2><p className="text-sm text-brand-muted">#{order.bookingNumber} · {order.serviceCategoryName}</p></div></div><span className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{bookingStatusLabels[order.status]}</span></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-brand-sand p-4"><CalendarDays aria-hidden="true" className="mb-2 h-5 w-5 text-brand-purple" /><p className="text-sm text-brand-muted">Thời gian làm việc</p><p className="mt-1 font-semibold first-letter:uppercase">{vnDateLabel(order.startsAtUtc)}</p><p className="text-sm text-brand-purple">{time}</p></div><div className="rounded-xl bg-brand-sand p-4"><MapPin aria-hidden="true" className="mb-2 h-5 w-5 text-brand-purple" /><p className="text-sm text-brand-muted">Khu vực</p><p className="mt-1 font-semibold">{order.areaLabel}</p><p className="text-sm text-brand-muted">Địa chỉ đầy đủ hiển thị sau khi đơn được xác nhận.</p></div></div>
      <div className="rounded-xl bg-brand-sand p-5"><dl className="space-y-4 text-sm"><div className="flex justify-between gap-3"><dt>Giá trị ca</dt><dd className="font-semibold">{formatVnd(order.baseAmountVnd)}</dd></div><div className="flex justify-between gap-3"><dt>Khách đã ký quỹ</dt><dd className="text-brand-purple">{formatVnd(order.depositAmountVnd)}</dd></div></dl>
        {order.allowedActions.length > 0 && <>
          {order.providerConfirmationDeadlineUtc && <p className="mt-4 text-sm text-brand-muted">Hạn phản hồi: {vnDateTime(order.providerConfirmationDeadlineUtc)}</p>}
          <div className="mt-5"><BookingResponseActions allowedActions={order.allowedActions} bookingId={order.id} summary={`${time} tại ${order.areaLabel}`} /></div>
        </>}
        <Link className="mt-5 inline-block text-sm font-semibold text-brand-purple" to={`/partner/orders/${order.id}`}>Xem chi tiết đơn →</Link>
      </div>
    </div>
  </PartnerPanel>
}

export function PartnerOrdersPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<BookingStatus | undefined>('PendingProviderConfirmation')
  const [page, setPage] = useState(1)
  const { data, error, isError, isPending } = useFreelancerBookings({ status, page, pageSize: 10 })
  const { data: counts } = useFreelancerBookingCounts()

  function filterBy(next: BookingStatus | undefined) {
    setStatus(next)
    setPage(1)
  }

  return <PartnerPage title="Quản lý đơn đặt lịch & xác nhận ca" description="Xem xét yêu cầu từ khách hàng, kiểm tra công việc và thù lao trước khi nhận ca." action={user?.actor !== 'company' && <Link className={partnerLink} to="/partner/schedule">Cập nhật ca rảnh</Link>}>
    <div aria-label="Lọc trạng thái đơn" className="mb-6 flex flex-wrap gap-2">{statusTabs.map((tab) => <button type="button" aria-pressed={status === tab.status} key={tab.label} onClick={() => filterBy(tab.status)} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold ${status === tab.status ? 'bg-brand-charcoal text-white' : 'bg-white text-brand-muted hover:bg-brand-50'}`}>{tab.label}{counts ? ` (${tab.status ? counts.counts[tab.status] ?? 0 : counts.total})` : ''}</button>)}</div>
    <div className="space-y-6">
      {isPending ? <p className="text-brand-muted" role="status">Đang tải danh sách đơn...</p>
        : isError ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(error)}</p>
        : data.items.length === 0 ? <PartnerPanel><h2 className="text-xl font-semibold">Không có đơn phù hợp</h2><p className="mt-2 text-brand-muted">Thử đổi trạng thái để xem các đơn khác.</p>{status !== undefined && <Button className="mt-4" variant="secondary" onClick={() => filterBy(undefined)}>Xem tất cả đơn</Button>}</PartnerPanel>
        : data.items.map((order) => <OrderCard key={order.id} order={order} />)}
      {data && data.totalPages > 1 && <div className="flex items-center justify-center gap-3 text-sm"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</Button><span>{data.page} / {data.totalPages}</span><Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Trang sau</Button></div>}
    </div>
    <PartnerPanel className="mt-8" title="Cam kết chất lượng"><p className="text-brand-muted">Sau khi nhận ca, hãy có mặt đúng giờ, kiểm tra công việc với khách hàng và quét mã QR của khách để check-in.</p><a className="mt-4 inline-block font-semibold text-brand-purple" href="mailto:support@abstrict.vn">Liên hệ hỗ trợ điều phối →</a></PartnerPanel>
  </PartnerPage>
}
