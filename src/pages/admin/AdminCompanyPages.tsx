import { useState, type FormEvent, type PropsWithChildren, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  companyDocumentSpecs,
  companyErrorMessage,
  companyStatusLabels,
  documentStatusLabels,
  openDocumentInNewTab,
  workforceSizeLabels,
  type CompanyDocument,
  type CompanyDocumentType,
  type CompanyStatus,
} from '../../entities/company'
import { adminCompanyDocumentContentPath, useAdminCompanies, useAdminCompany, useDecideCompany, useStartCompanyReview, type AdminCompanyDetail, type CompanyDecision } from '../../features/admin/api/companies'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateTime } from '../../shared/lib/vn-time'
import { Button } from '../../shared/ui/Button'

const statusTabs: { label: string; status: CompanyStatus | undefined }[] = [
  { label: 'Hàng chờ duyệt', status: undefined },
  { label: 'Đã duyệt', status: 'Approved' },
  { label: 'Bị từ chối', status: 'Rejected' },
  { label: 'Đang soạn', status: 'Draft' },
]

const decisionLabels: Record<CompanyDecision, string> = { Approved: 'Duyệt hồ sơ', ChangesRequested: 'Yêu cầu chỉnh sửa', Rejected: 'Từ chối' }
const inputClass = 'mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand-charcoal'
const errorClass = 'rounded-xl bg-red-50 p-3 text-sm text-red-700'

function AdminPage({ action, children, title }: PropsWithChildren<{ action?: ReactNode; title: string }>) {
  return <div><header className="mb-5 flex flex-wrap items-end justify-between gap-4"><h1 className="text-xl font-semibold tracking-[-0.02em]">{title}</h1>{action}</header>{children}</div>
}

function Panel({ children, title }: PropsWithChildren<{ title: string }>) {
  return <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-6"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>
}

function Field({ children, label }: PropsWithChildren<{ label: string }>) {
  return <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-brand-border py-2.5 text-sm last:border-b-0"><dt className="text-brand-muted">{label}</dt><dd className="text-right font-semibold">{children}</dd></div>
}

function StatusBadge({ status }: { status: CompanyStatus }) {
  const tone = status === 'Approved' ? 'bg-emerald-50 text-emerald-800' : status === 'Rejected' || status === 'Suspended' ? 'bg-red-50 text-red-800' : status === 'Draft' || status === 'NotStarted' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'
  return <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${tone}`}>{companyStatusLabels[status] ?? status}</span>
}

export function AdminCompaniesPage() {
  const [status, setStatus] = useState<CompanyStatus>()
  const [page, setPage] = useState(1)
  const { data, error, isError, isPending } = useAdminCompanies({ status, page, pageSize: 20 })

  return (
    <AdminPage title="Duyệt hồ sơ doanh nghiệp">
      <div aria-label="Lọc theo trạng thái" className="mb-6 flex flex-wrap gap-2" role="group">{statusTabs.map((tab) => <button aria-pressed={status === tab.status} className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${status === tab.status ? 'bg-blue-600 text-white' : 'bg-white text-brand-muted hover:bg-slate-50'}`} key={tab.label} onClick={() => { setStatus(tab.status); setPage(1) }} type="button">{tab.label}</button>)}</div>
      {isPending ? <p className="text-brand-muted" role="status">Đang tải danh sách...</p>
        : isError ? <p className={errorClass} role="alert">{companyErrorMessage(error)}</p>
        : data.items.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-brand-muted shadow-sm">{status ? 'Không có hồ sơ nào ở trạng thái này.' : 'Hàng chờ đang trống.'}</p>
        : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted"><tr><th className="px-5 py-3 font-semibold">Doanh nghiệp</th><th className="px-5 py-3 font-semibold">Mã số thuế</th><th className="px-5 py-3 font-semibold">SĐT tài khoản</th><th className="px-5 py-3 font-semibold">Gửi lúc</th><th className="px-5 py-3 font-semibold">Trạng thái</th></tr></thead>
              <tbody>{data.items.map((company) => <tr className="border-b border-brand-border last:border-b-0 hover:bg-slate-50" key={company.providerId}><td className="px-5 py-3"><Link className="font-semibold text-blue-600 hover:underline" to={`/admin/companies/${company.providerId}`}>{company.legalName}</Link></td><td className="px-5 py-3">{company.taxCode}</td><td className="px-5 py-3">{company.ownerPhoneNumber}</td><td className="px-5 py-3">{company.submittedAtUtc ? vnDateTime(company.submittedAtUtc) : '—'}</td><td className="px-5 py-3"><StatusBadge status={company.status} /></td></tr>)}</tbody>
            </table>
          </div>
        )}
      {data && data.totalPages > 1 ? <div className="mt-6 flex items-center justify-center gap-3 text-sm"><Button disabled={page <= 1} onClick={() => setPage(page - 1)} variant="secondary">Trang trước</Button><span>{data.page} / {data.totalPages}</span><Button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} variant="secondary">Trang sau</Button></div> : null}
    </AdminPage>
  )
}

