import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, PageHeader } from '@/components/ui'
import { useOrganization } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import {
  BOARDING_STATUS_LABELS,
  GROOMING_STATUS_LABELS,
  SPECIES_LABELS,
  VACCINE_STATUS_LABELS,
} from '@/lib/data/labels'
import { evaluateExpiryStatus, formatDateId, formatPetAge, todayIsoDate } from '@/lib/datetime/dates'
import { formatMoney } from '@/lib/money/money'

export function CustomerDetailPage() {
  const { customerId = '' } = useParams()
  const organization = useOrganization()
  const today = todayIsoDate(organization.time_zone)
  const money = (minor: number) =>
    formatMoney(minor, organization.default_currency, { locale: organization.locale })

  const { data: customer } = useQuery({
    queryKey: ['customer', organization.id, customerId],
    queryFn: () => api.getCustomer(organization.id, customerId),
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', organization.id, customerId],
    queryFn: () => api.listPets(organization.id, customerId),
  })

  const { data: allOrders = [] } = useQuery({
    queryKey: ['pos-orders', organization.id],
    queryFn: () => api.listPosOrders(organization.id),
  })

  const { data: allGrooming = [] } = useQuery({
    queryKey: ['grooming', organization.id],
    queryFn: () => api.listGrooming(organization.id),
  })

  const { data: allBoarding = [] } = useQuery({
    queryKey: ['boarding', organization.id],
    queryFn: () => api.listBoardingStays(organization.id),
  })

  if (!customer) {
    return (
      <Card>
        <EmptyState
          title="Profil pelanggan tidak ditemukan"
          description="Pelanggan mungkin berasal dari cabang lain atau telah diarsipkan."
          action={
            <ButtonLink variant="primary" size="sm" to={paths.customers}>
              Kembali ke Direktori
            </ButtonLink>
          }
        />
      </Card>
    )
  }

  const custOrders = allOrders.filter((o) => o.customer_id === customer.id)
  const custGrooming = allGrooming.filter((g) => g.customer_id === customer.id)
  const custBoarding = allBoarding.filter((b) => b.customer_id === customer.id)

  const lifetimeSpend =
    custOrders.reduce((a, b) => a + b.total_minor, 0) +
    custGrooming.reduce((a, b) => a + b.paid_minor, 0) +
    custBoarding.reduce((a, b) => a + b.total_paid_minor, 0)

  return (
    <div className="space-y-6">
      <div>
        <ButtonLink variant="ghost" size="xs" leadingIcon={<ArrowLeft />} to={paths.customers}>
          Semua Pelanggan
        </ButtonLink>
      </div>

      <PageHeader
        eyebrow={customer.code}
        title={customer.full_name}
        description={customer.notes || 'Member aktif Pet Shop'}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="brand">{customer.loyalty_points} Poin Loyalti</Badge>
            <Badge tone="positive">Total Belanja: {money(lifetimeSpend)}</Badge>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <p className="eyebrow">Informasi Kontak</p>
          <div className="mt-3 space-y-2.5 text-xs">
            <p className="flex items-center gap-2">
              <Phone className="text-ink-subtle size-3.5" />
              <span>{customer.phone || '—'}</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="text-ink-subtle size-3.5" />
              <span>{customer.email || '—'}</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="text-ink-subtle mt-0.5 size-3.5 shrink-0" />
              <span>{customer.address || 'Alamat belum dilengkapi'}</span>
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={`Hewan Peliharaan Terdaftar (${pets.length})`}
            description="Riwayat vaksin & catatan penanganan khusus untuk staf toko"
          />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {pets.length === 0 ? (
              <p className="text-ink-muted text-xs">Belum ada profil hewan terdaftar.</p>
            ) : (
              pets.map((pet) => {
                const vax = evaluateExpiryStatus(pet.vaccine_expires_on, today, 21)
                return (
                  <div key={pet.id} className="border-line rounded-lg border p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{pet.name}</span>
                      <Badge
                        tone={
                          vax === 'valid'
                            ? 'positive'
                            : vax === 'expiring_soon'
                              ? 'caution'
                              : 'critical'
                        }
                      >
                        {VACCINE_STATUS_LABELS[vax]}
                      </Badge>
                    </div>
                    <p className="text-ink-muted mt-0.5">
                      {SPECIES_LABELS[pet.species]} · {pet.breed} · {pet.weight_kg} kg ·{' '}
                      {formatPetAge(pet.birth_date)}
                    </p>
                    {pet.vaccine_expires_on ? (
                      <p className="text-ink-subtle mt-1 text-[0.6875rem]">
                        {pet.vaccine_name}: berlaku s/d {formatDateId(pet.vaccine_expires_on)}
                      </p>
                    ) : null}
                    {pet.allergies_or_notes ? (
                      <p className="bg-surface-muted mt-2 rounded p-2 text-[0.6875rem]">
                        {pet.allergies_or_notes}
                      </p>
                    ) : null}
                  </div>
                )
              })
            )}
          </CardBody>
        </Card>
      </div>

      {/* Unified Activity History */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title={`Belanja POS (${custOrders.length})`} />
          <CardBody className="space-y-2.5 text-xs">
            {custOrders.length === 0 ? (
              <p className="text-ink-muted">Belum ada nota POS.</p>
            ) : (
              custOrders.map((o) => (
                <div key={o.id} className="border-line flex justify-between border-b pb-2 last:border-none">
                  <div>
                    <p className="identifier font-semibold">{o.invoice_number}</p>
                    <p className="text-ink-subtle text-[0.6875rem]">
                      {formatDateId(o.created_at)} · {o.items.length} produk
                    </p>
                  </div>
                  <span data-numeric className="font-semibold">
                    {money(o.total_minor)}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Riwayat Grooming (${custGrooming.length})`} />
          <CardBody className="space-y-2.5 text-xs">
            {custGrooming.length === 0 ? (
              <p className="text-ink-muted">Belum ada sesi grooming.</p>
            ) : (
              custGrooming.map((g) => (
                <div key={g.id} className="border-line flex justify-between border-b pb-2 last:border-none">
                  <div>
                    <p className="font-semibold">{g.service_package}</p>
                    <p className="text-ink-subtle text-[0.6875rem]">
                      {formatDateId(g.scheduled_at)} · {GROOMING_STATUS_LABELS[g.status]}
                    </p>
                  </div>
                  <span data-numeric className="font-semibold">
                    {money(g.price_minor)}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`Kontrak Pet Hotel (${custBoarding.length})`} />
          <CardBody className="space-y-2.5 text-xs">
            {custBoarding.length === 0 ? (
              <p className="text-ink-muted">Belum pernah menginap.</p>
            ) : (
              custBoarding.map((b) => (
                <div key={b.id} className="border-line flex justify-between border-b pb-2 last:border-none">
                  <div>
                    <p className="identifier font-semibold">{b.contract_code}</p>
                    <p className="text-ink-subtle text-[0.6875rem]">
                      {b.nights} malam · {BOARDING_STATUS_LABELS[b.status]}
                    </p>
                  </div>
                  <span data-numeric className="font-semibold">
                    {money(b.total_minor)}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
