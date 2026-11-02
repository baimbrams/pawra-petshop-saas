import { PawPrint } from 'lucide-react'
import { BRAND } from '@/lib/config/brand'
import { cn } from '@/lib/utils/cn'

export function Wordmark({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const iconBox =
    size === 'sm' ? 'size-6 rounded-md' : size === 'lg' ? 'size-9 rounded-xl' : 'size-7 rounded-lg'
  const iconSize = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4'
  const textSize =
    size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-[0.9375rem]'

  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-ink', className)}>
      <span
        className={cn(
          'bg-brand-600 text-ink-inverse inline-flex shrink-0 items-center justify-center shadow-raised',
          iconBox,
        )}
      >
        <PawPrint className={iconSize} aria-hidden="true" />
      </span>
      <span className={textSize}>{BRAND.name}</span>
    </span>
  )
}
