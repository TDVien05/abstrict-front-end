import { Camera, Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { bookingErrorMessage, bookingPhotoTypeLabels, bookingTaskStatusLabels, type BookingTask } from '../../../entities/booking'
import { imageAccept, imageFileProblem } from '../../../shared/api/protected-image'
import { vnDateTime } from '../../../shared/lib/vn-time'
import { Button } from '../../../shared/ui/Button'
import { ProtectedImage } from '../../../shared/ui/ProtectedImage'
import { QrScanner } from '../../../shared/ui/QrScanner'
import { Select } from '../../../shared/ui/Select'
import {
  checkInTokenLength,
  photoCaptionMaxLength,
  taskStatusOptions,
  useCheckIn,
  useCompleteWork,
  useUpdateTaskStatus,
  useUploadProgressPhoto,
  type FreelancerBookingDetail,
} from '../api/bookings'
import { PartnerPanel, partnerInput } from './PartnerPrimitives'

const errorClass = 'mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700'

export function CheckInPanel({ order }: { order: FreelancerBookingDetail }) {
  const checkIn = useCheckIn(order.id)
  const [token, setToken] = useState('')
  const [scanning, setScanning] = useState(false)
  const trimmed = token.trim()
  const tokenProblem = trimmed.length > 0 && (trimmed.length < checkInTokenLength.min || trimmed.length > checkInTokenLength.max)
    ? `Mã check-in dài ${checkInTokenLength.min} đến ${checkInTokenLength.max} ký tự.` : null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (trimmed && !tokenProblem) checkIn.mutate(trimmed)
  }

  // Quét xong thì check-in luôn: mã chỉ sống 120 giây và dùng một lần.
  function scanned(text: string) {
    setScanning(false)
    setToken(text)
    const value = text.trim()
    if (value.length >= checkInTokenLength.min && value.length <= checkInTokenLength.max) checkIn.mutate(value)
  }

  return (
    <PartnerPanel title="Check-in tại nơi làm">
      <p className="text-sm text-brand-muted">Quét mã QR trong đơn của khách khi bạn đến nơi. Mã tự đổi liên tục và dùng được một lần.</p>
      {scanning ? <div className="mt-4"><QrScanner onCancel={() => setScanning(false)} onScan={scanned} /></div> : (
        <Button className="mt-4 w-full" onClick={() => { checkIn.reset(); setScanning(true) }} variant="secondary"><Camera aria-hidden="true" className="mr-2 h-4 w-4" />Quét mã QR bằng camera</Button>
      )}
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <label className="block text-sm font-semibold" htmlFor={`checkin-${order.id}`}>Hoặc nhập mã check-in
          <input autoComplete="off" className={`${partnerInput} mt-2 font-mono text-xs`} id={`checkin-${order.id}`} maxLength={checkInTokenLength.max + 20} onChange={(event) => setToken(event.target.value)} spellCheck={false} value={token} />
        </label>
        {tokenProblem ? <p className="text-sm text-red-700" role="alert">{tokenProblem}</p> : null}
        {checkIn.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(checkIn.error)}</p> : null}
        <Button className="w-full" disabled={!trimmed || Boolean(tokenProblem)} isLoading={checkIn.isPending} type="submit">Check-in</Button>
      </form>
    </PartnerPanel>
  )
}

export function CheckInHint({ order }: { order: FreelancerBookingDetail }) {
  return (
    <PartnerPanel title="Check-in tại nơi làm">
      <p className="text-sm text-brand-muted">Check-in mở từ 30 phút trước giờ bắt đầu ({vnDateTime(order.startsAtUtc)}) đến hết giờ kết thúc ca.</p>
    </PartnerPanel>
  )
}

