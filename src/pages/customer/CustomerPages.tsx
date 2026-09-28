import { CalendarDays, ChevronRight, Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CustomerCard, CustomerContainer, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { formatVnd } from '../../shared/lib/format-currency'

export { BookingCreatePage } from './BookingCreatePage'
export { CustomerDiscoveryPage } from './CustomerDiscoveryPage'
export { CustomerProviderPage } from './CustomerProviderPage'
export { OrderDetailPage } from './OrderDetailPage'

export function OrdersPage() {
  return (
    <main className="pb-20">
      <CustomerContainer className="py-8 sm:py-12">
        <p className="text-sm font-semibold text-brand-purple">Đơn của tôi</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Theo dõi các ca đã đặt</h1>
        <p className="mt-3 text-base text-brand-muted">Xem tiến độ, QR check-in và trạng thái nghiệm thu của từng đơn.</p>
        <div className="mt-8 grid gap-4">
          <CustomerCard className="p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div><div className="flex flex-wrap items-center gap-2"><StatusPill tone="green">Đang thực hiện</StatusPill><span className="text-xs text-brand-muted">#HC-241028-09</span></div><h2 className="mt-3 text-lg font-semibold">Tổng vệ sinh căn hộ · Chị Mai Lan Anh</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-brand-muted"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Hôm nay, 14:00 – 17:00</span><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />Vinhomes Grand Park · S5.03</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />Tiến độ 47%</span></div></div><div className="flex items-center justify-between gap-6 sm:justify-end"><div className="text-right"><p className="text-xs text-brand-muted">Tổng giá trị</p><strong>{formatVnd(300000)}</strong></div><Link className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white" to="/orders/HC-241028-09">Xem chi tiết <ChevronRight className="h-4 w-4" /></Link></div>
            </div>
          </CustomerCard>
        </div>
      </CustomerContainer>
    </main>
  )
}
