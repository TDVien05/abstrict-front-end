import { useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function BookingCreatePage() {
  const { providerId } = useParams()
  return <PageShell description={`Luồng chọn việc, thời gian, báo giá và đặt cọc cho đối tác ${providerId ?? ''}.`} title="Đặt lịch" />
}

export function OrdersPage() {
  return <PageShell description="Danh sách booking theo trạng thái server, kèm loading, empty và error state." title="Đơn hàng của tôi" />
}

export function OrderDetailPage() {
  const { id } = useParams()
  return <PageShell description={`Chi tiết trạng thái, QR, checklist, ảnh và nghiệm thu của booking ${id ?? ''}.`} title="Chi tiết đơn hàng" />
}
