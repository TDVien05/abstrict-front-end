import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent, type PropsWithChildren, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { bookingErrorMessage } from '../../entities/booking'
import { useAdminDispute, useAdminDisputes, useDecideDispute, useSendAdminDisputeMessage } from '../../features/admin/api/disputes'
import {
  disputeCategoryLabels,
  disputeStatusLabels,
  disputeTerminalStatuses,
  type Dispute,
  type DisputeStatus,
} from '../../features/customer/api/disputes'
import { EvidenceGrid, MessageComposer, MessageThread } from '../../features/customer/components/DisputeParts'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateTime } from '../../shared/lib/vn-time'
import { Button } from '../../shared/ui/Button'
import { Select } from '../../shared/ui/Select'

const statusTabs: { label: string; status: DisputeStatus | undefined }[] = [
  { label: 'Cần xử lý', status: 'Open' },
  { label: 'Chờ phản hồi', status: 'AwaitingResponse' },
  { label: 'Đang xem xét', status: 'UnderReview' },
  { label: 'Đã quyết định', status: 'Decided' },
  { label: 'Xem xét lại', status: 'Appealed' },
  { label: 'Đã đóng', status: 'Closed' },
  { label: 'Tất cả', status: undefined },
]

const outcomeOptions = [
  { code: 'FullRefund', label: 'Hoàn tiền toàn bộ cho khách' },
  { code: 'PartialRefund', label: 'Hoàn tiền một phần cho khách' },
  { code: 'PayProvider', label: 'Bác khiếu nại, trả tiền cho người làm' },
  { code: 'SplitPayment', label: 'Chia tiền giữa khách và người làm' },
  { code: 'NoAction', label: 'Không thay đổi khoản tiền nào' },
]
const customOutcome = '__custom'

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