function TaskRow({ editable, order, task }: { editable: boolean; order: FreelancerBookingDetail; task: BookingTask }) {
  const update = useUpdateTaskStatus(order.id)
  const done = task.status === 'Completed'

  return (
    <li className="rounded-xl border border-brand-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-start gap-2"><Check aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${done ? 'text-brand-green' : 'text-slate-300'}`} /><span><span className="text-brand-muted">{task.areaName}: </span>{task.description}</span></span>
        {editable ? (
          <Select aria-label={`Trạng thái: ${task.areaName} - ${task.description}`} className={`${partnerInput} !min-h-9 !w-40 !py-1 text-sm`} disabled={update.isPending} onChange={(event) => update.mutate({ taskId: task.id, status: event.target.value as BookingTask['status'] })} value={task.status}>
            {taskStatusOptions.map((status) => <option key={status} value={status}>{bookingTaskStatusLabels[status]}</option>)}
          </Select>
        ) : <span className="text-xs font-semibold text-brand-muted">{bookingTaskStatusLabels[task.status]}</span>}
      </div>
      {update.isError ? <p className="mt-2 text-red-700" role="alert">{bookingErrorMessage(update.error)}</p> : null}
    </li>
  )
}

export function ChecklistPanel({ order }: { order: FreelancerBookingDetail }) {
  const editable = order.allowedActions.includes('UploadPhotos') || order.allowedActions.includes('CompleteWork')
  if (order.tasks.length === 0) return null
  const sorted = [...order.tasks].sort((a, b) => a.sortOrder - b.sortOrder)
  const finished = order.tasks.filter((task) => task.status === 'Completed').length

  return (
    <PartnerPanel title="Công việc trong ca">
      {editable || finished > 0 ? <p className="mb-3 text-sm text-brand-muted">Đã xong {finished}/{order.tasks.length} mục.{editable ? ' Cập nhật trạng thái từng mục trong lúc làm.' : ''}</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2">{sorted.map((task) => <TaskRow editable={editable} key={task.id} order={order} task={task} />)}</ul>
    </PartnerPanel>
  )
}

function PhotoUploadForm({ order }: { order: FreelancerBookingDetail }) {
  const upload = useUploadProgressPhoto(order.id)
  const [type, setType] = useState<'Before' | 'After'>('Before')
  const [taskId, setTaskId] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [problem, setProblem] = useState<string | null>(null)

  function pick(next: File | null) {
    setFile(next)
    setProblem(next ? imageFileProblem(next) : null)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!file) { setProblem('Vui lòng chọn một ảnh.'); return }
    const fileProblem = imageFileProblem(file)
    if (fileProblem) { setProblem(fileProblem); return }
    upload.mutate({ file, type, bookingTaskId: taskId || undefined, caption }, {
      onSuccess: () => { setFile(null); setCaption(''); setFileKey((key) => key + 1) },
    })
  }

  return (
    <form className="mt-5 space-y-3 rounded-xl bg-brand-sand p-4" onSubmit={submit}>
      <p className="text-sm font-semibold">Tải ảnh tiến độ</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Loại ảnh
          <Select className={`${partnerInput} mt-2`} onChange={(event) => setType(event.target.value as 'Before' | 'After')} value={type}>
            <option value="Before">{bookingPhotoTypeLabels.Before}</option>
            <option value="After">{bookingPhotoTypeLabels.After}</option>
          </Select>
        </label>
        <label className="block text-sm font-semibold">Gắn với mục công việc (không bắt buộc)
          <Select className={`${partnerInput} mt-2`} onChange={(event) => setTaskId(event.target.value)} value={taskId}>
            <option value="">Cả ca làm</option>
            {order.tasks.map((task) => <option key={task.id} value={task.id}>{task.areaName}: {task.description}</option>)}
          </Select>
        </label>
      </div>
      <label className="block text-sm font-semibold">Ảnh (JPG hoặc PNG, tối đa 5 MB)
        <input accept={imageAccept} className={`${partnerInput} mt-2 bg-white`} key={fileKey} onChange={(event) => pick(event.target.files?.[0] ?? null)} type="file" />
      </label>
      <label className="block text-sm font-semibold">Chú thích (không bắt buộc)
        <input className={`${partnerInput} mt-2`} maxLength={photoCaptionMaxLength} onChange={(event) => setCaption(event.target.value)} value={caption} />
      </label>
      {problem ? <p className="text-sm text-red-700" role="alert">{problem}</p> : null}
      {upload.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(upload.error)}</p> : null}
      <Button disabled={Boolean(problem)} isLoading={upload.isPending} type="submit">Tải ảnh lên</Button>
    </form>
  )
}

export function PhotosPanel({ order }: { order: FreelancerBookingDetail }) {
  const canUpload = order.allowedActions.includes('UploadPhotos')
  if (!canUpload && order.photos.length === 0) return null
  const taskLabel = (id: string | null) => {
    const task = order.tasks.find((item) => item.id === id)
    return task ? `${task.areaName}: ${task.description}` : null
  }

  return (
    <PartnerPanel title="Ảnh tiến độ">
      {order.photos.length === 0 ? <p className="text-sm text-brand-muted">Chưa có ảnh nào. Chụp ảnh trước và sau khi làm để khách nghiệm thu.</p> : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {order.photos.map((photo) => (
            <li key={photo.id}>
              <ProtectedImage alt={`${bookingPhotoTypeLabels[photo.type]}${photo.caption ? `: ${photo.caption}` : ''}`} className="aspect-square w-full" contentUrl={photo.contentUrl} />
              <p className="mt-2 text-sm font-semibold">{bookingPhotoTypeLabels[photo.type]}</p>
              {photo.caption ? <p className="text-xs text-brand-muted">{photo.caption}</p> : null}
              {taskLabel(photo.bookingTaskId) ? <p className="text-xs text-brand-muted">{taskLabel(photo.bookingTaskId)}</p> : null}
            </li>
          ))}
        </ul>
      )}
      {canUpload ? <PhotoUploadForm order={order} /> : null}
    </PartnerPanel>
  )
}

export function CompleteWorkPanel({ order }: { order: FreelancerBookingDetail }) {
  const complete = useCompleteWork(order.id)
  const [confirming, setConfirming] = useState(false)
  // Server chỉ cho phép hoàn tất sau khi đã có ảnh "Sau khi làm" nên lấy `allowedActions` làm căn cứ.
  const canComplete = order.allowedActions.includes('CompleteWork')

  return (
    <PartnerPanel title="Hoàn tất ca">
      <p className="text-sm text-brand-muted">Khi làm xong, hoàn tất ca để khách nghiệm thu. Sau bước này bạn không sửa được checklist hay tải thêm ảnh.</p>
      {!canComplete ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">Cần tải ít nhất một ảnh "{bookingPhotoTypeLabels.After}" trước khi hoàn tất ca.</p> : null}
      {complete.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(complete.error)}</p> : null}
      {confirming ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button isLoading={complete.isPending} onClick={() => complete.mutate(undefined)}>Xác nhận hoàn tất ca</Button>
          <Button onClick={() => setConfirming(false)} variant="ghost">Quay lại</Button>
        </div>
      ) : <Button className="mt-4 w-full" disabled={!canComplete} onClick={() => setConfirming(true)}>Hoàn tất ca</Button>}
    </PartnerPanel>
  )
}
