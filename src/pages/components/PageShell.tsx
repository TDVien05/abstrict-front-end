import type { PropsWithChildren, ReactNode } from 'react'

interface PageShellProps extends PropsWithChildren {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageShell({ actions, children, description, eyebrow, title }: PageShellProps) {
  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-16 sm:py-20 lg:py-28">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-3xl">
          {eyebrow ? <p className="mb-4 text-base font-semibold text-brand-purple">{eyebrow}</p> : null}
          <h1 className="page-title">{title}</h1>
          <p className="page-intro mt-6">{description}</p>
        </div>
        {actions}
      </div>
      {children ? <div className="mt-12 sm:mt-16">{children}</div> : null}
    </main>
  )
}