function StatusBadge({ status }: { status: DisputeStatus }) {
  const tone = status === 'Decided' ? 'bg-emerald-50 text-emerald-800' : status === 'Closed' ? 'bg-slate-100 text-slate-700' : status === 'Open' || status === 'AwaitingResponse' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
  return <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${tone}`}>{disputeStatusLabels[status]}</span>
}

export function AdminDisputesPage() {
  const [status, setStatus] = useState<DisputeStatus | undefined>('Open')
  const [page, setPage] = useState(1)
  const { data, error, isError, isPending } = useAdminDisputes({ status, page, pageSize: 20 })

  return (
    <AdminPage title="Quản lý khiếu nại">
      <div aria-label="Lọc theo trạng thái" className="mb-6 flex flex-wrap gap-2" role="group">{statusTabs.map((tab) => <button aria-pressed={status === tab.status} className={`min-h-10 rounded-xl px-4 text-sm font-semibold ${status === tab.status ? 'bg-blue-600 text-white' : 'bg-white text-brand-muted hover:bg-slate-50'}`} key={tab.label} onClick={() => { setStatus(tab.status); setPage(1) }} type="button">{tab.label}</button>)}</div>
      {isPending ? <p className="text-brand-muted" role="status">Đang tải danh sách...</p>
        : isError ? <p className={errorClass} role="alert">{bookingErrorMessage(error)}</p>
        : data.items.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-brand-muted shadow-sm">{status ? 'Không có khiếu nại nào ở trạng thái này.' : 'Chưa có khiếu nại nào.'}</p>
        : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-brand-border text-xs uppercase tracking-wide text-brand-muted"><tr><th className="px-5 py-3 font-semibold">Đơn</th><th className="px-5 py-3 font-semibold">Khách hàng</th><th className="px-5 py-3 font-semibold">Người làm</th><th className="px-5 py-3 font-semibold">Loại</th><th className="px-5 py-3 font-semibold">Gửi lúc</th><th className="px-5 py-3 font-semibold">Hạn phản hồi</th><th className="px-5 py-3 font-semibold">Trạng thái</th></tr></thead>
              <tbody>{data.items.map((dispute) => <tr className="border-b border-brand-border last:border-b-0 hover:bg-slate-50" key={dispute.id}><td className="px-5 py-3"><Link className="font-semibold text-blue-600 hover:underline" to={`/admin/disputes/${dispute.id}`}>#{dispute.bookingNumber}</Link></td><td className="px-5 py-3">{dispute.customerName}</td><td className="px-5 py-3">{dispute.providerName}</td><td className="px-5 py-3">{disputeCategoryLabels[dispute.category]}</td><td className="px-5 py-3">{vnDateTime(dispute.createdAtUtc)}</td><td className="px-5 py-3">{disputeTerminalStatuses.includes(dispute.status) ? '—' : vnDateTime(dispute.responseDeadlineUtc)}</td><td className="px-5 py-3"><StatusBadge status={dispute.status} /></td></tr>)}</tbody>
            </table>
          </div>
        )}
      {data && data.totalPages > 1 ? <div className="mt-6 flex items-center justify-center gap-3 text-sm"><Button disabled={page <= 1} onClick={() => setPage(page - 1)} variant="secondary">Trang trước</Button><span>{data.page} / {data.totalPages}</span><Button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} variant="secondary">Trang sau</Button></div> : null}
    </AdminPage>
  )
}

function amountOf(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return { value: undefined, problem: null }
  if (!/^\d+$/.test(trimmed)) return { value: undefined, problem: 'Số tiền phải là số nguyên không âm (VND).' }
  return { value: Number(trimmed), problem: null }
}

function DecisionForm({ dispute }: { dispute: Dispute }) {
  const decide = useDecideDispute(dispute.id)
  const [outcome, setOutcome] = useState(outcomeOptions[0].code)
  const [custom, setCustom] = useState('')
  const [reason, setReason] = useState('')
  const [refund, setRefund] = useState('')
  const [provider, setProvider] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  function review(event: FormEvent) {
    event.preventDefault()
    const code = outcome === customOutcome ? custom.trim() : outcome
    const refundAmount = amountOf(refund)
    const providerAmount = amountOf(provider)
    if (code.length < 2 || code.length > 80) return setProblem('Mã kết quả dài 2 đến 80 ký tự.')
    if (reason.trim().length < 5) return setProblem('Lý do cần ít nhất 5 ký tự.')
    if (refundAmount.problem || providerAmount.problem) return setProblem(refundAmount.problem ?? providerAmount.problem)
    setProblem(null)
    setConfirming(true)
  }

  function submit() {
    const code = outcome === customOutcome ? custom.trim() : outcome
    decide.mutate({ outcomeCode: code, reason: reason.trim(), refundAmountVnd: amountOf(refund).value, providerAmountVnd: amountOf(provider).value }, { onError: () => setConfirming(false) })
  }

  const refundAmount = amountOf(refund).value
  const providerAmount = amountOf(provider).value

  return (
    <form className="space-y-4" onSubmit={review}>
      <label className="block text-sm font-semibold">Kết quả
        <Select className={inputClass} disabled={confirming} onChange={(event) => setOutcome(event.target.value)} value={outcome}>
          {outcomeOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
          <option value={customOutcome}>Khác (nhập mã kết quả)</option>
        </Select>
      </label>
      {outcome === customOutcome ? <label className="block text-sm font-semibold">Mã kết quả<input className={inputClass} disabled={confirming} maxLength={80} onChange={(event) => setCustom(event.target.value)} value={custom} /></label> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Hoàn cho khách (VND)<input className={inputClass} disabled={confirming} inputMode="numeric" onChange={(event) => setRefund(event.target.value)} placeholder="0" value={refund} /></label>
        <label className="block text-sm font-semibold">Trả cho người làm (VND)<input className={inputClass} disabled={confirming} inputMode="numeric" onChange={(event) => setProvider(event.target.value)} placeholder="0" value={provider} /></label>
      </div>
      <p className="text-xs text-brand-muted">Tổng hai khoản không được vượt giá trị đơn; hệ thống sẽ kiểm tra khi ghi nhận. Để trống nếu không áp dụng.</p>
      <label className="block text-sm font-semibold">Lý do (khách hàng sẽ nhìn thấy)
        <textarea className={`${inputClass} min-h-24`} disabled={confirming} maxLength={4000} onChange={(event) => setReason(event.target.value)} value={reason} />
      </label>
      {problem ? <p className={errorClass} role="alert">{problem}</p> : null}
      {decide.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(decide.error)}</p> : null}
      {confirming ? (
        <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="group" aria-label="Xác nhận quyết định">
          <p className="font-semibold">Quyết định không thể thay đổi sau khi ghi nhận.</p>
          <p>Hoàn cho khách: {refundAmount === undefined ? 'không' : formatVnd(refundAmount)}. Trả cho người làm: {providerAmount === undefined ? 'không' : formatVnd(providerAmount)}.</p>
          <div className="flex flex-wrap gap-2"><Button isLoading={decide.isPending} onClick={submit}>Xác nhận quyết định</Button><Button onClick={() => setConfirming(false)} variant="ghost">Quay lại</Button></div>
        </div>
      ) : <Button type="submit">Ghi nhận quyết định</Button>}
    </form>
  )
}

export function AdminDisputeDetailPage() {
  const { disputeId } = useParams()
  const { data: dispute, error, isPending } = useAdminDispute(disputeId)
  const send = useSendAdminDisputeMessage(disputeId ?? '')
  const back = <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-purple" to="/admin/disputes"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Danh sách khiếu nại</Link>

  if (isPending) return <AdminPage action={back} title="Khiếu nại"><p className="text-brand-muted" role="status">Đang tải khiếu nại...</p></AdminPage>
  if (!dispute) return <AdminPage action={back} title="Khiếu nại"><p className={errorClass} role="alert">{bookingErrorMessage(error)}</p></AdminPage>

  const finished = disputeTerminalStatuses.includes(dispute.status)

  return (
    <AdminPage action={back} title={`Khiếu nại đơn #${dispute.bookingNumber}`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Thông tin khiếu nại">
            <dl>
              <Field label="Trạng thái"><StatusBadge status={dispute.status} /></Field>
              <Field label="Loại">{disputeCategoryLabels[dispute.category]}</Field>
              <Field label="Khách hàng">{dispute.customerName}</Field>
              <Field label="Người làm">{dispute.providerName}</Field>
              <Field label="Trạng thái đơn">{dispute.bookingStatus}</Field>
              <Field label="Gửi lúc">{vnDateTime(dispute.createdAtUtc)}</Field>
              <Field label="Hạn phản hồi">{vnDateTime(dispute.responseDeadlineUtc)}</Field>
            </dl>
            <p className="mt-4 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm">{dispute.description}</p>
          </Panel>
          <Panel title="Ảnh bằng chứng"><EvidenceGrid evidence={dispute.evidence} /></Panel>
          {dispute.decisions.length > 0 ? (
            <Panel title="Quyết định đã ghi nhận">
              {dispute.decisions.map((decision) => (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900" key={decision.id}>
                  <p className="font-semibold">{decision.outcomeCode}</p>
                  <p className="mt-1 whitespace-pre-line">{decision.reason}</p>
                  <p className="mt-2">Hoàn cho khách: {decision.refundAmountVnd === null ? '—' : formatVnd(decision.refundAmountVnd)} · Trả cho người làm: {decision.providerAmountVnd === null ? '—' : formatVnd(decision.providerAmountVnd)}</p>
                  <p className="mt-1 text-xs">{vnDateTime(decision.decidedAtUtc)}</p>
                </div>
              ))}
            </Panel>
          ) : null}
        </div>

        <div className="space-y-6">
          <Panel title="Trao đổi">
            <MessageThread customerUserId={dispute.customerUserId} messages={dispute.messages} viewer="admin" />
            <MessageComposer allowInternalNote error={send.isError ? bookingErrorMessage(send.error) : null} isPending={send.isPending} label="Tin nhắn" onSend={(body, internalNote) => send.mutateAsync({ body, internalNote })} />
          </Panel>
          <Panel title="Ra quyết định">
            {finished ? <p className="text-sm text-brand-muted">Khiếu nại đã có quyết định nên không thể ghi nhận thêm.</p> : <DecisionForm dispute={dispute} />}
          </Panel>
        </div>
      </div>
    </AdminPage>
  )
}
