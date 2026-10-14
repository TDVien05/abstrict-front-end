import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Check, FileText, Upload } from 'lucide-react'
import {
  companyDocumentMaxBytes,
  companyDocumentSpecs,
  companyErrorMessage,
  companyStatusLabels,
  documentStatusLabels,
  openDocumentInNewTab,
  workforceSizeLabels,
  type CompanyDocumentType,
  type CompanyOnboardingStep,
  type CompanyProfile,
  type CompanyWorkforceSize,
} from '../../entities/company'
import { useServiceAreas } from '../../features/customer/api/addresses'
import {
  companyDocumentContentPath,
  useCompanyOnboarding,
  useSaveCompanyProfile,
  useSaveCompanyRepresentative,
  useSaveCompanyServiceAreas,
  useSubmitCompanyOnboarding,
  useUploadCompanyDocument,
  type CompanyOnboarding,
  type SaveCompanyRepresentativeRequest,
} from '../../features/partner/api/company-onboarding'
import { PartnerPage, PartnerPanel, partnerInputBlue } from '../../features/partner/components/PartnerPrimitives'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateTime } from '../../shared/lib/vn-time'
import { Button } from '../../shared/ui/Button'
import { Select } from '../../shared/ui/Select'

type FormStep = 'Company' | 'Representative' | 'ServiceAreas' | 'Documents' | 'Submit'

const steps: { key: FormStep; label: string }[] = [
  { key: 'Company', label: 'Thông tin pháp nhân' },
  { key: 'Representative', label: 'Người đại diện' },
  { key: 'ServiceAreas', label: 'Khu vực nhận ca' },
  { key: 'Documents', label: 'Giấy tờ' },
  { key: 'Submit', label: 'Gửi duyệt' },
]

const documentOrder = Object.keys(companyDocumentSpecs) as CompanyDocumentType[]
const labelClass = 'block text-sm font-semibold'
const inputClass = `${partnerInputBlue} mt-2 font-normal disabled:bg-slate-100 disabled:text-brand-muted`
const errorClass = 'rounded-xl bg-red-50 p-3 text-sm text-red-700'

interface StepProps {
  onboarding: CompanyOnboarding
  /** Sau khi lưu, trang đi theo `currentStep` mà server vừa trả. */
  onSaved: () => void
}

function isFormStep(step: CompanyOnboardingStep): step is FormStep {
  return steps.some((item) => item.key === step)
}

function documentTypesOf(onboarding: CompanyOnboarding) {
  return documentOrder.filter((type) => onboarding.requiredDocumentTypes.includes(type) || onboarding.documents.some((document) => document.type === type))
}

function stepDone(onboarding: CompanyOnboarding, step: FormStep) {
  switch (step) {
    case 'Company': return onboarding.company !== null
    case 'Representative': return onboarding.representative !== null
    case 'ServiceAreas': return onboarding.serviceAreas.length > 0
    case 'Documents': return onboarding.providerId !== null && onboarding.requiredDocumentTypes.every((type) => onboarding.documents.some((document) => document.type === type && document.status !== 'Rejected'))
    case 'Submit': return !isFormStep(onboarding.currentStep) && onboarding.submittedAtUtc !== null
  }
}

function SaveBar({ canEdit, error, isPending, label = 'Lưu và tiếp tục' }: { canEdit: boolean; error: unknown; isPending: boolean; label?: string }) {
  return (
    <>
      {error ? <p className={errorClass} role="alert">{companyErrorMessage(error)}</p> : null}
      {canEdit ? <Button isLoading={isPending} type="submit" variant="blue">{label}</Button> : null}
    </>
  )
}

