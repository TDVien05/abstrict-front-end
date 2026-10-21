import { useState, type FormEvent } from 'react'
import { vnDateTime } from '../../../shared/lib/vn-time'
import { ProtectedImage } from '../../../shared/ui/ProtectedImage'
import { disputeMessageMaxLength, type DisputeEvidence, type DisputeMessage } from '../api/disputes'

export function EvidenceGrid({ evidence }: { evidence: DisputeEvidence[] }) {
  if (evidence.length === 0) return <p className="text-sm text-brand-muted">Chưa có ảnh bằng chứng nào.</p>
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {evidence.map((item) => (
        <li key={item.id}>
          <ProtectedImage alt={item.description ?? 'Ảnh bằng chứng'} className="aspect-square w-full" contentUrl={item.contentUrl} />
          {item.description ? <p className="mt-2 text-xs">{item.description}</p> : null}
          <p className="text-xs text-brand-muted">{vnDateTime(item.createdAtUtc)}</p>
        </li>
      ))}
    </ul>
  )
}

type Viewer = 'customer' | 'admin'

function authorLabel(message: DisputeMessage, customerUserId: string, viewer: Viewer) {
  if (message.authorUserId === customerUserId) return viewer === 'customer' ? 'Bạn' : 'Khách hàng'
  return viewer === 'customer' ? 'ABSTRICT' : 'Quản trị viên'
}

export function MessageThread({ customerUserId, messages, viewer }: { customerUserId: string; messages: DisputeMessage[]; viewer: Viewer }) {
  if (messages.length === 0) return <p className="text-sm text-brand-muted">Chưa có tin nhắn nào.</p>
  return (
    <ol className="space-y-3">
      {messages.map((message) => {
        const mine = (viewer === 'customer') === (message.authorUserId === customerUserId)
        return (
          <li className={`rounded-xl p-3 text-sm ${message.isInternalAdminNote ? 'border border-dashed border-amber-300 bg-amber-50' : mine ? 'bg-brand-blue-pastel-soft' : 'bg-slate-50'}`} key={message.id}>
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-brand-muted">
              {authorLabel(message, customerUserId, viewer)}
              {message.isInternalAdminNote ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Ghi chú nội bộ</span> : null}
              <time className="font-normal" dateTime={message.createdAtUtc}>{vnDateTime(message.createdAtUtc)}</time>
            </p>
            <p className="mt-1 whitespace-pre-line">{message.body}</p>
          </li>
        )
      })}
    </ol>
  )
}

export function MessageComposer({ allowInternalNote = false, error, isPending, label, onSend }: {
  allowInternalNote?: boolean
  error?: string | null
  isPending: boolean
  label: string
  onSend: (body: string, internalNote: boolean) => Promise<unknown> | void
}) {
  const [body, setBody] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const trimmed = body.trim()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!trimmed) return
    try {
      await onSend(trimmed, internalNote)
      setBody('')
    } catch {
      // Lỗi được hiển thị qua `error` do trang cha giữ; nội dung đã nhập được giữ lại để gửi lại.
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={(event) => void submit(event)}>
      <label className="block text-xs font-semibold text-brand-muted">{label}
        <textarea className="mt-2 min-h-20 w-full resize-y rounded-xl border border-brand-border bg-white p-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal" maxLength={disputeMessageMaxLength} onChange={(event) => setBody(event.target.value)} value={body} />
      </label>
      {allowInternalNote ? <label className="flex items-center gap-2 text-sm"><input checked={internalNote} className="h-4 w-4 accent-brand-charcoal" onChange={(event) => setInternalNote(event.target.checked)} type="checkbox" />Ghi chú nội bộ (khách hàng không nhìn thấy)</label> : null}
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
      <button className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50" disabled={!trimmed || isPending} type="submit">{isPending ? 'Đang gửi...' : 'Gửi tin nhắn'}</button>
    </form>
  )
}
