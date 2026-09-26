import { useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

export function ProviderProfilePage() {
  const { id } = useParams()
  return <PageShell description={`Hồ sơ, dịch vụ và khả dụng của đối tác ${id ?? ''} sẽ được ghép từ feature profiles và availability.`} title="Hồ sơ đối tác" />
}

export function SignInPage() {
  return <PageShell description="Điểm tích hợp cơ chế đăng nhập phù hợp với backend; không lưu token dài hạn trong localStorage." title="Đăng nhập" />
}

export function PartnerRegistrationPage() {
  return <PageShell description="Form sẽ phân nhánh KYC freelancer và hồ sơ công ty theo hợp đồng API." title="Trở thành đối tác" />
}

export function ForbiddenPage() {
  return <PageShell description="Tài khoản hiện tại không có quyền truy cập khu vực này." title="Không có quyền truy cập" />
}

export function NotFoundPage() {
  return <PageShell description="Đường dẫn không tồn tại hoặc đã được chuyển sang vị trí khác." title="Không tìm thấy trang" />
}
