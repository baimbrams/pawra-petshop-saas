import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Plus, Scissors } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import {
  Badge,
  type BadgeTone,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  MetricTile,
  Modal,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { useOrganization } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import {
  GROOMING_PACKAGES,
  GROOMING_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  SPECIES_LABELS,
} from '@/lib/data/labels'
import { formatDateId, todayIsoDate } from '@/lib/datetime/dates'
import { formatMoney, toMinorUnits } from '@/lib/money/money'
import type { GroomingStatus, PaymentMethod } from '@/types/domain'

const STATUS_TONE: Record<GroomingStatus, BadgeTone> = {
  scheduled: 'neutral',
  checked_in: 'info',
  in_progress: 'brand',
  ready_pickup: 'caution',
  completed: 'positive',
  cancelled: 'critical',
}

export function GroomingPage() {
  const organization = useOrganization()
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const currency = organization.default_currency
  const today = todayIsoDate(organization.time_zone)
  const money = (minor: number) => formatMoney(minor, currency, { locale: organization.locale })

  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'completed'>('active')
  const [isNewOpen, setIsNewOpen] = useState(false)

  // New Booking Form
  const [customerId, setCustomerId] = useState('')
  const [petId, setPetId] = useState('')
  const [pkgName, setPkgName] = useState<string>(GROOMING_PACKAGES[0].name)
  const [dateStr, setDateStr] = useState(today)
  const [timeStr, setTimeStr] = useState('10:00')
  const [groomerName, setGroomerName] = useState('Sinta Maharani')
  const [priceMajor, setPriceMajor] = useState(
    currency === 'IDR' ? String(GROOMING_PACKAGES[0].defaultPriceIdr) : '35',
  )
  const [paidNow, setPaidNow] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')
  const [notes, setNotes] = useState('')

  const { data: appointments = [] } = useQuery({
    queryKey: ['grooming', organization.id],
    queryFn: () => api.listGrooming(organization.id),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', organization.id],
    queryFn: () => api.listCustomers(organization.id),
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', organization.id],
    queryFn: () => api.listPets(organization.id),
  })

  const customerPets = useMemo(
    () => pets.filter((p) => p.customer_id === customerId),
    [pets, customerId],
  )

  const openNewModal = () => {
    const firstCust = customers[0]?.id ?? ''
    setCustomerId(firstCust)
    const firstPet = pets.find((p) => p.customer_id === firstCust)?.id ?? ''
    setPetId(firstPet)
    setIsNewOpen(true)
  }

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter === 'active') {
        return a.status !== 'completed' && a.status !== 'cancelled'
      }
      if (statusFilter === 'completed') {
        return a.status === 'completed'
      }
      return true
    })
  }, [appointments, statusFilter])

  const createMutation = useMutation({
    mutationFn: () => {
      if (!customerId || !petId) {
        throw new Error('Pilih pelanggan dan hewan peliharaan terlebih dahulu.')
      }
      const pkg = GROOMING_PACKAGES.find((p) => p.name === pkgName) ?? GROOMING_PACKAGES[0]
      return api.createGrooming(organization.id, {
        customer_id: customerId,
        pet_id: petId,
        service_package: pkgName,
        scheduled_at: `${dateStr}T${timeStr}:00`,
        duration_minutes: pkg.duration,
        groomer_name: groomerName,
        price_minor: toMinorUnits(priceMajor, currency),
        paid_now: paidNow,
        payment_method: paymentMethod,
        notes,
      })
    },
    onSuccess: (created) => {
      setIsNewOpen(false)
      setNotes('')
      void queryClient.invalidateQueries({ queryKey: ['grooming', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: `Jadwal ${created.booking_code} berhasil dibuat`,
        description: `${created.service_package} terjadwal.`,
      })
    },
    onError: (err) => {
      pushToast({
        title: 'Gagal membuat booking',
        description: err instanceof Error ? err.message : 'Periksa formulir.',
        tone: 'critical',
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (input: {
      id: string
      status?: GroomingStatus
      settlePaymentMethod?: PaymentMethod
    }) =>
      api.updateGroomingStatus(organization.id, input.id, {
        status: input.status,
        settlePaymentMethod: input.settlePaymentMethod,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['grooming', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({ title: 'Status antrean grooming diperbarui' })
    },
  })

  const todayCount = appointments.filter(
    (a) => a.scheduled_at.slice(0, 10) === today && a.status !== 'cancelled',
  ).length
  const inProgressCount = appointments.filter((a) => a.status === 'in_progress').length
  const readyPickupCount = appointments.filter((a) => a.status === 'ready_pickup').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Layanan & Antrean Grooming"
        description="Kelola jadwal kedatangan hewan, penugasan groomer, catatan alergi kulit, dan pelunasan."
        actions={
          <Button variant="primary" leadingIcon={<Plus />} onClick={openNewModal}>
            Booking Grooming Baru
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label="Jadwal Hari Ini" value={todayCount} caption="Total sesi hari ini" />
        <MetricTile
          label="Sedang Dikerjakan"
          value={inProgressCount}
          caption="Di ruang mandi / meja styling"
        />
        <MetricTile
          label="Siap Dijemput Pemilik"
          value={readyPickupCount}
          caption="Menunggu penjemputan"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['active', 'Antrean Aktif'],
            ['completed', 'Selesai'],
            ['all', 'Semua Riwayat'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="xs"
            variant={statusFilter === key ? 'primary' : 'secondary'}
            onClick={() => setStatusFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Scissors className="size-5" />}
            title="Tidak ada antrean grooming pada tab ini"
            description="Klik Booking Grooming Baru untuk menjadwalkan layanan mandi, potong bulu, atau perawatan anti-kutu."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-line bg-surface-muted border-b">
                  <th className="eyebrow px-4 py-2.5 text-start">Kode &amp; Jadwal</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Hewan &amp; Pemilik</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Paket Layanan</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Groomer</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Status</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Tarif &amp; Bayar</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Tahapan</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {filtered.map((item) => {
                  const pet = pets.find((p) => p.id === item.pet_id)
                  const cust = customers.find((c) => c.id === item.customer_id)
                  const isPaid = item.paid_minor >= item.price_minor

                  return (
                    <tr key={item.id} className="hover:bg-surface-muted/60">
                      <td className="px-4 py-3">
                        <p className="identifier font-semibold">{item.booking_code}</p>
                        <p className="text-ink-muted mt-0.5">
                          {formatDateId(item.scheduled_at, true)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {pet?.name ?? 'Hewan'}{' '}
                          <span className="text-ink-muted font-normal">
                            ({pet ? `${SPECIES_LABELS[pet.species]} · ${pet.breed}` : ''})
                          </span>
                        </p>
                        <p className="text-ink-subtle text-[0.6875rem]">
                          Pemilik: {cust?.full_name ?? '—'} ({cust?.phone ?? ''})
                        </p>
                        {pet?.allergies_or_notes || item.notes ? (
                          <p className="text-caution-700 mt-1 flex items-center gap-1 text-[0.6875rem]">
                            <AlertCircle className="size-3 shrink-0" />
                            <span>{item.notes || pet?.allergies_or_notes}</span>
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.service_package}</p>
                        <p className="text-ink-subtle text-[0.6875rem]">
                          Estimasi {item.duration_minutes} menit
                        </p>
                      </td>
                      <td className="text-ink-muted px-4 py-3">{item.groomer_name}</td>
                      <td className="px-4 py-3">
                        <Badge tone={STATUS_TONE[item.status]}>
                          {GROOMING_STATUS_LABELS[item.status]}
                        </Badge>
                      </td>
                      <td data-numeric className="px-4 py-3 text-end">
                        <p className="font-semibold">{money(item.price_minor)}</p>
                        {isPaid ? (
                          <span className="text-positive-700 text-[0.6875rem] font-medium">
                            Lunas ({item.payment_method ? PAYMENT_METHOD_LABELS[item.payment_method] : 'QRIS'})
                          </span>
                        ) : (
                          <span className="text-caution-700 text-[0.6875rem] font-medium">
                            Belum Bayar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {item.status === 'scheduled' ? (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() =>
                                statusMutation.mutate({ id: item.id, status: 'in_progress' })
                              }
                            >
                              Mulai Grooming
                            </Button>
                          ) : null}
                          {item.status === 'in_progress' ? (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() =>
                                statusMutation.mutate({ id: item.id, status: 'ready_pickup' })
                              }
                            >
                              Siap Jemput
                            </Button>
                          ) : null}
                          {(item.status === 'ready_pickup' || item.status === 'in_progress') && (
                            <Button
                              size="xs"
                              variant="primary"
                              leadingIcon={<CheckCircle2 />}
                              onClick={() =>
                                statusMutation.mutate({
                                  id: item.id,
                                  status: 'completed',
                                  settlePaymentMethod: isPaid ? undefined : 'qris',
                                })
                              }
                            >
                              {isPaid ? 'Selesai' : 'Lunasi & Selesai'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Grooming Booking Modal */}
      <Modal
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        title="Jadwalkan Layanan Grooming Baru"
        description="Pilih pemilik, hewan peliharaan, paket perawatan, dan waktu kedatangan."
        size="lg"
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pemilik Hewan" required>
              <Select
                value={customerId}
                onChange={(e) => {
                  const nextCust = e.target.value
                  setCustomerId(nextCust)
                  const firstPet = pets.find((p) => p.customer_id === nextCust)?.id ?? ''
                  setPetId(firstPet)
                }}
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.full_name} (${c.phone})`,
                }))}
              />
            </Field>
            <Field label="Pilih Hewan Peliharaan" required>
              <Select
                value={petId}
                onChange={(e) => setPetId(e.target.value)}
                options={
                  customerPets.length > 0
                    ? customerPets.map((p) => ({
                        value: p.id,
                        label: `${p.name} — ${SPECIES_LABELS[p.species]} (${p.breed}, ${p.weight_kg}kg)`,
                      }))
                    : [{ value: '', label: 'Pelanggan ini belum memiliki data hewan' }]
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paket Layanan Grooming" required>
              <Select
                value={pkgName}
                onChange={(e) => {
                  const nextName = e.target.value
                  setPkgName(nextName)
                  const found = GROOMING_PACKAGES.find((p) => p.name === nextName)
                  if (found && currency === 'IDR') {
                    setPriceMajor(String(found.defaultPriceIdr))
                  }
                }}
                options={GROOMING_PACKAGES.map((p) => ({
                  value: p.name,
                  label: `${p.name} (${p.duration} mnt)`,
                }))}
              />
            </Field>
            <Field label={`Tarif Layanan (${currency})`} required>
              <Input
                type="number"
                min={0}
                required
                value={priceMajor}
                onChange={(e) => setPriceMajor(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal" required>
              <Input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </Field>
            <Field label="Jam Kedatangan" required>
              <Input
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </Field>
            <Field label="Staf Groomer" required>
              <Input
                required
                value={groomerName}
                onChange={(e) => setGroomerName(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={paidNow}
                onChange={(e) => setPaidNow(e.target.checked)}
                className="accent-brand-600 size-3.5 rounded"
              />
              <span>Langsung dibayar lunas di awal</span>
            </label>
            {paidNow ? (
              <div className="w-48">
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
              </div>
            ) : null}
          </div>

          <Field label="Catatan Khusus Groomer (Model potongan / sampo alergi)">
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Lion cut rapi, gunakan sampo anti-jamur, jangan pakai parfum."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsNewOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              Simpan Jadwal Grooming
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
