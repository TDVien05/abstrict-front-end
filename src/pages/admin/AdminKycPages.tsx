import { useState, type FormEvent, type PropsWithChildren, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  kycDocumentSpecs,
  kycDocumentStatusLabels,
  kycErrorMessage,
  kycGenderLabels,
  kycRequiredDocumentTypes,
  kycStatusLabels,
  openDocumentInNewTab,
  type KycDocument,
  type KycDocumentType,
  type KycStatus,
} from '../../entities/kyc'
import { adminKycDocumentContentPath, useAdminKyc, useAdminKycList, useDecideKyc, useStartKycReview, type AdminKycDetail, type KycDecision } from '../../features/admin/api/kyc'
import { vnDateTime } from '../../shared/lib/vn-time'
import { Button } from '../../shared/ui/Button'

const statusTabs: { label: string; status: KycStatus | undefined }[] = [
  { label: 'Hàng chờ duyệt', status: undefined },
  { label: 'Đã duyệt', status: 'Approved' },
  { label: 'Bị từ chối', status: 'Rejected' },
  { label: 'Đang soạn', status: 'Draft' },
]

const decisionLabels: Record<KycDecision, string> = { Approved: 'Duyệt hồ sơ', ChangesRequested: 'Yêu cầu chỉnh sửa', Rejected: 'Từ chối' }
const inputClass = 'mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand-charcoal'
const errorClass = 'rounded-xl bg-red-50 p-3 text-sm text-red-700'

function AdminPage({ action, children, title }: PropsWithChildren<{ action?: ReactNode; title: string }>) {
  return <main className="w-full px-4 py-10 sm:px-6 lg:px-8 xl:px-10 2xl:px-12"><header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-semibold text-brand-purple">Quản trị ABSTRICT</p><h1 className="text-3xl font-semibold tracking-[-0.03em]">{title}</h1></div>{action}</header>{children}</main>
}

function Panel({ children, title }: PropsWithChildren<{ title: string }>) {
  return <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>
}

function Field({ children, label }: PropsWithChildren<{ label: string }>) {
  return <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-brand-border py-2.5 text-sm last:border-b-0"><dt className="text-brand-muted">{label}</dt><dd className="text-right font-semibold">{children}</dd></div>
}

function StatusBadge({ status }: { status: KycStatus }) {
  const tone = status === 'Approved' ? 'bg-emerald-50 text-emerald-800' : status === 'Rejected' || status === 'Suspended' ? 'bg-red-50 text-red-800' : status === 'Draft' || status === 'NotStarted' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'
  return <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${tone}`}>{kycStatusLabels[status] ?? status}</span>
}

export function AdminKycPage() {
  const [status, setStatus] = useState<KycStatus>()
  const [page, setPage] = useState(1)
  const { data, error, isError, isPending } = useAdminKycList({ status, page, pageSize: 20 })

  return (
    <AdminPage title="Duyệt hồ sơ KYC freelancer">
      <div aria-label="Lọc theo trạng thái" className="mb-6 flex flex-wrap gap-2" role="group">{statusTabs.map((tab) => <button aria-pressed={status === tab.status} className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${status === tab.status ? 'bg-brand-charcoal text-white' : 'bg-white text-brand-muted hover:bg-slate-50'}`} key={tab.label} onClick={() => { setStatus(tab.status); setPage(1) }} type="button">{tab.label}</button>)}</div>
      {isPending ? <p className="text-brand-muted" role="status">Đang tải danh sách...</p>
        : isError ? <p className={errorClass} role="alert">{kycErrorMessage(error)}</p>
        : data.items.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-brand-muted shadow-sm">{status ? 'Không có hồ sơ nào ở trạng thái này.' : 'Hàng chờ đang trống.'}</p>
        : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted"><tr><th className="px-5 py-3 font-semibold">Freelancer</th><th className="px-5 py-3 font-semibold">SĐT tài khoản</th><th className="px-5 py-3 font-semibold">Gửi lúc</th><th className="px-5 py-3 font-semibold">Trạng thái</th></tr></thead>
              <tbody>{data.items.map((profile) => <tr className="border-b border-brand-border last:border-b-0 hover:bg-slate-50" key={profile.providerId}><td className="px-5 py-3"><Link className="font-semibold text-brand-purple hover:underline" to={`/admin/kyc/${profile.providerId}`}>{profile.legalFullName}</Link></td><td className="px-5 py-3">{profile.phoneNumber}</td><td className="px-5 py-3">{profile.submittedAtUtc ? vnDateTime(profile.submittedAtUtc) : '—'}</td><td className="px-5 py-3"><StatusBadge status={profile.status} /></td></tr>)}</tbody>
            </table>
          </div>
        )}
      {data && data.totalPages > 1 ? <div className="mt-6 flex items-center justify-center gap-3 text-sm"><Button disabled={page <= 1} onClick={() => setPage(page - 1)} variant="secondary">Trang trước</Button><span>{data.page} / {data.totalPages}</span><Button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} variant="secondary">Trang sau</Button></div> : null}
    </AdminPage>
  )
}

