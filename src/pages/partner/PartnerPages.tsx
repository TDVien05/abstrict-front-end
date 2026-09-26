import { useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function PartnerDashboardPage() {
  return <PageShell description="Tổng quan hồ sơ, đơn hàng và thống kê hiển thị do API cung cấp." title="Tổng quan đối tác" />
}

export function PartnerAvailabilityPage() {
  return <PageShell description="Chỉ freelancer quản lý khoảng rảnh/bận; công ty không dùng màn hình này." title="Lịch làm việc" />
}

export function PartnerOrderDetailPage() {
  const { id } = useParams()
  return <PageShell description={`Thao tác nhận đơn, QR scanner, checklist và ảnh cho booking ${id ?? ''}.`} title="Xử lý đơn hàng" />
}

export function PartnerPlansPage() {
  return <PageShell description="Giá, quyền lợi và hiệu lực gói luôn lấy từ API, không hard-code tại frontend." title="Gói tăng hiển thị" />
}
