import { Banknote, CircleDollarSign, Hourglass, Sparkles, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookingErrorMessage } from '../../entities/booking'
import { planAudienceLabels, useAdminPlanReport, type PlanReport } from '../../features/promotions/api/plans'
import { formatVnd } from '../../shared/lib/format-currency'

const BLUE = '#2563eb'
const cardClass = 'rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]'

function Stat({ hint, icon: Icon, label, tone, value }: { hint?: string; icon: LucideIcon; label: string; tone: string; value: string }) {
  return (
    <div className={cardClass}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="h-[18px] w-[18px]" /></span>
      <p className="mt-4 text-sm text-brand-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-brand-muted">{hint}</p> : null}
    </div>
  )
}

const dayLabel = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`

// Cột doanh thu theo ngày; ngày không có giao dịch vẫn vẽ trục để thấy khoảng trống.
function RevenueBars({ daily }: { daily: PlanReport['daily'] }) {
  const max = Math.max(1, ...daily.map((day) => day.revenueVnd))
  return (
    <figure>
      <div aria-label="Doanh thu gói theo ngày" className="flex h-44 items-end gap-3" role="img">
        {daily.map((day) => (
          <div className="flex h-full flex-1 flex-col justify-end text-center" key={day.date} title={`${dayLabel(day.date)}: ${formatVnd(day.revenueVnd)}, ${day.purchases} lượt mua`}>
            <span className="mb-1 text-[11px] font-semibold text-brand-charcoal">{day.revenueVnd > 0 ? formatVnd(day.revenueVnd) : ''}</span>
            <div className="rounded-t-lg" style={{ background: BLUE, height: `${Math.max(day.revenueVnd > 0 ? 4 : 1, (day.revenueVnd / max) * 100)}%`, opacity: day.revenueVnd > 0 ? 1 : 0.2 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">{daily.map((day) => <span className="flex-1 text-center text-[11px] text-brand-muted" key={day.date}>{dayLabel(day.date)}</span>)}</div>
    </figure>
  )
}

export function AdminPlanReport() {
  const { data, error, isPending } = useAdminPlanReport()

  return (
    <section aria-label="Báo cáo gói hiển thị" className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Báo cáo gói hiển thị</h2>
        <Link className="text-sm font-semibold text-brand-charcoal underline" to="/admin/plans">Quản lý gói</Link>
      </div>
      {isPending ? <p className="text-sm text-brand-muted">Đang tải…</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{bookingErrorMessage(error)}</p> : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat icon={Banknote} label="Tổng doanh thu gói" tone="bg-emerald-50 text-emerald-600" value={formatVnd(data.totalRevenueVnd)} />
            <Stat icon={CircleDollarSign} label="Doanh thu 7 ngày qua" tone="bg-blue-50 text-blue-600" value={formatVnd(data.last7DaysRevenueVnd)} />
            <Stat hint={`${data.paidPurchases.toLocaleString('vi-VN')} lượt mua đã thanh toán`} icon={Sparkles} label="Gói đang hiệu lực" tone="bg-violet-50 text-violet-600" value={data.activeNow.toLocaleString('vi-VN')} />
            <Stat hint={`${data.paymentFailed.toLocaleString('vi-VN')} thanh toán thất bại`} icon={Hourglass} label="Chờ thanh toán" tone="bg-orange-50 text-orange-500" value={data.pendingPayment.toLocaleString('vi-VN')} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className={cardClass}>
              <h3 className="mb-4 text-base font-semibold">Doanh thu theo ngày</h3>
              <RevenueBars daily={data.daily} />
            </div>
            <div className={cardClass}>
              <h3 className="mb-4 text-base font-semibold">Theo đối tượng</h3>
              <ul className="space-y-4">
                {data.audiences.map((row) => (
                  <li className="flex items-center justify-between text-sm" key={row.audience}>
                    <span className="font-medium">{planAudienceLabels[row.audience]}</span>
                    <span className="text-brand-muted"><b className="text-brand-charcoal">{formatVnd(row.revenueVnd)}</b> · {row.purchases} lượt</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-brand-muted">{data.activePlanCount} gói đang bán, {data.inactivePlanCount} gói đã tắt.</p>
            </div>
          </div>

          <div className={`${cardClass} overflow-x-auto`}>
            <h3 className="mb-4 text-base font-semibold">Hiệu quả từng gói</h3>
            {data.plans.length === 0 ? <p className="text-sm text-brand-muted">Chưa có gói nào.</p> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-brand-muted"><tr><th className="py-2 font-medium">Gói</th><th className="py-2 font-medium">Đối tượng</th><th className="py-2 text-right font-medium">Lượt mua</th><th className="py-2 text-right font-medium">Đang hiệu lực</th><th className="py-2 text-right font-medium">Doanh thu</th></tr></thead>
                <tbody>
                  {data.plans.map((plan) => (
                    <tr className="border-t border-slate-100" key={plan.planId}>
                      <td className="py-3"><span className="font-semibold">{plan.name}</span>{plan.isActive ? null : <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">Đã tắt</span>}<span className="block text-xs text-brand-muted">{plan.code}</span></td>
                      <td className="py-3">{planAudienceLabels[plan.audience]}</td>
                      <td className="py-3 text-right">{plan.purchases}</td>
                      <td className="py-3 text-right">{plan.activeNow}</td>
                      <td className="py-3 text-right font-semibold">{formatVnd(plan.revenueVnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </section>
  )
}
