import { useState, type FormEvent } from 'react'
import { bookingErrorMessage } from '../../../entities/booking'
import { Button } from '../../../shared/ui/Button'
import { useRespondToBooking, type FreelancerBookingAction } from '../api/bookings'
import { partnerInput } from './PartnerPrimitives'

export function BookingResponseActions({ allowedActions, bookingId, summary }: { allowedActions: FreelancerBookingAction[]; bookingId: string; summary: string }) {
  const respond = useRespondToBooking(bookingId)
  const [action, setAction] = useState<'accept' | 'reject' | null>(null)
  const [reason, setReason] = useState('')

  function choose(next: 'accept' | 'reject' | null) {
    respond.reset()
    setAction(next)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    respond.mutate(action === 'accept' ? { accept: true } : { accept: false, reason })
  }

  if (allowedActions.length === 0) return null

  return (
    <div>
      {/* Quá hạn xác nhận thì server chỉ còn cho từ chối. */}
      <div className="flex flex-wrap gap-3">{allowedActions.includes('Confirm') && <Button onClick={() => choose('accept')}>Xác nhận nhận ca</Button>}{allowedActions.includes('Reject') && <Button variant="secondary" onClick={() => choose('reject')}>Từ chối</Button>}</div>
      {action && (
        <form className="mt-5 space-y-3 border-t border-brand-border pt-4" onSubmit={submit}>
          {action === 'reject'
            ? <><label className="block text-sm font-semibold" htmlFor={`reason-${bookingId}`}>Lý do từ chối</label><select className={partnerInput} id={`reason-${bookingId}`} onChange={(event) => setReason(event.target.value)} required value={reason}><option value="">Chọn lý do</option><option>Bận việc đột xuất</option><option>Khoảng cách quá xa</option><option>Không phù hợp kỹ năng</option></select><p className="text-sm text-brand-muted">Khách sẽ được hoàn đủ tiền cọc.</p></>
            : <p className="text-sm">Bạn muốn nhận ca {summary}?</p>}
          <div className="flex flex-wrap gap-2"><Button isLoading={respond.isPending} type="submit">{action === 'accept' ? 'Đồng ý nhận ca' : 'Gửi lý do từ chối'}</Button><Button variant="ghost" onClick={() => choose(null)}>Quay lại</Button></div>
        </form>
      )}
      {respond.isError && <p className="mt-4 text-sm text-red-700" role="alert">{bookingErrorMessage(respond.error)} Trạng thái đơn không thay đổi.</p>}
    </div>
  )
}
