import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, Home, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  useToast,
} from '@/components/ui'
import { useOrganization, usePermission } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { KENNEL_SIZE_LABELS, KENNEL_STATUS_LABELS, SPECIES_LABELS } from '@/lib/data/labels'
import { todayIsoDate } from '@/lib/datetime/dates'
import { formatMoney, toMajorUnits, toMinorUnits } from '@/lib/money/money'
import type { Kennel, KennelOperationalStatus, KennelSize, PetSpecies } from '@/types/domain'

export function KennelsPage() {
  const organization = useOrganization()
  const canManage = usePermission('kennels.create')
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const currency = organization.default_currency
  const today = todayIsoDate(organization.time_zone)
  const money = (minor: number) => formatMoney(minor, currency, { locale: organization.locale })

  const [editing, setEditing] = useState<Kennel | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<PetSpecies>('cat')
  const [size, setSize] = useState<KennelSize>('medium')
  const [rateMajor, setRateMajor] = useState('100000')
  const [opStatus, setOpStatus] = useState<KennelOperationalStatus>('active')
  const [features, setFeatures] = useState('')

  const { data: kennels = [] } = useQuery({
    queryKey: ['kennels', organization.id],
    queryFn: () => api.listKennels(organization.id),
  })

  const { data: stays = [] } = useQuery({
    queryKey: ['boarding', organization.id],
    queryFn: () => api.listBoardingStays(organization.id),
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', organization.id],
    queryFn: () => api.listPets(organization.id),
  })

  const openCreate = () => {
    setEditing(null)
    setCode(`CAT-0${kennels.length + 1}`)
    setName('Cat Suite Baru')
    setSpecies('cat')
    setSize('medium')
    setRateMajor(currency === 'IDR' ? '100000' : '30')
    setOpStatus('active')
    setFeatures('AC 24 jam, litter box pribadi, CCTV')
    setIsOpen(true)
  }

  const openEdit = (k: Kennel) => {
    setEditing(k)
    setCode(k.code)
    setName(k.name)
    setSpecies(k.species_allowed[0] ?? 'cat')
    setSize(k.size)
    setRateMajor(String(toMajorUnits(k.daily_rate_minor, currency)))
    setOpStatus(k.operational_status)
    setFeatures(k.features)
    setIsOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.upsertKennel(organization.id, {
        id: editing?.id,
        code,
        name,
        species_allowed: [species],
        size,
        daily_rate_minor: toMinorUnits(rateMajor, currency),
        operational_status: opStatus,
        features,
      }),
    onSuccess: (saved) => {
      setIsOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['kennels', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: editing ? 'Kandang diperbarui' : 'Kandang ditambahkan',
        description: `${saved.code} (${saved.name}) siap digunakan.`,
      })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kandang & Ruang Pet Hotel"
        description="Status operasional diatur oleh manajemen toko, sedangkan status okupansi dihitung otomatis dari kontrak aktif."
        actions={
          canManage ? (
            <Button variant="primary" leadingIcon={<Plus />} onClick={openCreate}>
              Tambah Unit Kandang
            </Button>
          ) : null
        }
      />

      {kennels.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Home className="size-5" />}
            title="Belum ada unit kandang"
            description="Tambahkan unit kandang kucing atau kabin anjing untuk membuka layanan Pet Hotel."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kennels.map((ken) => {
            const activeStay = stays.find(
              (s) =>
                s.kennel_id === ken.id &&
                s.status === 'checked_in' &&
                s.check_in_date <= today &&
                s.check_out_date >= today,
            )
            const reservedToday = stays.find(
              (s) =>
                s.kennel_id === ken.id &&
                s.status === 'reserved' &&
                s.check_in_date <= today &&
                s.check_out_date > today,
            )
            const occupantPet = activeStay ? pets.find((p) => p.id === activeStay.pet_id) : null

            return (
              <Card key={ken.id} className="flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="identifier text-ink-subtle text-xs font-semibold">
                        {ken.code}
                      </span>
                      <h3 className="mt-0.5 text-base font-semibold">{ken.name}</h3>
                    </div>

                    {ken.operational_status !== 'active' ? (
                      <Badge tone="neutral">{KENNEL_STATUS_LABELS[ken.operational_status]}</Badge>
                    ) : activeStay ? (
                      <Badge tone="info">Terisi: {occupantPet?.name ?? 'Hewan'}</Badge>
                    ) : reservedToday ? (
                      <Badge tone="caution">Dipesan Hari Ini</Badge>
                    ) : (
                      <Badge tone="positive">Tersedia</Badge>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge tone="brand">{KENNEL_SIZE_LABELS[ken.size]}</Badge>
                    {ken.species_allowed.map((sp) => (
                      <Badge key={sp} tone="neutral">
                        {SPECIES_LABELS[sp]}
                      </Badge>
                    ))}
                  </div>

                  <p className="text-ink-muted mt-3 text-xs leading-relaxed">
                    {ken.features || 'Fasilitas standar kebersihan harian.'}
                  </p>
                </div>

                <div className="border-line mt-4 flex items-center justify-between border-t pt-3.5">
                  <div>
                    <span data-numeric className="text-brand-700 text-sm font-semibold">
                      {money(ken.daily_rate_minor)}
                    </span>
                    <span className="text-ink-subtle text-xs"> / malam</span>
                  </div>
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      leadingIcon={<Edit3 />}
                      onClick={() => openEdit(ken)}
                    >
                      Atur Unit
                    </Button>
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={isOpen}
        onOpenChange={setIsOpen}
        title={editing ? `Ubah Unit ${editing.code}` : 'Tambah Unit Kandang Baru'}
        description="Tentukan kapasitas spesies, tarif per malam, dan status operasional."
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kode Kandang" required>
              <Input required value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            <Field label="Ukuran Ruang">
              <Select
                value={size}
                onChange={(e) => setSize(e.target.value as KennelSize)}
                options={Object.entries(KENNEL_SIZE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Field>
          </div>

          <Field label="Nama Ruang / Tipe Suite" required>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Peruntukan Spesies Utama">
              <Select
                value={species}
                onChange={(e) => setSpecies(e.target.value as PetSpecies)}
                options={Object.entries(SPECIES_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Field>
            <Field label={`Tarif per Malam (${currency})`} required>
              <Input
                type="number"
                min={0}
                required
                value={rateMajor}
                onChange={(e) => setRateMajor(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Status Operasional">
            <Select
              value={opStatus}
              onChange={(e) => setOpStatus(e.target.value as KennelOperationalStatus)}
              options={Object.entries(KENNEL_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>

          <Field label="Fasilitas Unit">
            <Input value={features} onChange={(e) => setFeatures(e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              Simpan Kandang
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
