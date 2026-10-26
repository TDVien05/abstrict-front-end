import { Pencil, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type PropsWithChildren } from 'react'
import { bookingErrorMessage } from '../../entities/booking'
import { useServiceCategories } from '../../features/catalog/api/catalog'
import { useServiceAreas } from '../../features/customer/api/addresses'
import {
  approvalStatusLabels,
  MAX_BIO_LENGTH,
  MAX_HOURLY_RATE_VND,
  MAX_SERVICE_AREAS,
  MAX_SERVICE_DESCRIPTION_LENGTH,
  MIN_HOURLY_RATE_VND,
  missingForBookingsLabels,
  useMyProfile,
  useRemoveService,
  useReplaceServiceAreas,
  useSaveService,
  useUpdateProfile,
  type MyFreelancerProfile,
  type MyService,
} from '../../features/partner/api/profile'
import { formatVnd } from '../../shared/lib/format-currency'
import { Button } from '../../shared/ui/Button'
import { Select } from '../../shared/ui/Select'

const inputClass = 'mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand-charcoal'
const errorClass = 'rounded-xl bg-red-50 p-3 text-sm text-red-700'
const DEFAULT_RADIUS_KM = 10

function Section({ children, hint, title }: PropsWithChildren<{ hint?: string; title: string }>) {
  return (
    <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint ? <p className="mb-4 mt-1 text-sm text-brand-muted">{hint}</p> : <div className="mb-4" />}
      {children}
    </section>
  )
}

function Toggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 text-sm font-semibold">
      {label}
      <input checked={checked} className="size-5" disabled={disabled} onChange={(event) => onChange(event.target.checked)} role="switch" type="checkbox" />
    </label>
  )
}

function StatusSection({ profile }: { profile: MyFreelancerProfile }) {
  const update = useUpdateProfile()
  return (
    <Section title="Nhận đơn">
      <p className="mb-3 text-sm">Trạng thái hồ sơ: <strong>{approvalStatusLabels[profile.approvalStatus]}</strong></p>
      {profile.missingForBookings.length > 0 ? (
        <ul className="mb-3 space-y-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" aria-label="Điều kiện còn thiếu">
          {profile.missingForBookings.map((code) => <li key={code}>{missingForBookingsLabels[code] ?? code}</li>)}
        </ul>
      ) : null}
      {profile.acceptingBookingsPaused ? <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">Nhận đơn đã được tự tắt vì hồ sơ không còn đủ điều kiện.</p> : null}
      <Toggle checked={profile.isAcceptingBookings} disabled={update.isPending || (!profile.isAcceptingBookings && !profile.canAcceptBookings)} label="Đang nhận đơn" onChange={(next) => update.mutate({ isAcceptingBookings: next })} />
      <Toggle checked={profile.autoAcceptBookings} disabled={update.isPending} label="Tự động xác nhận đơn mới" onChange={(next) => update.mutate({ autoAcceptBookings: next })} />
      {update.isError ? <p className={`${errorClass} mt-2`} role="alert">{bookingErrorMessage(update.error)}</p> : null}
    </Section>
  )
}

function BioSection({ profile }: { profile: MyFreelancerProfile }) {
  const [bio, setBio] = useState(profile.bio ?? '')
  const update = useUpdateProfile()
  const dirty = bio !== (profile.bio ?? '')

  function submit(event: FormEvent) {
    event.preventDefault()
    update.mutate({ bio: bio.trim() })
  }

  return (
    <Section hint="Khách hàng đọc phần này khi xem hồ sơ của bạn." title="Giới thiệu">
      <form onSubmit={submit}>
        <label className="block text-sm font-semibold">Giới thiệu bản thân
          <textarea className={inputClass} maxLength={MAX_BIO_LENGTH} onChange={(event) => setBio(event.target.value)} rows={5} value={bio} />
        </label>
        <p className="mt-1 text-right text-xs text-brand-muted">{bio.length}/{MAX_BIO_LENGTH}</p>
        {update.isError ? <p className={`${errorClass} mb-3`} role="alert">{bookingErrorMessage(update.error)}</p> : null}
        <Button disabled={!dirty} isLoading={update.isPending} type="submit">Lưu giới thiệu</Button>
      </form>
    </Section>
  )
}

interface ServiceDraft { categoryId: string; hourlyRate: string; description: string; isActive: boolean }

function ServiceForm({ draft, editing, onDone, takenIds }: { draft: ServiceDraft; editing: boolean; onDone: () => void; takenIds: Set<string> }) {
  const [form, setForm] = useState(draft)
  const categories = useServiceCategories()
  const save = useSaveService()
  const available = (categories.data ?? []).filter((category) => category.isActive && (editing || !takenIds.has(category.id)))
  const rate = Number(form.hourlyRate)
  const rateValid = Number.isInteger(rate) && rate >= MIN_HOURLY_RATE_VND && rate <= MAX_HOURLY_RATE_VND

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate({ categoryId: form.categoryId, hourlyRateVnd: rate, description: form.description.trim(), isActive: form.isActive }, { onSuccess: onDone })
  }

  return (
    <form aria-label={editing ? 'Sửa kỹ năng' : 'Thêm kỹ năng'} className="mt-4 grid gap-4 rounded-xl border border-brand-border p-4 sm:grid-cols-2" onSubmit={submit}>
      <label className="block text-sm font-semibold">Kỹ năng
        <Select className={inputClass} disabled={editing} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required value={form.categoryId}>
          <option value="">Chọn kỹ năng…</option>
          {available.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
      </label>
      <label className="block text-sm font-semibold">Giá theo giờ (VND)
        <input className={inputClass} max={MAX_HOURLY_RATE_VND} min={MIN_HOURLY_RATE_VND} onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })} required step={1000} type="number" value={form.hourlyRate} />
        <span className="mt-1 block text-xs font-normal text-brand-muted">Từ {formatVnd(MIN_HOURLY_RATE_VND)} đến {formatVnd(MAX_HOURLY_RATE_VND)}.</span>
      </label>
      <label className="block text-sm font-semibold sm:col-span-2">Mô tả kỹ năng
        <textarea className={inputClass} maxLength={MAX_SERVICE_DESCRIPTION_LENGTH} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ví dụ: 3 năm kinh nghiệm dọn dẹp căn hộ, tự mang dụng cụ" rows={3} value={form.description} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} type="checkbox" />Đang cung cấp (khách tìm thấy và đặt được)</label>
      {save.isError ? <p className={`${errorClass} sm:col-span-2`} role="alert">{bookingErrorMessage(save.error)}</p> : null}
      <div className="flex gap-2 sm:col-span-2"><Button disabled={!form.categoryId || !rateValid} isLoading={save.isPending} type="submit">{editing ? 'Lưu kỹ năng' : 'Thêm kỹ năng'}</Button><Button onClick={onDone} variant="ghost">Hủy</Button></div>
    </form>
  )
}

