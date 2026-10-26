import { Clock, MapPin, Users } from 'lucide-react'
import { useState } from 'react'
import { bookingErrorMessage } from '../../entities/booking'
import {
  planPaymentMethodLabels,
  purchaseStatusLabels,
  useConfirmSandboxPurchase,
  usePartnerPlans,
  usePlanPurchases,
  usePurchasePlan,
  type PartnerPlan,
  type PlanPaymentMethod,
  type PlanPurchase,
} from '../../features/promotions/api/plans'
import { BenefitList } from '../../features/promotions/components/Benefits'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateTime } from '../../shared/lib/vn-time'
import { Button } from '../../shared/ui/Button'
import { Select } from '../../shared/ui/Select'

const errorClass = 'rounded-xl bg-red-50 p-3 text-sm text-red-700'

function Highlight({ children, icon: Icon }: { children: string; icon: typeof Clock }) {
  return <li className="flex items-center gap-2.5 text-sm text-brand-charcoal"><Icon aria-hidden className="size-4 shrink-0 text-brand-muted" />{children}</li>
}

// Thanh toán thử: chỉ có cổng sandbox nên người dùng tự chọn kết quả; cổng thật sẽ thay bằng chuyển hướng thanh toán.
function SandboxPayment({ onDone, purchase }: { onDone: () => void; purchase: PlanPurchase }) {
  const confirm = useConfirmSandboxPurchase()
  return (
    <div className="mt-4 space-y-3 rounded-xl bg-amber-50 p-4 text-sm" role="group" aria-label="Thanh toán thử">
      <p className="font-semibold text-amber-900">Chờ thanh toán {formatVnd(purchase.priceVnd)}</p>
      <p className="text-amber-900">Đây là cổng thanh toán thử nghiệm: chọn kết quả giao dịch để tiếp tục.</p>
      {confirm.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(confirm.error)}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button isLoading={confirm.isPending} onClick={() => confirm.mutate({ purchaseId: purchase.id, succeeded: true }, { onSuccess: onDone })}>Thanh toán thành công</Button>
        <Button disabled={confirm.isPending} onClick={() => confirm.mutate({ purchaseId: purchase.id, succeeded: false }, { onSuccess: onDone })} variant="secondary">Thanh toán thất bại</Button>
      </div>
    </div>
  )
}

