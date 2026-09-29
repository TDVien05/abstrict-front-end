import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, BadgeCheck, Bookmark, FileHeart, Fingerprint, Gavel, Info, LockKeyhole, BriefcaseMedical, RefreshCw, ShieldCheck, Wallet, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { scanCccd } from '../../features/partner/api/kyc-ocr'
import { KycFaceStatus, KycField, KycSection, KycUpload, kycFocus, kycInput } from '../../features/partner/components/KycPrimitives'
import { KycSidebar } from '../../features/partner/components/KycSidebar'
import { partnerRegistrationSchema, type PartnerRegistrationValues } from '../../features/partner/registration-schema'
import { Button } from '../../shared/ui/Button'
import frontExample from '../../features/partner/assets/identity-front-example.jpg'
import backExample from '../../features/partner/assets/identity-back-example.jpg'
import portraitExample from '../../features/partner/assets/portrait-example.jpg'

const areas = [
  ['Vinhomes Central Park', 'Bình Thạnh'],
  ['Vinhomes Golden River', 'Quận 1'],
  ['Masteri Thảo Điền', 'Thủ Đức / Quận 2'],
  ['Empire City & Metropole', 'Thủ Thiêm'],
  ['Phú Mỹ Hưng Midtown', 'Quận 7'],
  ['The Sun Avenue', 'An Phú, Quận 2'],
]
const skills = [
  ['Dọn dẹp tiêu chuẩn căn hộ cao cấp', 'Lau chùi sàn gỗ, hút bụi thảm, khử khuẩn bề mặt nội thất'],
  ['Tẩy cặn kính nhà tắm & thiết bị vệ sinh cao cấp', 'Xử lý cặn canxi vách tắm kính, bồn sứ, sen vòi mạ crom'],
  ['Giặt sấy rèm, đệm nệm & sofa da/vải nỉ', 'Sử dụng máy phun hút và thiết bị vệ sinh chuyên dụng'],
  ['Nấu ăn theo khẩu vị gia đình & thực đơn dinh dưỡng', 'Nấu theo thực đơn Á/Âu, kiểm soát dinh dưỡng và vệ sinh thực phẩm'],
]
const steps = [
  ['Thông tin cá nhân & Khu vực', 'Thông tin cơ bản'],
  ['CCCD gắn chip & Face ID', 'eKYC sinh trắc'],
  ['Sức khỏe & Lý lịch tư pháp', 'Hồ sơ bổ sung'],
  ['Kỹ năng & Tài khoản nhận tiền', 'Thù lao'],
]
const checkboxClass = 'mt-1 h-4 w-4 shrink-0 accent-brand-blue-pastel-hover'

function normalizeDate(value?: string) {
  if (!value) return undefined
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  return trimmed
}

function normalizeGender(value?: string) {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (['nam', 'male', 'm'].includes(normalized)) return 'Nam'
  if (['nữ', 'nu', 'female', 'f'].includes(normalized)) return 'Nữ'
  return undefined
}

