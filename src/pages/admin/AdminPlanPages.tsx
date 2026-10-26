import { useState, type FormEvent, type PropsWithChildren } from 'react'
import { bookingErrorMessage } from '../../entities/booking'
import {
  planAudienceLabels,
  useAdminPlans,
  useCreatePlan,
  useDeletePlan,
  useUpdatePlan,
  type AdminPlan,
  type PlanAudience,
  type PlanInput,
} from '../../features/promotions/api/plans'
import { formatVnd } from '../../shared/lib/format-currency'
import { Button } from '../../shared/ui/Button'
import { BenefitList, BenefitsEditor, cleanBenefits } from '../../features/promotions/components/Benefits'
import { Select } from '../../shared/ui/Select'

const inputClass = 'mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-brand-charcoal'
const errorClass = 'rounded-xl bg-red-50 p-3 text-sm text-red-700'

interface FormState {
  code: string
  audience: PlanAudience
  name: string
  durationDays: string
  priceVnd: string
  priorityRadiusKm: string
  workerLimit: string
  benefits: string[]
  isActive: boolean
}

const emptyForm: FormState = {
  code: '', audience: 'Freelancer', name: '', durationDays: '7', priceVnd: '', priorityRadiusKm: '', workerLimit: '', benefits: [], isActive: true,
}

function formFromPlan(plan: AdminPlan): FormState {
  return {
    code: plan.code,
    audience: plan.audience,
    name: plan.name,
    durationDays: String(plan.durationDays),
    priceVnd: String(plan.priceVnd),
    priorityRadiusKm: plan.priorityRadiusKm === null ? '' : String(plan.priorityRadiusKm),
    workerLimit: plan.workerLimit === null ? '' : String(plan.workerLimit),
    benefits: plan.benefits,
    isActive: plan.isActive,
  }
}

function toInput(form: FormState): PlanInput {
  return {
    name: form.name,
    durationDays: Number(form.durationDays),
    priceVnd: Number(form.priceVnd),
    priorityRadiusKm: form.priorityRadiusKm.trim() === '' ? null : Number(form.priorityRadiusKm),
    workerLimit: form.audience === 'Company' && form.workerLimit.trim() !== '' ? Number(form.workerLimit) : null,
    benefits: cleanBenefits(form.benefits),
    isActive: form.isActive,
  }
}

function Label({ children, text }: PropsWithChildren<{ text: string }>) {
  return <label className="block text-sm font-semibold">{text}{children}</label>
}

function PlanForm({ editing, onDone }: { editing: AdminPlan | null; onDone: () => void }) {
  const [form, setForm] = useState<FormState>(editing ? formFromPlan(editing) : emptyForm)
  const create = useCreatePlan()
  const update = useUpdatePlan(editing?.id ?? '')
  const mutation = editing ? update : create
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    const input = toInput(form)
    if (editing) update.mutate(input, { onSuccess: onDone })
    else create.mutate({ ...input, code: form.code, audience: form.audience }, { onSuccess: onDone })
  }

  return (
    <form aria-label={editing ? 'Sửa gói' : 'Tạo gói mới'} className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2" onSubmit={submit}>
      <h2 className="text-lg font-semibold sm:col-span-2">{editing ? `Sửa gói ${editing.code}` : 'Tạo gói mới'}</h2>
      <Label text="Mã gói"><input className={inputClass} disabled={Boolean(editing)} onChange={(event) => set('code', event.target.value)} placeholder="FREELANCER_FEATURED_7D" required value={form.code} /></Label>
      <Label text="Đối tượng">
        <Select className={inputClass} disabled={Boolean(editing)} onChange={(event) => set('audience', event.target.value as PlanAudience)} value={form.audience}>
          <option value="Freelancer">{planAudienceLabels.Freelancer}</option>
          <option value="Company">{planAudienceLabels.Company}</option>
        </Select>
      </Label>
      <Label text="Tên gói"><input className={inputClass} onChange={(event) => set('name', event.target.value)} required value={form.name} /></Label>
      <Label text="Thời hạn (ngày)"><input className={inputClass} max={365} min={1} onChange={(event) => set('durationDays', event.target.value)} required type="number" value={form.durationDays} /></Label>
      <Label text="Giá (VND)"><input className={inputClass} min={0} onChange={(event) => set('priceVnd', event.target.value)} required type="number" value={form.priceVnd} /></Label>
      <Label text="Bán kính ưu tiên (km)"><input className={inputClass} max={100} min={1} onChange={(event) => set('priorityRadiusKm', event.target.value)} placeholder="Bỏ trống nếu không giới hạn" type="number" value={form.priorityRadiusKm} /></Label>
      {form.audience === 'Company' ? <Label text="Giới hạn số người làm"><input className={inputClass} max={1000} min={1} onChange={(event) => set('workerLimit', event.target.value)} type="number" value={form.workerLimit} /></Label> : null}
      <div className="sm:col-span-2"><BenefitsEditor onChange={(next) => set('benefits', next)} value={form.benefits} /></div>
      <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input checked={form.isActive} onChange={(event) => set('isActive', event.target.checked)} type="checkbox" />Đang bán (hiển thị cho đối tác)</label>
      {mutation.isError ? <p className={`${errorClass} sm:col-span-2`} role="alert">{bookingErrorMessage(mutation.error)}</p> : null}
      <div className="flex gap-2 sm:col-span-2"><Button isLoading={mutation.isPending} type="submit">{editing ? 'Lưu thay đổi' : 'Tạo gói'}</Button><Button onClick={onDone} variant="ghost">Hủy</Button></div>
    </form>
  )
}

