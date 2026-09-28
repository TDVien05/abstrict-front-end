import { useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export { PartnerDashboardPage, PartnerPlansPage } from './PartnerDashboardPage'
export { PartnerOrdersPage } from './PartnerOrdersPage'

export function PartnerAvailabilityPage() {
  return <PageShell description="Chỉ freelancer quản lý khoảng rảnh/bận; công ty không dùng màn hình này." title="Lịch làm việc" />
}

export function PartnerOrderDetailPage() {
  const { id } = useParams()
  return <PageShell description={`Thao tác nhận đơn, QR scanner, checklist và ảnh cho booking ${id ?? ''}.`} title="Xử lý đơn hàng" />
}