function CompanyStep({ onboarding, onSaved }: StepProps) {
  const save = useSaveCompanyProfile()
  const [values, setValues] = useState(() => ({
    legalName: onboarding.company?.legalName ?? '',
    displayName: onboarding.company?.displayName ?? '',
    taxCode: onboarding.company?.taxCode ?? '',
    hotline: onboarding.company?.hotline ?? '',
    headquartersAddress: onboarding.company?.headquartersAddress ?? '',
    workforceSize: onboarding.company?.workforceSize ?? ('UnderTen' as CompanyWorkforceSize),
    liabilityCoverageVnd: onboarding.company?.liabilityCoverageVnd?.toString() ?? '',
  }))
  const field = (name: keyof typeof values) => ({ value: values[name], onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues((current) => ({ ...current, [name]: event.target.value })) })

  function submit(event: FormEvent) {
    event.preventDefault()
    const request: CompanyProfile = { ...values, liabilityCoverageVnd: values.liabilityCoverageVnd === '' ? null : Number(values.liabilityCoverageVnd) }
    save.mutate(request, { onSuccess: onSaved })
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="space-y-5" disabled={!onboarding.canEdit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>Tên pháp nhân theo ĐKKD<input className={inputClass} maxLength={200} minLength={2} placeholder="Công ty TNHH Sạch Nhà" required {...field('legalName')} /></label>
          <label className={labelClass}>Tên hiển thị với khách<input className={inputClass} maxLength={120} minLength={2} placeholder="Sạch Nhà" required {...field('displayName')} /></label>
          <label className={labelClass}>Mã số thuế<input className={inputClass} inputMode="numeric" pattern="\s*\d(\s*\d){9}(\s*-\s*\d{3})?\s*" placeholder="0312345678 hoặc 0312345678-001" required title="10 chữ số, hoặc 10 chữ số kèm hậu tố chi nhánh -001" {...field('taxCode')} /></label>
          <label className={labelClass}>Hotline<input className={inputClass} inputMode="tel" placeholder="1900 1234" required {...field('hotline')} /></label>
          <label className={labelClass}>Quy mô nhân sự<Select className={inputClass} {...field('workforceSize')}>{Object.entries(workforceSizeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
          <label className={`${labelClass} sm:col-span-2`}>Địa chỉ trụ sở<input className={inputClass} maxLength={300} minLength={5} placeholder="12 Lê Lợi, Quận 1, Hồ Chí Minh" required {...field('headquartersAddress')} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Mức bảo hiểm trách nhiệm (VND, không bắt buộc)<input className={inputClass} inputMode="numeric" min={0} placeholder="500000000" step={1} type="number" {...field('liabilityCoverageVnd')} /><span className="mt-1.5 block text-sm font-normal text-brand-muted">Nếu nhập số lớn hơn 0, bạn sẽ cần tải thêm giấy chứng nhận bảo hiểm ở bước Giấy tờ.</span></label>
        </div>
        <SaveBar canEdit={onboarding.canEdit} error={save.error} isPending={save.isPending} />
      </fieldset>
    </form>
  )
}

function RepresentativeStep({ onboarding, onSaved }: StepProps) {
  const save = useSaveCompanyRepresentative()
  const saved = onboarding.representative
  const [values, setValues] = useState<SaveCompanyRepresentativeRequest>(() => ({
    fullName: saved?.fullName ?? '',
    jobTitle: saved?.jobTitle ?? '',
    workEmail: saved?.workEmail ?? '',
    phoneNumber: saved?.phoneNumber ?? '',
    identityNumber: '',
  }))
  const field = (name: keyof SaveCompanyRepresentativeRequest) => ({ value: values[name], onChange: (event: ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [name]: event.target.value })) })

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(values, { onSuccess: onSaved })
  }

  if (!onboarding.company) return <p className="text-brand-muted">Hãy khai thông tin pháp nhân trước.</p>

  return (
    <form onSubmit={submit}>
      <fieldset className="space-y-5" disabled={!onboarding.canEdit}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>Họ và tên<input autoComplete="name" className={inputClass} maxLength={160} minLength={2} required {...field('fullName')} /></label>
          <label className={labelClass}>Chức danh<input className={inputClass} maxLength={120} minLength={2} placeholder="Giám đốc" required {...field('jobTitle')} /></label>
          <label className={labelClass}>Email công việc<input autoComplete="email" className={inputClass} maxLength={254} required type="email" {...field('workEmail')} /></label>
          <label className={labelClass}>Số điện thoại<input autoComplete="tel" className={inputClass} inputMode="tel" placeholder="0901234567" required {...field('phoneNumber')} /></label>
          {onboarding.canEdit
            ? <label className={`${labelClass} sm:col-span-2`}>Số CCCD (12 chữ số)<input autoComplete="off" className={inputClass} inputMode="numeric" maxLength={12} pattern="\d{12}" required title="Đúng 12 chữ số" {...field('identityNumber')} /><span className="mt-1.5 block text-sm font-normal text-brand-muted">{saved ? `Đã lưu số kết thúc bằng ${saved.identityNumberLast4}. Vì lý do bảo mật, mỗi lần sửa cần nhập lại đủ số CCCD.` : 'Số CCCD được mã hóa khi lưu và không hiển thị lại đầy đủ.'}</span></label>
            : <p className="text-sm text-brand-muted sm:col-span-2">Số CCCD: ••••••••{saved?.identityNumberLast4}</p>}
        </div>
        <SaveBar canEdit={onboarding.canEdit} error={save.error} isPending={save.isPending} />
      </fieldset>
    </form>
  )
}

