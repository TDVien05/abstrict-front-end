import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingErrorMessage, bookingStatusLabels, bookingStatusTones, type BookingStatus } from '../../entities/booking'
import { useBookings } from '../../features/customer/api/bookings'
import { CustomerCard, CustomerContainer, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateLabel, vnTimeRange } from '../../shared/lib/vn-time'

export { BookingCreatePage } from './BookingCreatePage'
export { CustomerDiscoveryPage } from './CustomerDiscoveryPage'
export { CustomerProviderPage } from './CustomerProviderPage'
export { DisputeCreatePage, DisputeDetailPage, DisputesPage } from './DisputePages'
export { OrderDetailPage } from './OrderDetailPage'
export { ProfilePage } from './ProfilePage'

const statusFilters: BookingStatus[] = ['PendingDeposit', 'PendingProviderConfirmation', 'Confirmed', 'Completed', 'Cancelled', 'Rejected', 'Expired']

export function OrdersPage() {
  const [status, setStatus] = useState<BookingStatus>()
  const [page, setPage] = useState(1)
  const { data, error, isError, isPending, isPlaceholderData } = useBookings({ status, page, pageSize: 10 })

  function filterBy(next: BookingStatus | undefined) {
    setStatus(next)
    setPage(1)
  }

  const chip = (active: boolean) => `rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-brand-charcoal text-white' : 'bg-white text-brand-muted ring-1 ring-brand-border hover:text-brand-charcoal'}`

  return (
    <main className="pb-20">
      <CustomerContainer className="py-8 sm:py-12">
        <p className="text-sm font-semibold text-brand-purple">Đơn của tôi</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Theo dõi các ca đã đặt</h1>
        <div aria-label="Lọc theo trạng thái" className="mt-6 flex flex-wrap gap-2" role="group">
          <button aria-pressed={status === undefined} className={chip(status === undefined)} onClick={() => filterBy(undefined)} type="button">Tất cả</button>
          {statusFilters.map((item) => <button aria-pressed={status === item} className={chip(status === item)} key={item} onClick={() => filterBy(item)} type="button">{bookingStatusLabels[item]}</button>)}
        </div>

        {isPending ? <p className="mt-8 text-sm text-brand-muted" role="status">Đang tải danh sách đơn...</p>
          : isError ? <p className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(error)}</p>
          : data.items.length === 0 ? <CustomerCard className="mt-8 p-8 text-center"><p className="text-sm text-brand-muted">{status ? 'Không có đơn nào ở trạng thái này.' : 'Bạn chưa đặt ca nào.'}</p><Link className="mt-3 inline-flex text-sm font-semibold text-brand-purple hover:underline" to="/discover">Khám phá đối tác</Link></CustomerCard>
          : (
            <>
              <ul className={`mt-8 space-y-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
                {data.items.map((booking) => (
                  <li key={booking.id}>
                    <Link className="block rounded-2xl border border-brand-border bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition hover:border-slate-300" to={`/orders/${booking.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-brand-muted">#{booking.bookingNumber}</p><p className="mt-1 font-semibold text-brand-charcoal">{booking.serviceCategoryName} · {booking.providerDisplayName}</p><p className="mt-1 text-sm text-brand-muted"><span className="inline-block first-letter:uppercase">{vnDateLabel(booking.startsAtUtc)}</span> · {vnTimeRange(booking.startsAtUtc, booking.endsAtUtc)}</p></div><div className="text-right"><StatusPill tone={bookingStatusTones[booking.status]}>{bookingStatusLabels[booking.status]}</StatusPill><p className="mt-2 text-sm font-semibold">{formatVnd(booking.baseAmountVnd)}</p><p className="text-xs text-brand-muted">Cọc {formatVnd(booking.depositAmountVnd)}</p></div></div>
                    </Link>
                  </li>
                ))}
              </ul>
              {data.totalPages > 1 ? <div className="mt-6 flex items-center justify-center gap-3 text-sm"><button aria-label="Trang trước" className="rounded-lg p-2 text-brand-muted hover:bg-slate-100 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)} type="button"><ChevronLeft className="h-4 w-4" /></button><span>{data.page} / {data.totalPages}</span><button aria-label="Trang sau" className="rounded-lg p-2 text-brand-muted hover:bg-slate-100 disabled:opacity-40" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} type="button"><ChevronRight className="h-4 w-4" /></button></div> : null}
            </>
          )}
      </CustomerContainer>
    </main>
  )
}
