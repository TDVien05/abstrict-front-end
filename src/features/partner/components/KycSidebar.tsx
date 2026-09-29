import { Building2, Headset, ShieldCheck, Wallet, Zap } from 'lucide-react'
import { kycFocus } from './KycPrimitives'

export function KycSidebar({ progress, documentsSelected }: { progress: number; documentsSelected: boolean }) {
  const checkpoints = [
    ['Tính xác thực CCCD', 'Chờ đối chiếu'],
    ['Khớp khuôn mặt Face ID', 'Chưa xác thực'],
    ['Sức khỏe & tư pháp', documentsSelected ? 'Đã chọn tệp' : 'Chờ bổ sung'],
  ]
  return (
    <aside aria-label="Thông tin thẩm định và hỗ trợ" className="min-w-0 space-y-4 lg:sticky lg:top-[216px] lg:z-10 lg:col-span-4 lg:self-start">
      <section className="overflow-hidden rounded-2xl bg-white">
        <header className="flex items-center justify-between gap-2 bg-brand-blue-pastel-soft px-4 py-3"><h2 title="Chỉ số tín nhiệm eKYC" className="min-w-0 truncate text-base font-semibold">Chỉ số tín nhiệm eKYC</h2><span className="shrink-0 whitespace-nowrap text-sm text-brand-blue-ink">Chưa thẩm định</span></header>
        <div className="p-4">
          <div role="progressbar" aria-label="Độ hoàn thiện hồ sơ" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="relative mx-auto mb-4 flex h-28 w-28 items-center justify-center">
            <svg aria-hidden className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-brand-sand" /><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="264" strokeDashoffset={264 * (1 - progress / 100)} strokeLinecap="round" className="text-brand-blue-pastel-hover transition-all" /></svg>
            <div className="text-center"><p className="text-2xl font-semibold">{progress}<span className="text-base text-brand-blue-ink">/100</span></p><p className="text-xs text-brand-muted">Độ hoàn thiện</p></div>
          </div>
          <dl className="space-y-2 text-sm">{checkpoints.map(([label, value]) => <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-brand-sand p-2.5" key={label}><dt>{label}</dt><dd className="text-brand-blue-ink">{value}</dd></div>)}</dl>
          <p className="mt-3 text-sm text-brand-muted">Điểm thể hiện mức độ điền thông tin, chưa phải kết quả xác minh.</p>
        </div>
      </section>
      <section className="rounded-2xl bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Quyền lợi đối tác</h2>
        <ul className="space-y-4 text-sm text-brand-muted">
          <li className="flex gap-3"><Wallet aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue-ink" /><span>Thù lao minh bạch theo công việc và thời lượng của từng ca.</span></li>
          <li className="flex gap-3"><Zap aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue-ink" /><span>Nhận thù lao qua tài khoản ngân hàng đã được đối soát.</span></li>
          <li className="flex gap-3"><ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue-ink" /><span>Được hỗ trợ trong quá trình làm việc và xử lý các vấn đề phát sinh.</span></li>
          <li className="flex gap-3"><Building2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue-ink" /><span>Tự do chọn khu vực nhận ca gần nơi cư trú tại các tổ hợp căn hộ.</span></li>
        </ul>
      </section>
      <section className="rounded-2xl bg-brand-charcoal p-5 text-white">
        <div className="flex items-center gap-3"><Headset aria-hidden className="h-7 w-7 shrink-0" /><div><h2 className="text-lg font-semibold">Trợ lý KYC cá nhân</h2><p className="text-sm text-white/75">Bộ phận tuyển dụng ABSTRICT</p></div></div>
        <p className="my-4 text-sm text-white/75">Gặp trục trặc khi chụp CCCD hoặc cần hỗ trợ thủ tục làm lý lịch tư pháp trực tuyến?</p>
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm">Hỗ trợ hồ sơ đối tác</span><a className={`rounded-lg border border-white/30 bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-brand-charcoal ${kycFocus}`} href="mailto:support@abstrict.vn">Liên hệ hỗ trợ</a></div>
      </section>
    </aside>
  )
}
