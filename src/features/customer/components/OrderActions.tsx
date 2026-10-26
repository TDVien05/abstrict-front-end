import { Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { bookingErrorMessage, bookingPhotoTypeLabels } from '../../../entities/booking'
import { vnDateTime } from '../../../shared/lib/vn-time'
import { ProtectedImage } from '../../../shared/ui/ProtectedImage'
import { useAcceptWork, type BookingDetail } from '../api/bookings'
import { useCustomerDisputes } from '../api/disputes'
import { ratingCommentMaxLength, useCreateRating, useMyRating } from '../api/ratings'
import { CustomerCard } from './CustomerPrimitives'

const primaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-charcoal hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const errorClass = 'mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700'

export function AcceptWorkPanel({ booking }: { booking: BookingDetail }) {
  const accept = useAcceptWork(booking.id)
  const [confirming, setConfirming] = useState(false)

  return (
    <CustomerCard className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Nghiệm thu công việc</h2>
      <p className="mt-1 text-sm text-brand-muted">{booking.providerDisplayName} đã báo hoàn tất ca. Kiểm tra ảnh và checklist rồi nghiệm thu để hoàn thành đơn. Nếu công việc chưa đạt, bạn có thể mở khiếu nại thay vì nghiệm thu.</p>
      {accept.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(accept.error)}</p> : null}
      {confirming ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={primaryButton} disabled={accept.isPending} onClick={() => accept.mutate()} type="button">{accept.isPending ? 'Đang nghiệm thu...' : 'Xác nhận nghiệm thu'}</button>
          <button className={secondaryButton} onClick={() => setConfirming(false)} type="button">Quay lại</button>
        </div>
      ) : <button className={`${primaryButton} mt-4 w-full`} onClick={() => setConfirming(true)} type="button">Nghiệm thu công việc</button>}
    </CustomerCard>
  )
}

function Stars({ score }: { score: number }) {
  return <span aria-label={`${score} trên 5 sao`} className="inline-flex gap-0.5" role="img">{[1, 2, 3, 4, 5].map((value) => <Star aria-hidden="true" className={`h-4 w-4 ${value <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} key={value} />)}</span>
}

function RatingForm({ booking }: { booking: BookingDetail }) {
  const create = useCreateRating(booking.id)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [missing, setMissing] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (score === 0) { setMissing(true); return }
    create.mutate({ score, comment: comment.trim() || undefined })
  }

  return (
    <CustomerCard className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Đánh giá {booking.providerDisplayName}</h2>
      <p className="mt-1 text-sm text-brand-muted">Đánh giá được công khai ngay trên hồ sơ của đối tác và chỉ gửi được một lần.</p>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <fieldset>
          <legend className="text-xs font-semibold text-brand-muted">Mức độ hài lòng</legend>
          <div className="mt-2 flex gap-1" role="radiogroup">
            {[1, 2, 3, 4, 5].map((value) => (
              <button aria-checked={score === value} aria-label={`${value} sao`} className="rounded-lg p-1 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-purple" key={value} onClick={() => { setScore(value); setMissing(false) }} role="radio" type="button">
                <Star aria-hidden="true" className={`h-8 w-8 ${value <= score ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
          {missing ? <p className="mt-1 text-xs text-red-700" role="alert">Vui lòng chọn số sao.</p> : null}
        </fieldset>
        <label className="block text-xs font-semibold text-brand-muted">Nhận xét (không bắt buộc)
          <textarea className="mt-2 min-h-24 w-full resize-y rounded-xl border border-brand-border bg-white p-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal" maxLength={ratingCommentMaxLength} onChange={(event) => setComment(event.target.value)} value={comment} />
          <span className="mt-1 block text-right font-normal">{comment.length}/{ratingCommentMaxLength}</span>
        </label>
        {create.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(create.error)}</p> : null}
        <button className={`${primaryButton} w-full`} disabled={create.isPending} type="submit">{create.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
      </form>
    </CustomerCard>
  )
}

export function RatingPanel({ booking }: { booking: BookingDetail }) {
  const canRate = booking.allowedActions.includes('RateProvider')
  // Chỉ hỏi server khi đơn có thể đã được đánh giá, để không gọi thừa cho các đơn chưa hoàn thành.
  const mine = useMyRating(booking.id, !canRate && (booking.status === 'Completed' || booking.status === 'Disputed'))

  if (canRate) return <RatingForm booking={booking} />
  if (!mine.data) return null
  return (
    <CustomerCard className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Đánh giá của bạn</h2>
      <div className="mt-3 flex items-center gap-2"><Stars score={mine.data.score} /><span className="text-xs text-brand-muted">{vnDateTime(mine.data.createdAtUtc)}</span></div>
      {mine.data.comment ? <p className="mt-2 whitespace-pre-line text-sm">{mine.data.comment}</p> : <p className="mt-2 text-sm text-brand-muted">Bạn không để lại nhận xét.</p>}
    </CustomerCard>
  )
}

export function DisputePanel({ booking }: { booking: BookingDetail }) {
  const canOpen = booking.allowedActions.includes('OpenDispute')
  const disputed = booking.status === 'Disputed'
  const disputes = useCustomerDisputes(1, 50, disputed && !canOpen)
  const existing = disputes.data?.items.find((item) => item.bookingId === booking.id)

  if (canOpen) {
    return (
      <CustomerCard className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Công việc có vấn đề?</h2>
        <p className="mt-1 text-sm text-brand-muted">Gửi khiếu nại kèm ảnh bằng chứng để ABSTRICT xem xét. Mỗi đơn chỉ khiếu nại được một lần.</p>
        <Link className={`${secondaryButton} mt-4 w-full`} to={`/orders/${booking.id}/dispute`}>Mở khiếu nại</Link>
      </CustomerCard>
    )
  }
  if (disputed) {
    return (
      <CustomerCard className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Đơn đang có khiếu nại</h2>
        <Link className={`${secondaryButton} mt-4 w-full`} to={existing ? `/disputes/${existing.id}` : '/disputes'}>Xem khiếu nại</Link>
      </CustomerCard>
    )
  }
  return null
}

export function ProgressPhotos({ booking }: { booking: BookingDetail }) {
  if (booking.photos.length === 0) return null
  const taskLabel = (id: string | null) => {
    const task = booking.tasks.find((item) => item.id === id)
    return task ? `${task.areaName}: ${task.description}` : null
  }

  return (
    <CustomerCard className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Ảnh tiến độ</h2>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {booking.photos.map((photo) => (
          <li key={photo.id}>
            <ProtectedImage alt={`${bookingPhotoTypeLabels[photo.type]}${photo.caption ? `: ${photo.caption}` : ''}`} className="aspect-square w-full" contentUrl={photo.contentUrl} />
            <p className="mt-2 text-sm font-semibold">{bookingPhotoTypeLabels[photo.type]}</p>
            {photo.caption ? <p className="text-xs text-brand-muted">{photo.caption}</p> : null}
            {taskLabel(photo.bookingTaskId) ? <p className="text-xs text-brand-muted">{taskLabel(photo.bookingTaskId)}</p> : null}
            <p className="text-xs text-brand-muted">{vnDateTime(photo.takenAtUtc)}</p>
          </li>
        ))}
      </ul>
    </CustomerCard>
  )
}
