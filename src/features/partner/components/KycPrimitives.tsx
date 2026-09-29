import { useEffect, useRef } from 'react'
import type { ComponentType, InputHTMLAttributes, PropsWithChildren, ReactNode } from 'react'
import { CloudUpload, Eye, FileText, FileUp, RefreshCw, ScanFace, X } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { PartnerRegistrationValues } from '../registration-schema'

export const kycInput = 'w-full min-w-0 min-h-11 rounded-lg border border-transparent bg-brand-sand px-3 py-2 outline-none transition focus:border-brand-blue-pastel-hover focus:bg-white focus:ring-2 focus:ring-brand-blue-pastel'
export const kycFocus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-pastel-hover'
export const kycAction = 'inline-flex min-h-8 items-center justify-center gap-1 rounded-lg bg-brand-blue-pastel px-2 py-1 text-sm font-semibold text-brand-charcoal transition hover:bg-brand-blue-pastel-hover'

export function KycSection({ id, title, note, icon: Icon, children, referenceLayout = false }: PropsWithChildren<{ id: string; title: string; note: ReactNode; referenceLayout?: boolean; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }>) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`min-w-0 scroll-mt-24 overflow-hidden bg-white lg:scroll-mt-32 ${referenceLayout ? 'rounded-xl shadow-sm' : 'rounded-2xl'}`}>
      <header className={`flex items-center justify-between gap-3 bg-brand-blue-pastel-soft py-4 ${referenceLayout ? 'px-6 sm:px-8' : 'px-4 sm:px-6'}`}>
        <div className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden className="h-5 w-5 shrink-0 text-brand-blue-ink" />
          <h2 id={`${id}-title`} title={title} className="truncate text-base font-semibold leading-6 sm:text-lg">{title}</h2>
        </div>
        <span className={`${referenceLayout ? 'max-w-[38%] rounded bg-white px-2.5 py-1 text-right' : 'whitespace-nowrap'} shrink-0 text-sm text-brand-blue-ink`}>{note}</span>
      </header>
      <div className="p-6 sm:p-8">{children}</div>
    </section>
  )
}

type TextField = 'fullName' | 'phone' | 'birthDate' | 'permanentAddress' | 'currentAddress' | 'bankAccount' | 'accountName'

export function KycField({ name, label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { name: TextField; label: string; hint?: string }) {
  const { register, formState: { errors } } = useFormContext<PartnerRegistrationValues>()
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold" htmlFor={name}>{label} <span aria-hidden>*</span></label>
      <input id={name} className={kycInput} {...props} {...register(name)} aria-required="true" aria-invalid={Boolean(errors[name])} aria-describedby={[hint ? `${name}-hint` : '', errors[name] ? `${name}-error` : ''].filter(Boolean).join(' ') || undefined} />
      {hint && <p id={`${name}-hint`} className="mt-2 text-sm text-brand-muted">{hint}</p>}
      {errors[name] && <p id={`${name}-error`} className="mt-2 text-sm text-red-700">{errors[name]?.message}</p>}
    </div>
  )
}

