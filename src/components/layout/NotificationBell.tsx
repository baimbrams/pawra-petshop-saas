import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { cn } from '@/lib/utils/cn'

export function NotificationBell({ className }: { className?: string }) {
  const { organization } = useWorkspace()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', organization?.id],
    queryFn: () => api.listNotifications(organization!.id),
    enabled: Boolean(organization?.id),
  })

  const urgentCount = notifications.filter((n) => n.severity !== 'info').length
  const totalCount = notifications.length

  return (
    <Link
      to={paths.notifications}
      title="Notifikasi Operasional"
      aria-label={`Notifikasi (${totalCount})`}
      className={cn(
        'text-ink-muted hover:bg-surface-inset hover:text-ink relative inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
        className,
      )}
    >
      <Bell className="size-4" />
      {totalCount > 0 ? (
        <span
          className={cn(
            'absolute top-1 right-1 flex size-2 rounded-full',
            urgentCount > 0 ? 'bg-critical-600' : 'bg-brand-500',
          )}
        />
      ) : null}
    </Link>
  )
}
