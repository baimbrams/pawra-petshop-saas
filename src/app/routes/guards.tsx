import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { paths } from './paths'
import { FullPageLoader } from '@/components/feedback/FullPageLoader'
import { ButtonLink, Card } from '@/components/ui'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { type Permission, ROLE_LABELS, can, requiredRoleFor } from '@/lib/authz/permissions'

export function RequireAnonymous() {
  const { user, isLoading } = useWorkspace()
  if (isLoading) return <FullPageLoader />
  if (user) return <Navigate to={paths.overview} replace />
  return <Outlet />
}

export function RequireAuth({ publicHome }: { publicHome?: ReactNode }) {
  const { user, isLoading } = useWorkspace()
  const location = useLocation()

  if (isLoading) return <FullPageLoader />
  if (!user) {
    if (location.pathname === paths.overview && publicHome) {
      return <>{publicHome}</>
    }
    return <Navigate to={paths.signIn} replace />
  }
  return <Outlet />
}

export function RequireOrganization() {
  const { organization, isLoading } = useWorkspace()
  if (isLoading) return <FullPageLoader />
  if (!organization) return <Navigate to={paths.createShop} replace />
  return <Outlet />
}

export function RequirePermission({ permission }: { permission: Permission }) {
  const { role } = useWorkspace()
  if (!can(role, permission)) {
    const needed = ROLE_LABELS[requiredRoleFor(permission)]
    return (
      <Card className="mx-auto max-w-lg p-6 text-center">
        <p className="eyebrow text-caution-600">Akses Dibatasi Role</p>
        <h2 className="mt-1 text-base font-semibold">Anda tidak memiliki izin ke modul ini</h2>
        <p className="text-ink-muted mt-2 text-xs leading-relaxed">
          Halaman ini memerlukan minimal wewenang <strong>{needed}</strong>. Saat ini Anda masuk
          dengan role <strong>{role ? ROLE_LABELS[role] : 'Tamu'}</strong>.
        </p>
        <div className="mt-4">
          <ButtonLink variant="primary" size="sm" to={paths.overview}>
            Kembali ke Ringkasan
          </ButtonLink>
        </div>
      </Card>
    )
  }
  return <Outlet />
}
