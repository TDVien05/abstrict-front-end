import { useSearchParams } from 'react-router-dom'
import { DiscoveryFilters } from '../../features/discovery/components/DiscoveryFilters'
import { Card } from '../../shared/ui/Card'
import { PageShell } from '../components/PageShell'

export function DiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <PageShell
      description="Bộ lọc được lưu trên URL để có thể chia sẻ kết quả và giữ nguyên khi chuyển trang."
      eyebrow="Khám phá"
      title="Tìm đối tác phù hợp"
    >
      <DiscoveryFilters searchParams={searchParams} setSearchParams={setSearchParams} />
      <Card className="mt-6 text-center">
        <h2 className="text-lg font-bold text-slate-950">Chưa tải dữ liệu đối tác</h2>
        <p className="mt-2 text-slate-600">Kết nối endpoint tìm kiếm OpenAPI để hiển thị trạng thái loading, empty và error tại đây.</p>
      </Card>
    </PageShell>
  )
}