function PreviewImage({ file, example, alt, className }: { file?: File; example: string; alt: string; className: string }) {
  const ref = useRef<HTMLImageElement>(null)
  useEffect(() => {
    if (!file || !['image/jpeg', 'image/png'].includes(file.type) || file.size > 15 * 1024 * 1024) return
    const url = URL.createObjectURL(file)
    if (ref.current) ref.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img ref={ref} src={example} alt={file ? `Xem trước ${file.name}` : alt} className={className} />
}

type UploadField = 'front' | 'back' | 'portrait' | 'health' | 'judicial'

export function KycUpload({ name, label, example, children, compact = false, documentRow = false, icon: Icon = FileText, badge }: PropsWithChildren<{ name: UploadField; label: string; example?: string; compact?: boolean; documentRow?: boolean; icon?: typeof FileText; badge?: string }>) {
  const { register, control, setValue, formState: { errors } } = useFormContext<PartnerRegistrationValues>()
  const files = useWatch({ control, name })
  const file = files?.[0]
  const photo = ['front', 'back', 'portrait'].includes(name)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const registration = register(name)

  return (
    <div className={`flex min-w-0 flex-col ${compact ? '' : 'gap-3'}`}>
      {!compact && <div className="flex items-center justify-between gap-2"><label htmlFor={name} className="flex min-w-0 items-center gap-2 text-sm font-semibold">{!example && <Icon aria-hidden className="h-5 w-5 shrink-0 text-brand-muted" />}{label}</label><span className="shrink-0 rounded bg-white px-2 py-0.5 text-xs font-medium text-brand-blue-ink">{badge ?? (file ? 'Đã chọn tệp' : 'Chưa tải lên')}</span></div>}
      <input {...registration} ref={(element) => { registration.ref(element); inputRef.current = element }} id={name} aria-label={label} aria-invalid={Boolean(errors[name])} aria-describedby={`${name}-hint${errors[name] ? ` ${name}-error` : ''}`} className="sr-only" type="file" accept={photo ? 'image/jpeg,image/png' : 'image/jpeg,image/png,application/pdf'} />
      {example ? (
        <div className={`group relative rounded-xl bg-brand-sand ${compact ? 'h-28 w-28' : 'h-44 overflow-hidden p-2'}`}>
          <PreviewImage key={file ? `${file.name}-${file.lastModified}` : 'example'} file={file} example={example} alt={`${label} — ảnh minh họa`} className="h-full w-full rounded-lg object-cover" />
          <div className={`absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-brand-blue-ink/40 backdrop-blur-[2px] transition-opacity ${compact ? 'opacity-0 hover:opacity-100 focus-within:opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'}`}>
            {!compact && <button type="button" className={`${kycAction} ${kycFocus}`} aria-label={`Xem chi tiết ${label.toLowerCase()}`} onClick={() => dialogRef.current?.showModal()}><Eye aria-hidden className="h-4 w-4" />Xem chi tiết</button>}
            <button type="button" aria-label={`${file ? 'Thay' : 'Chọn'} ${label.toLowerCase()}`} onClick={() => inputRef.current?.click()} className={`${kycAction} ${kycFocus}`}>{file ? <RefreshCw aria-hidden className="h-4 w-4" /> : <FileUp aria-hidden className="h-4 w-4" />}{file ? 'Tải lại' : 'Chọn ảnh'}</button>
          </div>
          {compact && <span aria-hidden className="pointer-events-none absolute -right-2 -bottom-2 rounded-full bg-brand-blue-ink p-1 text-white shadow-md"><ScanFace className="h-4 w-4" /></span>}
        </div>
      ) : (
        <button type="button" aria-label={`${file ? 'Thay' : 'Chọn'} ${label.toLowerCase()}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files.length) setValue(name, event.dataTransfer.files, { shouldDirty: true, shouldValidate: true }) }} className={`w-full rounded-lg bg-white transition hover:bg-brand-blue-pastel-soft ${kycFocus} ${documentRow ? 'flex items-center justify-between gap-2 p-3.5 text-left' : 'flex flex-col items-center justify-center p-4 text-center'}`}>
          {documentRow ? <><span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-brand-sand"><FileText aria-hidden className="h-[22px] w-[22px]" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{file?.name ?? 'Chọn tệp giấy khám sức khỏe'}</span><span id={`${name}-hint`} className="block text-xs text-brand-muted">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'PDF, PNG, JPG · Tối đa 15 MB'}</span></span></span><FileUp aria-hidden className="h-[18px] w-[18px] shrink-0 text-brand-blue-ink" /></> : <><span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue-pastel-soft text-brand-blue-ink"><CloudUpload aria-hidden className="h-5 w-5" /></span><span className="max-w-full truncate text-sm font-semibold">{file?.name ?? 'Kéo thả tệp hoặc chọn file'}</span><span id={`${name}-hint`} className="mt-0.5 text-xs text-brand-muted">PDF, PNG, JPG (Tối đa 15MB) hoặc phiếu điện tử VNeID mức 2</span></>}
        </button>
      )}
      {example && <p id={`${name}-hint`} className="sr-only">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Ảnh mẫu minh họa · JPG, PNG · tối đa 15 MB'}</p>}
      {errors[name] && <p id={`${name}-error`} role="alert" className="mt-2 text-sm text-red-700">{errors[name]?.message}</p>}
      {children}
      {example && !compact && <dialog ref={dialogRef} aria-labelledby={`${name}-preview-title`} className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-3rem)] max-w-3xl overflow-auto rounded-2xl bg-white p-6 backdrop:bg-black/50"><div className="mb-4 flex items-center justify-between gap-3"><h2 id={`${name}-preview-title`} className="text-xl font-semibold">{label}</h2><button type="button" aria-label="Đóng ảnh xem trước" className={`${kycAction} ${kycFocus}`} onClick={() => dialogRef.current?.close()}><X aria-hidden className="h-5 w-5" /></button></div><PreviewImage key={file ? `${file.name}-${file.lastModified}` : 'example'} file={file} example={example} alt={label} className="max-h-[65vh] w-full object-contain" />{!file && <p className="mt-3 text-sm text-brand-muted">Ảnh mẫu minh họa từ thiết kế, không phải giấy tờ đã xác minh.</p>}</dialog>}
    </div>
  )
}

export function KycFaceStatus() {
  return <div className="flex w-full min-w-0 flex-1 flex-col gap-2 text-left"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"><div className="min-w-0"><h3 className="text-sm font-semibold">Sinh trắc học nhận diện khuôn mặt</h3><p className="text-sm text-brand-muted">Đối chiếu ảnh chân dung với ảnh trên căn cước công dân.</p></div><span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white px-3 py-1 text-sm text-brand-blue-ink shadow-sm sm:self-auto"><span aria-hidden className="h-2 w-2 rounded-full bg-brand-blue-ink" />Face Match: Chưa xác thực</span></div><div aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-brand-border" /><div className="flex flex-wrap items-center justify-between gap-1 pt-0.5 text-xs text-brand-muted"><span>Ngưỡng chấp thuận hệ thống: ≥85.0%</span><span className="font-medium text-brand-blue-ink">Trạng thái: Chờ thẩm định</span></div></div>
}
