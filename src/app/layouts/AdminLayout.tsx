import { Building2, LayoutDashboard, Scale, ShieldCheck } from 'lucide-react'
import { SidebarShell, type SidebarItem } from '../components/SidebarShell'

const items: SidebarItem[] = [
  { label: 'Tổng quan', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Duyệt KYC', to: '/admin/kyc', icon: ShieldCheck },
  { label: 'Duyệt doanh nghiệp', to: '/admin/approvals', icon: Building2 },
  { label: 'Khiếu nại', to: '/admin/disputes', icon: Scale },
]

export function AdminLayout() {
  return <SidebarShell items={items} navLabel="Điều hướng quản trị" roleLabel="Quản trị viên" />
}
