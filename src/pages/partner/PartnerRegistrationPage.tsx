import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, BadgeCheck, Bookmark, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { kycDocumentContentPath, kycDocumentMaxBytes, kycDocumentStatusLabels, kycErrorMessage, kycRequiredDocumentTypes, kycStatusLabels, openDocumentInNewTab, type FreelancerKyc, type KycDocument, type KycDocumentType } from '../../entities/kyc'
import { useAuth } from '../../features/auth/auth-context'
import { useFreelancerKyc, useSaveKycProfile, useSubmitKyc, useUploadKycDocument, type SaveKycProfileRequest } from '../../features/partner/api/kyc'
import { KycField, KycSection, KycUpload, kycFocus } from '../../features/partner/components/KycPrimitives'
import { KycSidebar } from '../../features/partner/components/KycSidebar'
import { partnerRegistrationSchema, type PartnerRegistrationValues } from '../../features/partner/registration-schema'
import { Button } from '../../shared/ui/Button'
import { vnDateTime } from '../../shared/lib/vn-time'
import frontExample from '../../features/partner/assets/identity-front-example.jpg'
import backExample from '../../features/partner/assets/identity-back-example.jpg'
import portraitExample from '../../features/partner/assets/portrait-example.jpg'

const steps = [
  ['Thông tin cá nhân', 'Bắt buộc'],
  ['Ảnh CCCD & chân dung', 'Ảnh định danh'],
  ['Gửi hồ sơ', 'Hoàn tất'],
]
const genderOptions = [
  ['Female', 'Nữ'],
  ['Male', 'Nam'],
] as const
const checkboxClass = 'mt-1 h-4 w-4 shrink-0 accent-brand-blue-pastel-hover'

function ServerDocument({ document }: { document?: KycDocument }) {
  const [error, setError] = useState<string | null>(null)
  if (!document) return null
  const doc = document
  const tone = doc.status === 'Rejected' ? 'font-semibold text-red-700' : doc.status === 'Verified' ? 'font-semibold text-emerald-700' : 'text-brand-muted'
  async function view() {
    try {
      setError(null)
      await openDocumentInNewTab(kycDocumentContentPath(doc.id))
    } catch (cause) {
      setError(kycErrorMessage(cause))
    }
  }
  return (
    <dl className="mt-3 space-y-1 rounded-lg bg-brand-sand p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2"><dt className="shrink-0 text-brand-muted">Ảnh đã tải:</dt><dd className="min-w-0 truncate text-right"><button className="truncate font-semibold text-brand-blue-ink hover:underline" onClick={() => void view()} type="button">{doc.originalFileName}</button></dd></div>
      <div className="flex items-center justify-between gap-2"><dt className="shrink-0 text-brand-muted">Trạng thái:</dt><dd className={tone}>{kycDocumentStatusLabels[doc.status]}</dd></div>
      {doc.rejectionReason ? <p className="mt-1 text-red-700">Lý do từ chối: {doc.rejectionReason}</p> : null}
      {error ? <p className="mt-1 text-red-700" role="alert">{error}</p> : null}
    </dl>
  )
}

function StatusBanner({ kyc }: { kyc: FreelancerKyc }) {
  const { status, feedback } = kyc
  if (status === 'Submitted' || status === 'UnderReview') return <p className="mb-8 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status">Hồ sơ đã gửi{kyc.submittedAtUtc ? ` lúc ${vnDateTime(kyc.submittedAtUtc)}` : ''} và đang chờ ABSTRICT xét duyệt. Trong thời gian này bạn chỉ xem được, chưa sửa được.</p>
  if (status === 'Approved') return <p className="mb-8 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">Hồ sơ KYC đã được duyệt.</p>
  if (status === 'Suspended') return <p className="mb-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">Tài khoản đang bị tạm ngưng. Vui lòng liên hệ support@abstrict.vn.</p>
  if (feedback && feedback.decision !== 'Approved') return <div className="mb-8 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert"><p className="font-semibold">{feedback.decision === 'Rejected' ? 'Hồ sơ bị từ chối' : 'ABSTRICT yêu cầu chỉnh sửa hồ sơ'} ({vnDateTime(feedback.decidedAtUtc)})</p>{feedback.reason ? <p className="mt-1">{feedback.reason}</p> : null}<p className="mt-1">Bạn có thể sửa và gửi lại.</p></div>
  return null
}

