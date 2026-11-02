import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface border-line rounded-lg border shadow-raised', className)}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-line flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-ink text-[0.9375rem] font-semibold">{title}</h2>
        {description ? (
          <p className="text-ink-muted mt-0.5 text-xs">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h1 className="text-ink text-xl font-semibold tracking-tight sm:text-[1.375rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-ink-muted mt-1 text-[0.8125rem]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function MetricTile({
  label,
  value,
  caption,
  badge,
  emphasis = 'default',
}: {
  label: string
  value: ReactNode
  caption?: ReactNode
  badge?: ReactNode
  emphasis?: 'default' | 'strong'
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow">{label}</p>
        {badge}
      </div>
      <p
        data-numeric
        className={cn(
          'text-ink mt-2 font-semibold tracking-tight',
          emphasis === 'strong' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl',
        )}
      >
        {value}
      </p>
      {caption ? <p className="text-ink-subtle mt-1 text-xs">{caption}</p> : null}
    </Card>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? (
        <div className="bg-surface-inset text-ink-subtle mb-3 flex size-10 items-center justify-center rounded-lg border border-[var(--color-line)]">
          {icon}
        </div>
      ) : null}
      <p className="text-ink text-sm font-semibold">{title}</p>
      <p className="text-ink-muted mt-1 max-w-md text-xs leading-relaxed">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Alert({
  tone = 'info',
  title,
  children,
  actions,
}: {
  tone?: 'info' | 'caution' | 'critical' | 'positive'
  title: string
  children?: ReactNode
  actions?: ReactNode
}) {
  const styles = {
    info: 'bg-info-50 border-info-200 text-info-700',
    caution: 'bg-caution-50 border-caution-200 text-caution-700',
    critical: 'bg-critical-50 border-critical-200 text-critical-700',
    positive: 'bg-positive-50 border-positive-200 text-positive-700',
  }[tone]

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3', styles)}>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-semibold">{title}</p>
        {children ? <div className="mt-0.5 text-xs opacity-90">{children}</div> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}
