import { useState, type FormEvent } from 'react'
import {
  BadgeCheck,
  BrushCleaning,
  CalendarCheck2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Headset,
  ListChecks,
  MapPin,
  ShieldCheck,
  Shirt,
  SprayCan,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import apartmentImage from '../assets/landing-page-apartment.png'
import cleanerImage from '../assets/landing-page-cleaner.png'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { Reveal } from '../../../shared/ui/Reveal'
import {
  bookingModes,
  bookingSteps,
  faqs,
  partners,
  services,
  trustPillars,
  workflowChecklist,
  workflowSteps,
} from '../landing-content'

const containerClass = 'w-full px-6 sm:px-8 lg:px-8 xl:px-10 2xl:px-12'
const softShadow = '[box-shadow:0_4px_20px_-2px_rgba(23,25,28,0.05)]'

function CheckIcon() {
  return <Check aria-hidden="true" className="h-4 w-4 text-brand-green" strokeWidth={2.5} />
}

function LocationIcon() {
  return <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-charcoal/60" strokeWidth={1.8} />
}

function ChevronIcon() {
  return <ChevronDown aria-hidden="true" className="faq-chevron h-5 w-5 text-brand-muted transition-transform duration-200" />
}

function LandingIcon({ name }: { name: string }) {
  const commonProps = { 'aria-hidden': true, className: 'h-6 w-6', strokeWidth: 1.8 } as const

  if (name === 'home') return <BrushCleaning {...commonProps} />
  if (name === 'flask') return <SprayCan {...commonProps} />
  if (name === 'receipt') return <Shirt {...commonProps} />
  if (name === 'calendar') return <CalendarCheck2 {...commonProps} />
  if (name === 'shield') return <BadgeCheck {...commonProps} className="h-5 w-5" />
  if (name === 'clipboard') return <ClipboardCheck {...commonProps} className="h-5 w-5" />
  return <Headset {...commonProps} className="h-5 w-5" />
}

interface SearchSelectProps {
  defaultValue: string
  label: string
  name: string
  options: ReadonlyArray<{ label: string; value: string }>
}

function SearchSelect({ defaultValue, label, name, options }: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <label className="flex min-w-0 flex-col text-left text-sm font-semibold text-brand-charcoal">
      <span className="mb-2">{label}</span>
      <span className="relative">
        <select
          className="w-full min-w-0 appearance-none rounded-xl border border-brand-border bg-brand-sand/50 py-2.5 pl-3 pr-11 text-sm font-normal normal-case tracking-normal text-brand-charcoal focus:border-brand-blue-pastel-hover focus:outline-none focus:ring-1 focus:ring-brand-blue-pastel"
          defaultValue={defaultValue}
          name={name}
          onBlur={() => setIsOpen(false)}
          onChange={() => setIsOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') setIsOpen(true)
            if (event.key === 'Escape') setIsOpen(false)
          }}
          onPointerDown={() => setIsOpen((current) => !current)}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={1.8}
        />
      </span>
    </label>
  )
}