function PlanRow({ onEdit, plan }: { onEdit: () => void; plan: AdminPlan }) {
  const update = useUpdatePlan(plan.id)
  const remove = useDeletePlan()
  const error = update.error ?? remove.error

  function toggle() {
    update.mutate({
      name: plan.name, durationDays: plan.durationDays, priceVnd: plan.priceVnd, priorityRadiusKm: plan.priorityRadiusKm,
      workerLimit: plan.workerLimit, benefits: plan.benefits, isActive: !plan.isActive,
    })
  }

  return (
    <tr className="border-t border-brand-border align-top">
      <td className="px-4 py-3"><p className="font-semibold">{plan.name}</p><p className="text-xs text-brand-muted">{plan.code}</p><BenefitList benefits={plan.benefits} className="mt-2 text-xs" /></td>
      <td className="px-4 py-3">{planAudienceLabels[plan.audience]}</td>
      <td className="px-4 py-3">{plan.durationDays} ngày</td>
      <td className="px-4 py-3 font-semibold">{formatVnd(plan.priceVnd)}</td>
      <td className="px-4 py-3"><span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${plan.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{plan.isActive ? 'Đang bán' : 'Đã tắt'}</span></td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-9" onClick={onEdit} variant="secondary">Sửa</Button>
          <Button className="min-h-9" isLoading={update.isPending} onClick={toggle} variant="secondary">{plan.isActive ? 'Tắt' : 'Bật'}</Button>
          {plan.purchaseCount === 0 ? <Button className="min-h-9" isLoading={remove.isPending} onClick={() => { if (window.confirm(`Xóa gói ${plan.code}?`)) remove.mutate(plan.id) }} variant="ghost">Xóa</Button> : null}
        </div>
        {error ? <p className="mt-2 text-xs text-red-700" role="alert">{bookingErrorMessage(error)}</p> : null}
      </td>
    </tr>
  )
}

export function AdminPlansPage() {
  const [audience, setAudience] = useState<PlanAudience | ''>('')
  const [formState, setFormState] = useState<{ editing: AdminPlan | null } | null>(null)
  const { data, error, isPending } = useAdminPlans(audience || undefined)

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Gói hiển thị</h1>
        <div className="flex items-center gap-3">
          <Select aria-label="Lọc theo đối tượng" className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm" onChange={(event) => setAudience(event.target.value as PlanAudience | '')} value={audience}>
            <option value="">Tất cả đối tượng</option>
            <option value="Freelancer">{planAudienceLabels.Freelancer}</option>
            <option value="Company">{planAudienceLabels.Company}</option>
          </Select>
          <Button onClick={() => setFormState({ editing: null })}>Tạo gói mới</Button>
        </div>
      </header>
      {formState ? <PlanForm editing={formState.editing} key={formState.editing?.id ?? 'new'} onDone={() => setFormState(null)} /> : null}
      {isPending ? <p className="text-sm text-brand-muted">Đang tải…</p> : null}
      {error ? <p className={errorClass} role="alert">{bookingErrorMessage(error)}</p> : null}
      {data && data.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm text-brand-muted">Chưa có gói nào.</p> : null}
      {data && data.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-brand-muted"><tr><th className="px-4 py-3 font-medium">Gói</th><th className="px-4 py-3 font-medium">Đối tượng</th><th className="px-4 py-3 font-medium">Thời hạn</th><th className="px-4 py-3 font-medium">Giá</th><th className="px-4 py-3 font-medium">Trạng thái</th><th className="px-4 py-3 font-medium">Thao tác</th></tr></thead>
            <tbody>{data.map((plan) => <PlanRow key={plan.id} onEdit={() => setFormState({ editing: plan })} plan={plan} />)}</tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
