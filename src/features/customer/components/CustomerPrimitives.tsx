import type { PropsWithChildren, ReactNode } from 'react'

export function CustomerContainer({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={`w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 ${className}`}>{children}</div>
}

export function CustomerCard({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`rounded-2xl border border-brand-border bg-white shadow-[0_1px_3px_rgba(16,24,40,0.04)] ${className}`}>{children}</section>
}

export function StatusPill({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'blue' | 'green' | 'neutral' | 'purple' | 'yellow' }>) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    neutral: 'bg-slate-100 text-slate-600',
    purple: 'bg-brand-50 text-brand-700',
    yellow: 'bg-amber-50 text-amber-700',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export function SectionHeading({ action, description, title }: { action?: ReactNode; description?: string; title: string }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><h2 className="text-xl font-semibold tracking-[-0.02em] text-brand-charcoal sm:text-2xl">{title}</h2>{description ? <p className="mt-1 text-sm text-brand-muted">{description}</p> : null}</div>
      {action}
    </div>
  )
}
