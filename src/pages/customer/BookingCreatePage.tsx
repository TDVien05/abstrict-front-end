import { ArrowRight, BedDouble, Check, CheckCircle2, ClipboardCheck, Clock3, CreditCard, House, Info, MapPin, MessageSquareText, ShieldCheck, ShowerHead, Sofa } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CustomerCard, CustomerContainer, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { bookingChecklist, maiLanAnhImage, providers, servicePackages } from '../../features/customer/customer-content'
import { formatVnd } from '../../shared/lib/format-currency'

interface BookingNavigationState {
  date?: string
  endTime?: string
  serviceId?: string
  startTime?: string
}

const areaIcons = [Sofa, House, BedDouble, ShowerHead]
const paymentMethods = [{ id: 'momo', label: 'Ví MoMo', mark: 'M' }, { id: 'vietqr', label: 'VietQR / ATM', mark: 'QR' }, { id: 'zalopay', label: 'ZaloPay', mark: 'Z' }, { id: 'card', label: 'Visa / Master', mark: '••' }]

export function BookingCreatePage() {
  const { providerId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as BookingNavigationState | null) ?? {}
  const provider = providers.find((item) => item.id === providerId) ?? providers[0]
  const service = servicePackages.find((item) => item.id === state.serviceId) ?? servicePackages[0]
  const startTime = state.startTime ?? '14:00'
  const endTime = state.endTime ?? '17:00'
  const duration = useMemo(() => (Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3)) - Number(startTime.slice(0, 2)) * 60 - Number(startTime.slice(3))) / 60, [endTime, startTime])
  const total = service.price * duration
  const deposit = total * 0.15
  const [checkedItems, setCheckedItems] = useState(() => new Set(bookingChecklist.flatMap((group) => group.items)))
  const [paymentMethod, setPaymentMethod] = useState('vietqr')
  const [note, setNote] = useState('Nhà có 1 bé mèo ngoan, chuông cửa đang hỏng; vui lòng gọi điện khi đến sảnh.')
  const [message, setMessage] = useState('')

  function toggleItem(item: string) {
    setCheckedItems((current) => {
      const next = new Set(current)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  function confirmDeposit() {
    setMessage('Thông tin booking đã sẵn sàng gửi đến API tạo đơn và khởi tạo giao dịch cọc.')
    window.setTimeout(() => navigate('/orders/HC-241028-09'), 650)
  }

  return (
    <main className="pb-20">
      <CustomerContainer className="py-7 sm:py-10">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex flex-wrap items-center gap-2"><StatusPill tone="purple">Yêu cầu #AB-2810</StatusPill><StatusPill tone="green">Bảo vệ cọc</StatusPill></div><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-charcoal">Xác nhận đặt dịch vụ & ký quỹ</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted">Kiểm tra thời gian, địa chỉ và phạm vi công việc trước khi đặt cọc giữ lịch.</p></div></div>

        <div className="mb-6 grid gap-2 rounded-2xl border border-brand-border bg-white p-3 sm:grid-cols-3">{[['1', 'Chọn công việc', true], ['2', 'Thời gian & địa chỉ', true], ['3', 'Xác nhận & ký cọc', false]].map(([step, label, complete]) => <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${complete ? 'text-emerald-700' : 'bg-brand-charcoal text-white'}`} key={String(step)}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${complete ? 'bg-emerald-100' : 'bg-white/15'}`}>{complete ? <Check className="h-4 w-4" /> : step}</span><span className="text-sm font-semibold">{label}</span></div>)}</div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <CustomerCard className="p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><img alt={provider.name} className="h-16 w-16 rounded-full object-cover object-top" src={provider.image ?? maiLanAnhImage} /><div className="flex-1"><div className="flex items-center gap-2"><h2 className="font-semibold text-brand-charcoal">{provider.name}</h2><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><p className="mt-1 text-xs text-brand-muted">ABSTRICT Pro · {provider.rating}★ · {provider.reviews} ca hoàn tất</p></div><div className="text-left sm:text-right"><p className="text-xs text-brand-muted">Đơn giá niêm yết</p><strong className="text-lg">{formatVnd(service.price)}<span className="text-xs font-normal text-brand-muted">/giờ</span></strong></div></div><div className="mt-5 grid gap-3 border-t border-brand-border pt-5 sm:grid-cols-2"><div className="flex gap-3 rounded-xl bg-[#f7f8fa] p-4"><Clock3 className="h-5 w-5 text-brand-purple" /><div><p className="text-xs text-brand-muted">Thời gian thực hiện</p><p className="mt-1 text-sm font-semibold">{startTime} – {endTime} · {duration} giờ</p><p className="text-xs text-brand-muted">Ngày {state.date ?? '28/10'}</p></div></div><div className="flex gap-3 rounded-xl bg-[#f7f8fa] p-4"><MapPin className="h-5 w-5 text-brand-purple" /><div><p className="text-xs text-brand-muted">Địa chỉ căn hộ</p><p className="mt-1 text-sm font-semibold">S5.03, tầng 18</p><p className="text-xs text-brand-muted">Vinhomes Grand Park, TP. Thủ Đức</p></div></div></div></CustomerCard>

            <CustomerCard className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="h-5 w-5 text-brand-purple" />Checklist đã thống nhất</p><p className="mt-1 text-xs text-brand-muted">{checkedItems.size} hạng mục đang được chọn</p></div><StatusPill tone="green">Có thể chỉnh sửa</StatusPill></div><div className="mt-5 space-y-4">{bookingChecklist.map((group, groupIndex) => { const Icon = areaIcons[groupIndex]; const selectedCount = group.items.filter((item) => checkedItems.has(item)).length; return <section className="rounded-xl border border-brand-border p-4" key={group.area}><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-brand-purple" />{groupIndex + 1}. {group.area}</h3><span className="text-xs font-semibold text-emerald-700">{selectedCount}/{group.items.length} mục</span></div><div className="mt-3 space-y-2">{group.items.map((item) => <label className="flex cursor-pointer items-start gap-2.5 text-sm text-brand-muted" key={item}><input checked={checkedItems.has(item)} className="mt-1 h-4 w-4 accent-brand-purple" onChange={() => toggleItem(item)} type="checkbox" /><span>{item}</span></label>)}</div></section> })}</div></CustomerCard>

            <CustomerCard className="p-5 sm:p-6"><label className="block"><span className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="h-4 w-4 text-brand-purple" />Ghi chú riêng cho {provider.name}</span><textarea className="mt-3 min-h-24 w-full resize-y rounded-xl border border-brand-border bg-[#f7f8fa] p-3 text-sm leading-6 outline-none focus:border-brand-charcoal" onChange={(event) => setNote(event.target.value)} value={note} /></label></CustomerCard>

            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><Info className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Phạm vi công việc minh bạch:</strong> Công việc ngoài checklist cần tạo đề nghị gia hạn và được cả hai bên đồng ý trước khi thực hiện.</p></div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit"><CustomerCard className="p-5 sm:p-6"><h2 className="text-xl font-semibold tracking-[-0.02em]">Tóm tắt thanh toán</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-brand-muted">Chi phí ca ({duration} giờ × {formatVnd(service.price)})</span><span>{formatVnd(total)}</span></div><div className="flex justify-between"><span className="text-brand-muted">Dụng cụ & chất tẩy rửa</span><span>0 ₫</span></div><div className="flex justify-between border-t border-brand-border pt-3 font-semibold"><span>Tổng giá trị ca</span><span>{formatVnd(total)}</span></div></div><div className="mt-5 rounded-xl bg-brand-50 p-4"><div className="flex justify-between text-sm font-semibold text-brand-700"><span>Cọc giữ lịch (15%)</span><span>{formatVnd(deposit)}</span></div><div className="mt-2 flex justify-between text-xs text-brand-muted"><span>Thanh toán sau nghiệm thu</span><span>{formatVnd(total - deposit)}</span></div></div><div className="mt-5 flex gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><ShieldCheck className="h-4 w-4 shrink-0" /><span>Miễn phí hủy trước giờ làm tối thiểu 2 giờ. Chính sách cuối cùng do API trả về khi tạo booking.</span></div><fieldset className="mt-5"><legend className="text-xs font-semibold text-brand-muted">Phương thức thanh toán cọc</legend><div className="mt-2 grid grid-cols-2 gap-2">{paymentMethods.map((method) => <button className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold ${paymentMethod === method.id ? 'border-brand-purple bg-brand-50 text-brand-700' : 'border-brand-border text-brand-muted'}`} key={method.id} onClick={() => setPaymentMethod(method.id)} type="button"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[10px] font-semibold text-brand-charcoal shadow-sm">{method.mark}</span>{method.label}</button>)}</div></fieldset><button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black" onClick={confirmDeposit} type="button"><CreditCard className="h-4 w-4" />Thanh toán cọc {formatVnd(deposit)} <ArrowRight className="h-4 w-4" /></button>{message ? <p className="mt-3 rounded-xl bg-brand-blue-pastel-soft p-3 text-xs leading-5 text-brand-blue-ink" role="status">{message}</p> : null}<p className="mt-4 text-center text-xs text-brand-muted">Đối tác dự kiến phản hồi trong vòng 10 phút</p></CustomerCard></aside>
        </div>
      </CustomerContainer>
    </main>
  )
}
