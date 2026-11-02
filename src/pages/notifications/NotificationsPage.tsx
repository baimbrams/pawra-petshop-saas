import { useQuery } from '@tanstack/react-query'
import { BellRing, CheckCircle2 } from 'lucide-react'
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { useOrganization } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'

export function NotificationsPage() {
  const organization = useOrganization()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', organization.id],
    queryFn: () => api.listNotifications(organization.id),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifikasi & Peringatan Operasional"
        description={`Pemantauan otomatis stok gudang, produk expired, masa berlaku vaksin, dan jadwal Pet Hotel di ${organization.name}.`}
      />

      {notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="size-5 text-positive-600" />}
            title="Semua operasional terkendali"
            description="Tidak ada stok kritis, produk kedaluwarsa, atau peringatan vaksin saat ini."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3">
                <div className="bg-surface-inset mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <BellRing className="text-ink-muted size-4" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        item.severity === 'critical'
                          ? 'critical'
                          : item.severity === 'caution'
                            ? 'caution'
                            : 'info'
                      }
                    >
                      {item.severity === 'critical'
                        ? 'Penting'
                        : item.severity === 'caution'
                          ? 'Perhatian'
                          : 'Jadwal Hari Ini'}
                    </Badge>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-ink-muted mt-1 text-xs leading-relaxed">{item.description}</p>
                </div>
              </div>
              <div className="shrink-0">
                <ButtonLink variant="secondary" size="xs" to={item.link_to}>
                  Tindak Lanjuti →
                </ButtonLink>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
