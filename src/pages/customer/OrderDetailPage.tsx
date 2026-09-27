import { AlertTriangle, ArrowLeft, BadgeCheck, Bath, Camera, Check, CheckCircle2, ChevronRight, Clock3, Download, Expand, FileCheck2, Headphones, Hourglass, MapPin, MessageCircle, Phone, QrCode, Send, ShieldCheck, Sofa, Sparkles, Star, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import bathroomBefore from '../../features/customer/assets/bathroom-before.jpg'
import kitchenAfter from '../../features/customer/assets/kitchen-after.jpg'
import kitchenBefore from '../../features/customer/assets/kitchen-before.jpg'
import livingAfter from '../../features/customer/assets/living-after.jpg'
import livingBefore from '../../features/customer/assets/living-before.jpg'
import { CustomerCard, CustomerContainer, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { maiLanAnhImage } from '../../features/customer/customer-content'
import { formatVnd } from '../../shared/lib/format-currency'

function DemoQrCode() {
  const cells = Array.from({ length: 21 * 21 }, (_, index) => {
    const x = index % 21
    const y = Math.floor(index / 21)
    const inFinder = (originX: number, originY: number) => x >= originX && x < originX + 7 && y >= originY && y < originY + 7 && (x === originX || x === originX + 6 || y === originY || y === originY + 6 || (x >= originX + 2 && x <= originX + 4 && y >= originY + 2 && y <= originY + 4))
    return inFinder(0, 0) || inFinder(14, 0) || inFinder(0, 14) || ((x * 7 + y * 11 + x * y) % 5 < 2 && !(x < 8 && y < 8) && !(x > 12 && y < 8) && !(x < 8 && y > 12))
  })

  return <svg aria-label="Mã QR check-in của ca làm" className="h-36 w-36" role="img" viewBox="0 0 21 21">{cells.map((filled, index) => filled ? <rect fill="currentColor" height="1" key={index} width="1" x={index % 21} y={Math.floor(index / 21)} /> : null)}</svg>
}

interface WorkAreaProps {
  afterImage?: string
  beforeImage: string
  description: string
  icon: typeof UtensilsCrossed
  index: number
  status: string
  title: string
}

function WorkArea({ afterImage, beforeImage, description, icon: Icon, index, status, title }: WorkAreaProps) {
  return (
    <article className="rounded-2xl border border-brand-border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-4 w-4" /></span><div><h3 className="text-sm font-semibold">{index}. {title}</h3><p className="mt-1 text-xs text-brand-muted">{description}</p></div></div><StatusPill tone={afterImage ? 'green' : 'yellow'}>{status}</StatusPill></div>
      <div className="mt-4 grid grid-cols-2 gap-3"><figure className="overflow-hidden rounded-xl bg-slate-100"><div className="relative aspect-[4/3]"><img alt={`${title} trước khi dọn`} className="h-full w-full object-cover" src={beforeImage} /><span className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">Trước khi dọn</span></div></figure>{afterImage ? <figure className="overflow-hidden rounded-xl bg-slate-100"><div className="relative aspect-[4/3]"><img alt={`${title} sau khi dọn`} className="h-full w-full object-cover" src={afterImage} /><span className="absolute left-2 top-2 rounded-md bg-emerald-700/85 px-2 py-1 text-[10px] font-semibold text-white">Sau khi dọn ✓</span></div></figure> : <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-dashed border-brand-border bg-[#f7f8fa] p-3 text-center text-brand-muted"><Hourglass className="h-5 w-5 text-amber-500" /><p className="mt-2 text-xs">Ảnh nghiệm thu sẽ tải lên khi hoàn tất</p></div>}</div>
    </article>
  )
}

export function OrderDetailPage() {
  const { id } = useParams()
  const [extension, setExtension] = useState(30)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')

  return (
    <main className="pb-20">
      <CustomerContainer className="py-6 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to="/don-hang"><ArrowLeft className="h-4 w-4" />Đơn của tôi</Link><div className="flex gap-2"><button className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-muted hover:text-brand-charcoal" type="button"><Download className="h-4 w-4" />Xuất phiếu ca</button><button className="inline-flex items-center gap-2 rounded-xl bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white" type="button"><FileCheck2 className="h-4 w-4" />Nghiệm thu</button></div></div>

        <section className="rounded-2xl border border-brand-border bg-white p-5 sm:p-7"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="flex flex-wrap items-center gap-2"><StatusPill tone="green">Đang thực hiện trực tiếp</StatusPill><span className="text-xs text-brand-muted">Đơn #{id ?? 'HC-241028-09'}</span></div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Chi tiết ca làm #{id ?? 'HC-241028-09'}</h1><p className="mt-2 flex items-start gap-2 text-sm text-brand-muted"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />Căn hộ S5.03 tầng 18, Vinhomes Grand Park · Tổng vệ sinh căn hộ</p></div><div className="min-w-40 rounded-xl bg-emerald-50 p-4 text-emerald-800"><p className="text-xs font-semibold">Tiến độ ca</p><strong className="mt-1 block text-2xl">47%</strong><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full w-[47%] rounded-full bg-emerald-600" /></div></div></div>

          <div className="mt-7 grid gap-1 sm:grid-cols-5">{[['Đã xác nhận', '10:15', true], ['Đã check-in', '13:58', true], ['Đang thực hiện', 'Live', false], ['Chờ nghiệm thu', '17:00', false], ['Quyết toán', 'Sau nghiệm thu', false]].map(([label, time, complete], index) => <div className={`relative rounded-xl p-3 ${index === 2 ? 'bg-brand-charcoal text-white' : complete ? 'bg-emerald-50 text-emerald-800' : 'bg-[#f7f8fa] text-brand-muted'}`} key={String(label)}><div className="flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${complete ? 'bg-emerald-600 text-white' : index === 2 ? 'bg-white text-brand-charcoal' : 'bg-white'}`}>{complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className="text-xs font-semibold">{label}</span></div><p className="mt-2 pl-8 text-[11px] opacity-70">{time}</p></div>)}</div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="space-y-5">
            <CustomerCard className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-xl font-semibold"><Sparkles className="h-5 w-5 text-brand-purple" />Tổng quan ca làm việc</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['2PN · 68m²', 'Quy mô căn hộ'], ['3 giờ', 'Thời gian chuẩn'], ['2 / 3', 'Khu vực hoàn tất'], ['Pro Kit', 'Dụng cụ']].map(([value, label]) => <div className="rounded-xl bg-[#f7f8fa] p-4" key={label}><strong className="text-base font-semibold">{value}</strong><p className="mt-1 text-xs text-brand-muted">{label}</p></div>)}</div></CustomerCard>

            <CustomerCard className="p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-xl font-semibold"><Camera className="h-5 w-5 text-brand-purple" />Nhật ký Before / After</h2><p className="mt-1 text-xs text-brand-muted">Ảnh đối chứng minh bạch theo từng khu vực.</p></div><StatusPill tone="green">2/3 đã có ảnh</StatusPill></div><div className="mt-5 space-y-4"><WorkArea afterImage={kitchenAfter} beforeImage={kitchenBefore} description="Hoàn tất lúc 14:45 · Đã khử khuẩn bồn rửa và lau mặt bếp" icon={UtensilsCrossed} index={1} status="Đã xong" title="Bếp & bồn rửa" /><WorkArea afterImage={livingAfter} beforeImage={livingBefore} description="Hoàn tất lúc 15:20 · Hút bụi thảm và lau sàn gỗ" icon={Sofa} index={2} status="Đã xong" title="Phòng khách & bàn trà" /><WorkArea beforeImage={bathroomBefore} description="Đang tẩy cặn nano và đánh bóng vách kính" icon={Bath} index={3} status="Đang xử lý" title="Nhà tắm Master & vách kính" /></div></CustomerCard>

            <CustomerCard className="p-5 sm:p-6"><div className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600" /><div><h2 className="text-xl font-semibold">Nghiệm thu & quyết toán</h2><p className="mt-1 text-sm leading-6 text-brand-muted">Khoản thanh toán còn lại được bảo lưu; chỉ xử lý khi trạng thái nghiệm thu được server xác nhận.</p></div></div><div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl bg-[#f7f8fa] p-5 sm:flex-row sm:items-center"><div><p className="text-xs text-brand-muted">Thanh toán còn lại</p><strong className="mt-1 block text-2xl">{formatVnd(255000)}</strong><p className="text-xs text-brand-muted">Đã trừ cọc {formatVnd(45000)}</p></div><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-5 text-sm font-semibold text-white" type="button"><CheckCircle2 className="h-4 w-4" />Xác nhận hoàn thành</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-sm font-semibold text-brand-muted" type="button"><MessageCircle className="h-4 w-4" />Yêu cầu làm rõ</button><button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-semibold text-red-700" type="button"><AlertTriangle className="h-4 w-4" />Gửi khiếu nại</button></div></CustomerCard>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
            <CustomerCard className="p-5 text-center"><div className="flex items-center justify-between text-left"><div><h2 className="flex items-center gap-2 text-base font-semibold"><QrCode className="h-4 w-4" />Mã QR check-in</h2><p className="mt-1 text-xs text-brand-muted">Đã quét lúc 13:58 tại sảnh S5.03</p></div><StatusPill tone="green">Đã check-in</StatusPill></div><div className="mx-auto mt-5 flex w-fit rounded-2xl border-8 border-white bg-white p-2 text-brand-charcoal shadow-lg"><DemoQrCode /></div><button className="mx-auto mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand-purple" type="button"><Expand className="h-4 w-4" />Mở rộng mã QR</button></CustomerCard>

            <CustomerCard className="p-5"><div className="flex items-center gap-3"><div className="relative"><img alt="Chị Mai Lan Anh" className="h-12 w-12 rounded-full object-cover object-top" src={maiLanAnhImage} /><span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" /></div><div><div className="flex items-center gap-1.5"><h2 className="text-sm font-semibold">Chị Mai Lan Anh</h2><BadgeCheck className="h-4 w-4 text-emerald-600" /></div><p className="mt-1 flex items-center gap-1 text-xs text-brand-muted"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />4.9 · 148 ca hoàn thành</p></div></div><p className="mt-4 text-xs text-brand-muted">Số điện thoại: <strong className="text-brand-charcoal">0987 *** 321</strong></p><div className="mt-3 grid grid-cols-2 gap-2"><a className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-xs font-semibold" href="tel:0987000321"><Phone className="h-4 w-4" />Gọi điện</a><button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border text-xs font-semibold" type="button"><MessageCircle className="h-4 w-4" />Nhắn tin</button></div></CustomerCard>

            <CustomerCard className="p-5"><h2 className="flex items-center gap-2 text-base font-semibold"><Clock3 className="h-4 w-4 text-brand-purple" />Đề nghị gia hạn</h2><p className="mt-2 text-xs leading-5 text-brand-muted">Gửi yêu cầu khi căn hộ phát sinh thêm công việc.</p><div className="mt-4 grid grid-cols-2 gap-2">{[[30, 50000], [60, 90000]].map(([minutes, price]) => <button className={`rounded-xl border p-3 text-left ${extension === minutes ? 'border-brand-purple bg-brand-50 text-brand-700' : 'border-brand-border'}`} key={minutes} onClick={() => setExtension(minutes)} type="button"><strong className="text-sm">+{minutes} phút</strong><span className="mt-1 block text-xs">{formatVnd(price)}</span></button>)}</div><label className="mt-4 block text-xs font-semibold text-brand-muted">Lý do gia hạn<textarea className="mt-2 min-h-20 w-full rounded-xl border border-brand-border p-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal" onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Phát sinh ủi đồ..." value={reason} /></label><button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-charcoal text-sm font-semibold text-white" onClick={() => setMessage(`Yêu cầu gia hạn ${extension} phút đã sẵn sàng gửi đến API.`)} type="button"><Send className="h-4 w-4" />Gửi yêu cầu gia hạn</button>{message ? <p className="mt-3 rounded-xl bg-brand-blue-pastel-soft p-3 text-xs text-brand-blue-ink" role="status">{message}</p> : null}</CustomerCard>

            <a className="flex items-center justify-between rounded-2xl bg-brand-charcoal p-4 text-white" href="tel:19006824"><span className="flex items-center gap-3"><Headphones className="h-5 w-5 text-brand-blue-pastel" /><span><strong className="block text-sm">Hỗ trợ khẩn cấp 24/7</strong><span className="text-xs text-white/60">Hotline 1900 6824</span></span></span><ChevronRight className="h-4 w-4" /></a>
          </aside>
        </div>
      </CustomerContainer>
    </main>
  )
}
