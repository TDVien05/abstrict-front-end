import { useId, useMemo, useState, type ReactNode } from 'react'
import { BadgeCheck, Building2, Clock3, FileCheck2, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CompanyStatus } from '../../entities/company'
import type { KycStatus } from '../../entities/kyc'
import { useAdminCompanies } from '../../features/admin/api/companies'
import { useAdminKycList } from '../../features/admin/api/kyc'
import { vnDateTime } from '../../shared/lib/vn-time'
import { AdminPlanReport } from './AdminPlanReport'

const DAYS = 7
const BLUE = '#2563eb'
const GREEN = '#10b981'

type Status = KycStatus & CompanyStatus

function useTotals() {
  const count = (status?: Status) => ({ status, page: 1, pageSize: 1 })
  const kycQueue = useAdminKycList(count())
  const kycApproved = useAdminKycList(count('Approved'))
  const kycRejected = useAdminKycList(count('Rejected'))
  const kycDraft = useAdminKycList(count('Draft'))
  const companyQueue = useAdminCompanies(count())
  const companyApproved = useAdminCompanies(count('Approved'))
  const companyRejected = useAdminCompanies(count('Rejected'))
  const companyDraft = useAdminCompanies(count('Draft'))
  const n = (query: { data?: { totalItems: number } }) => query.data?.totalItems ?? 0
  return {
    kyc: { queue: n(kycQueue), approved: n(kycApproved), rejected: n(kycRejected), draft: n(kycDraft) },
    company: { queue: n(companyQueue), approved: n(companyApproved), rejected: n(companyRejected), draft: n(companyDraft) },
    isPending: [kycQueue, kycApproved, kycRejected, kycDraft, companyQueue, companyApproved, companyRejected, companyDraft].some((query) => query.isPending),
  }
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function lastDays() {
  return Array.from({ length: DAYS }, (_, index) => {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - (DAYS - 1 - index))
    return day
  })
}

