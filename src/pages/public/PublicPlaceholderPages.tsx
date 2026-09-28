import { useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function ProviderProfilePage() {
  const { id } = useParams()
  return <PageShell description={`Hồ sơ, dịch vụ và khả dụng của đối tác ${id ?? ''} sẽ được ghép từ feature profiles và availability.`} title="Hồ sơ đối tác" />
}

export { PartnerRegistrationPage } from '../partner/PartnerRegistrationPage'

export function ForbiddenPage() {
  return <PageShell description="Tài khoản hiện tại không có quyền truy cập khu vực này." title="Không có quyền truy cập" />
}

export function NotFoundPage() {
  return <PageShell description="Đường dẫn không tồn tại hoặc đã được chuyển sang vị trí khác." title="Không tìm thấy trang" />
}
