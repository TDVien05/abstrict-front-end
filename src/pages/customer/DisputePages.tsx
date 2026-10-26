import { ArrowLeft, Scale, X } from 'lucide-react'
import { useState, type FormEvent, type PropsWithChildren } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { bookingErrorMessage } from '../../entities/booking'
import { useAuth } from '../../features/auth/auth-context'
import { useBooking } from '../../features/customer/api/bookings'
import {
  disputeCategoryLabels,
  disputeDescriptionLimits,
  disputeEvidenceMax,
  disputeStatusLabels,
  disputeTerminalStatuses,
  uploadDisputeEvidence,
  useCustomerDispute,
  useCustomerDisputes,
  useDisputeCategories,
  useOpenDispute,
  useSendDisputeMessage,
  useUploadDisputeEvidence,
  type DisputeCategory,
  type DisputeStatus,
} from '../../features/customer/api/disputes'
import { CustomerCard, CustomerContainer, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { EvidenceGrid, MessageComposer, MessageThread } from '../../features/customer/components/DisputeParts'
import { imageAccept, imageFileProblem } from '../../shared/api/protected-image'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateTime } from '../../shared/lib/vn-time'
import { Select } from '../../shared/ui/Select'

const primaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50'
const inputClass = 'mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal'
const errorClass = 'rounded-xl bg-red-50 p-3 text-sm text-red-700'

const statusTone: Record<DisputeStatus, 'blue' | 'green' | 'neutral' | 'purple' | 'yellow'> = {
  Open: 'yellow', AwaitingResponse: 'yellow', UnderReview: 'blue', Decided: 'green', Appealed: 'purple', Closed: 'neutral',
}

function Page({ back, children, title }: PropsWithChildren<{ back: { label: string; to: string }; title: string }>) {
  return (
    <main className="pb-20">
      <CustomerContainer className="py-6 sm:py-8">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to={back.to}><ArrowLeft aria-hidden="true" className="h-4 w-4" />{back.label}</Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
        <div className="mt-6">{children}</div>
      </CustomerContainer>
    </main>
  )
}

// Chọn thêm ảnh dần dần, gộp lại và chặn quá số lượng cho phép.
function useEvidenceFiles(limit: number) {
  const [files, setFiles] = useState<File[]>([])
  const [problem, setProblem] = useState<string | null>(null)

  function add(list: FileList | null) {
    if (!list) return
    const next = [...files]
    let message: string | null = null
    for (const file of Array.from(list)) {
      const fileProblem = imageFileProblem(file)
      if (fileProblem) { message = `${file.name}: ${fileProblem}`; continue }
      if (next.some((item) => item.name === file.name && item.size === file.size)) continue
      if (next.length >= limit) { message = `Chỉ gửi được tối đa ${limit} ảnh.`; break }
      next.push(file)
    }
    setFiles(next)
    setProblem(message)
  }

  return { add, clear: () => { setFiles([]); setProblem(null) }, files, problem, remove: (index: number) => setFiles(files.filter((_, position) => position !== index)) }
}