function DocumentItem({ document, providerId }: { document: CompanyDocument; providerId: string }) {
  const [error, setError] = useState<string | null>(null)

  async function view() {
    try {
      setError(null)
      await openDocumentInNewTab(adminCompanyDocumentContentPath(providerId, document.id))
    } catch (cause) {
      setError(companyErrorMessage(cause))
    }
  }

  return (
    <li className="rounded-xl border border-brand-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{companyDocumentSpecs[document.type]?.label ?? document.type}</p><p className="text-brand-muted">{document.originalFileName} · {documentStatusLabels[document.status]} · {vnDateTime(document.uploadedAtUtc)}</p></div><Button onClick={() => void view()} variant="secondary">Xem giấy tờ</Button></div>
      {document.rejectionReason ? <p className="mt-2 text-red-700">Lý do từ chối: {document.rejectionReason}</p> : null}
      {error ? <p className="mt-2 text-red-700" role="alert">{error}</p> : null}
    </li>
  )
}

function DecisionForm({ company }: { company: AdminCompanyDetail }) {
  const decide = useDecideCompany(company.providerId)
  const [decision, setDecision] = useState<CompanyDecision>('Approved')
  const [reason, setReason] = useState('')
  const [rejectedTypes, setRejectedTypes] = useState<CompanyDocumentType[]>([])
  const needsReason = decision !== 'Approved'

  function toggle(type: CompanyDocumentType) {
    setRejectedTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    decide.mutate({ decision, reason: reason.trim() || undefined, rejectedDocumentTypes: needsReason ? rejectedTypes : [] })
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <fieldset><legend className="text-sm font-semibold">Quyết định</legend><div className="mt-2 space-y-2">{(Object.keys(decisionLabels) as CompanyDecision[]).map((value) => <label className="flex cursor-pointer items-center gap-2 text-sm" key={value}><input checked={decision === value} className="h-4 w-4 accent-brand-charcoal" name="decision" onChange={() => setDecision(value)} type="radio" />{decisionLabels[value]}</label>)}</div></fieldset>
      <label className="block text-sm font-semibold">Lý do{needsReason ? ' (tối thiểu 10 ký tự)' : ' (không bắt buộc)'}<textarea className={`${inputClass} min-h-24`} maxLength={1000} minLength={needsReason ? 10 : undefined} onChange={(event) => setReason(event.target.value)} required={needsReason} value={reason} /></label>
      {needsReason && company.documents.length > 0 ? <fieldset><legend className="text-sm font-semibold">Giấy tờ cần tải lại</legend><div className="mt-2 space-y-2">{company.documents.map((document) => <label className="flex cursor-pointer items-center gap-2 text-sm" key={document.id}><input checked={rejectedTypes.includes(document.type)} className="h-4 w-4 accent-brand-charcoal" onChange={() => toggle(document.type)} type="checkbox" />{companyDocumentSpecs[document.type]?.label ?? document.type}</label>)}</div></fieldset> : null}
      {decide.isError ? <p className={errorClass} role="alert">{companyErrorMessage(decide.error)}</p> : null}
      <Button isLoading={decide.isPending} type="submit">Ghi nhận quyết định</Button>
    </form>
  )
}

