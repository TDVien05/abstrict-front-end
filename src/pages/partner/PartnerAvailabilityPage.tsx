import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { bookingErrorMessage } from '../../entities/booking'
import { useCreateAvailability, useDeleteAvailability, useMyAvailability } from '../../features/partner/api/bookings'
import { PartnerPage, PartnerPanel, partnerInput } from '../../features/partner/components/PartnerPrimitives'
import { durationHours, vnDateLabel, vnIsoDate, vnTimeRange, vnToUtcIso } from '../../shared/lib/vn-time'
import { Button } from '../../shared/ui/Button'

const horizonDays = 30
const timeOptions = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}`)

export function PartnerAvailabilityPage() {
  const today = vnIsoDate()
  const { data: windows, error, isError, isPending } = useMyAvailability(today, horizonDays)
  const create = useCreateAvailability()
  const remove = useDeleteAvailability()
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const tooShort = durationHours(vnToUtcIso(date, startTime), vnToUtcIso(date, endTime)) < 2

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate({ startsAtUtc: vnToUtcIso(date, startTime), endsAtUtc: vnToUtcIso(date, endTime) })
  }

  return <PartnerPage title="Lịch làm việc" description="Mở các khoảng rảnh để khách hàng đặt ca. Khách chỉ đặt được trong những khoảng bạn đã mở.">
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <PartnerPanel className="h-fit" title="Thêm khoảng rảnh">
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold">Ngày<input className={`${partnerInput} mt-2`} min={today} onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-semibold">Từ<select className={`${partnerInput} mt-2`} onChange={(event) => setStartTime(event.target.value)} value={startTime}>{timeOptions.map((time) => <option key={time}>{time}</option>)}</select></label>
            <label className="block text-sm font-semibold">Đến<select className={`${partnerInput} mt-2`} onChange={(event) => setEndTime(event.target.value)} value={endTime}>{timeOptions.map((time) => <option key={time}>{time}</option>)}</select></label>
          </div>
          <p className={`text-sm ${tooShort ? 'text-red-700' : 'text-brand-muted'}`}>Mỗi khoảng rảnh tối thiểu 2 giờ, theo bước 30 phút, không chồng lên khoảng đã mở.</p>
          {create.isError && <p className="text-sm text-red-700" role="alert">{bookingErrorMessage(create.error)}</p>}
          <Button disabled={tooShort} isLoading={create.isPending} type="submit">Mở khoảng rảnh</Button>
        </form>
      </PartnerPanel>

      <PartnerPanel title={`Khoảng rảnh ${horizonDays} ngày tới`}>
        {isPending ? <p className="text-brand-muted" role="status">Đang tải lịch rảnh...</p>
          : isError ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(error)}</p>
          : windows.length === 0 ? <p className="text-brand-muted">Bạn chưa mở khoảng rảnh nào.</p>
          : <ul className="divide-y divide-brand-border">{windows.map((window) => <li className="flex items-center justify-between gap-4 py-3" key={window.id}><div><p className="font-semibold first-letter:uppercase">{vnDateLabel(window.startsAtUtc)}</p><p className="text-sm text-brand-purple">{vnTimeRange(window.startsAtUtc, window.endsAtUtc)} · {durationHours(window.startsAtUtc, window.endsAtUtc)} giờ</p></div><Button aria-label={`Xóa khoảng rảnh ${vnDateLabel(window.startsAtUtc)} ${vnTimeRange(window.startsAtUtc, window.endsAtUtc)}`} disabled={remove.isPending} onClick={() => remove.mutate(window.id)} variant="ghost"><Trash2 aria-hidden="true" className="h-4 w-4" /></Button></li>)}</ul>}
        {remove.isError && <p className="mt-4 text-sm text-red-700" role="alert">{bookingErrorMessage(remove.error)}</p>}
      </PartnerPanel>
    </div>
  </PartnerPage>
}