function DocumentItem({ document, providerId }: { document: KycDocument; providerId: string }) {
  const [error, setError] = useState<string | null>(null)

  async function view() {
    try {
      setError(null)
      await openDocumentInNewTab(adminKycDocumentContentPath(providerId, document.id))
    } catch (cause) {
      setError(kycErrorMessage(cause))
    }
  }

  return (
    <li className="rounded-xl border border-brand-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{kycDocumentSpecs[document.type]?.label ?? document.type}</p><p className="text-brand-muted">{document.originalFileName} · {kycDocumentStatusLabels[document.status]} · {vnDateTime(document.uploadedAtUtc)}</p></div><Button onClick={() => void view()} variant="secondary">Xem ảnh</Button></div>
      {document.rejectionReason ? <p className="mt-2 text-red-700">Lý do từ chối: {document.rejectionReason}</p> : null}
      {error ? <p className="mt-2 text-red-700" role="alert">{error}</p> : null}
    </li>
  )
}

function DecisionForm({ profile }: { profile: AdminKycDetail }) {
  const decide = useDecideKyc(profile.providerId)
  const [decision, setDecision] = useState<KycDecision>('Approved')
  const [reason, setReason] = useState('')
  const [rejectedTypes, setRejectedTypes] = useState<KycDocumentType[]>([])
  const needsReason = decision !== 'Approved'

  function toggle(type: KycDocumentType) {
    setRejectedTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    decide.mutate({ decision, reason: reason.trim() || undefined, rejectedDocumentTypes: needsReason ? rejectedTypes : [] })
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <fieldset><legend className="text-sm font-semibold">Quyết định</legend><div className="mt-2 space-y-2">{(Object.keys(decisionLabels) as KycDecision[]).map((value) => <label className="flex cursor-pointer items-center gap-2 text-sm" key={value}><input checked={decision === value} className="h-4 w-4 accent-brand-charcoal" name="decision" onChange={() => setDecision(value)} type="radio" />{decisionLabels[value]}</label>)}</div></fieldset>
      <label className="block text-sm font-semibold">Lý do{needsReason ? ' (tối thiểu 10 ký tự)' : ' (không bắt buộc)'}<textarea className={`${inputClass} min-h-24`} maxLength={1000} minLength={needsReason ? 10 : undefined} onChange={(event) => setReason(event.target.value)} required={needsReason} value={reason} /></label>
      {needsReason ? <fieldset><legend className="text-sm font-semibold">Ảnh cần tải lại</legend><div className="mt-2 space-y-2">{kycRequiredDocumentTypes.map((type) => <label className="flex cursor-pointer items-center gap-2 text-sm" key={type}><input checked={rejectedTypes.includes(type)} className="h-4 w-4 accent-brand-charcoal" onChange={() => toggle(type)} type="checkbox" />{kycDocumentSpecs[type].label}</label>)}</div></fieldset> : null}
      {decide.isError ? <p className={errorClass} role="alert">{kycErrorMessage(decide.error)}</p> : null}
      <Button isLoading={decide.isPending} type="submit">Ghi nhận quyết định</Button>
    </form>
  )
}

