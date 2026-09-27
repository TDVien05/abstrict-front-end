import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, Check, CheckCircle2, Clock3, HeartHandshake, MapPin, Share2, ShieldCheck, Sparkles, Star, Timer, UserRoundCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import kitchenAfter from '../../features/customer/assets/kitchen-after.jpg'
import livingAfter from '../../features/customer/assets/living-after.jpg'
import { CustomerCard, CustomerContainer, SectionHeading, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { maiLanAnhImage, providers, servicePackages } from '../../features/customer/customer-content'
import { formatVnd } from '../../shared/lib/format-currency'

const days = [
  { day: 'Thứ 2', date: '23/10', slots: '2 ca rảnh' }, { day: 'Thứ 3', date: '24/10', slots: '1 ca rảnh' },
  { day: 'Thứ 4', date: '25/10', slots: '3 ca rảnh' }, { day: 'Thứ 5', date: '26/10', slots: '2 ca rảnh' },
  { day: 'Thứ 6', date: '27/10', slots: '1 ca rảnh' }, { day: 'Thứ 7', date: '28/10', slots: '2 ca rảnh' },
  { day: 'CN', date: '29/10', slots: 'Kín lịch' },
]

const startTimes = ['08:00', '08:30', '09:00', '09:30', '10:00']
const endTimes = ['11:00', '11:30', '12:00']

export function CustomerProviderPage() {
  const { providerId } = useParams()
  const navigate = useNavigate()
  const provider = providers.find((item) => item.id === providerId) ?? providers[0]
  const [serviceId, setServiceId] = useState('standard')
  const [selectedDay, setSelectedDay] = useState(5)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('11:00')
  const service = servicePackages.find((item) => item.id === serviceId) ?? servicePackages[0]
  const duration = useMemo(() => (Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3)) - Number(startTime.slice(0, 2)) * 60 - Number(startTime.slice(3))) / 60, [endTime, startTime])
  const total = service.price * duration

  function continueBooking() {
    navigate(`/dat-lich/${provider.id}`, { state: { date: days[selectedDay].date, endTime, serviceId, startTime } })
  }

  return (
    <main className="pb-20">
      <CustomerContainer className="py-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to="/kham-pha"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Danh sách đối tác</Link><button className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" type="button"><Share2 aria-hidden="true" className="h-4 w-4" />Chia sẻ</button></div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <CustomerCard className="overflow-hidden p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="relative shrink-0"><img alt={provider.name} className="h-28 w-28 rounded-2xl object-cover object-top" src={provider.image ?? maiLanAnhImage} /><span className="absolute -bottom-2 -right-2 rounded-lg bg-brand-purple p-1.5 text-white"><BadgeCheck aria-hidden="true" className="h-4 w-4" /></span></div>
                <div className="flex-1"><div className="flex flex-wrap gap-2"><StatusPill tone="purple">Freelancer</StatusPill><StatusPill tone="yellow">ABSTRICT Pro 5★</StatusPill><StatusPill tone="green">Đang nhận lịch tuần này</StatusPill></div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-charcoal">{provider.name}</h1><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-brand-muted"><span className="inline-flex items-center gap-1.5 font-semibold text-amber-700"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{provider.rating} ({provider.reviews} đánh giá)</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />99% hoàn thành đúng hạn</span><span className="inline-flex items-center gap-1.5"><Timer className="h-4 w-4" />5 năm kinh nghiệm</span></div><p className="mt-4 flex items-start gap-2 text-sm leading-6 text-brand-muted"><MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand-purple" />Phục vụ Vinhomes Grand Park, Masteri Thảo Điền và Vinhomes Central Park.</p></div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-brand-border pt-6 sm:grid-cols-4">{[['1.820+', 'Giờ làm'], ['92,4%', 'Khách đặt lại'], ['< 8 phút', 'Phản hồi'], ['Eco-Clean', 'Trang thiết bị']].map(([value, label]) => <div key={label}><strong className="text-lg font-semibold text-brand-charcoal">{value}</strong><p className="mt-0.5 text-xs text-brand-muted">{label}</p></div>)}</div>
            </CustomerCard>

            <CustomerCard className="p-6 sm:p-8"><SectionHeading description="Kỹ năng đã được kiểm định trong năm 2025." title="Giới thiệu & kỹ năng nghiệp vụ" /><div className="mt-5 grid gap-3 sm:grid-cols-2">{[['Vệ sinh bếp chuẩn nhà hàng', 'Tẩy dầu mỡ, bảo dưỡng mặt đá và tủ bếp.'], ['Tẩy cặn kính nano & vách tắm', 'Xử lý cặn canxi bằng dụng cụ không gây xước.'], ['Chăm sóc nội thất cao cấp', 'Hút bụi nệm, dưỡng da sofa và lau đèn trang trí.'], ['Ủi đồ & bảo quản vải', 'Ủi hơi nước, gấp quần áo chuẩn boutique.']].map(([title, description]) => <div className="rounded-xl bg-[#f7f8fa] p-4" key={title}><Sparkles aria-hidden="true" className="h-4 w-4 text-brand-purple" /><h3 className="mt-3 text-sm font-semibold text-brand-charcoal">{title}</h3><p className="mt-1 text-xs leading-5 text-brand-muted">{description}</p></div>)}</div></CustomerCard>

            <CustomerCard className="p-6 sm:p-8"><SectionHeading description="Giá minh bạch theo giờ; báo giá cuối cùng do API xác nhận trước khi đặt." title="Dịch vụ & bảng giá" /><div className="mt-5 space-y-3">{servicePackages.map((item) => <button className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition ${serviceId === item.id ? 'border-brand-purple bg-brand-50/50' : 'border-brand-border hover:border-slate-300'}`} key={item.id} onClick={() => setServiceId(item.id)} type="button"><span className="flex gap-3"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${serviceId === item.id ? 'border-brand-purple bg-brand-purple text-white' : 'border-slate-300'}`}>{serviceId === item.id ? <Check className="h-3 w-3" /> : null}</span><span><span className="font-semibold text-brand-charcoal">{item.name}</span>{item.popular ? <span className="ml-2 rounded-full bg-brand-charcoal px-2 py-0.5 text-[10px] font-semibold text-white">Phổ biến</span> : null}<span className="mt-1 block text-xs leading-5 text-brand-muted">{item.description}</span></span></span><strong className="shrink-0 text-sm text-brand-charcoal">{formatVnd(item.price)}<span className="font-normal text-brand-muted">/giờ</span></strong></button>)}</div></CustomerCard>

            <CustomerCard className="p-6 sm:p-8">
              <SectionHeading description="Chọn khoảng rảnh liên tục tối thiểu 2 giờ." title="Lịch làm việc & đặt ca" />
              <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-7">{days.map((item, index) => <button className={`rounded-xl border px-2 py-3 text-center transition ${selectedDay === index ? 'border-brand-charcoal bg-brand-charcoal text-white' : item.slots === 'Kín lịch' ? 'cursor-not-allowed border-brand-border bg-slate-100 text-brand-muted opacity-60' : 'border-brand-border bg-white hover:border-slate-400'}`} disabled={item.slots === 'Kín lịch'} key={item.date} onClick={() => setSelectedDay(index)} type="button"><span className="block text-xs font-semibold">{item.day}</span><span className="mt-1 block text-sm">{item.date}</span><span className={`mt-1 block text-[10px] ${selectedDay === index ? 'text-white/65' : 'text-brand-muted'}`}>{item.slots}</span></button>)}</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Clock3 className="h-4 w-4" />08:00 – 12:00</p><p className="mt-1 text-xs text-emerald-700">Rảnh 4 giờ · Có thể chọn</p></div><div className="rounded-xl bg-slate-100 p-4"><p className="text-sm font-semibold text-brand-muted">12:00 – 14:00</p><p className="mt-1 text-xs text-brand-muted">Đã có lịch / Nghỉ trưa</p></div></div>
              <div className="mt-5 rounded-2xl bg-[#f7f8fa] p-5"><h3 className="text-sm font-semibold text-brand-charcoal">Tinh chỉnh khung giờ</h3><div className="mt-4 grid gap-5 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold text-brand-muted">Giờ bắt đầu</p><div className="flex flex-wrap gap-2">{startTimes.map((time) => <button className={`rounded-lg px-3 py-2 text-xs font-semibold ${startTime === time ? 'bg-brand-purple text-white' : 'border border-brand-border bg-white text-brand-muted'}`} key={time} onClick={() => setStartTime(time)} type="button">{time}</button>)}</div></div><div><p className="mb-2 text-xs font-semibold text-brand-muted">Giờ kết thúc</p><div className="flex flex-wrap gap-2">{endTimes.map((time) => <button className={`rounded-lg px-3 py-2 text-xs font-semibold ${endTime === time ? 'bg-brand-purple text-white' : 'border border-brand-border bg-white text-brand-muted'}`} key={time} onClick={() => setEndTime(time)} type="button">{time}</button>)}</div></div></div><p className="mt-4 flex items-center gap-2 text-xs text-brand-muted"><Clock3 className="h-4 w-4 text-brand-purple" />Đã chọn {duration} giờ · {startTime} – {endTime}</p></div>
            </CustomerCard>

            <CustomerCard className="p-6 sm:p-8"><SectionHeading description="Phản hồi từ những ca đã nghiệm thu." title="Đánh giá thực tế từ cư dân" /><div className="mt-5 space-y-5">{[[kitchenAfter, 'Trần Quốc Bảo', 'Cư dân Origami S7.02', 'Chị Lan Anh đến đúng giờ, chuẩn bị rất vệ sinh. Khu vực bếp được xử lý sạch bóng và bàn giao đúng checklist.'], [livingAfter, 'Nguyễn Hoàng Yến', 'Cư dân Masteri Thảo Điền', 'Dung dịch sinh học dịu nhẹ, nội thất được sắp xếp ngăn nắp. Gia đình mình rất hài lòng.']].map(([image, name, residence, review]) => <article className="grid gap-4 border-b border-brand-border pb-5 last:border-0 last:pb-0 sm:grid-cols-[1fr_140px]" key={String(name)}><div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{String(name).split(' ').slice(-2).map((word) => word[0]).join('')}</span><div><h3 className="text-sm font-semibold">{name}</h3><p className="text-xs text-brand-muted">{residence}</p></div></div><div className="mt-3 flex gap-0.5 text-amber-400">{Array.from({ length: 5 }, (_, index) => <Star className="h-3.5 w-3.5 fill-current" key={index} />)}</div><p className="mt-2 text-sm leading-6 text-brand-muted">{review}</p></div><img alt="Ảnh sau khi dọn" className="h-28 w-full rounded-xl object-cover sm:h-full" src={String(image)} /></article>)}</div></CustomerCard>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <CustomerCard className="p-5 sm:p-6"><p className="text-xs font-semibold text-brand-purple">Phiếu đặt trước</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Khởi tạo lịch làm việc</h2><div className="mt-5 rounded-xl bg-brand-50 p-4"><p className="flex items-center gap-2 text-xs font-semibold text-brand-700"><CalendarDays className="h-4 w-4" />Khung giờ đã chọn</p><p className="mt-2 font-semibold text-brand-charcoal">{days[selectedDay].day}, {days[selectedDay].date}</p><p className="text-sm text-brand-muted">{startTime} – {endTime} ({duration} giờ)</p></div><div className="mt-5"><p className="text-xs font-semibold text-brand-muted">Căn hộ nhận dịch vụ</p><label className="mt-2 block"><select className="w-full rounded-xl border border-brand-border bg-white px-3 py-3 text-sm outline-none focus:border-brand-charcoal"><option>Vinhomes Grand Park · S5.03, căn 12A.08</option><option>Vinhomes Central Park · Park 2, căn 18.04</option><option>Masteri Thảo Điền · T4, căn 09.02</option></select></label><p className="mt-2 flex items-center gap-1.5 text-xs text-brand-muted"><MapPin className="h-3.5 w-3.5" />Cách đối tác 1,2 km · Không phụ phí</p></div><div className="my-5 h-px bg-brand-border" /><div className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-brand-muted">{service.name} ({duration} giờ)</span><span>{formatVnd(total)}</span></div><div className="flex justify-between"><span className="text-brand-muted">Phí nền tảng & bảo hiểm</span><span className="text-emerald-700">Miễn phí</span></div><div className="flex justify-between"><span className="text-brand-muted">Giữ chỗ ưu tiên (15%)</span><span>{formatVnd(total * 0.15)}</span></div><div className="flex justify-between border-t border-brand-border pt-3 font-semibold"><span>Tổng tạm tính</span><span>{formatVnd(total)}</span></div></div><div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><ShieldCheck className="mb-2 h-4 w-4" />Cọc giữ lịch được bảo lưu và chỉ xử lý theo trạng thái do server xác nhận.</div><button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black" onClick={continueBooking} type="button">Tiếp tục chọn checklist <ArrowRight className="h-4 w-4" /></button><div className="mt-4 flex justify-center gap-4 text-[11px] text-brand-muted"><span className="inline-flex items-center gap-1"><UserRoundCheck className="h-3.5 w-3.5" />Đã xác minh</span><span className="inline-flex items-center gap-1"><HeartHandshake className="h-3.5 w-3.5" />Hỗ trợ 24/7</span></div></CustomerCard>
          </aside>
        </div>
      </CustomerContainer>
    </main>
  )
}