function PurchasePanel({ onClose, plan }: { onClose: () => void; plan: PartnerPlan }) {
  const [method, setMethod] = useState<PlanPaymentMethod>('Momo')
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const purchase = usePurchasePlan()
  const free = plan.priceVnd === 0
  const done = purchase.data?.status === 'Active'

  if (purchase.data?.status === 'PendingPayment') return <SandboxPayment onDone={onClose} purchase={purchase.data} />
  if (done) {
    return (
      <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
        Đã kích hoạt {plan.name}{purchase.data?.endsAtUtc ? `, hiệu lực đến ${vnDateTime(purchase.data.endsAtUtc)}` : ''}.
        <button className="ml-2 font-semibold underline" onClick={onClose} type="button">Đóng</button>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-brand-border p-4 text-sm">
      <p>Bạn sắp mua <strong>{plan.name}</strong> ({plan.durationDays} ngày) với giá <strong>{free ? 'miễn phí' : formatVnd(plan.priceVnd)}</strong>. Nếu đang có gói khác, gói này sẽ nối tiếp ngay sau khi gói hiện tại hết hạn.</p>
      {free ? null : (
        <label className="block font-semibold">Phương thức thanh toán
          <Select className="mt-2 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-normal" onChange={(event) => setMethod(event.target.value as PlanPaymentMethod)} value={method}>
            {Object.entries(planPaymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </label>
      )}
      {purchase.isError ? <p className={errorClass} role="alert">{bookingErrorMessage(purchase.error)}</p> : null}
      <div className="flex gap-2">
        <Button isLoading={purchase.isPending} onClick={() => purchase.mutate({ planId: plan.id, method, idempotencyKey })}>Xác nhận mua</Button>
        <Button onClick={onClose} variant="ghost">Hủy</Button>
      </div>
    </div>
  )
}

function PlanCard({ pending, plan }: { pending: PlanPurchase | undefined; plan: PartnerPlan }) {
  const [buying, setBuying] = useState(false)
  const free = plan.priceVnd === 0

  return (
    <li className="flex flex-col rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{plan.name}</h2>
        <span className="shrink-0 rounded-full bg-brand-blue-pastel px-3 py-1 text-xs font-semibold">{plan.durationDays} ngày</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.02em]">{free ? 'Miễn phí' : formatVnd(plan.priceVnd)}</p>
      <ul className="mt-5 space-y-2.5 border-t border-brand-border pt-5">
        <Highlight icon={Clock}>{`Hiệu lực ${plan.durationDays} ngày kể từ khi kích hoạt`}</Highlight>
        {plan.priorityRadiusKm !== null ? <Highlight icon={MapPin}>{`Ưu tiên hiển thị trong bán kính ${plan.priorityRadiusKm} km`}</Highlight> : null}
        {plan.workerLimit !== null ? <Highlight icon={Users}>{`Áp dụng cho tối đa ${plan.workerLimit} người làm`}</Highlight> : null}
      </ul>
      <BenefitList benefits={plan.benefits} className="mt-4" />
      <div className="mt-auto pt-6">
        {pending ? <SandboxPayment onDone={() => setBuying(false)} purchase={pending} /> : buying ? <PurchasePanel onClose={() => setBuying(false)} plan={plan} /> : <Button className="w-full" onClick={() => setBuying(true)}>Mua gói</Button>}
      </div>
    </li>
  )
}

function PurchaseSummary({ purchases }: { purchases: PlanPurchase[] }) {
  const active = purchases.filter((x) => x.status === 'Active')
  const current = active.find((x) => x.isCurrent)
  const queued = active.filter((x) => !x.isCurrent)
  if (!current && queued.length === 0) return null
  return (
    <section aria-label="Gói đang dùng" className="mb-5 rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900">
      {current ? <p><strong>{current.planName}</strong> đang hiệu lực đến {vnDateTime(current.endsAtUtc as string)}.</p> : null}
      {queued.map((x) => <p className="mt-1" key={x.id}>Tiếp theo: <strong>{x.planName}</strong>, từ {vnDateTime(x.startsAtUtc as string)} đến {vnDateTime(x.endsAtUtc as string)}.</p>)}
    </section>
  )
}

function PurchaseHistory({ purchases }: { purchases: PlanPurchase[] }) {
  if (purchases.length === 0) return null
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">Lịch sử mua gói</h2>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-brand-muted"><tr><th className="px-4 py-3 font-medium">Gói</th><th className="px-4 py-3 font-medium">Giá</th><th className="px-4 py-3 font-medium">Hiệu lực</th><th className="px-4 py-3 font-medium">Trạng thái</th></tr></thead>
          <tbody>
            {purchases.map((x) => (
              <tr className="border-t border-brand-border" key={x.id}>
                <td className="px-4 py-3 font-semibold">{x.planName}</td>
                <td className="px-4 py-3">{x.priceVnd === 0 ? 'Miễn phí' : formatVnd(x.priceVnd)}</td>
                <td className="px-4 py-3">{x.startsAtUtc && x.endsAtUtc ? `${vnDateTime(x.startsAtUtc)} – ${vnDateTime(x.endsAtUtc)}` : '—'}</td>
                <td className="px-4 py-3">{purchaseStatusLabels[x.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function PartnerPlansPage() {
  const plans = usePartnerPlans()
  const purchases = usePlanPurchases()
  const history = purchases.data ?? []

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Gói hiển thị</h1>
        <p className="mt-1 text-sm text-brand-muted">Gói giúp hồ sơ của bạn được ưu tiên hiển thị. Mua nhiều gói liên tiếp sẽ được cộng dồn thời hạn.</p>
      </header>
      <PurchaseSummary purchases={history} />
      {plans.isPending ? <p className="text-sm text-brand-muted">Đang tải…</p> : null}
      {plans.error ? <p className={errorClass} role="alert">{bookingErrorMessage(plans.error)}</p> : null}
      {plans.data && plans.data.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-brand-muted shadow-sm">Hiện chưa có gói nào đang bán cho bạn.</p> : null}
      {plans.data && plans.data.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.data.map((plan) => <PlanCard key={plan.id} pending={history.find((x) => x.planId === plan.id && x.status === 'PendingPayment')} plan={plan} />)}
        </ul>
      ) : null}
      <PurchaseHistory purchases={history} />
    </div>
  )
}
