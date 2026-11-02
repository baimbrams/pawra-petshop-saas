import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export type BadgeTone = 'neutral' | 'positive' | 'info' | 'caution' | 'critical' | 'brand'

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-badge-50 text-neutral-badge-600 border-neutral-badge-200',
  positive: 'bg-positive-50 text-positive-700 border-positive-200',
  info: 'bg-info-50 text-info-700 border-info-200',
  caution: 'bg-caution-50 text-caution-700 border-caution-200',
  critical: 'bg-critical-50 text-critical-700 border-critical-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