export function AdminKycDetailPage() {
  const { providerId } = useParams()
  const { data: profile, error, isPending } = useAdminKyc(providerId)
  const startReview = useStartKycReview(providerId ?? '')
  const back = <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple" to="/admin/kyc"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Danh sách hồ sơ</Link>

  if (isPending) return <AdminPage action={back} title="Hồ sơ KYC"><p className="text-brand-muted" role="status">Đang tải hồ sơ...</p></AdminPage>
  if (!profile) return <AdminPage action={back} title="Hồ sơ KYC"><p className={errorClass} role="alert">{kycErrorMessage(error)}</p></AdminPage>

  const reviewable = profile.status === 'Submitted' || profile.status === 'UnderReview'

  return (
    <AdminPage action={back} title={profile.legalFullName || 'Hồ sơ KYC'}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Thông tin định danh">
            <dl>
              <Field label="Trạng thái"><StatusBadge status={profile.status} /></Field>
              <Field label="Họ và tên">{profile.legalFullName}</Field>
              <Field label="Ngày sinh">{profile.dateOfBirth}</Field>
              <Field label="Giới tính">{kycGenderLabels[profile.gender] ?? profile.gender}</Field>
              <Field label="Số CCCD">{profile.citizenIdNumber}</Field>
              <Field label="Địa chỉ thường trú">{profile.permanentAddress}</Field>
              <Field label="Địa chỉ tạm trú">{profile.currentAddress}</Field>
              <Field label="Kinh nghiệm">{profile.experienceYears} năm</Field>
              <Field label="SĐT tài khoản">{profile.phoneNumber}</Field>
              <Field label="Gửi duyệt lúc">{profile.submittedAtUtc ? vnDateTime(profile.submittedAtUtc) : '—'}</Field>
            </dl>
          </Panel>
          <Panel title="Ảnh định danh">
            {profile.documents.length > 0 ? <ul className="space-y-3">{profile.documents.map((document) => <DocumentItem document={document} key={document.id} providerId={profile.providerId} />)}</ul> : <p className="text-sm text-brand-muted">Chưa tải ảnh nào.</p>}
            {kycRequiredDocumentTypes.some((type) => !profile.documents.some((document) => document.type === type)) ? <p className="mt-3 text-sm text-amber-800">Còn thiếu: {kycRequiredDocumentTypes.filter((type) => !profile.documents.some((document) => document.type === type)).map((type) => kycDocumentSpecs[type].label).join(', ')}.</p> : null}
          </Panel>
        </div>

        <div className="space-y-6">
          {profile.feedback ? <Panel title="Quyết định gần nhất"><p className="text-sm font-semibold">{decisionLabels[profile.feedback.decision] ?? profile.feedback.decision} · {vnDateTime(profile.feedback.decidedAtUtc)}</p>{profile.feedback.reason ? <p className="mt-2 text-sm text-brand-muted">{profile.feedback.reason}</p> : null}</Panel> : null}
          {reviewable ? (
            <Panel title="Xét duyệt">
              {profile.status === 'Submitted' ? <div className="mb-5 border-b border-brand-border pb-5"><p className="mb-3 text-sm text-brand-muted">Nhận hồ sơ để đánh dấu đang xem xét. Có thể ra quyết định ngay mà không cần bước này.</p>{startReview.isError ? <p className={`${errorClass} mb-3`} role="alert">{kycErrorMessage(startReview.error)}</p> : null}<Button isLoading={startReview.isPending} onClick={() => startReview.mutate(undefined)} variant="secondary">Bắt đầu xem xét</Button></div> : null}
              <DecisionForm profile={profile} />
            </Panel>
          ) : <Panel title="Xét duyệt"><p className="text-sm text-brand-muted">Chỉ ra quyết định được khi hồ sơ đang chờ duyệt hoặc đang xem xét.</p></Panel>}
        </div>
      </div>
    </AdminPage>
  )
}