function ServiceCard({ onEdit, service }: { onEdit: () => void; service: MyService }) {
  const remove = useRemoveService()
  const save = useSaveService()
  return (
    <li className="rounded-xl border border-brand-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{service.name}</p>
          <p className="text-sm text-brand-muted">{formatVnd(service.hourlyRateVnd)}/giờ</p>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${service.isListed ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{service.isListed ? 'Đang hiện công khai' : service.isActive ? 'Danh mục tạm ẩn' : 'Đã tắt'}</span>
      </div>
      {service.description ? <p className="mt-2 text-sm">{service.description}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="min-h-9" onClick={onEdit} variant="secondary"><Pencil className="mr-1.5 size-4" />Sửa</Button>
        <Button className="min-h-9" isLoading={save.isPending} onClick={() => save.mutate({ categoryId: service.serviceCategoryId, hourlyRateVnd: service.hourlyRateVnd, description: service.description ?? '', isActive: !service.isActive })} variant="secondary">{service.isActive ? 'Tắt' : 'Bật'}</Button>
        <Button aria-label={`Xóa kỹ năng ${service.name}`} className="min-h-9" isLoading={remove.isPending} onClick={() => { if (window.confirm(`Xóa kỹ năng ${service.name}?`)) remove.mutate(service.serviceCategoryId) }} variant="ghost"><Trash2 className="mr-1.5 size-4" />Xóa</Button>
      </div>
      {save.isError || remove.isError ? <p className={`${errorClass} mt-3`} role="alert">{bookingErrorMessage(save.error ?? remove.error)}</p> : null}
    </li>
  )
}

function ServicesSection({ profile }: { profile: MyFreelancerProfile }) {
  const [draft, setDraft] = useState<{ value: ServiceDraft; editing: boolean } | null>(null)
  const takenIds = new Set(profile.services.map((service) => service.serviceCategoryId))

  return (
    <Section hint="Đây là các dịch vụ khách hàng tìm kiếm. Mỗi kỹ năng có giá theo giờ riêng." title="Kỹ năng và giá">
      {profile.services.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-brand-muted">Bạn chưa thêm kỹ năng nào. Cần ít nhất một kỹ năng để nhận đơn.</p> : null}
      <ul className="space-y-3">
        {profile.services.map((service) => (
          <ServiceCard key={service.serviceCategoryId} onEdit={() => setDraft({ editing: true, value: { categoryId: service.serviceCategoryId, hourlyRate: String(service.hourlyRateVnd), description: service.description ?? '', isActive: service.isActive } })} service={service} />
        ))}
      </ul>
      {draft ? <ServiceForm draft={draft.value} editing={draft.editing} key={draft.value.categoryId || 'new'} onDone={() => setDraft(null)} takenIds={takenIds} /> : (
        <Button className="mt-4" onClick={() => setDraft({ editing: false, value: { categoryId: '', hourlyRate: '', description: '', isActive: true } })} variant="secondary">Thêm kỹ năng</Button>
      )}
    </Section>
  )
}

function AreasSection({ profile }: { profile: MyFreelancerProfile }) {
  const areas = useServiceAreas()
  const replace = useReplaceServiceAreas()
  const initial = () => new Map(profile.serviceAreas.map((area) => [area.serviceAreaId, area.travelRadiusKm ?? DEFAULT_RADIUS_KM]))
  const [selected, setSelected] = useState(initial)
  const saved = new Map(initial())
  const dirty = selected.size !== saved.size || [...selected].some(([id, radius]) => saved.get(id) !== radius)

  const groups = new Map<string, NonNullable<typeof areas.data>>()
  for (const area of (areas.data ?? []).filter((item) => item.isActive)) groups.set(area.city, [...(groups.get(area.city) ?? []), area])

  function toggle(id: string, checked: boolean) {
    const next = new Map(selected)
    if (checked) next.set(id, DEFAULT_RADIUS_KM)
    else next.delete(id)
    setSelected(next)
  }

  return (
    <Section hint={`Chọn tối đa ${MAX_SERVICE_AREAS} khu vực bạn nhận ca và bán kính di chuyển cho từng khu vực.`} title="Khu vực nhận ca">
      {areas.isPending ? <p className="text-sm text-brand-muted">Đang tải…</p> : null}
      {areas.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(areas.error)}</p> : null}
      {[...groups].map(([city, items]) => (
        <fieldset className="mb-4" key={city}>
          <legend className="mb-2 text-sm font-semibold">{city}</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((area) => {
              const radius = selected.get(area.id)
              const label = [area.district, area.wardOrComplex].filter(Boolean).join(' – ')
              return (
                <li className="flex items-center justify-between gap-3 rounded-xl border border-brand-border px-3 py-2 text-sm" key={area.id}>
                  <label className="flex items-center gap-2"><input checked={radius !== undefined} disabled={radius === undefined && selected.size >= MAX_SERVICE_AREAS} onChange={(event) => toggle(area.id, event.target.checked)} type="checkbox" />{label}</label>
                  {radius !== undefined ? (
                    <label className="flex items-center gap-1 text-xs text-brand-muted">
                      <input aria-label={`Bán kính di chuyển ${label}`} className="w-16 rounded-lg border border-brand-border px-2 py-1 text-sm text-brand-charcoal" max={100} min={1} onChange={(event) => setSelected(new Map(selected).set(area.id, Number(event.target.value)))} type="number" value={radius} />km
                    </label>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </fieldset>
      ))}
      {replace.isError ? <p className={`${errorClass} mb-3`} role="alert">{bookingErrorMessage(replace.error)}</p> : null}
      <Button disabled={!dirty || selected.size === 0} isLoading={replace.isPending} onClick={() => replace.mutate([...selected].map(([serviceAreaId, travelRadiusKm]) => ({ serviceAreaId, travelRadiusKm })))}>Lưu khu vực</Button>
    </Section>
  )
}

export function PartnerProfilePage() {
  const { data, error, isPending } = useMyProfile()

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Hồ sơ công khai</h1>
        {data ? <p className="mt-1 text-sm text-brand-muted">{data.displayName} · {data.experienceYears} năm kinh nghiệm</p> : null}
      </header>
      {isPending ? <p className="text-sm text-brand-muted">Đang tải…</p> : null}
      {error ? <p className={errorClass} role="alert">{bookingErrorMessage(error)}</p> : null}
      {data ? (
        <>
          <StatusSection profile={data} />
          <BioSection profile={data} />
          <ServicesSection profile={data} />
          <AreasSection key={data.serviceAreas.map((area) => `${area.serviceAreaId}:${area.travelRadiusKm}`).join(',')} profile={data} />
        </>
      ) : null}
    </div>
  )
}