export function DisputeCreatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: booking, error, isPending } = useBooking(id)
  const categories = useDisputeCategories()
  const open = useOpenDispute(id ?? '')
  const evidence = useEvidenceFiles(disputeEvidenceMax)
  const [category, setCategory] = useState<DisputeCategory | ''>('')
  const [description, setDescription] = useState('')
  const [validation, setValidation] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const back = { label: 'Chi tiết đơn', to: `/orders/${id}` }
  const trimmed = description.trim()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!category) { setValidation('Vui lòng chọn loại khiếu nại.'); return }
    if (trimmed.length < disputeDescriptionLimits.min) { setValidation(`Mô tả cần ít nhất ${disputeDescriptionLimits.min} ký tự.`); return }
    setValidation(null)
    try {
      const dispute = await open.mutateAsync({ category, description: trimmed })
      // Khiếu nại đã được tạo; ảnh nào tải lỗi thì báo ở trang chi tiết để bổ sung lại, không tạo khiếu nại thứ hai.
      setUploading(true)
      const failed: string[] = []
      for (const file of evidence.files) {
        try { await uploadDisputeEvidence(dispute.id, file) } catch (cause) { failed.push(`${file.name}: ${bookingErrorMessage(cause)}`) }
      }
      navigate(`/disputes/${dispute.id}`, { replace: true, state: failed.length > 0 ? { evidenceErrors: failed } : null })
    } catch {
      // Lỗi tạo khiếu nại hiển thị qua open.error.
    } finally {
      setUploading(false)
    }
  }

  if (isPending) return <Page back={back} title="Mở khiếu nại"><p className="text-sm text-brand-muted" role="status">Đang tải thông tin đơn...</p></Page>
  if (!booking) return <Page back={back} title="Mở khiếu nại"><p className={errorClass} role="alert">{bookingErrorMessage(error)}</p></Page>
  if (!booking.allowedActions.includes('OpenDispute')) {
    return <Page back={back} title="Mở khiếu nại"><CustomerCard className="p-6"><p className="text-sm">Đơn #{booking.bookingNumber} hiện không thể khiếu nại. Chỉ khiếu nại được đơn đã hoàn tất hoặc đang chờ nghiệm thu, và mỗi đơn chỉ một lần.</p></CustomerCard></Page>
  }

  return (
    <Page back={back} title="Mở khiếu nại">
      <form className="max-w-2xl space-y-5" onSubmit={(event) => void submit(event)}>
        <CustomerCard className="p-5 sm:p-6">
          <p className="text-xs text-brand-muted">Đơn #{booking.bookingNumber}</p>
          <p className="mt-1 font-semibold">{booking.serviceCategoryName} · {booking.providerDisplayName}</p>
          <p className="text-sm text-brand-muted">{vnDateTime(booking.startsAtUtc)} · {formatVnd(booking.baseAmountVnd)}</p>
        </CustomerCard>

        <CustomerCard className="space-y-4 p-5 sm:p-6">
          <label className="block text-xs font-semibold text-brand-muted">Loại khiếu nại
            <Select className={inputClass} onChange={(event) => setCategory(event.target.value as DisputeCategory | '')} value={category}>
              <option value="">{categories.isPending ? 'Đang tải...' : 'Chọn loại khiếu nại'}</option>
              {categories.data?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </Select>
          </label>
          {category && categories.data ? <p className="text-xs text-brand-muted">{categories.data.find((item) => item.value === category)?.description}</p> : null}
          {categories.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(categories.error)}</p> : null}

          <label className="block text-xs font-semibold text-brand-muted">Mô tả vấn đề
            <textarea className={`${inputClass} min-h-32 resize-y`} maxLength={disputeDescriptionLimits.max} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả cụ thể chuyện gì đã xảy ra, ở khu vực nào, vào lúc nào..." value={description} />
            <span className="mt-1 block text-right font-normal">{trimmed.length}/{disputeDescriptionLimits.max}</span>
          </label>

          <div>
            <label className="block text-xs font-semibold text-brand-muted">Ảnh bằng chứng (không bắt buộc, JPG hoặc PNG, tối đa 5 MB mỗi ảnh, tối đa {disputeEvidenceMax} ảnh)
              <input accept={imageAccept} className={inputClass} multiple onChange={(event) => { evidence.add(event.target.files); event.target.value = '' }} type="file" />
            </label>
            {evidence.problem ? <p className="mt-2 text-sm text-red-700" role="alert">{evidence.problem}</p> : null}
            {evidence.files.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {evidence.files.map((file, index) => <li className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm" key={`${file.name}-${file.size}`}><span className="min-w-0 truncate">{file.name}</span><button aria-label={`Bỏ ảnh ${file.name}`} className="shrink-0 text-brand-muted hover:text-red-700" onClick={() => evidence.remove(index)} type="button"><X aria-hidden="true" className="h-4 w-4" /></button></li>)}
              </ul>
            ) : null}
          </div>
        </CustomerCard>

        {validation ? <p className={errorClass} role="alert">{validation}</p> : null}
        {open.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(open.error)}</p> : null}
        <button className={primaryButton} disabled={open.isPending || uploading} type="submit">{open.isPending ? 'Đang gửi khiếu nại...' : uploading ? 'Đang tải ảnh...' : 'Gửi khiếu nại'}</button>
      </form>
    </Page>
  )
}

