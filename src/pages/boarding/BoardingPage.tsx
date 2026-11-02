import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BedDouble, ClipboardList, Plus, ShieldAlert } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import {
  Alert,
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
import { useOrganization, useWorkspace } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { BOARDING_STATUS_LABELS, SPECIES_LABELS, VACCINE_STATUS_LABELS } from '@/lib/data/labels'
import { isKennelAvailableBetween } from '@/lib/data/local-store'
import {
  addDaysIso,
  daysBetweenIso,
  evaluateExpiryStatus,
  formatDateId,
  todayIsoDate,
} from '@/lib/datetime/dates'
import { formatMoney, toMinorUnits } from '@/lib/money/money'
import type { BoardingCareLog, BoardingStatus, BoardingStay } from '@/types/domain'

const STAY_TONE: Record<BoardingStatus, BadgeTone> = {
  reserved: 'caution',
  checked_in: 'info',
  checked_out: 'positive',
  cancelled: 'critical',
}

export function BoardingPage() {
  const organization = useOrganization()
  const { user } = useWorkspace()
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const currency = organization.default_currency
  const today = todayIsoDate(organization.time_zone)
  const money = (minor: number) => formatMoney(minor, currency, { locale: organization.locale })

  const [isNewOpen, setIsNewOpen] = useState(false)
  const [careTarget, setCareTarget] = useState<BoardingStay | null>(null)

  // New Boarding Form
  const [customerId, setCustomerId] = useState('')
  const [petId, setPetId] = useState('')
  const [checkInDate, setCheckInDate] = useState(today)
  const [checkOutDate, setCheckOutDate] = useState(addDaysIso(today, 3))
  const [kennelId, setKennelId] = useState('')
  const [addonsMajor, setAddonsMajor] = useState('0')
  const [depositMajor, setDepositMajor] = useState('0')
  const [initialStatus, setInitialStatus] = useState<'reserved' | 'checked_in'>('checked_in')
  const [feedingInstructions, setFeedingInstructions] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')

  // Care Log Form
  const [appetite, setAppetite] = useState<BoardingCareLog['appetite']>('lahap')
  const [mood, setMood] = useState<BoardingCareLog['mood']>('ceria')
  const [careNote, setCareNote] = useState('')

  const { data: stays = [] } = useQuery({
    queryKey: ['boarding', organization.id],
    queryFn: () => api.listBoardingStays(organization.id),
  })

  const { data: kennels = [] } = useQuery({
    queryKey: ['kennels', organization.id],
    queryFn: () => api.listKennels(organization.id),
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
  const selectedPet = pets.find((p) => p.id === petId)
  const selectedPetVax = selectedPet
    ? evaluateExpiryStatus(selectedPet.vaccine_expires_on, today, 21)
    : 'valid'

  const availableKennelOptions = useMemo(() => {
    return kennels.map((k) => {
      const check = isKennelAvailableBetween(k, stays, checkInDate, checkOutDate)
      return {
        kennel: k,
        available: check.available,
        reason: check.reason,
      }
    })
  }, [kennels, stays, checkInDate, checkOutDate])

  const selectedKennel = kennels.find((k) => k.id === kennelId)
  const nights = Math.max(0, daysBetweenIso(checkInDate, checkOutDate))
  const estimatedTotalMinor =
    nights * (selectedKennel?.daily_rate_minor ?? 0) + toMinorUnits(addonsMajor, currency)

  const openNewModal = () => {
    const firstCust = customers[0]?.id ?? ''
    setCustomerId(firstCust)
    const firstPet = pets.find((p) => p.customer_id === firstCust)?.id ?? ''
    setPetId(firstPet)
    const firstAvail = availableKennelOptions.find((o) => o.available)?.kennel.id ?? kennels[0]?.id ?? ''
    setKennelId(firstAvail)
    setDepositMajor('0')
    setAddonsMajor('0')
    setFeedingInstructions('')
    setMedicalNotes('')
    setIsNewOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!customerId || !petId || !kennelId) {
        throw new Error('Lengkapi pelanggan, hewan, dan kandang terlebih dahulu.')
      }
      return api.createBoardingStay(organization.id, {
        kennel_id: kennelId,
        customer_id: customerId,
        pet_id: petId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        addons_minor: toMinorUnits(addonsMajor, currency),
        deposit_paid_minor: toMinorUnits(depositMajor, currency),
        status: initialStatus,
        feeding_instructions: feedingInstructions,
        medical_notes: medicalNotes,
      })
    },
    onSuccess: (created) => {
      setIsNewOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['boarding', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: `Kontrak ${created.contract_code} berhasil dibuat`,
        description: `${created.nights} malam berhasil diamankan tanpa bentrok jadwal.`,
      })
    },
    onError: (err) => {
      pushToast({
        title: 'Tidak dapat menyimpan kontrak penitipan',
        description: err instanceof Error ? err.message : 'Terjadi konflik jadwal.',
        tone: 'critical',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: {
      stayId: string
      status?: BoardingStatus
      settleFullPayment?: boolean
      careLog?: Omit<BoardingCareLog, 'id' | 'logged_at'>
    }) =>
      api.updateBoardingStay(organization.id, input.stayId, {
        status: input.status,
        settleFullPayment: input.settleFullPayment,
        careLog: input.careLog,
      }),
    onSuccess: (updated) => {
      if (careTarget && careTarget.id === updated.id) {
        setCareTarget(updated)
      }
      setCareNote('')
      void queryClient.invalidateQueries({ queryKey: ['boarding', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({ title: `Kontrak ${updated.contract_code} diperbarui` })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pet Hotel & Kontrak Penitipan"
        description="Manajemen check-in/out kandang bebas bentrok jadwal, pelunasan deposit, dan log perawatan harian."
        actions={
          <Button variant="primary" leadingIcon={<Plus />} onClick={openNewModal}>
            Kontrak Penitipan Baru
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile
          label="Sedang Menginap"
          value={stays.filter((s) => s.status === 'checked_in').length}
          caption="Hewan aktif di ruang Pet Hotel"
        />
        <MetricTile
          label="Reservasi Mendatang"
          value={stays.filter((s) => s.status === 'reserved').length}
          caption="Kandang sudah dikunci untuk tanggal tersebut"
        />
        <MetricTile
          label="Sisa Pelunasan Hotel"
          value={money(
            stays
              .filter((s) => s.status === 'checked_in' || s.status === 'reserved')
              .reduce((acc, s) => acc + Math.max(0, s.total_minor - s.total_paid_minor), 0),
          )}
          caption="Tagihan saat check-out"
        />
      </div>

      <Card>
        {stays.length === 0 ? (
          <EmptyState
            icon={<BedDouble className="size-5" />}
            title="Belum ada kontrak Pet Hotel"
            description="Buat kontrak baru saat pelanggan memesan kandang atau melakukan check-in penitipan hewan."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-line bg-surface-muted border-b">
                  <th className="eyebrow px-4 py-2.5 text-start">Kontrak &amp; Kandang</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Hewan &amp; Pemilik</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Check-In → Check-Out</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Status</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Total &amp; Sisa</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {stays.map((stay) => {
                  const pet = pets.find((p) => p.id === stay.pet_id)
                  const cust = customers.find((c) => c.id === stay.customer_id)
                  const ken = kennels.find((k) => k.id === stay.kennel_id)
                  const remaining = Math.max(0, stay.total_minor - stay.total_paid_minor)

                  return (
                    <tr key={stay.id} className="hover:bg-surface-muted/60">
                      <td className="px-4 py-3">
                        <p className="identifier font-semibold">{stay.contract_code}</p>
                        <p className="text-brand-700 mt-0.5 font-medium">
                          {ken?.code ?? '—'} · {ken?.name ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">
                          {pet?.name ?? 'Hewan'}{' '}
                          <span className="text-ink-muted font-normal">
                            ({pet ? SPECIES_LABELS[pet.species] : ''})
                          </span>
                        </p>
                        <p className="text-ink-subtle text-[0.6875rem]">
                          {cust?.full_name ?? '—'} · {cust?.phone ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {formatDateId(stay.check_in_date)} → {formatDateId(stay.check_out_date)}
                        </p>
                        <p className="text-ink-subtle text-[0.6875rem]">{stay.nights} malam</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={STAY_TONE[stay.status]}>
                          {BOARDING_STATUS_LABELS[stay.status]}
                        </Badge>
                      </td>
                      <td data-numeric className="px-4 py-3 text-end">
                        <p className="font-semibold">{money(stay.total_minor)}</p>
                        {remaining > 0 ? (
                          <p className="text-caution-700 text-[0.6875rem] font-medium">
                            Sisa {money(remaining)}
                          </p>
                        ) : (
                          <p className="text-positive-700 text-[0.6875rem] font-medium">Lunas</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            leadingIcon={<ClipboardList />}
                            onClick={() => setCareTarget(stay)}
                          >
                            Log ({stay.care_logs.length})
                          </Button>
                          {stay.status === 'reserved' ? (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() =>
                                updateMutation.mutate({ stayId: stay.id, status: 'checked_in' })
                              }
                            >
                              Check-In
                            </Button>
                          ) : null}
                          {stay.status === 'checked_in' ? (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() =>
                                updateMutation.mutate({
                                  stayId: stay.id,
                                  status: 'checked_out',
                                  settleFullPayment: true,
                                })
                              }
                            >
                              {remaining > 0 ? 'Lunasi & Check-Out' : 'Check-Out'}
                            </Button>
                          ) : null}
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

      {/* New Boarding Stay Modal */}
      <Modal
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        title="Kontrak Penitipan Pet Hotel Baru"
        description="Sistem otomatis memvalidasi ketersediaan kandang agar tidak terjadi double-booking."
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
                  const next = e.target.value
                  setCustomerId(next)
                  const firstPet = pets.find((p) => p.customer_id === next)?.id ?? ''
                  setPetId(firstPet)
                }}
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.full_name} (${c.phone})`,
                }))}
              />
            </Field>
            <Field label="Hewan yang Menginap" required>
              <Select
                value={petId}
                onChange={(e) => setPetId(e.target.value)}
                options={
                  customerPets.length > 0
                    ? customerPets.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${SPECIES_LABELS[p.species]} · ${p.breed})`,
                      }))
                    : [{ value: '', label: 'Belum ada profil hewan' }]
                }
              />
            </Field>
          </div>

          {selectedPet && (selectedPetVax === 'expired' || selectedPetVax === 'unvaccinated') ? (
            <Alert tone="caution" title={`Perhatian Vaksin: ${VACCINE_STATUS_LABELS[selectedPetVax]}`}>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 shrink-0" />
                <span>
                  Hewan <strong>{selectedPet.name}</strong> belum memiliki bukti vaksin aktif.
                  Tempatkan di ruang terpisah atau konfirmasi buku vaksin terbaru pemilik.
                </span>
              </div>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal Check-In" required>
              <Input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
              />
            </Field>
            <Field label="Tanggal Check-Out" required>
              <Input
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
              />
            </Field>
            <Field label="Status Awal">
              <Select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as 'reserved' | 'checked_in')}
                options={[
                  { value: 'checked_in', label: 'Langsung Check-In Sekarang' },
                  { value: 'reserved', label: 'Reservasi Tanggal Mendatang' },
                ]}
              />
            </Field>
          </div>

          <Field
            label="Pilih Kamar / Kandang Tersedia"
            hint="Kandang yang sedang dipakai pada rentang tanggal di atas ditandai otomatis."
            required
          >
            <Select
              value={kennelId}
              onChange={(e) => setKennelId(e.target.value)}
              options={availableKennelOptions.map(({ kennel, available }) => ({
                value: kennel.id,
                label: `${available ? '✓' : '✗'} ${kennel.code} — ${kennel.name} (${money(kennel.daily_rate_minor)}/malam)${available ? '' : ' [Tidak Tersedia]'}`,
              }))}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Biaya Tambahan / Add-on Grooming Pulang (${currency})`}>
              <Input
                type="number"
                min={0}
                value={addonsMajor}
                onChange={(e) => setAddonsMajor(e.target.value)}
              />
            </Field>
            <Field label={`Deposit / DP Diterima (${currency})`}>
              <Input
                type="number"
                min={0}
                value={depositMajor}
                onChange={(e) => setDepositMajor(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instruksi Pemberian Pakan">
              <Textarea
                rows={2}
                value={feedingInstructions}
                onChange={(e) => setFeedingInstructions(e.target.value)}
                placeholder="Contoh: Royal Canin 60g pagi & sore"
              />
            </Field>
            <Field label="Catatan Medis / Kebiasaan">
              <Textarea
                rows={2}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="Contoh: Vitamin bulu 1x sehari"
              />
            </Field>
          </div>

          <div className="bg-surface-muted border-line flex items-center justify-between rounded-lg border p-3.5 text-xs">
            <span>
              Durasi menginap: <strong>{nights} malam</strong>
            </span>
            <span data-numeric className="text-sm font-semibold">
              Estimasi Total: <strong className="text-brand-700">{money(estimatedTotalMinor)}</strong>
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setIsNewOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              Buat Kontrak Penitipan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Daily Care Log Modal */}
      <Modal
        open={Boolean(careTarget)}
        onOpenChange={(open) => {
          if (!open) setCareTarget(null)
        }}
        title={
          careTarget
            ? `Daily Care Log — ${careTarget.contract_code}`
            : 'Daily Care Log'
        }
        description="Catatan makan, mood, dan kondisi harian hewan selama menginap di Pet Hotel."
        size="lg"
      >
        {careTarget ? (
          <div className="space-y-5">
            <div className="bg-surface-muted border-line grid gap-2 rounded-lg border p-3.5 text-xs sm:grid-cols-2">
              <div>
                <span className="text-ink-subtle block">Instruksi Pakan:</span>
                <strong>{careTarget.feeding_instructions || 'Sesuai standar Pet Hotel'}</strong>
              </div>
              <div>
                <span className="text-ink-subtle block">Catatan Medis:</span>
                <strong>{careTarget.medical_notes || 'Tidak ada catatan khusus'}</strong>
              </div>
            </div>

            {careTarget.status === 'checked_in' ? (
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault()
                  updateMutation.mutate({
                    stayId: careTarget.id,
                    careLog: {
                      staff_name: user?.full_name ?? 'Staf Caretaker',
                      appetite,
                      mood,
                      note: careNote || 'Kondisi sehat, kandang sudah dibersihkan.',
                    },
                  })
                }}
                className="border-line space-y-3 rounded-lg border p-4"
              >
                <p className="text-xs font-semibold">Tambah Pemantauan Harian Baru</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nafsu Makan">
                    <Select
                      value={appetite}
                      onChange={(e) =>
                        setAppetite(e.target.value as BoardingCareLog['appetite'])
                      }
                      options={[
                        { value: 'lahap', label: 'Lahap (Habis 100%)' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'kurang', label: 'Kurang Nafsu Makan' },
                      ]}
                    />
                  </Field>
                  <Field label="Mood & Aktivitas">
                    <Select
                      value={mood}
                      onChange={(e) => setMood(e.target.value as BoardingCareLog['mood'])}
                      options={[
                        { value: 'ceria', label: 'Ceria & Aktif' },
                        { value: 'tenang', label: 'Tenang / Istirahat' },
                        { value: 'gelisah', label: 'Gelisah / Adaptasi' },
                      ]}
                    />
                  </Field>
                </div>
                <Field label="Catatan untuk Pemilik (Siap salin ke WhatsApp)" required>
                  <Input
                    required
                    value={careNote}
                    onChange={(e) => setCareNote(e.target.value)}
                    placeholder="Contoh: Sarapan habis, pup bagus, sudah bermain 15 menit."
                  />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" variant="primary">
                    Tambah Log Harian
                  </Button>
                </div>
              </form>
            ) : null}

            <div className="space-y-2.5">
              <p className="eyebrow">Riwayat Pemantauan ({careTarget.care_logs.length})</p>
              {careTarget.care_logs.length === 0 ? (
                <p className="text-ink-muted text-xs">Belum ada catatan harian.</p>
              ) : (
                careTarget.care_logs.map((log) => (
                  <div key={log.id} className="border-line rounded-lg border p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{log.staff_name}</span>
                      <span className="text-ink-subtle">{formatDateId(log.logged_at, true)}</span>
                    </div>
                    <div className="mt-1.5 flex gap-2">
                      <Badge tone="positive">Makan: {log.appetite}</Badge>
                      <Badge tone="info">Mood: {log.mood}</Badge>
                    </div>
                    <p className="text-ink-muted mt-2">{log.note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