export function PartnerRegistrationPage() {
  const { user } = useAuth()
  const { data: kyc, error: loadError, isPending } = useFreelancerKyc()
  const saveProfile = useSaveKycProfile()
  const submitKyc = useSubmitKyc()
  const upload = useUploadKycDocument()
  const [message, setMessage] = useState('')
  const [docError, setDocError] = useState('')
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const hydratedRef = useRef(false)
  const form = useForm<PartnerRegistrationValues>({
    resolver: zodResolver(partnerRegistrationSchema),
    defaultValues: { fullName: '', birthDate: '', gender: 'Female', citizenIdNumber: '', permanentAddress: '', currentAddress: '', experienceYears: '0', consent: false },
  })
  const { register, handleSubmit, reset, formState: { errors } } = form

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
    if (hydratedRef.current || !kyc) return
    hydratedRef.current = true
    reset({
      fullName: kyc.profile?.legalFullName ?? '',
      birthDate: kyc.profile?.dateOfBirth ?? '',
      gender: kyc.profile?.gender === 'Male' ? 'Male' : 'Female',
      citizenIdNumber: '',
      permanentAddress: kyc.profile?.permanentAddress ?? '',
      currentAddress: kyc.profile?.currentAddress ?? '',
      experienceYears: String(kyc.profile?.experienceYears ?? 0),
    })
  }, [kyc, reset])

  const canEdit = kyc?.canEdit ?? false
  const documentsOf = (type: KycDocumentType) => kyc?.documents.find((document) => document.type === type)
  const documentsReady = kycRequiredDocumentTypes.every((type) => kyc?.documents.some((document) => document.type === type && document.status !== 'Rejected'))
  const stepDone = [Boolean(kyc?.profile), documentsReady, kyc ? !kyc.canEdit : false]
  const progress = Math.round((stepDone.filter(Boolean).length / steps.length) * 100)
  const activeStep = stepDone.findIndex((done) => !done)
  const currentStep = selectedStep ?? (activeStep === -1 ? steps.length - 1 : activeStep)
  const barProgress = ((currentStep + 1) / steps.length) * 100
  const actionError = saveProfile.error ?? submitKyc.error

  function handleUpload(type: KycDocumentType, file: File) {
    setDocError('')
    if (!kyc?.profile) {
      setDocError('Hãy điền và lưu thông tin cá nhân (mục 1) trước khi tải giấy tờ.')
      return
    }
    if (file.size === 0) {
      setDocError('Tệp tải lên đang trống. Vui lòng chọn tệp khác.')
      return
    }
    if (file.size > kycDocumentMaxBytes) {
      setDocError('Ảnh không được lớn hơn 5 MB.')
      return
    }
    upload.mutate({ file, type }, { onError: (cause) => setDocError(kycErrorMessage(cause)) })
  }

  function toRequest(input: PartnerRegistrationValues): SaveKycProfileRequest {
    return {
      legalFullName: input.fullName.trim(),
      dateOfBirth: input.birthDate,
      gender: input.gender,
      citizenIdNumber: input.citizenIdNumber.trim(),
      permanentAddress: input.permanentAddress.trim(),
      currentAddress: input.currentAddress.trim(),
      experienceYears: Number(input.experienceYears) || 0,
    }
  }

  const saveDraft = handleSubmit((input) => {
    setMessage('')
    saveProfile.mutate(toRequest(input), { onSuccess: () => setMessage('Đã lưu thông tin hồ sơ.') })
  })

  const sendKyc = handleSubmit((input) => {
    setMessage('')
    saveProfile.mutate(toRequest(input), {
      onSuccess: () => submitKyc.mutate(undefined, { onSuccess: () => setMessage('Đã gửi hồ sơ thẩm định. ABSTRICT sẽ phản hồi sau khi xét duyệt.') }),
    })
  })

  return (
    <>
      <main className="w-full px-6 py-10 sm:px-8 sm:py-14 lg:px-10 2xl:px-12">
        <header className="mb-12 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-brand-blue-ink">Cổng thẩm định đối tác</span>
              <span className="text-brand-muted">Trạng thái: {kyc ? kycStatusLabels[kyc.status] : 'Đang tải…'}</span>
            </div>
            <h1 className="page-title">Đăng ký & định danh đối tác</h1>
            <p className="page-intro mt-6">Hoàn thiện hồ sơ định danh để nhận ca giúp việc căn hộ ABSTRICT. Khai thông tin cá nhân, tải ảnh CCCD và ảnh chân dung để gửi thẩm định.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start rounded-xl bg-white p-4 lg:self-end">
            <ShieldCheck aria-hidden className="h-9 w-9 text-brand-blue-ink" />
            <div><p className="text-sm text-brand-muted">Quy trình thẩm định</p><p className="font-semibold">Định danh & an toàn</p></div>
          </div>
        </header>

        {isPending ? <p className="text-brand-muted" role="status">Đang tải hồ sơ KYC…</p>
          : !kyc ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{kycErrorMessage(loadError)} <Link className="font-semibold underline" to="/partners/login">Đăng nhập</Link></p>
          : (
            <>
              <StatusBanner kyc={kyc} />
              <nav aria-label="Các phần hồ sơ" className="mb-8 rounded-2xl bg-white p-4 sm:p-6 lg:sticky lg:top-16 lg:z-30 lg:shadow-md">
                <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {steps.map(([title, caption], index) => (
                    <li key={title}>
                      <a href={`#kyc-${index + 1}`} aria-current={currentStep === index ? 'step' : undefined} onClick={() => setSelectedStep(index)} className={`flex h-full items-center gap-3 rounded-xl p-2 ${kycFocus} ${index <= currentStep || stepDone[index] ? 'bg-brand-blue-pastel-soft' : ''}`}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-semibold ${index <= currentStep || stepDone[index] ? 'bg-brand-blue-pastel text-brand-charcoal' : 'bg-brand-sand'}`}>{index + 1}</span>
                        <span className="min-w-0"><span className="mb-1 block text-sm text-brand-muted">Bước {index + 1} · {stepDone[index] ? 'Đã xong' : caption}</span><span className="block text-sm font-semibold">{title}</span></span>
                      </a>
                    </li>
                  ))}
                </ol>
                <progress aria-label="Tiến độ điền hồ sơ" value={barProgress} max={100} className="mt-5 block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-brand-sand accent-brand-blue-pastel [&::-webkit-progress-bar]:bg-brand-sand [&::-webkit-progress-value]:bg-brand-blue-pastel [&::-moz-progress-bar]:bg-brand-blue-pastel" />
              </nav>

              <FormProvider {...form}>
                <div className="grid items-start gap-8 lg:grid-cols-12">
                  <form noValidate className="min-w-0 space-y-8 lg:col-span-8" onSubmit={sendKyc}>
                    <fieldset className="min-w-0 space-y-8 border-0 p-0" disabled={!canEdit}>
                      <KycSection id="kyc-1" title="1. Thông tin cá nhân" note="Bắt buộc" icon={BadgeCheck}>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <KycField name="fullName" label="Họ và tên khai sinh" autoComplete="name" hint="Trùng khớp với CCCD" />
                          <KycField name="birthDate" label="Ngày tháng năm sinh" type="date" />
                          <fieldset>
                            <legend className="mb-2 text-sm font-semibold">Giới tính</legend>
                            <div className="grid grid-cols-2 gap-2">{genderOptions.map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-sand"><input className="accent-brand-blue-pastel-hover" type="radio" value={value} {...register('gender')} />{label}</label>)}</div>
                          </fieldset>
                          {canEdit
                            ? <KycField name="citizenIdNumber" label="Số CCCD (12 chữ số)" inputMode="numeric" maxLength={12} hint={kyc.profile ? `Đã lưu số kết thúc bằng ${kyc.profile.citizenIdLast4}. Vì bảo mật, mỗi lần lưu cần nhập lại đủ số CCCD.` : 'Số CCCD được mã hóa khi lưu và không hiển thị lại đầy đủ.'} />
                            : <div><p className="mb-2 text-sm font-semibold">Số CCCD</p><p className="flex min-h-11 items-center rounded-lg bg-brand-sand px-3 text-sm">••••••••{kyc.profile?.citizenIdLast4 ?? ''}</p></div>}
                          <KycField name="experienceYears" label="Số năm kinh nghiệm" type="number" min={0} max={60} inputMode="numeric" />
                          <div className="sm:col-span-2"><KycField name="permanentAddress" label="Địa chỉ thường trú (theo CCCD)" /></div>
                          <div className="sm:col-span-2"><KycField name="currentAddress" label="Địa chỉ tạm trú hiện tại" autoComplete="street-address" /></div>
                        </div>
                        <p className="mt-4 text-sm text-brand-muted">Số điện thoại tài khoản: <span className="font-semibold">{user?.phoneNumber ?? '—'}</span> (không sửa được tại đây).</p>
                      </KycSection>

                      <KycSection id="kyc-2" title="2. Tải giấy tờ CCCD & ảnh chân dung" note="JPG/PNG · tối đa 5 MB" icon={Fingerprint} referenceLayout>
                        <div className="mb-6 grid gap-6 md:grid-cols-2">
                          <KycUpload name="front" label="Mặt trước CCCD gắn chip" example={frontExample} onSelect={(file) => handleUpload('CitizenIdFront', file)}>
                            <ServerDocument document={documentsOf('CitizenIdFront')} />
                          </KycUpload>
                          <KycUpload name="back" label="Mặt sau CCCD gắn chip" example={backExample} onSelect={(file) => handleUpload('CitizenIdBack', file)}>
                            <ServerDocument document={documentsOf('CitizenIdBack')} />
                          </KycUpload>
                        </div>
                        <div className="flex flex-col items-center gap-5 rounded-xl bg-brand-blue-pastel-soft p-5 md:flex-row">
                          <div className="w-28 shrink-0"><KycUpload name="portrait" label="Ảnh chân dung" example={portraitExample} compact onSelect={(file) => handleUpload('FaceVerification', file)} /></div>
                          <div className="w-full min-w-0 flex-1 text-left">
                            <h3 className="text-sm font-semibold">Ảnh chân dung xác thực</h3>
                            <p className="text-sm text-brand-muted">Ảnh rõ mặt, đối chiếu với ảnh trên CCCD. ABSTRICT kiểm tra thủ công, không dùng so khớp khuôn mặt tự động.</p>
                            <ServerDocument document={documentsOf('FaceVerification')} />
                          </div>
                        </div>
                        {docError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{docError}</p> : null}
                        {upload.isPending ? <p className="mt-4 text-sm text-brand-blue-ink" role="status">Đang tải ảnh lên…</p> : null}
                        <p className="mt-4 text-sm text-brand-muted">Cần đủ 3 ảnh: mặt trước CCCD, mặt sau CCCD và ảnh chân dung.</p>
                      </KycSection>

                      <section id="kyc-3" aria-label="Cam kết và gửi hồ sơ" className="scroll-mt-24 overflow-hidden rounded-2xl bg-white lg:scroll-mt-32">
                        <div className="p-6"><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className={checkboxClass} {...register('consent')} /><span className="text-sm">Tôi cam kết thông tin, hình ảnh căn cước công dân và ảnh chân dung cung cấp là chính xác, trung thực. Tôi đồng ý cho ABSTRICT đối soát định danh phục vụ công tác thẩm định hồ sơ.</span></label>{errors.consent && <p className="mt-3 text-sm text-red-700">{errors.consent.message}</p>}</div>
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-blue-pastel-soft p-6">
                          <p className="flex items-center gap-2 text-sm text-brand-blue-ink"><LockKeyhole aria-hidden className="h-4 w-4 shrink-0" />{canEdit ? 'Hồ sơ chưa được gửi thẩm định' : 'Hồ sơ đã gửi, đang chờ duyệt'}</p>
                          {canEdit ? <div className="flex w-full flex-wrap gap-3 sm:w-auto"><Button variant="transparent" isLoading={saveProfile.isPending} onClick={() => void saveDraft()}><Bookmark aria-hidden className="mr-2 h-4 w-4" />Lưu bản nháp</Button><Button variant="dark" type="submit" isLoading={submitKyc.isPending} disabled={!documentsReady}>Gửi hồ sơ thẩm định KYC<ArrowRight aria-hidden className="ml-2 h-4 w-4" /></Button></div> : null}
                        </div>
                        {canEdit && !documentsReady ? <p className="px-6 pt-4 text-sm text-amber-800">Tải đủ 3 ảnh định danh trước khi gửi.</p> : null}
                        {actionError ? <p role="alert" className="p-6 text-sm text-red-700">{kycErrorMessage(actionError)}</p> : null}
                        {message ? <p role="status" className="p-6 text-sm text-brand-blue-ink">{message}</p> : null}
                      </section>
                    </fieldset>
                  </form>
                  <KycSidebar progress={progress} documentsSelected={documentsReady} />
                </div>
              </FormProvider>
            </>
          )}
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