function bucket(days: Date[], submittedAt: (string | null)[]) {
  const counts = new Map(days.map((day) => [dayKey(day), 0]))
  for (const value of submittedAt) {
    if (!value) continue
    const key = dayKey(new Date(value))
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return days.map((day) => counts.get(dayKey(day)) ?? 0)
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] ${className}`}>{children}</section>
}

function StatCard({ icon: Icon, label, loading, tone, to, value }: { icon: LucideIcon; label: string; loading: boolean; tone: string; to: string; value: number }) {
  return (
    <Link className="block rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5" to={to}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="h-[18px] w-[18px]" /></span>
      <p className="mt-4 text-sm text-brand-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{loading ? '—' : value.toLocaleString('vi-VN')}</p>
    </Link>
  )
}

function smoothPath(points: [number, number][]) {
  return points.reduce((path, [x, y], index) => {
    if (index === 0) return `M${x},${y}`
    const [px, py] = points[index - 1]
    const mid = (px + x) / 2
    return `${path} C${mid},${py} ${mid},${y} ${x},${y}`
  }, '')
}

function OverviewChart({ days, kyc, company }: { days: Date[]; kyc: number[]; company: number[] }) {
  const gradient = useId()
  const [hover, setHover] = useState<number | null>(null)
  const width = 640
  const height = 240
  const pad = { top: 16, right: 24, bottom: 32, left: 36 }
  const max = Math.max(4, ...kyc, ...company)
  const x = (index: number) => pad.left + (index * (width - pad.left - pad.right)) / (DAYS - 1)
  const y = (value: number) => pad.top + (1 - value / max) * (height - pad.top - pad.bottom)
  const kycPoints = kyc.map((value, index) => [x(index), y(value)] as [number, number])
  const companyPoints = company.map((value, index) => [x(index), y(value)] as [number, number])
  const kycPath = smoothPath(kycPoints)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(max * ratio))
  const label = (day: Date) => `${day.getDate()}/${day.getMonth() + 1}`
  const active = hover ?? DAYS - 1

  return (
    <div className="relative">
      <svg aria-label="Biểu đồ hồ sơ chờ duyệt theo ngày gửi" className="h-auto w-full" onMouseLeave={() => setHover(null)} role="img" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={BLUE} stopOpacity="0.18" /><stop offset="100%" stopColor={BLUE} stopOpacity="0" /></linearGradient>
        </defs>
        {ticks.map((tick) => <g key={tick}><line stroke="#e2e8f0" strokeDasharray="3 4" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} /><text fill="#94a3b8" fontSize="10" textAnchor="end" x={pad.left - 8} y={y(tick) + 3}>{tick}</text></g>)}
        <path d={`${kycPath} L${x(DAYS - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${gradient})`} />
        <path d={kycPath} fill="none" stroke={BLUE} strokeLinecap="round" strokeWidth="2.5" />
        <path d={smoothPath(companyPoints)} fill="none" stroke={GREEN} strokeLinecap="round" strokeWidth="2.5" />
        {days.map((day, index) => <text fill="#94a3b8" fontSize="10" key={day.toISOString()} textAnchor="middle" x={x(index)} y={height - 8}>{label(day)}</text>)}
        <line stroke="#cbd5e1" strokeDasharray="3 3" x1={x(active)} x2={x(active)} y1={pad.top} y2={y(0)} />
        <circle cx={x(active)} cy={y(kyc[active])} fill="white" r="4.5" stroke={BLUE} strokeWidth="2.5" />
        <circle cx={x(active)} cy={y(company[active])} fill="white" r="4.5" stroke={GREEN} strokeWidth="2.5" />
        {days.map((day, index) => <rect fill="transparent" height={height} key={day.toISOString()} onMouseEnter={() => setHover(index)} width={(width - pad.left - pad.right) / (DAYS - 1)} x={x(index) - (width - pad.left - pad.right) / (DAYS - 1) / 2} y="0" />)}
      </svg>
      <div className="pointer-events-none absolute top-2 rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-100" style={{ left: `${Math.min(Math.max((x(active) / width) * 100, 12), 78)}%` }}>
        <p className="font-semibold text-brand-charcoal">{label(days[active])}</p>
        <p className="mt-1 flex items-center gap-1.5 text-brand-muted"><span className="h-2 w-2 rounded-full" style={{ background: BLUE }} />KYC <b className="text-brand-charcoal">{kyc[active]}</b></p>
        <p className="flex items-center gap-1.5 text-brand-muted"><span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />Doanh nghiệp <b className="text-brand-charcoal">{company[active]}</b></p>
      </div>
    </div>
  )
}

function Donut({ percent }: { percent: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  return (
    <div className="relative mx-auto h-40 w-40">
      <svg aria-hidden="true" className="-rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" fill="none" r={radius} stroke="#e8f0fe" strokeWidth="14" />
        <circle cx="64" cy="64" fill="none" r={radius} stroke={BLUE} strokeDasharray={`${(percent / 100) * circumference} ${circumference}`} strokeLinecap="round" strokeWidth="14" />
      </svg>
      <p className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">{percent}%</p>
    </div>
  )
}

function Bars({ items }: { items: { color: string; label: string; value: number }[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const percent = total === 0 ? 0 : Math.round((item.value / total) * 100)
        return (
          <li key={item.label}>
            <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.label}</span><span className="text-brand-muted"><b className="text-brand-charcoal">{item.value}</b> · {percent}%</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ background: item.color, width: `${percent}%` }} /></div>
          </li>
        )
      })}
    </ul>
  )
}

export function AdminDashboardPage() {
  const totals = useTotals()
  const kycRecent = useAdminKycList({ page: 1, pageSize: 100 })
  const companyRecent = useAdminCompanies({ page: 1, pageSize: 100 })
  const days = useMemo(() => lastDays(), [])
  const kycSeries = useMemo(() => bucket(days, (kycRecent.data?.items ?? []).map((item) => item.submittedAtUtc)), [days, kycRecent.data])
  const companySeries = useMemo(() => bucket(days, (companyRecent.data?.items ?? []).map((item) => item.submittedAtUtc)), [days, companyRecent.data])
  const decided = (group: { approved: number; rejected: number }) => group.approved + group.rejected
  const totalDecided = decided(totals.kyc) + decided(totals.company)
  const approvalRate = totalDecided === 0 ? 0 : Math.round(((totals.kyc.approved + totals.company.approved) / totalDecided) * 100)
  const queue = [
    ...(kycRecent.data?.items ?? []).map((item) => ({ id: item.providerId, kind: 'KYC freelancer', name: item.legalFullName, at: item.submittedAtUtc, to: `/admin/kyc/${item.providerId}` })),
    ...(companyRecent.data?.items ?? []).map((item) => ({ id: item.providerId, kind: 'Doanh nghiệp', name: item.legalName, at: item.submittedAtUtc, to: `/admin/companies/${item.providerId}` })),
  ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 5)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Clock3} label="KYC chờ duyệt" loading={totals.isPending} tone="bg-blue-50 text-blue-600" to="/admin/kyc" value={totals.kyc.queue} />
        <StatCard icon={BadgeCheck} label="KYC đã duyệt" loading={totals.isPending} tone="bg-emerald-50 text-emerald-600" to="/admin/kyc" value={totals.kyc.approved} />
        <StatCard icon={Building2} label="Doanh nghiệp chờ duyệt" loading={totals.isPending} tone="bg-orange-50 text-orange-500" to="/admin/approvals" value={totals.company.queue} />
        <StatCard icon={FileCheck2} label="Doanh nghiệp đã duyệt" loading={totals.isPending} tone="bg-violet-50 text-violet-600" to="/admin/approvals" value={totals.company.approved} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Hồ sơ chờ duyệt theo ngày gửi</h2>
            <div className="flex items-center gap-4 text-xs text-brand-muted"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: BLUE }} />KYC</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />Doanh nghiệp</span><span className="rounded-lg bg-slate-50 px-2.5 py-1">{DAYS} ngày qua</span></div>
          </div>
          <OverviewChart company={companySeries} days={days} kyc={kycSeries} />
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold">Hồ sơ gần đây trong hàng chờ</h2>
          {queue.length === 0 ? <p className="text-sm text-brand-muted">Hàng chờ đang trống.</p> : (
            <ul className="divide-y divide-slate-100">
              {queue.map((item) => <li key={`${item.kind}-${item.id}`}><Link className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand-purple" to={item.to}><span className="min-w-0"><span className="block truncate font-semibold">{item.name}</span><span className="block text-xs text-brand-muted">{item.kind}</span></span><span className="shrink-0 text-xs text-brand-muted">{item.at ? vnDateTime(item.at) : '—'}</span></Link></li>)}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-base font-semibold">Tỉ lệ duyệt</h2>
          <Donut percent={approvalRate} />
          <p className="mt-3 text-center text-xs text-brand-muted">{totals.kyc.approved + totals.company.approved} duyệt / {totalDecided} đã có quyết định</p>
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold">Trạng thái KYC</h2>
          <Bars items={[{ color: BLUE, label: 'Chờ duyệt', value: totals.kyc.queue }, { color: GREEN, label: 'Đã duyệt', value: totals.kyc.approved }, { color: '#f97316', label: 'Bị từ chối', value: totals.kyc.rejected }, { color: '#a78bfa', label: 'Đang soạn', value: totals.kyc.draft }]} />
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold">Trạng thái doanh nghiệp</h2>
          <Bars items={[{ color: BLUE, label: 'Chờ duyệt', value: totals.company.queue }, { color: GREEN, label: 'Đã duyệt', value: totals.company.approved }, { color: '#f97316', label: 'Bị từ chối', value: totals.company.rejected }, { color: '#a78bfa', label: 'Đang soạn', value: totals.company.draft }]} />
        </Card>
      </div>

      <AdminPlanReport />
    </div>
  )
}