export function DisputesPage() {
  const [page, setPage] = useState(1)
  const { data, error, isError, isPending } = useCustomerDisputes(page, 10)

  return (
    <Page back={{ label: 'Đơn của tôi', to: '/orders' }} title="Khiếu nại của tôi">
      {isPending ? <p className="text-sm text-brand-muted" role="status">Đang tải danh sách khiếu nại...</p>
        : isError ? <p className={errorClass} role="alert">{bookingErrorMessage(error)}</p>
        : data.items.length === 0 ? <CustomerCard className="p-8 text-center"><Scale aria-hidden="true" className="mx-auto h-8 w-8 text-brand-muted" /><p className="mt-3 text-sm text-brand-muted">Bạn chưa có khiếu nại nào. Khi gặp vấn đề với một ca đã hoàn tất, hãy mở khiếu nại ngay trong chi tiết đơn.</p></CustomerCard>
        : (
          <>
            <ul className="space-y-3">
              {data.items.map((dispute) => (
                <li key={dispute.id}>
                  <Link className="block rounded-2xl border border-brand-border bg-white p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition hover:border-slate-300" to={`/disputes/${dispute.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="text-xs text-brand-muted">Đơn #{dispute.bookingNumber}</p><p className="mt-1 font-semibold">{disputeCategoryLabels[dispute.category]} · {dispute.providerName}</p><p className="mt-1 line-clamp-2 text-sm text-brand-muted">{dispute.description}</p></div>
                      <div className="text-right"><StatusPill tone={statusTone[dispute.status]}>{disputeStatusLabels[dispute.status]}</StatusPill><p className="mt-2 text-xs text-brand-muted">{vnDateTime(dispute.createdAtUtc)}</p></div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {data.totalPages > 1 ? <div className="mt-6 flex items-center justify-center gap-3 text-sm"><button className="rounded-lg px-3 py-2 text-brand-muted hover:bg-slate-100 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">Trang trước</button><span>{data.page} / {data.totalPages}</span><button className="rounded-lg px-3 py-2 text-brand-muted hover:bg-slate-100 disabled:opacity-40" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} type="button">Trang sau</button></div> : null}
          </>
        )}
    </Page>
  )
}

function AddEvidence({ disputeId }: { disputeId: string }) {
  const upload = useUploadDisputeEvidence(disputeId)
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [fileKey, setFileKey] = useState(0)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) { setProblem('Vui lòng chọn một ảnh.'); return }
    upload.mutate({ file, description }, { onSuccess: () => { setFile(null); setDescription(''); setFileKey((key) => key + 1) } })
  }

  return (
    <form className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4" onSubmit={submit}>
      <p className="text-sm font-semibold">Bổ sung ảnh bằng chứng</p>
      <label className="block text-xs font-semibold text-brand-muted">Ảnh (JPG hoặc PNG, tối đa 5 MB)
        <input accept={imageAccept} className={inputClass} key={fileKey} onChange={(event) => { const next = event.target.files?.[0] ?? null; setFile(next); setProblem(next ? imageFileProblem(next) : null) }} type="file" />
      </label>
      <label className="block text-xs font-semibold text-brand-muted">Mô tả ảnh (không bắt buộc)
        <input className={inputClass} maxLength={300} onChange={(event) => setDescription(event.target.value)} value={description} />
      </label>
      {problem ? <p className="text-sm text-red-700" role="alert">{problem}</p> : null}
      {upload.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(upload.error)}</p> : null}
      <button className={primaryButton} disabled={Boolean(problem) || upload.isPending} type="submit">{upload.isPending ? 'Đang tải lên...' : 'Tải ảnh lên'}</button>
    </form>
  )
}

export function DisputeDetailPage() {
  const { disputeId } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const { data: dispute, error, isPending } = useCustomerDispute(disputeId)
  const send = useSendDisputeMessage(disputeId ?? '')
  const back = { label: 'Khiếu nại của tôi', to: '/disputes' }
  const evidenceErrors = (location.state as { evidenceErrors?: string[] } | null)?.evidenceErrors

  if (isPending) return <Page back={back} title="Chi tiết khiếu nại"><p className="text-sm text-brand-muted" role="status">Đang tải khiếu nại...</p></Page>
  if (!dispute) return <Page back={back} title="Chi tiết khiếu nại"><p className={errorClass} role="alert">{bookingErrorMessage(error)}</p></Page>

  const finished = disputeTerminalStatuses.includes(dispute.status)
  const mine = dispute.evidence.filter((item) => item.uploadedByUserId === user?.id).length

  return (
    <Page back={back} title={`Khiếu nại đơn #${dispute.bookingNumber}`}>
      {evidenceErrors && evidenceErrors.length > 0 ? (
        <div className={`${errorClass} mb-5`} role="alert">
          <p className="font-semibold">Khiếu nại đã được gửi nhưng một số ảnh chưa tải lên được:</p>
          <ul className="mt-1 list-disc pl-5">{evidenceErrors.map((message) => <li key={message}>{message}</li>)}</ul>
          <p className="mt-1">Bạn có thể bổ sung lại ở mục "Ảnh bằng chứng" bên dưới.</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <CustomerCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs text-brand-muted">{disputeCategoryLabels[dispute.category]} · {dispute.providerName}</p><p className="mt-1 text-sm text-brand-muted">Gửi lúc {vnDateTime(dispute.createdAtUtc)}</p></div>
              <StatusPill tone={statusTone[dispute.status]}>{disputeStatusLabels[dispute.status]}</StatusPill>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm">{dispute.description}</p>
            {!finished ? <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">ABSTRICT sẽ phản hồi trước {vnDateTime(dispute.responseDeadlineUtc)}.</p> : null}
            <Link className="mt-4 inline-block text-sm font-semibold text-brand-purple hover:underline" to={`/orders/${dispute.bookingId}`}>Xem đơn #{dispute.bookingNumber}</Link>
          </CustomerCard>

          {dispute.decisions.length > 0 ? (
            <CustomerCard className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Quyết định của ABSTRICT</h2>
              {dispute.decisions.map((decision) => (
                <div className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm" key={decision.id}>
                  <p className="font-semibold text-emerald-900">{decision.outcomeCode}</p>
                  <p className="mt-1 whitespace-pre-line text-emerald-900">{decision.reason}</p>
                  <dl className="mt-3 space-y-1 text-emerald-900">
                    {decision.refundAmountVnd !== null ? <div className="flex justify-between gap-3"><dt>Hoàn lại cho bạn</dt><dd className="font-semibold">{formatVnd(decision.refundAmountVnd)}</dd></div> : null}
                    {decision.providerAmountVnd !== null ? <div className="flex justify-between gap-3"><dt>Trả cho người làm</dt><dd className="font-semibold">{formatVnd(decision.providerAmountVnd)}</dd></div> : null}
                  </dl>
                  <p className="mt-2 text-xs text-emerald-800">{vnDateTime(decision.decidedAtUtc)}</p>
                </div>
              ))}
            </CustomerCard>
          ) : null}

          <CustomerCard className="p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Ảnh bằng chứng</h2>
            <EvidenceGrid evidence={dispute.evidence} />
            {!finished && mine < disputeEvidenceMax ? <AddEvidence disputeId={dispute.id} /> : null}
            {!finished && mine >= disputeEvidenceMax ? <p className="mt-4 text-sm text-brand-muted">Bạn đã gửi tối đa {disputeEvidenceMax} ảnh.</p> : null}
          </CustomerCard>
        </div>

        <CustomerCard className="h-fit p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Trao đổi với ABSTRICT</h2>
          <MessageThread customerUserId={dispute.customerUserId} messages={dispute.messages} viewer="customer" />
          {finished
            ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-brand-muted">Khiếu nại đã có quyết định nên không nhắn thêm được.</p>
            : <MessageComposer error={send.isError ? bookingErrorMessage(send.error) : null} isPending={send.isPending} label="Tin nhắn cho ABSTRICT" onSend={(body) => send.mutateAsync(body)} />}
        </CustomerCard>
      </div>
    </Page>
  )
}
