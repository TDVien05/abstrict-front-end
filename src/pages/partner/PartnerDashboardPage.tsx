import { useId, useMemo } from 'react'
import { CalendarDays, ClipboardCheck, ClipboardList, TrendingUp, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookingStatusLabels, type BookingStatus } from '../../entities/booking'
import { useAuth } from '../../features/auth/auth-context'
import { useFreelancerBookingCounts, useFreelancerBookings } from '../../features/partner/api/bookings'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateTime } from '../../shared/lib/vn-time'

const BLUE = '#2563eb'
const GREEN = '#10b981'
const AMBER = '#f59e0b'
const RED = '#ef4444'

const statusColor: Partial<Record<BookingStatus, string>> = {
  Completed: GREEN,
  Confirmed: BLUE,
  CheckedIn: '#8b5cf6',
  InProgress: '#8b5cf6',
  PendingProviderConfirmation: AMBER,
  PendingAcceptance: AMBER,
  Rejected: RED,
  Cancelled: RED,
  Expired: '#94a3b8',
  Disputed: RED,
  PendingDeposit: '#94a3b8',
}

// Nhóm trạng thái cho stat cards
const GROUP_PENDING: BookingStatus[] = ['PendingProviderConfirmation', 'PendingDeposit']
const GROUP_ACTIVE: BookingStatus[] = ['Confirmed', 'CheckedIn', 'InProgress', 'PendingAcceptance']
const GROUP_DONE: BookingStatus[] = ['Completed']
const GROUP_CANCELLED: BookingStatus[] = ['Rejected', 'Cancelled', 'Expired']

function sumGroup(counts: Partial<Record<BookingStatus, number>>, statuses: BookingStatus[]) {
  return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
}

// ─── Donut ───────────────────────────────────────────────────────────────────
function Donut({ segments }: { segments: { color: string; value: number }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-100 text-xs text-brand-muted">Chưa có</div>
  const r = 48; const circ = 2 * Math.PI * r
  const active = segments.filter((s) => s.value > 0)
  const offsets = active.reduce<number[]>((acc, seg) => [...acc, (acc.at(-1) ?? 0) + (seg.value / total) * circ], [0])
  return (
    <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
      <circle cx="60" cy="60" fill="none" r={r} stroke="#f1f5f9" strokeWidth="16" />
      {active.map((seg, i) => {
        const dash = (seg.value / total) * circ
        return (
          <circle key={i} cx="60" cy="60" fill="none" r={r}
            stroke={seg.color} strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={-offsets[i]} strokeWidth="16" strokeLinecap="butt" />
        )
      })}
      <text className="rotate-90" dominantBaseline="middle" fill="#0f172a" fontSize="18" fontWeight="600" textAnchor="middle" transform="rotate(90,60,60)" x="60" y="60">{total}</text>
    </svg>
  )
}

// ─── Biểu đồ cột ngang ───────────────────────────────────────────────────────
function HBar({ color, label, total, value }: { color: string; label: string; total: number; value: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100)
  return (
    <li>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ background: color, width: `${pct}%` }} />
      </div>
    </li>
  )
}

// ─── Biểu đồ đường doanh thu 7 ngày ─────────────────────────────────────────
const DAYS = 7
function lastDays() {
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (DAYS - 1 - i)); return d
  })
}
function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }

function RevenueChart({ days, series, color }: { days: Date[]; series: number[]; color: string }) {
  const gradId = useId()
  const w = 560; const h = 160; const pl = 40; const pr = 16; const pt = 12; const pb = 28
  const max = Math.max(1, ...series)
  const xp = (i: number) => pl + (i * (w - pl - pr)) / (DAYS - 1)
  const yp = (v: number) => pt + (1 - v / max) * (h - pt - pb)
  const pts: [number, number][] = series.map((v, i) => [xp(i), yp(v)])
  const line = pts.reduce((p, [x, y], i) => {
    if (i === 0) return `M${x},${y}`
    const [px, py] = pts[i - 1]; const mx = (px + x) / 2
    return `${p} C${mx},${py} ${mx},${y} ${x},${y}`
  }, '')
  const area = `${line} L${xp(DAYS-1)},${yp(0)} L${xp(0)},${yp(0)} Z`
  const ticks = [0, Math.round(max / 2), max]
  return (
    <svg aria-label="Doanh thu 7 ngày" className="h-auto w-full" viewBox={`0 0 ${w} ${h}`} role="img">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line stroke="#e2e8f0" strokeDasharray="3 4" x1={pl} x2={w - pr} y1={yp(t)} y2={yp(t)} />
          <text fill="#94a3b8" fontSize="9" textAnchor="end" x={pl - 4} y={yp(t) + 3}>{t === 0 ? '0' : t > 999999 ? `${(t/1000000).toFixed(1)}M` : `${(t/1000).toFixed(0)}k`}</text>
        </g>
      ))}
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeLinecap="round" strokeWidth="2.5" />
      {days.map((d, i) => (
        <text fill="#94a3b8" fontSize="10" key={d.toISOString()} textAnchor="middle" x={xp(i)} y={h - 6}>{`${d.getDate()}/${d.getMonth()+1}`}</text>
      ))}
      {pts.map(([x, y], i) => series[i] > 0 && <circle key={i} cx={x} cy={y} fill="white" r="3.5" stroke={color} strokeWidth="2" />)}
    </svg>
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, loading, sub, tone, value }: { icon: LucideIcon; label: string; loading: boolean; sub?: string; tone: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon aria-hidden className="h-[18px] w-[18px]" /></span>
      <p className="mt-4 text-sm text-brand-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-[-0.02em]">{loading ? '—' : value}</p>
      {sub ? <p className="mt-1 text-xs text-brand-muted">{sub}</p> : null}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function PartnerDashboardPage() {
  const { user } = useAuth()
  const counts = useFreelancerBookingCounts()
  const recent = useFreelancerBookings({ pageSize: 50 })
  const days = useMemo(() => lastDays(), [])

  const c = counts.data?.counts ?? {}
  const total = counts.data?.total ?? 0
  const pending = sumGroup(c, GROUP_PENDING)
  const active = sumGroup(c, GROUP_ACTIVE)
  const done = sumGroup(c, GROUP_DONE)
  const cancelled = sumGroup(c, GROUP_CANCELLED)

  // Doanh thu từ completed bookings trong 7 ngày (dữ liệu thực từ API paged)
  const revSeries = useMemo(() => {
    const buckets = new Map(days.map((d) => [dayKey(d), 0]))
    for (const b of recent.data?.items ?? []) {
      if (b.status !== 'Completed') continue
      const key = dayKey(new Date(b.startsAtUtc))
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + b.baseAmountVnd)
    }
    return days.map((d) => buckets.get(dayKey(d)) ?? 0)
  }, [days, recent.data])

  const recentOrders = (recent.data?.items ?? []).slice(0, 6)

  const donutSegments = [
    { color: GREEN, value: done },
    { color: BLUE, value: active },
    { color: AMBER, value: pending },
    { color: RED, value: cancelled },
  ]

  return (
    <div className="space-y-5">
      {/* Tiêu đề + nút */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em]">Tổng quan</h1>
          <p className="mt-0.5 text-sm text-brand-muted">Hoạt động đơn hàng và doanh thu của bạn</p>
        </div>
        {user?.actor !== 'company' && (
          <Link className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" to="/partner/schedule">
            <CalendarDays aria-hidden className="h-4 w-4" />Đăng ký ca rảnh
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Chờ xác nhận" loading={counts.isPending} sub="Cần phản hồi sớm" tone="bg-amber-50 text-amber-600" value={pending} />
        <StatCard icon={CalendarDays} label="Đang diễn ra" loading={counts.isPending} tone="bg-blue-50 text-blue-600" value={active} />
        <StatCard icon={ClipboardCheck} label="Đã hoàn thành" loading={counts.isPending} tone="bg-emerald-50 text-emerald-600" value={done} />
        <StatCard icon={TrendingUp} label="Tổng đơn" loading={counts.isPending} tone="bg-violet-50 text-violet-600" value={total} />
      </div>

      {/* Chart + donut */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Doanh thu 7 ngày qua</h2>
            <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-brand-muted">Từ đơn hoàn thành</span>
          </div>
          <RevenueChart color={GREEN} days={days} series={revSeries} />
          <p className="mt-2 text-right text-sm font-semibold">
            Tổng: <span className="text-emerald-600">{formatVnd(revSeries.reduce((s, v) => s + v, 0))}</span>
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
          <h2 className="mb-4 text-base font-semibold">Phân bổ đơn hàng</h2>
          <div className="flex items-center justify-center py-2">
            <Donut segments={donutSegments} />
          </div>
          <ul className="mt-5 space-y-3">
            <HBar color={GREEN} label="Hoàn thành" total={total} value={done} />
            <HBar color={BLUE} label="Đang diễn ra" total={total} value={active} />
            <HBar color={AMBER} label="Chờ xác nhận" total={total} value={pending} />
            <HBar color={RED} label="Hủy / Từ chối" total={total} value={cancelled} />
          </ul>
        </section>
      </div>

      {/* Đơn gần đây */}
      <section className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-semibold">Đơn gần đây</h2>
          <Link className="text-sm font-medium text-blue-600 hover:underline" to="/partner/orders">Xem tất cả →</Link>
        </div>
        {counts.isPending || recent.isPending ? (
          <p className="px-5 pb-5 text-sm text-brand-muted">Đang tải…</p>
        ) : recentOrders.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-brand-muted">Chưa có đơn nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-y border-slate-100 text-xs text-brand-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Mã đơn</th>
                  <th className="px-5 py-2.5 font-medium">Khách hàng</th>
                  <th className="px-5 py-2.5 font-medium">Dịch vụ</th>
                  <th className="px-5 py-2.5 font-medium">Thời gian</th>
                  <th className="px-5 py-2.5 font-medium">Trạng thái</th>
                  <th className="px-5 py-2.5 font-medium text-right">Giá</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((b) => (
                  <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50" key={b.id}>
                    <td className="px-5 py-3">
                      <Link className="font-semibold text-blue-600 hover:underline" to={`/partner/orders/${b.id}`}>#{b.bookingNumber}</Link>
                    </td>
                    <td className="px-5 py-3">{b.customerName}</td>
                    <td className="px-5 py-3 text-brand-muted">{b.serviceCategoryName}</td>
                    <td className="px-5 py-3 text-brand-muted">{vnDateTime(b.startsAtUtc)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold" style={{ background: `${statusColor[b.status] ?? '#94a3b8'}18`, color: statusColor[b.status] ?? '#64748b' }}>
                        {bookingStatusLabels[b.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{formatVnd(b.baseAmountVnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export function PartnerPlansPage() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <p className="text-brand-muted">Gói hiển thị sẽ sớm ra mắt.</p>
    </div>
  )
}