export function PartnerRegistrationPage() {
  const [message, setMessage] = useState('')
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const form = useForm<PartnerRegistrationValues>({
    resolver: zodResolver(partnerRegistrationSchema),
    defaultValues: { areas: [], skills: [], gender: '', consent: false },
  })
  const { register, handleSubmit, control, setValue, formState: { errors } } = form
  const values = useWatch({ control })
  const frontFile = values.front?.[0]
  const backFile = values.back?.[0]
  const scanKey = frontFile && backFile ? `${frontFile.name}:${frontFile.lastModified}:${backFile.name}:${backFile.lastModified}` : null
  const appliedScanRef = useRef<string | null>(null)
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const completed = [
    Boolean(values.fullName && values.phone && values.birthDate && values.permanentAddress && values.currentAddress && values.areas?.length),
    Boolean(values.front?.length && values.back?.length && values.portrait?.length),
    Boolean(values.health?.length && values.judicial?.length),
    Boolean(values.skills?.length && values.bank && values.bankAccount && values.accountName && values.consent),
  ]
  const progress = completed.filter(Boolean).length * 25
  const activeStep = completed.findIndex((done) => !done)
  const currentStep = selectedStep ?? (activeStep === -1 ? steps.length - 1 : activeStep)
  const barProgress = (currentStep + 1) * 25

  useEffect(() => {
    const sections = steps.map((_, index) => document.getElementById(`kyc-${index + 1}`)).filter((section): section is HTMLElement => section !== null)
    if (!sections.length) return

    let frame = 0
    function update() {
      frame = 0
      const threshold = window.innerWidth >= 1024 ? 220 : 140
      let index = 0
      sections.forEach((section, sectionIndex) => {
        if (section.getBoundingClientRect().top <= threshold) index = sectionIndex
      })
      setSelectedStep((value) => (value === index ? value : index))
    }
    function handleScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!frontFile || !backFile || !scanKey || appliedScanRef.current === scanKey) return
    appliedScanRef.current = scanKey
    setScanStatus('scanning')
    scanCccd(frontFile, backFile)
      .then((result) => {
        const fillOptions = { shouldDirty: true, shouldValidate: true }
        const fill = (field: 'fullName' | 'permanentAddress' | 'currentAddress', value?: string) => {
          const trimmed = value?.trim()
          if (trimmed) setValue(field, trimmed, fillOptions)
        }
        fill('fullName', result.fullName)
        const dateOfBirth = normalizeDate(result.dateOfBirth)
        if (dateOfBirth) setValue('birthDate', dateOfBirth, fillOptions)
        const gender = normalizeGender(result.gender)
        if (gender) setValue('gender', gender, fillOptions)
        fill('permanentAddress', result.permanentAddress)
        fill('currentAddress', result.currentAddress || result.permanentAddress)
        setScanStatus('done')
      })
      .catch(() => {
        appliedScanRef.current = null
        setScanStatus('error')
      })
  }, [backFile, frontFile, scanKey, setValue])

  const ocrNote = (
    <span className="inline-flex items-center gap-1">
      {scanStatus === 'scanning'
        ? <><RefreshCw aria-hidden className="h-3.5 w-3.5 shrink-0 animate-spin" />Đang quét CCCD…</>
        : <><Zap aria-hidden className="h-3.5 w-3.5 shrink-0" />{scanStatus === 'done' ? 'Đã quét CCCD' : scanStatus === 'error' ? 'Quét CCCD thất bại' : 'OCR tự động'}</>}
    </span>
  )

  return (
    <>
      <main className="w-full px-6 py-10 sm:px-8 sm:py-14 lg:px-10 2xl:px-12">
        <header className="mb-12 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-brand-blue-ink">Cổng thẩm định đối tác</span>
              <span className="text-brand-muted">Mã hồ sơ: Chưa cấp</span>
            </div>
            <h1 className="page-title">Đăng ký & định danh đối tác</h1>
            <p className="page-intro mt-6">Hoàn thiện hồ sơ giúp việc căn hộ ABSTRICT. Chuẩn bị thông tin cá nhân, giấy tờ định danh và tài khoản nhận thù lao.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start rounded-xl bg-white p-4 lg:self-end">
            <ShieldCheck aria-hidden className="h-9 w-9 text-brand-blue-ink" />
            <div><p className="text-sm text-brand-muted">Quy trình thẩm định</p><p className="font-semibold">Định danh & an toàn</p></div>
          </div>
        </header>

        <nav aria-label="Các phần hồ sơ" className="mb-8 rounded-2xl bg-white p-4 sm:p-6 lg:sticky lg:top-16 lg:z-30 lg:shadow-md">
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, caption], index) => (
              <li key={title}>
                <a href={`#kyc-${index + 1}`} aria-current={currentStep === index ? 'step' : undefined} onClick={() => setSelectedStep(index)} className={`flex h-full items-center gap-3 rounded-xl p-2 ${kycFocus} ${index <= currentStep || completed[index] ? 'bg-brand-blue-pastel-soft' : ''}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-semibold ${index <= currentStep || completed[index] ? 'bg-brand-blue-pastel text-brand-charcoal' : 'bg-brand-sand'}`}>{index + 1}</span>
                  <span className="min-w-0"><span className="mb-1 block text-sm text-brand-muted">Bước {index + 1} · {completed[index] ? 'Đã nhập' : caption}</span><span className="block text-sm font-semibold">{title}</span></span>
                </a>
              </li>
            ))}
          </ol>
          <progress aria-label="Tiến độ điền hồ sơ" value={barProgress} max={100} className="mt-5 block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-brand-sand accent-brand-blue-pastel [&::-webkit-progress-bar]:bg-brand-sand [&::-webkit-progress-value]:bg-brand-blue-pastel [&::-moz-progress-bar]:bg-brand-blue-pastel" />
        </nav>

        <FormProvider {...form}>
          <div className="grid items-start gap-8 lg:grid-cols-12">
            <form noValidate className="min-w-0 space-y-8 lg:col-span-8" onSubmit={handleSubmit(() => setMessage('Hồ sơ đã đủ thông tin để kiểm tra. Chức năng gửi thẩm định chưa được kết nối; hồ sơ chưa được gửi.'), () => setMessage('Vui lòng kiểm tra các trường được đánh dấu trước khi gửi.'))}>
              <KycSection id="kyc-1" title="1. Thông tin cá nhân & khu vực nhận ca" note="Bắt buộc" icon={BadgeCheck}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <KycField name="fullName" label="Họ và tên khai sinh" autoComplete="name" hint="Trùng khớp với CCCD và tài khoản ngân hàng" />
                  <KycField name="phone" label="Số điện thoại liên lạc chính" type="tel" autoComplete="tel" placeholder="0912345678" hint="Dùng để liên hệ và xác thực tài khoản" />
                  <KycField name="birthDate" label="Ngày tháng năm sinh" type="date" />
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold">Giới tính</legend>
                    <div className="grid grid-cols-2 gap-2">{['Nữ', 'Nam'].map((gender) => <label key={gender} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-sand"><input className="accent-brand-blue-pastel-hover" type="radio" value={gender} {...register('gender')} />{gender}</label>)}</div>
                  </fieldset>
                  <div className="sm:col-span-2"><KycField name="permanentAddress" label="Địa chỉ thường trú (theo CCCD)" /></div>
                  <div className="sm:col-span-2"><KycField name="currentAddress" label="Địa chỉ tạm trú hiện tại" autoComplete="street-address" /></div>
                </div>
                <fieldset className="mt-6">
                  <legend className="mb-3 font-semibold">Cụm khu đô thị & tổ hợp căn hộ ưu tiên nhận ca *</legend>
                  <div className="grid gap-3 sm:grid-cols-3">{areas.map(([area, district]) => <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-brand-sand p-3 has-checked:bg-brand-blue-pastel-soft" key={area}><input className={checkboxClass} type="checkbox" value={area} {...register('areas')} /><span><span className="block text-sm font-semibold">{area}</span><span className="mt-1 block text-sm text-brand-muted">{district}</span></span></label>)}</div>
                  {errors.areas && <p className="mt-2 text-sm text-red-700">{errors.areas.message}</p>}
                </fieldset>
              </KycSection>

              <KycSection id="kyc-2" title="2. Tải giấy tờ CCCD & Xác thực sinh trắc học" note={ocrNote} icon={Fingerprint} referenceLayout>
                <div className="mb-6 grid gap-6 md:grid-cols-2">
                  <KycUpload name="front" label="Mặt trước CCCD gắn chip" example={frontExample}>
                    <dl className="space-y-0.5 rounded-lg bg-brand-sand p-2.5 text-xs"><div className="flex items-center justify-between gap-2"><dt className="shrink-0 text-brand-muted">Số thẻ CCCD:</dt><dd className="truncate font-semibold">Chưa nhận diện</dd></div><div className="flex items-center justify-between gap-2"><dt className="shrink-0 text-brand-muted">Hạn sử dụng:</dt><dd className="truncate font-semibold">—</dd></div></dl>
                  </KycUpload>
                  <KycUpload name="back" label="Mặt sau CCCD gắn chip" example={backExample}>
                    <dl className="space-y-0.5 rounded-lg bg-brand-sand p-2.5 text-xs"><div className="flex items-center justify-between gap-2"><dt className="shrink-0 text-brand-muted">Ngày cấp:</dt><dd className="truncate font-semibold">—</dd></div><div className="flex items-center justify-between gap-2"><dt className="shrink-0 text-brand-muted">Nơi cấp:</dt><dd className="truncate font-semibold">Chưa nhận diện</dd></div></dl>
                  </KycUpload>
                </div>
                {scanStatus !== 'idle' && (
                  <p className={`mb-6 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${scanStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-brand-blue-pastel-soft text-brand-blue-ink'}`} role="status">
                    {scanStatus === 'scanning' ? <RefreshCw aria-hidden className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : <Zap aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>
                      {scanStatus === 'scanning' ? 'Đang quét CCCD và tự động điền thông tin vào Phần 1…' : null}
                      {scanStatus === 'done' ? 'Đã quét CCCD và tự điền họ tên, ngày sinh, giới tính, địa chỉ vào Phần 1. Vui lòng kiểm tra lại.' : null}
                      {scanStatus === 'error' ? 'Không quét được CCCD. Vui lòng thử lại hoặc nhập thông tin thủ công.' : null}
                    </span>
                  </p>
                )}
                <div className="flex flex-col items-center gap-5 rounded-xl bg-brand-blue-pastel-soft p-5 md:flex-row">
                  <div className="w-28 shrink-0"><KycUpload name="portrait" label="Ảnh chân dung" example={portraitExample} compact /></div>
                  <KycFaceStatus />
                </div>
              </KycSection>

              <KycSection id="kyc-3" title="3. Giấy khám sức khỏe & Lý lịch tư pháp số 2" note="Bắt buộc theo chuẩn 5 sao" icon={FileHeart} referenceLayout>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-brand-sand p-4"><KycUpload name="health" label="Giấy khám sức khỏe định kỳ" icon={BriefcaseMedical} documentRow /><p className="text-xs leading-relaxed text-brand-muted">Cung cấp giấy khám sức khỏe có kết luận đủ điều kiện làm việc và còn hiệu lực.</p></div>
                  <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-brand-sand p-4"><KycUpload name="judicial" label="Phiếu Lý lịch tư pháp số 2" icon={Gavel} badge="Tích hợp VNeID" /><p className="text-xs leading-relaxed text-brand-muted">Có thể sử dụng phiếu điện tử tải trực tiếp từ ứng dụng VNeID của Bộ Công An. Hồ sơ được kiểm tra khi gửi thẩm định.</p></div>
                </div>
              </KycSection>

              <KycSection id="kyc-4" title="4. Kỹ năng dịch vụ & tài khoản nhận thù lao" note="Quyết toán ca" icon={Wallet}>
                <fieldset>
                  <legend className="mb-4 font-semibold">Kỹ năng dịch vụ đã qua đào tạo / thành thạo *</legend>
                  <p className="mb-4 text-sm text-brand-muted">Chọn tối thiểu 1 nghiệp vụ</p>
                  <div className="grid gap-3 sm:grid-cols-2">{skills.map(([skill, detail]) => <label key={skill} className="flex cursor-pointer items-start gap-3 rounded-lg bg-brand-sand p-4 has-checked:bg-brand-blue-pastel-soft"><input className={checkboxClass} type="checkbox" value={skill} {...register('skills')} /><span><span className="block text-sm font-semibold">{skill}</span><span className="mt-1 block text-sm text-brand-muted">{detail}</span></span></label>)}</div>
                  {errors.skills && <p className="mt-2 text-sm text-red-700">{errors.skills.message}</p>}
                </fieldset>
                <div className="mt-8">
                  <h3 className="mb-4 font-semibold">Tài khoản ngân hàng liên kết nhận thù lao</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="min-w-0"><label className="mb-2 block text-sm font-semibold" htmlFor="bank">Ngân hàng thụ hưởng *</label><select id="bank" className={kycInput} {...register('bank')} aria-invalid={Boolean(errors.bank)}><option value="">Chọn ngân hàng</option>{['Vietcombank', 'Techcombank', 'MBBank', 'ACB', 'BIDV', 'VietinBank', 'VPBank', 'Sacombank'].map((bank) => <option key={bank}>{bank}</option>)}</select>{errors.bank && <p className="mt-2 text-sm text-red-700">{errors.bank.message}</p>}</div>
                    <KycField name="bankAccount" label="Số tài khoản" inputMode="numeric" />
                    <KycField name="accountName" label="Tên chủ tài khoản" />
                  </div>
                  <p className="mt-4 flex items-start gap-2 text-sm text-brand-muted"><Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue-ink" />Tên chủ tài khoản cần trùng khớp với tên trên CCCD để đối soát thù lao.</p>
                </div>
              </KycSection>

              <section aria-label="Cam kết và gửi hồ sơ" className="overflow-hidden rounded-2xl bg-white">
                <div className="p-6"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className={checkboxClass} {...register('consent')} /><span className="text-sm">Tôi cam kết thông tin, hình ảnh căn cước công dân và giấy tờ cung cấp là chính xác, trung thực. Tôi đồng ý cho ABSTRICT đối soát định danh phục vụ công tác thẩm định hồ sơ và điều phối ca làm việc.</span></label>{errors.consent && <p className="mt-3 text-sm text-red-700">{errors.consent.message}</p>}</div>
                <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-blue-pastel-soft p-6">
                  <p className="flex items-center gap-2 text-sm text-brand-blue-ink"><LockKeyhole aria-hidden className="h-4 w-4 shrink-0" />Hồ sơ chưa được gửi thẩm định</p>
                  <div className="flex w-full flex-wrap gap-3 sm:w-auto"><Button variant="transparent" onClick={() => setMessage('Chức năng lưu bản nháp chưa được kết nối. Thông tin chỉ được giữ trong trang hiện tại.')}><Bookmark aria-hidden className="mr-2 h-4 w-4" />Lưu bản nháp</Button><Button variant="dark" type="submit">Gửi hồ sơ thẩm định KYC<ArrowRight aria-hidden className="ml-2 h-4 w-4" /></Button></div>
                </div>
                {message && <p role="status" className="p-6 text-sm text-brand-blue-ink">{message}</p>}
              </section>
              <p className="text-sm text-brand-muted">Biểu mẫu xem trước. Thông tin và tệp chỉ được giữ trong trang hiện tại; ảnh mẫu không được dùng làm giấy tờ xác minh.</p>
            </form>
            <KycSidebar progress={progress} documentsSelected={completed[2]} />
          </div>
        </FormProvider>
      </main>
      <footer className="mt-10 border-t border-brand-border bg-white">
        <div className="flex w-full flex-col justify-between gap-5 px-6 py-8 text-sm text-brand-muted sm:px-8 lg:flex-row lg:px-10 2xl:px-12">
          <p>© {new Date().getFullYear()} ABSTRICT. Dịch vụ chăm sóc & giúp việc căn hộ.</p>
          <div className="flex flex-wrap items-center gap-5"><a href="mailto:support@abstrict.vn">Trung tâm trợ giúp</a><Link to="/partners/register">Gia nhập đối tác</Link><span className="text-brand-charcoal">Cổng đối tác ABSTRICT</span></div>
        </div>
      </footer>
    </>
  )
}