export function HeroSection() {
  const navigate = useNavigate()

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params = new URLSearchParams({
      location: String(data.get('location') ?? ''),
      date: String(data.get('date') ?? ''),
      service: String(data.get('service') ?? ''),
      page: '1',
      pageSize: '12',
    })
    navigate(`/partners?${params.toString()}`)
  }

  return (
    <section className="pb-20 pt-14 sm:pt-20 lg:py-28">
      <Reveal className={`${containerClass} grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8`}>
        <div className="flex min-w-0 flex-col items-start lg:col-span-7 lg:pr-6">
          <div className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-brand-muted">
            <span className="h-2 w-2 rounded-full bg-brand-green" />
            Nền tảng đặt giúp việc căn hộ uy tín
          </div>
          <h1 className="page-title mb-6">
            Nhà sạch hơn, thời gian cho bạn nhiều hơn.
          </h1>
          <p className="page-intro mb-10 max-w-xl">
            Chọn người giúp việc hoặc công ty phù hợp, xem lịch và đặt ca theo giờ bạn muốn.
          </p>
          <div className={`mb-6 min-w-0 w-full rounded-2xl border border-brand-border bg-white p-4 sm:p-5 ${softShadow}`} id="hero-search">
            <form className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-3" onSubmit={handleSearch}>
              <SearchSelect
                defaultValue="quan-1"
                label="Khu vực"
                name="location"
                options={[
                  { label: 'Quận 1, TP.HCM', value: 'quan-1' },
                  { label: 'Bình Thạnh', value: 'binh-thanh' },
                  { label: 'Vinhomes Central Park', value: 'vinhomes-central-park' },
                  { label: 'Quận 2, TP. Thủ Đức', value: 'quan-2' },
                  { label: 'Quận 7, Phú Mỹ Hưng', value: 'quan-7' },
                ]}
              />
              <label className="flex min-w-0 flex-col text-left text-sm font-semibold text-brand-charcoal">
                <span className="mb-2">Ngày cần làm</span>
                <input className="w-full min-w-0 rounded-xl border border-brand-border bg-brand-sand/50 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-brand-charcoal focus:border-brand-blue-pastel-hover focus:outline-none focus:ring-1 focus:ring-brand-blue-pastel" defaultValue="2026-10-28" name="date" type="date" />
              </label>
              <SearchSelect
                defaultValue="don-dep-tieu-chuan"
                label="Loại dịch vụ"
                name="service"
                options={[
                  { label: 'Dọn dẹp tiêu chuẩn', value: 'don-dep-tieu-chuan' },
                  { label: 'Vệ sinh bếp & toilet', value: 've-sinh-bep-toilet' },
                  { label: 'Giặt ủi & sắp xếp', value: 'giat-ui-sap-xep' },
                  { label: 'Dọn dẹp định kỳ', value: 'don-dep-dinh-ky' },
                ]}
              />
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 sm:col-span-3">
                <a className="text-sm font-medium text-brand-muted transition-colors hover:text-brand-charcoal" href="#how-it-works">Xem cách hoạt động →</a>
                <button className="inline-flex w-full items-center justify-center rounded-xl bg-brand-blue-pastel px-7 py-3 text-sm font-semibold text-brand-charcoal shadow-sm transition-colors hover:bg-brand-blue-pastel-hover sm:w-auto" type="submit">Tìm đối tác</button>
              </div>
            </form>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-brand-muted">
            <span className="inline-flex items-center gap-1.5"><CheckIcon />Hồ sơ được xét duyệt</span>
            <span className="inline-flex items-center gap-1.5"><CheckIcon />Giá hiển thị minh bạch trước khi đặt</span>
          </div>
        </div>
        <div className="relative lg:col-span-5">
          <div className={`relative overflow-hidden rounded-3xl border border-brand-border bg-white ${softShadow}`}>
            <img alt="Nhân viên vệ sinh đang lau bàn trong căn hộ sáng và gọn gàng" className="h-[460px] w-full object-cover object-center sm:h-[520px]" decoding="async" fetchPriority="high" loading="eager" src={cleanerImage} />
            <div className={`absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-2xl border border-brand-border bg-white/95 px-4 py-3 backdrop-blur-sm sm:right-auto ${softShadow}`}>
              <span className="h-3 w-3 shrink-0 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
              <div><p className="text-xs font-bold text-brand-charcoal">Lịch rảnh hôm nay</p><p className="text-xs font-medium text-brand-muted">Sẵn sàng nhận ca</p></div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export function ServicesSection() {
  return (
    <section className="content-section bg-white" id="services">
      <Reveal className={containerClass}>
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="section-title mx-auto mb-5">Chọn việc bạn cần hỗ trợ</h2>
          <p className="section-intro mx-auto">Dịch vụ linh hoạt theo từng nhu cầu cụ thể của căn hộ, đặt theo block giờ rõ ràng.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <article className="landing-card group flex flex-col justify-between rounded-2xl bg-brand-sand p-7 hover:[box-shadow:0_12px_32px_-4px_rgba(23,25,28,0.08)]" key={service.title}>
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-purple shadow-xs transition-transform group-hover:scale-105"><LandingIcon name={service.icon} /></div>
                <h3 className="mb-3 text-xl font-semibold text-brand-charcoal">{service.title}</h3>
                <p className="mb-7 text-base leading-relaxed text-brand-muted">{service.description}</p>
              </div>
              <a className="flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal transition-colors group-hover:text-brand-blue-ink" href="#partners">Khám phá <span aria-hidden="true">→</span></a>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

export function PartnerSection() {
  return (
    <section className="content-section" id="partners">
      <Reveal className={containerClass}>
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="section-title mx-auto mb-5">Tìm người làm phù hợp với lịch của bạn</h2>
          <p className="section-intro mx-auto">Freelancer đã xác thực lịch rảnh hoặc công ty chuyên nghiệp hỗ trợ theo yêu cầu.</p>
          <div className="mt-6">
            <Link className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue-ink transition-colors hover:text-brand-charcoal" to="/partners">Xem tất cả đối tác →</Link>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {partners.map((partner) => (
            <article className={`landing-card relative flex flex-col justify-between rounded-2xl border border-brand-border bg-white p-6 ${softShadow}`} key={partner.name}>
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-brand-sand text-base font-semibold text-brand-purple">{partner.initials}</div>
                  {partner.badge ? (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${partner.company ? 'border border-brand-border bg-brand-sand text-brand-charcoal' : 'bg-brand-purple/10 text-brand-purple'}`}>{partner.badge}</span>
                  ) : null}
                </div>
                <h3 className="mb-1 text-xl font-semibold text-brand-charcoal">{partner.name}</h3>
                <p className="mb-4 text-sm text-brand-muted">{partner.type}</p>
                <div className="mb-4 flex items-center gap-1.5 text-sm text-brand-muted"><LocationIcon /><span>{partner.location}</span></div>
                <div className="mb-6 rounded-xl border border-brand-border bg-brand-sand p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${partner.company ? 'bg-brand-purple' : 'bg-brand-green'}`} />
                    <span className="text-xs font-semibold text-brand-charcoal">{partner.statusLabel}</span>
                  </div>
                  <p className={`${partner.company ? 'text-xs leading-relaxed' : 'text-sm'} pl-4 font-medium text-brand-charcoal`}>{partner.status}</p>
                </div>
              </div>
              <div>
                <div className="mb-4 flex items-baseline justify-between border-t border-brand-border pt-4">
                  <span className="text-xs font-medium text-brand-muted">{partner.footerLabel}</span>
                  <span className={`${partner.company ? 'text-sm' : 'text-base'} font-bold text-brand-charcoal`}>{partner.footerValue}{partner.footerSuffix ? <span className="text-xs font-normal text-brand-muted">{partner.footerSuffix}</span> : null}</span>
                </div>
                <Link className="block w-full rounded-xl border border-brand-charcoal bg-white px-4 py-2.5 text-center text-sm font-semibold text-brand-charcoal transition-colors hover:bg-brand-charcoal hover:text-white" to="/partners">{partner.action}</Link>
              </div>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

function BookingModeIcon({ mode }: { mode: (typeof bookingModes)[number]['id'] }) {
  const className = 'h-5 w-5'

  if (mode === 'tasks') return <ListChecks aria-hidden="true" className={className} strokeWidth={1.8} />
  if (mode === 'time') return <Clock3 aria-hidden="true" className={className} strokeWidth={1.8} />
  return <CalendarCheck2 aria-hidden="true" className={className} strokeWidth={1.8} />
}

export function BookingModeSection() {
  const [selectedModeId, setSelectedModeId] = useState<(typeof bookingModes)[number]['id']>('tasks')
  const selectedMode = bookingModes.find((mode) => mode.id === selectedModeId) ?? bookingModes[0]

  return (
    <section className="content-section bg-white" id="booking-options">
      <Reveal className={containerClass}>
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="section-title mx-auto mb-5">Đặt dịch vụ theo cách phù hợp với bạn</h2>
          <p className="section-intro mx-auto">Bắt đầu từ công việc, quỹ thời gian hoặc lịch sinh hoạt — không bị giới hạn bởi loại hình nơi ở.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div aria-label="Cách đặt dịch vụ" className="space-y-3 lg:col-span-5" role="tablist">
            {bookingModes.map((mode) => {
              const selected = mode.id === selectedModeId
              return (
                <button
                  aria-controls="booking-mode-panel"
                  aria-selected={selected}
                  className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all ${selected ? `border-brand-blue-pastel-hover bg-brand-blue-pastel text-brand-charcoal ${softShadow}` : 'border-brand-border bg-brand-sand hover:border-brand-blue-pastel-hover hover:bg-brand-blue-pastel-soft'}`}
                  id={`booking-mode-${mode.id}`}
                  key={mode.id}
                  onClick={() => setSelectedModeId(mode.id)}
                  role="tab"
                  type="button"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-white/55 text-brand-blue-ink' : 'bg-white text-brand-blue-ink'}`}><BookingModeIcon mode={mode.id} /></span>
                  <span><span className="block text-base font-semibold text-brand-charcoal">{mode.label}</span><span className={`mt-1 block text-sm leading-relaxed ${selected ? 'text-brand-blue-ink' : 'text-brand-muted'}`}>{mode.shortDescription}</span></span>
                </button>
              )
            })}
          </div>

          <div
            aria-labelledby={`booking-mode-${selectedMode.id}`}
            className={`flex min-h-[360px] flex-col justify-between overflow-hidden rounded-3xl bg-brand-charcoal p-7 text-white sm:p-10 lg:col-span-7 ${softShadow}`}
            id="booking-mode-panel"
            role="tabpanel"
          >
            <div>
              <span className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white"><BookingModeIcon mode={selectedMode.id} /></span>
              <p className="mb-3 text-sm font-semibold text-brand-green">{selectedMode.label}</p>
              <h3 className="mb-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.025em] text-white">{selectedMode.title}</h3>
              <p className="max-w-2xl text-base leading-relaxed text-white/65">{selectedMode.description}</p>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {selectedMode.highlights.map((highlight) => (
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/90" key={highlight}><CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-green" />{highlight}</div>
                ))}
              </div>
            </div>
            <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/55">Chi tiết công việc và báo giá được xác nhận trước khi đặt.</p>
              <a className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-charcoal transition-colors hover:bg-brand-sand" href="#hero-search">Bắt đầu tìm đối tác <span aria-hidden="true" className="ml-2">→</span></a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export function HowItWorksSection() {
  return (
    <section className="content-section bg-white" id="how-it-works">
      <Reveal className={containerClass}>
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="section-title mx-auto mb-5">Đặt lịch nhanh chóng trong 3 bước</h2>
          <p className="section-intro mx-auto">Quy trình gọn gàng, chủ động và minh bạch trên từng thao tác.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {bookingSteps.map((step) => (
            <article className="relative rounded-2xl bg-brand-sand p-8" key={step.number}>
              <span className="mb-5 block text-3xl font-semibold text-brand-purple/30">{step.number}</span>
              <h3 className="mb-4 text-2xl font-semibold leading-tight text-brand-charcoal">{step.title}</h3>
              <p className="text-base leading-relaxed text-brand-muted">{step.description}</p>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

export function TransparentWorkflowSection() {
  const [completedItems, setCompletedItems] = useState<string[]>(workflowChecklist.slice(0, 3).map((item) => item.id))
  const progress = Math.round((completedItems.length / workflowChecklist.length) * 100)

  function toggleChecklistItem(itemId: string) {
    setCompletedItems((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    )
  }

  return (
    <section className="content-section" id="workflow">
      <Reveal className={containerClass}>
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-purple"><Camera aria-hidden="true" className="h-4 w-4" />Theo dõi ca dọn</div>
          <h2 className="section-title mx-auto mb-5">Mỗi đầu việc đều có tiến độ rõ ràng</h2>
          <p className="section-intro mx-auto">Thử tích chọn checklist để xem cách khách hàng theo dõi và nghiệm thu một ca dọn trên ABSTRICT.</p>
        </div>
        <div className={`grid grid-cols-1 gap-8 rounded-3xl border border-brand-border bg-white p-6 lg:grid-cols-12 lg:p-8 ${softShadow}`}>
          <div className="relative overflow-hidden rounded-2xl lg:col-span-7">
            <img alt="Căn hộ hiện đại sạch sẽ với ánh nắng ấm và cây xanh" className="h-full min-h-[420px] w-full object-cover" decoding="async" loading="lazy" src={apartmentImage} />
            <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-brand-charcoal/85 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-brand-green" />Ảnh bàn giao sau ca
            </div>
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/50 bg-white/90 p-4 backdrop-blur-sm sm:inset-x-6 sm:bottom-6">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div><p className="text-sm font-semibold text-brand-charcoal">Căn hộ 2 phòng ngủ</p><p className="text-xs text-brand-muted">Ảnh được lưu cùng checklist của ca dọn</p></div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-green"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />Đã ghi nhận</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between lg:col-span-5">
            <div>
              <div className="mb-6">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-purple"><ListChecks aria-hidden="true" className="h-4 w-4" />Checklist minh họa</span>
                <h3 className="text-2xl font-semibold text-brand-charcoal">Tiến độ thực hiện ca dọn</h3>
              </div>
              <div className="space-y-3">
                {workflowChecklist.map((item) => {
                  const completed = completedItems.includes(item.id)
                  return (
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-brand-border bg-brand-sand p-4 transition-colors hover:border-brand-blue-pastel-hover" key={item.id}>
                      <input checked={completed} className="mt-1 h-4 w-4 accent-brand-blue-pastel-hover" onChange={() => toggleChecklistItem(item.id)} type="checkbox" />
                      <span className="flex-1"><span className="block text-sm font-semibold text-brand-charcoal">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-brand-muted">{item.detail}</span></span>
                      <span className={`text-xs font-semibold ${completed ? 'text-brand-green' : 'text-brand-muted'}`}>{completed ? 'Hoàn tất' : 'Đang chờ'}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-brand-border bg-brand-sand p-5">
              <div className="mb-3 flex items-center justify-between text-sm"><span className="font-semibold text-brand-charcoal">Tiến độ hoàn tất</span><strong className="text-brand-blue-ink">{progress}%</strong></div>
              <div aria-label={`Tiến độ ${progress}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="h-2.5 overflow-hidden rounded-full bg-brand-border" role="progressbar"><div className="h-full rounded-full bg-brand-blue-pastel-hover transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
              <p className="mt-3 text-xs leading-relaxed text-brand-muted">Khách hàng đối chiếu checklist và ảnh bàn giao trước khi xác nhận hoàn tất.</p>
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {workflowSteps.map((step, index) => (
            <div className="flex gap-4 rounded-2xl bg-white p-5" key={step.title}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-sand text-sm font-semibold text-brand-purple">{index + 1}</div>
              <div><h3 className="mb-1 text-base font-semibold text-brand-charcoal">{step.title}</h3><p className="text-sm leading-relaxed text-brand-muted">{step.description}</p></div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

function TrustCommitmentBanner() {
  return (
    <div className={`mb-16 rounded-3xl border border-brand-border bg-brand-sand p-6 sm:p-8 ${softShadow}`}>
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-xl items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-purple text-white"><ShieldCheck aria-hidden="true" className="h-7 w-7" strokeWidth={1.8} /></div>
          <div><h3 className="text-xl font-semibold text-brand-charcoal">An tâm trong từng bước đặt và nghiệm thu</h3><p className="mt-2 text-sm leading-relaxed text-brand-muted">Thông tin đối tác, chi phí, checklist và kênh hỗ trợ được hiển thị rõ để bạn chủ động quyết định.</p></div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {['Xét duyệt hồ sơ', 'Giá xác nhận trước', 'Có bằng chứng ca dọn'].map((label) => (
            <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-brand-charcoal" key={label}><CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-green" />{label}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TrustAndFaqSection() {
  return (
    <section className="content-section bg-white" id="trust-and-faq">
      <Reveal className={containerClass}>
        <TrustCommitmentBanner />
        <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          {trustPillars.map((pillar) => (
            <article className="rounded-2xl bg-brand-sand p-7" key={pillar.title}>
              <div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white ${pillar.accent === 'green' ? 'text-brand-green' : pillar.accent === 'purple' ? 'text-brand-purple' : 'text-brand-charcoal'}`}><LandingIcon name={pillar.icon} /></div>
              <h3 className="mb-3 text-xl font-semibold text-brand-charcoal">{pillar.title}</h3>
              <p className="text-base leading-relaxed text-brand-muted">{pillar.description}</p>
            </article>
          ))}
        </div>
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="section-title mx-auto mb-5">Câu hỏi thường gặp</h2>
            <p className="section-intro mx-auto">Những thắc mắc phổ biến về việc đặt lịch và phục vụ căn hộ.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details className="group cursor-pointer rounded-2xl border border-brand-border bg-brand-sand p-5" key={faq.question}>
                <summary className="flex list-none select-none items-center justify-between text-lg font-semibold text-brand-charcoal"><span>{faq.question}</span><ChevronIcon /></summary>
                <p className="mt-4 border-t border-brand-border/60 pt-5 text-base leading-relaxed text-brand-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export function LandingCallToAction() {
  return (
    <section className="content-section">
      <Reveal className={containerClass}>
        <div className="relative overflow-hidden rounded-3xl bg-brand-charcoal p-10 text-center text-white sm:p-16">
          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="mb-6 text-3xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-5xl">Sẵn sàng để căn nhà được chăm sóc chu đáo?</h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg font-normal leading-relaxed text-white/70">Trải nghiệm đặt người giúp việc căn hộ minh bạch, nhanh chóng và chuẩn xác ngay hôm nay.</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a className="inline-flex w-full items-center justify-center rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-brand-charcoal transition-colors hover:bg-brand-sand sm:w-auto" href="#hero-search">Tìm người làm ngay</a>
              <Link className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white/90 transition-colors hover:border-white/40 hover:text-white sm:w-auto" to="/partners/register">Đăng ký làm đối tác (Dành cho Freelancer & Công ty) →</Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-brand-border bg-white py-14">
      <div className={containerClass}>
        <div className="flex flex-col items-start justify-between gap-8 border-b border-brand-border pb-10 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <BrandLogo size="sm" />
            <p className="max-w-sm text-xs text-brand-muted">Nền tảng kết nối người giúp việc và công ty vệ sinh căn hộ chuyên nghiệp.</p>
          </div>
          <nav aria-label="Điều hướng chân trang" className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-brand-muted">
            <a className="transition-colors hover:text-brand-charcoal" href="#services">Dịch vụ</a>
            <a className="transition-colors hover:text-brand-charcoal" href="#how-it-works">Cách hoạt động</a>
            <a className="transition-colors hover:text-brand-charcoal" href="#trust-and-faq">Hỗ trợ</a>
            <a className="transition-colors hover:text-brand-charcoal" href="#terms">Điều khoản dịch vụ</a>
            <a className="transition-colors hover:text-brand-charcoal" href="#privacy">Chính sách riêng tư</a>
          </nav>
        </div>
        <div className="flex flex-col items-center justify-between pt-8 text-xs text-brand-muted sm:flex-row">
          <p>© 2026 ABSTRICT Platform. Mọi quyền được bảo lưu.</p>
          <p className="mt-2 font-medium sm:mt-0">Tiêu chuẩn minh bạch & dịch vụ căn hộ chuẩn mực</p>
        </div>
      </div>
    </footer>
  )
}
