import { cn } from '@/lib/utils/cn'
import type { Organization } from '@/types/domain'

export function OrganizationAvatar({
  organization,
  size = 'md',
}: {
  organization: Organization
  size?: 'sm' | 'md'
}) {
  const initials = organization.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <span
      className={cn(
        'bg-brand-700 text-ink-inverse inline-flex shrink-0 items-center justify-center rounded-md font-semibold tracking-tight',
        size === 'sm' ? 'size-6 text-[0.6875rem]' : 'size-7 text-xs',
      )}
    >
      {initials || 'PW'}
    </span>
  )
}