function ServiceAreasStep({ onboarding, onSaved }: StepProps) {
  const save = useSaveCompanyServiceAreas()
  const areas = useServiceAreas()
  const [selected, setSelected] = useState(() => onboarding.serviceAreas.map((area) => area.id))
  const activeAreas = (areas.data ?? []).filter((area) => area.isActive)
  const cities = [...new Set(activeAreas.map((area) => area.city))]

  function toggle(areaId: string) {
    setSelected((current) => current.includes(areaId) ? current.filter((id) => id !== areaId) : [...current, areaId])
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(selected, { onSuccess: onSaved })
  }

  if (!onboarding.company) return <p className="text-brand-muted">Hãy khai thông tin pháp nhân trước.</p>
  if (areas.isPending) return <p className="text-brand-muted" role="status">Đang tải danh sách khu vực...</p>
  if (areas.isError) return <p className={errorClass} role="alert">{companyErrorMessage(areas.error)}</p>

  return (
    <form onSubmit={submit}>
      <fieldset className="space-y-5" disabled={!onboarding.canEdit}>
        {cities.map((city) => (
          <div key={city}>
            <p className="text-sm font-semibold">{city}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeAreas.filter((area) => area.city === city).map((area) => <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-brand-border bg-white px-3 text-sm" key={area.id}><input checked={selected.includes(area.id)} className="h-4 w-4 accent-brand-charcoal" onChange={() => toggle(area.id)} type="checkbox" />{area.district}{area.wardOrComplex ? ` · ${area.wardOrComplex}` : ''}</label>)}
            </div>
          </div>
        ))}
        <p className={`text-sm ${selected.length > 20 ? 'text-red-700' : 'text-brand-muted'}`}>Đã chọn {selected.length} / tối đa 20 khu vực.</p>
        {save.isError ? <p className={errorClass} role="alert">{companyErrorMessage(save.error)}</p> : null}
        {onboarding.canEdit ? <Button disabled={selected.length === 0 || selected.length > 20} isLoading={save.isPending} type="submit" variant="blue">Lưu và tiếp tục</Button> : null}
      </fieldset>
    </form>
  )
}

function DocumentRow({ onboarding, type }: { onboarding: CompanyOnboarding; type: CompanyDocumentType }) {
  const upload = useUploadCompanyDocument()
  const fileInput = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const spec = companyDocumentSpecs[type]
  const document = onboarding.documents.find((item) => item.type === type)
  const required = onboarding.requiredDocumentTypes.includes(type)

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    upload.reset()
    // Server xác định định dạng từ nội dung file; ở đây chỉ chặn sớm trường hợp chắc chắn bị từ chối.
    const tooLarge = file.size > companyDocumentMaxBytes
    setProblem(tooLarge ? 'File lớn hơn 10 MB.' : file.size === 0 ? 'File rỗng. Vui lòng chọn file khác.' : null)
    if (!tooLarge && file.size > 0) upload.mutate({ file, type })
  }

  async function view() {
    if (!document) return
    try {
      setProblem(null)
      await openDocumentInNewTab(companyDocumentContentPath(document.id))
    } catch (error) {
      setProblem(companyErrorMessage(error))
    }
  }

  const error = problem ?? (upload.isError ? companyErrorMessage(upload.error) : null)

  return (
    <li className="rounded-xl border border-brand-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold"><FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-blue-ink" />{spec.label}{required ? <span className="text-red-600">*</span> : null}</p>
          <p className="mt-1 text-sm text-brand-muted">{spec.formats}, tối đa 10 MB.</p>
          {document
            ? <p className="mt-2 text-sm"><button className="font-semibold text-brand-blue-ink hover:underline" onClick={() => void view()} type="button">{document.originalFileName}</button> · <span className={document.status === 'Rejected' ? 'font-semibold text-red-700' : document.status === 'Verified' ? 'font-semibold text-emerald-700' : 'text-brand-muted'}>{documentStatusLabels[document.status]}</span> · tải lên {vnDateTime(document.uploadedAtUtc)}</p>
            : <p className="mt-2 text-sm text-brand-muted">Chưa tải lên.</p>}
          {document?.rejectionReason ? <p className="mt-1 text-sm text-red-700">Lý do từ chối: {document.rejectionReason}</p> : null}
        </div>
        {onboarding.canEdit ? <><input accept={spec.accept} aria-label={`Chọn file ${spec.label}`} className="sr-only" onChange={pickFile} ref={fileInput} type="file" /><Button isLoading={upload.isPending} onClick={() => fileInput.current?.click()} variant="secondary"><Upload aria-hidden="true" className="mr-2 h-4 w-4" />{document ? 'Tải lại' : 'Tải lên'}</Button></> : null}
      </div>
      {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
    </li>
  )
}

function DocumentsStep({ onboarding, onSaved }: StepProps) {
  if (!onboarding.company) return <p className="text-brand-muted">Hãy khai thông tin pháp nhân trước.</p>

  return (
    <div className="space-y-5">
      <ul className="space-y-3">{documentTypesOf(onboarding).map((type) => <DocumentRow key={type} onboarding={onboarding} type={type} />)}</ul>
      <p className="text-sm text-brand-muted">Giấy tờ có dấu <span className="text-red-600">*</span> là bắt buộc. Định dạng được kiểm tra theo nội dung file, không theo đuôi file.</p>
      {onboarding.canEdit && stepDone(onboarding, 'Documents') ? <Button onClick={onSaved} variant="blue">Tiếp tục</Button> : null}
    </div>
  )
}

function SummaryRow({ children, label }: { children: ReactNode; label: string }) {
  return <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-brand-border py-3 text-sm last:border-b-0"><dt className="text-brand-muted">{label}</dt><dd className="text-right font-semibold">{children}</dd></div>
}

function SubmitStep({ onboarding }: StepProps) {
  const submit = useSubmitCompanyOnboarding()
  const { company, representative } = onboarding
  const missing = steps.filter((step) => step.key !== 'Submit' && !stepDone(onboarding, step.key))

  return (
    <div className="space-y-5">
      <dl>
        <SummaryRow label="Pháp nhân">{company ? `${company.legalName} · MST ${company.taxCode}` : 'Chưa khai'}</SummaryRow>
        <SummaryRow label="Quy mô">{company ? workforceSizeLabels[company.workforceSize] : '—'}</SummaryRow>
        <SummaryRow label="Bảo hiểm trách nhiệm">{company?.liabilityCoverageVnd ? formatVnd(company.liabilityCoverageVnd) : 'Không khai'}</SummaryRow>
        <SummaryRow label="Người đại diện">{representative ? `${representative.fullName} · ${representative.jobTitle}` : 'Chưa khai'}</SummaryRow>
        <SummaryRow label="Khu vực nhận ca">{onboarding.serviceAreas.length > 0 ? onboarding.serviceAreas.map((area) => `${area.district}, ${area.city}`).join(' · ') : 'Chưa chọn'}</SummaryRow>
        <SummaryRow label="Giấy tờ">{onboarding.requiredDocumentTypes.filter((type) => onboarding.documents.some((document) => document.type === type)).length} / {onboarding.requiredDocumentTypes.length} loại bắt buộc đã tải</SummaryRow>
      </dl>
      {onboarding.canEdit && missing.length > 0 ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Còn thiếu: {missing.map((step) => step.label).join(', ')}.</p> : null}
      {submit.isError ? <p className={errorClass} role="alert">{companyErrorMessage(submit.error)}</p> : null}
      {onboarding.canEdit ? <><p className="text-sm text-brand-muted">Sau khi gửi, hồ sơ bị khóa cho tới khi ABSTRICT có kết quả xét duyệt.</p><Button disabled={onboarding.currentStep !== 'Submit'} isLoading={submit.isPending} onClick={() => submit.mutate(undefined)} variant="blue">Gửi hồ sơ để duyệt</Button></> : null}
    </div>
  )
}

function StatusBanner({ onboarding }: { onboarding: CompanyOnboarding }) {
  const { currentStep, feedback } = onboarding
  if (currentStep === 'AwaitingReview') return <p className="mb-6 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status">Hồ sơ đã gửi{onboarding.submittedAtUtc ? ` lúc ${vnDateTime(onboarding.submittedAtUtc)}` : ''} và đang chờ ABSTRICT xét duyệt. Trong thời gian này bạn chỉ xem được, chưa sửa được.</p>
  if (currentStep === 'Completed') return <p className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">Hồ sơ doanh nghiệp đã được duyệt. Tính năng nhận đơn cho doanh nghiệp sẽ được mở ở giai đoạn sau.</p>
  if (currentStep === 'Suspended') return <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">Tài khoản doanh nghiệp đang bị tạm ngưng. Vui lòng liên hệ support@abstrict.vn.</p>
  if (feedback && feedback.decision !== 'Approved') return <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert"><p className="font-semibold">{feedback.decision === 'Rejected' ? 'Hồ sơ bị từ chối' : 'ABSTRICT yêu cầu chỉnh sửa hồ sơ'} ({vnDateTime(feedback.decidedAtUtc)})</p>{feedback.reason ? <p className="mt-1">{feedback.reason}</p> : null}<p className="mt-1">Bạn có thể sửa và gửi lại.</p></div>
  return null
}

export function CompanyOnboardingPage() {
  const { data: onboarding, error, isPending } = useCompanyOnboarding()
  const [picked, setPicked] = useState<FormStep | null>(null)

  if (isPending) return <PartnerPage accent="blue" description="Đang tải hồ sơ..." title="Hồ sơ doanh nghiệp"><p className="text-brand-muted" role="status">Đang tải hồ sơ doanh nghiệp...</p></PartnerPage>
  if (!onboarding) return <PartnerPage accent="blue" description="Không tải được hồ sơ." title="Hồ sơ doanh nghiệp"><p className={errorClass} role="alert">{companyErrorMessage(error)}</p></PartnerPage>

  // Hồ sơ đã gửi/đã duyệt không còn bước nào cần làm: mở phần tóm tắt.
  const active = picked ?? (isFormStep(onboarding.currentStep) ? onboarding.currentStep : 'Submit')
  const stepProps: StepProps = { onboarding, onSaved: () => setPicked(null) }

  return (
    <PartnerPage accent="blue" description="Khai thông tin pháp nhân, người đại diện, khu vực nhận ca và giấy tờ để ABSTRICT xét duyệt." title="Hồ sơ doanh nghiệp" action={<span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold shadow-sm">Trạng thái: {companyStatusLabels[onboarding.status] ?? onboarding.status}</span>}>
      <StatusBanner onboarding={onboarding} />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav aria-label="Các bước hồ sơ" className="h-fit rounded-2xl bg-white p-3 shadow-sm">
          <ol className="space-y-1">
            {steps.map((step, index) => {
              const done = stepDone(onboarding, step.key)
              return <li key={step.key}><button aria-current={active === step.key ? 'step' : undefined} className={`flex w-full items-center gap-3 rounded-xl p-2 text-left text-sm font-semibold ${active === step.key ? 'bg-brand-blue-pastel-soft text-brand-blue-ink' : 'text-brand-charcoal hover:bg-brand-sand'}`} onClick={() => setPicked(step.key)} type="button"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${done ? 'bg-brand-green text-white' : 'bg-brand-sand'}`}>{done ? <Check aria-label="Đã xong" className="h-4 w-4" /> : index + 1}</span>{step.label}</button></li>
            })}
          </ol>
        </nav>
        <PartnerPanel title={steps.find((step) => step.key === active)?.label}>
          {active === 'Company' ? <CompanyStep key="company" {...stepProps} /> : null}
          {active === 'Representative' ? <RepresentativeStep key="representative" {...stepProps} /> : null}
          {active === 'ServiceAreas' ? <ServiceAreasStep key="areas" {...stepProps} /> : null}
          {active === 'Documents' ? <DocumentsStep {...stepProps} /> : null}
          {active === 'Submit' ? <SubmitStep {...stepProps} /> : null}
        </PartnerPanel>
      </div>
    </PartnerPage>
  )
}
