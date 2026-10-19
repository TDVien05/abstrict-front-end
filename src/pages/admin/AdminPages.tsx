
export { AdminDashboardPage } from './AdminDashboardPage'
export { AdminCompaniesPage, AdminCompanyDetailPage } from './AdminCompanyPages'
export { AdminKycDetailPage, AdminKycPage } from './AdminKycPages'

export function AdminDisputesPage() {
  return <div><h1 className="text-xl font-semibold tracking-[-0.02em]">Quản lý khiếu nại</h1><p className="mt-4 rounded-2xl bg-white p-6 text-sm text-brand-muted shadow-sm">Timeline bằng chứng, quyết định và tối đa một lần yêu cầu xem xét lại.</p></div>
}