export function AdminCompanyDetailPage() {
  const { providerId } = useParams()
  const { data: company, error, isPending } = useAdminCompany(providerId)
  const startReview = useStartCompanyReview(providerId ?? '')
  const back = <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple" to="/admin/approvals"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Danh sách hồ sơ</Link>

  if (isPending) return <AdminPage action={back} title="Hồ sơ doanh nghiệp"><p className="text-brand-muted" role="status">Đang tải hồ sơ...</p></AdminPage>
  if (!company) return <AdminPage action={back} title="Hồ sơ doanh nghiệp"><p className={errorClass} role="alert">{companyErrorMessage(error)}</p></AdminPage>

  const { company: profile, representative } = company
  const reviewable = company.status === 'Submitted' || company.status === 'UnderReview'

  return (
    <AdminPage action={back} title={profile?.legalName ?? 'Hồ sơ doanh nghiệp'}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Pháp nhân">
            <dl>
              <Field label="Trạng thái"><StatusBadge status={company.status} /></Field>
              <Field label="Tên hiển thị">{profile?.displayName}</Field>
              <Field label="Mã số thuế">{profile?.taxCode}</Field>
              <Field label="Hotline">{profile?.hotline}</Field>
              <Field label="Trụ sở">{profile?.headquartersAddress}</Field>
              <Field label="Quy mô">{profile ? workforceSizeLabels[profile.workforceSize] : '—'}</Field>
              <Field label="Bảo hiểm trách nhiệm">{profile?.liabilityCoverageVnd ? formatVnd(profile.liabilityCoverageVnd) : 'Không khai'}</Field>
              <Field label="Tài khoản quản lý">{company.ownerFullName} · {company.ownerPhoneNumber}</Field>
              <Field label="Gửi duyệt lúc">{company.submittedAtUtc ? vnDateTime(company.submittedAtUtc) : '—'}</Field>
            </dl>
          </Panel>
          <Panel title="Người đại diện">
            {representative ? <dl><Field label="Họ và tên">{representative.fullName}</Field><Field label="Chức danh">{representative.jobTitle}</Field><Field label="Email">{representative.workEmail}</Field><Field label="Số điện thoại">{representative.phoneNumber}</Field><Field label="Số CCCD">{representative.identityNumber}</Field></dl> : <p className="text-sm text-brand-muted">Chưa khai.</p>}
          </Panel>
          <Panel title="Khu vực nhận ca">
            {company.serviceAreas.length > 0 ? <ul className="flex flex-wrap gap-2 text-sm">{company.serviceAreas.map((area) => <li className="rounded-lg bg-slate-100 px-3 py-1.5" key={area.id}>{area.district}, {area.city}{area.wardOrComplex ? ` · ${area.wardOrComplex}` : ''}</li>)}</ul> : <p className="text-sm text-brand-muted">Chưa chọn.</p>}
          </Panel>
          <Panel title="Giấy tờ">
            {company.documents.length > 0 ? <ul className="space-y-3">{company.documents.map((document) => <DocumentItem document={document} key={document.id} providerId={company.providerId} />)}</ul> : <p className="text-sm text-brand-muted">Chưa tải giấy tờ nào.</p>}
            {company.requiredDocumentTypes.some((type) => !company.documents.some((document) => document.type === type)) ? <p className="mt-3 text-sm text-amber-800">Còn thiếu: {company.requiredDocumentTypes.filter((type) => !company.documents.some((document) => document.type === type)).map((type) => companyDocumentSpecs[type]?.label ?? type).join(', ')}.</p> : null}
          </Panel>
        </div>

        <div className="space-y-6">
          {company.feedback ? <Panel title="Quyết định gần nhất"><p className="text-sm font-semibold">{decisionLabels[company.feedback.decision as CompanyDecision] ?? company.feedback.decision} · {vnDateTime(company.feedback.decidedAtUtc)}</p>{company.feedback.reason ? <p className="mt-2 text-sm text-brand-muted">{company.feedback.reason}</p> : null}</Panel> : null}
          {reviewable ? (
            <Panel title="Xét duyệt">
              {company.status === 'Submitted' ? <div className="mb-5 border-b border-brand-border pb-5"><p className="mb-3 text-sm text-brand-muted">Nhận hồ sơ để đánh dấu đang xem xét. Có thể ra quyết định ngay mà không cần bước này.</p>{startReview.isError ? <p className={`${errorClass} mb-3`} role="alert">{companyErrorMessage(startReview.error)}</p> : null}<Button isLoading={startReview.isPending} onClick={() => startReview.mutate(undefined)} variant="secondary">Bắt đầu xem xét</Button></div> : null}
              <DecisionForm company={company} />
            </Panel>
          ) : <Panel title="Xét duyệt"><p className="text-sm text-brand-muted">Chỉ ra quyết định được khi hồ sơ đang chờ duyệt hoặc đang xem xét.</p></Panel>}
        </div>
      </div>
    </AdminPage>
  )
}
