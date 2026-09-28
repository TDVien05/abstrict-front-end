import { useState } from 'react'
import { Check, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/auth-context'
import { PartnerPage, PartnerPanel, PartnerStat, PreviewNotice, partnerLink } from '../../features/partner/components/PartnerPrimitives'
import { previewPlans } from '../../features/partner/partner-preview'
import { formatVnd } from '../../shared/lib/format-currency'
import { Button } from '../../shared/ui/Button'

export function PartnerDashboardPage() {
  const { user } = useAuth()
  const [selected, setSelected] = useState<string | null>(null)
  const plan = previewPlans.find((item) => item.id === selected)
  return <PartnerPage title="Quản lý gói hiển thị & tăng lượt ca" description="Theo dõi hiệu quả hồ sơ và lựa chọn gói tiếp cận khách hàng căn hộ phù hợp." action={user?.actor !== 'company' && <Link className={partnerLink} to="/partner/schedule"><CalendarDays className="mr-2 h-4 w-4" />Đăng ký ca rảnh</Link>}>
    <PreviewNotice />
    <div className="grid gap-5 md:grid-cols-3"><PartnerStat label="Gói đang dùng" value="Gói 7 Ngày" detail="Hết hạn ngày 31/10/2026. Tự động kết thúc khi hết hạn." /><PartnerStat label="Điểm tín nhiệm" value="4.9 / 5" detail="Dựa trên 128 lượt đánh giá dịch vụ hoàn tất." /><PartnerStat label="Lượt xem hồ sơ" value="342 lượt" detail="Tăng 24% so với tuần trước trong dữ liệu minh họa." /></div>
    <div className="my-10 flex flex-wrap items-center justify-between gap-4"><h2 className="section-title">Chọn gói tăng hiển thị</h2><Link className="font-semibold text-brand-purple" to="/partner/orders">Quản lý đơn đặt lịch →</Link></div>
    <div className="grid gap-6 md:grid-cols-2">{previewPlans.map((item) => <PartnerPanel key={item.id} className={item.id === 'month' ? 'ring-1 ring-brand-purple' : ''}><p className="text-sm text-brand-purple">{item.caption}</p><h3 className="mt-3 text-2xl font-semibold">{item.name}</h3><p className="my-5"><strong className="text-4xl font-semibold">{formatVnd(item.price)}</strong><span className="text-brand-muted"> / {item.duration}</span></p><p className="text-sm text-brand-muted">Giá đề xuất minh họa</p><ul className="my-7 space-y-4">{item.benefits.map((benefit) => <li key={benefit} className="flex gap-3"><Check aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-brand-green" />{benefit}</li>)}</ul><Button className="w-full" variant={item.id === 'week' ? 'secondary' : 'primary'} onClick={() => setSelected(item.id)}>{item.id === 'week' ? 'Gia hạn thêm 7 ngày' : 'Nâng cấp gói 30 ngày'}</Button></PartnerPanel>)}</div>
    {plan && <section aria-label="Gói đã chọn" className="mt-6 rounded-2xl bg-brand-50 p-6" role="status"><h3 className="text-xl font-semibold">Đã chọn {plan.name}</h3><p className="mt-2">Giá minh họa: {formatVnd(plan.price)} / {plan.duration}. Chức năng thanh toán chưa được kết nối; bạn chưa bị tính phí.</p><Button className="mt-4" variant="secondary" onClick={() => setSelected(null)}>Đóng lựa chọn</Button></section>}
    <p className="mt-7 text-sm text-brand-muted">Thời hạn gói tính liên tục kể cả khi bạn tạm tắt nhận đơn hoặc kín lịch. Giá và quyền lợi chính thức sẽ được xác nhận trước khi thanh toán.</p>
  </PartnerPage>
}

export function PartnerPlansPage() { return <PartnerDashboardPage /> }
