import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { paths } from '@/app/routes/paths'
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, PageHeader } from '@/components/ui'
import { useOrganization } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { GROOMING_STATUS_LABELS } from '@/lib/data/labels'
import { addDaysIso, formatDateId, todayIsoDate } from '@/lib/datetime/dates'
import { cn } from '@/lib/utils/cn'

export function CalendarPage() {
  const organization = useOrganization()
  const today = todayIsoDate(organization.time_zone)
  const [dayOffset, setDayOffset] = useState(-2)

  const windowDays = useMemo(() => {
    const start = addDaysIso(today, dayOffset)
    return Array.from({ length: 12 }, (_, idx) => addDaysIso(start, idx))
  }, [today, dayOffset])

  const { data: kennels = [] } = useQuery({
    queryKey: ['kennels', organization.id],
    queryFn: () => api.listKennels(organization.id),
  })

  const { data: stays = [] } = useQuery({
    queryKey: ['boarding', organization.id],
    queryFn: () => api.listBoardingStays(organization.id),
  })

  const { data: grooming = [] } = useQuery({
    queryKey: ['grooming', organization.id],
    queryFn: () => api.listGrooming(organization.id),
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', organization.id],
    queryFn: () => api.listPets(organization.id),
  })

  const upcomingGrooming = grooming
    .filter((g) => g.scheduled_at.slice(0, 10) >= today && g.status !== 'cancelled')
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender Okupansi Kandang & Grooming"
        description="Peta visual ketersediaan ruang Pet Hotel selama 12 hari serta jadwal grooming mendatang."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDayOffset((d) => d - 7)}
              aria-label="Minggu sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDayOffset(-2)}>
              Hari Ini
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDayOffset((d) => d + 7)}
              aria-label="Minggu berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      {/* Kennel Timeline Matrix */}
      <Card>
        <CardHeader
          title="Matriks Kandang Pet Hotel"
          description="Setiap sel merepresentasikan malam menginap [Check-In s/d H-1 Check-Out]"
          actions={
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-info-600 size-2.5 rounded-sm" /> Menginap
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-caution-600 size-2.5 rounded-sm" /> Reservasi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[#c4c8ce]" /> Sterilisasi
              </span>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-xs">
            <thead>
              <tr className="border-line bg-surface-muted border-b">
                <th className="eyebrow sticky start-0 bg-[var(--color-surface-muted)] px-4 py-2.5 text-start">
                  Unit Kandang
                </th>
                {windowDays.map((day) => {
                  const dt = new Date(`${day}T00:00:00`)
                  const isToday = day === today
                  return (
                    <th
                      key={day}
                      className={cn(
                        'border-line border-s px-2 py-2 text-center font-medium',
                        isToday && 'bg-brand-50 text-brand-800',
                      )}
                    >
                      <div className="text-[0.65rem] uppercase">
                        {new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(dt)}
                      </div>
                      <div data-numeric className="font-semibold">
                        {day.slice(8, 10)}/{day.slice(5, 7)}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {kennels.map((ken) => (
                <tr key={ken.id}>
                  <td className="bg-surface sticky start-0 px-4 py-3">
                    <p className="identifier font-semibold">{ken.code}</p>
                    <p className="text-ink-subtle truncate text-[0.6875rem]">{ken.name}</p>
                  </td>
                  {windowDays.map((day) => {
                    if (ken.operational_status !== 'active') {
                      return (
                        <td
                          key={day}
                          className="border-line border-s bg-[#f1f2f4] px-1.5 py-2 text-center text-[0.65rem] text-ink-subtle"
                        >
                          UV
                        </td>
                      )
                    }

                    const stay = stays.find(
                      (s) =>
                        s.kennel_id === ken.id &&
                        (s.status === 'checked_in' || s.status === 'reserved') &&
                        s.check_in_date <= day &&
                        day < s.check_out_date,
                    )
                    const pet = stay ? pets.find((p) => p.id === stay.pet_id) : null

                    return (
                      <td
                        key={day}
                        className={cn(
                          'border-line border-s p-1 text-center',
                          day === today && 'bg-brand-50/35',
                        )}
                      >
                        {stay ? (
                          <div
                            title={`${stay.contract_code} · ${pet?.name ?? ''} (${stay.check_in_date} → ${stay.check_out_date})`}
                            className={cn(
                              'truncate rounded px-1.5 py-1 text-[0.6875rem] font-semibold text-white',
                              stay.status === 'checked_in' ? 'bg-info-600' : 'bg-caution-600',
                            )}
                          >
                            {pet?.name ?? stay.contract_code}
                          </div>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upcoming Grooming Agenda */}
      <Card>
        <CardHeader
          title="Agenda Grooming Hari Ini & Mendatang"
          actions={
            <ButtonLink variant="secondary" size="xs" to={paths.grooming}>
              Kelola Grooming
            </ButtonLink>
          }
        />
        <CardBody>
          {upcomingGrooming.length === 0 ? (
            <p className="text-ink-muted text-xs">Belum ada jadwal grooming mendatang.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingGrooming.map((g) => {
                const pet = pets.find((p) => p.id === g.pet_id)
                return (
                  <div key={g.id} className="border-line rounded-lg border p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="identifier font-semibold">{g.booking_code}</span>
                      <Badge tone="brand">{GROOMING_STATUS_LABELS[g.status]}</Badge>
                    </div>
                    <p className="mt-1.5 font-semibold">
                      {pet?.name ?? 'Hewan'} — {g.service_package}
                    </p>
                    <p className="text-ink-muted mt-0.5">
                      {formatDateId(g.scheduled_at, true)} · {g.groomer_name}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
