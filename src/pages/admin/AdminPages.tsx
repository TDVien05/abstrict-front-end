import { PageShell } from '../components/PageShell'

export { AdminCompaniesPage, AdminCompanyDetailPage } from './AdminCompanyPages'
export { AdminKycDetailPage, AdminKycPage } from './AdminKycPages'

export function AdminDisputesPage() {
  return <PageShell description="Timeline bằng chứng, quyết định và tối đa một lần yêu cầu xem xét lại." title="Quản lý khiếu nại" />
}
