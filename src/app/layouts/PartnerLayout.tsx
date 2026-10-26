import { Building2, CalendarDays, ClipboardList, IdCard, LayoutDashboard, Sparkles, UserRound } from 'lucide-react'
import { useAuth } from '../../features/auth/auth-context'
import { SidebarShell, type SidebarItem } from '../components/SidebarShell'

const freelancerItems: SidebarItem[] = [
  { label: 'Tổng quan', to: '/partner/dashboard', icon: LayoutDashboard },
  { label: 'Đơn đặt lịch', to: '/partner/orders', icon: ClipboardList },
  { label: 'Lịch làm việc', to: '/partner/schedule', icon: CalendarDays },
  { label: 'Hồ sơ công khai', to: '/partner/profile', icon: UserRound },
  { label: 'Gói hiển thị', to: '/partner/plans', icon: Sparkles },
  { label: 'Hồ sơ KYC', to: '/partners/register/kyc', icon: IdCard },
]

const companyItems: SidebarItem[] = [
  { label: 'Tổng quan', to: '/partner/dashboard', icon: LayoutDashboard },
  { label: 'Hồ sơ doanh nghiệp', to: '/partner/company/onboarding', icon: Building2 },
  { label: 'Gói hiển thị', to: '/partner/plans', icon: Sparkles },
]

export function PartnerLayout() {
  const { user } = useAuth()
  return <SidebarShell items={user?.actor === 'company' ? companyItems : freelancerItems} navLabel="Điều hướng đối tác" roleLabel={user?.actor === 'company' ? 'Doanh nghiệp' : 'Freelancer'} />
}
