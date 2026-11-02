import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PawPrint, Plus, Search, UserPlus, Users } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { customerDetailPath } from '@/app/routes/paths'
import {
  Badge,
  type BadgeTone,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { useOrganization, usePermission } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { SPECIES_LABELS, VACCINE_STATUS_LABELS } from '@/lib/data/labels'
import { evaluateExpiryStatus, formatPetAge, todayIsoDate } from '@/lib/datetime/dates'
import type { Pet, PetSpecies, VaccineStatus } from '@/types/domain'

const VAX_TONE: Record<VaccineStatus, BadgeTone> = {
  valid: 'positive',
  expiring_soon: 'caution',
  expired: 'critical',
  unvaccinated: 'neutral',
}

export function CustomersPage() {
  const organization = useOrganization()
  const canCreate = usePermission('customers.create')
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const today = todayIsoDate(organization.time_zone)

  const [viewTab, setViewTab] = useState<'owners' | 'pets'>('owners')
  const [search, setSearch] = useState('')
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false)
  const [isPetModalOpen, setIsPetModalOpen] = useState(false)

  // Owner Form
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  // Pet Form
  const [petOwnerId, setPetOwnerId] = useState('')
  const [petName, setPetName] = useState('')
  const [species, setSpecies] = useState<PetSpecies>('cat')
  const [breed, setBreed] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [birthDate, setBirthDate] = useState('')
  const [weightKg, setWeightKg] = useState('4.0')
  const [isSterilized, setIsSterilized] = useState(true)
  const [vaccineName, setVaccineName] = useState('Tricat / DHPPi Tahunan')
  const [vaccineExpiresOn, setVaccineExpiresOn] = useState('')
  const [temperament, setTemperament] = useState<Pet['temperament']>('friendly')
  const [allergies, setAllergies] = useState('')

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', organization.id],
    queryFn: () => api.listCustomers(organization.id),
  })

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', organization.id],
    queryFn: () => api.listPets(organization.id),
  })

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      const ownedPets = pets.filter((p) => p.customer_id === c.id)
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        ownedPets.some((p) => p.name.toLowerCase().includes(q))
      )
    })
  }, [customers, pets, search])

  const filteredPets = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pets
    return pets.filter((p) => {
      const owner = customers.find((c) => c.id === p.customer_id)
      return (
        p.name.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (owner?.full_name.toLowerCase().includes(q) ?? false)
      )
    })
  }, [pets, customers, search])

  const createOwnerMutation = useMutation({
    mutationFn: () =>
      api.createCustomer(organization.id, {
        full_name: fullName,
        phone,
        email,
        address,
        notes,
      }),
    onSuccess: (created) => {
      setIsOwnerModalOpen(false)
      setFullName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setNotes('')
      void queryClient.invalidateQueries({ queryKey: ['customers', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: `Pelanggan ${created.full_name} terdaftar`,
        description: `Kode member: ${created.code}`,
      })
    },
  })

  const createPetMutation = useMutation({
    mutationFn: () =>
      api.createPet(organization.id, {
        customer_id: petOwnerId,
        name: petName,
        species,
        breed,
        gender,
        birth_date: birthDate || null,
        weight_kg: Number(weightKg) || 1,
        is_sterilized: isSterilized,
        vaccine_name: vaccineName,
        vaccine_expires_on: vaccineExpiresOn || null,
        allergies_or_notes: allergies,
        temperament,
      }),
    onSuccess: (created) => {
      setIsPetModalOpen(false)
      setPetName('')
      setBreed('')
      setAllergies('')
      void queryClient.invalidateQueries({ queryKey: ['pets', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: `Profil hewan ${created.name} ditambahkan`,
        description: `${SPECIES_LABELS[created.species]} (${created.breed})`,
      })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pelanggan & Profil Hewan Peliharaan"
        description="Direktori pemilik hewan, poin loyalti belanja, serta rekam vaksinasi & alergi tiap hewan."
        actions={
          canCreate ? (
            <>
              <Button
                variant="secondary"
                leadingIcon={<PawPrint />}
                onClick={() => {
                  setPetOwnerId(customers[0]?.id ?? '')
                  setIsPetModalOpen(true)
                }}
                disabled={customers.length === 0}
              >
                Tambah Hewan
              </Button>
              <Button
                variant="primary"
                leadingIcon={<UserPlus />}
                onClick={() => setIsOwnerModalOpen(true)}
              >
                Tambah Pelanggan
              </Button>
            </>
          ) : null
        }
      />

      {/* Search & Mode Switch */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="text-ink-subtle pointer-events-none absolute top-2.5 left-3 size-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pemilik, nomor WA, atau nama hewan (mis. Mochi)..."
              className="ps-9"
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              size="xs"
              variant={viewTab === 'owners' ? 'primary' : 'secondary'}
              onClick={() => setViewTab('owners')}
            >
              Pemilik Hewan ({customers.length})
            </Button>
            <Button
              size="xs"
              variant={viewTab === 'pets' ? 'primary' : 'secondary'}
              onClick={() => setViewTab('pets')}
            >
              Semua Hewan ({pets.length})
            </Button>
          </div>
        </div>
      </Card>

      {viewTab === 'owners' ? (
        <Card>
          {filteredCustomers.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title="Pelanggan belum ditemukan"
              description="Daftarkan pelanggan baru untuk mulai mencatat profil hewan dan poin member."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-line bg-surface-muted border-b">
                    <th className="eyebrow px-4 py-2.5 text-start">Kode</th>
                    <th className="eyebrow px-4 py-2.5 text-start">Nama &amp; Kontak</th>
                    <th className="eyebrow px-4 py-2.5 text-start">Hewan Peliharaan</th>
                    <th className="eyebrow px-4 py-2.5 text-end">Poin Loyalti</th>
                    <th className="eyebrow px-4 py-2.5 text-end">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {filteredCustomers.map((cust) => {
                    const owned = pets.filter((p) => p.customer_id === cust.id)
                    return (
                      <tr key={cust.id} className="hover:bg-surface-muted/60">
                        <td className="identifier px-4 py-3 font-medium">{cust.code}</td>
                        <td className="px-4 py-3">
                          <Link
                            to={customerDetailPath(cust.id)}
                            className="text-ink hover:text-brand-700 font-semibold hover:underline"
                          >
                            {cust.full_name}
                          </Link>
                          <p className="text-ink-subtle text-[0.6875rem]">
                            {cust.phone} {cust.email ? `· ${cust.email}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {owned.length === 0 ? (
                            <span className="text-ink-subtle">Belum ada hewan</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {owned.map((p) => (
                                <Badge key={p.id} tone="brand">
                                  {p.name} ({SPECIES_LABELS[p.species]})
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td data-numeric className="px-4 py-3 text-end font-semibold">
                          {cust.loyalty_points} pts
                        </td>
                        <td className="px-4 py-3 text-end">
                          <ButtonLink
                            variant="secondary"
                            size="xs"
                            to={customerDetailPath(cust.id)}
                          >
                            Buka Profil
                          </ButtonLink>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPets.map((pet) => {
            const owner = customers.find((c) => c.id === pet.customer_id)
            const vax = evaluateExpiryStatus(pet.vaccine_expires_on, today, 21)

            return (
              <Card key={pet.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="identifier text-ink-subtle text-[0.6875rem]">{pet.code}</span>
                    <h3 className="text-base font-semibold">{pet.name}</h3>
                    <p className="text-ink-muted text-xs">
                      {SPECIES_LABELS[pet.species]} · {pet.breed}
                    </p>
                  </div>
                  <Badge tone={VAX_TONE[vax]}>{VACCINE_STATUS_LABELS[vax]}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[0.6875rem]">
                  <Badge tone="neutral">{pet.gender === 'male' ? 'Jantan' : 'Betina'}</Badge>
                  <Badge tone="neutral">{pet.weight_kg} kg</Badge>
                  <Badge tone="neutral">{formatPetAge(pet.birth_date)}</Badge>
                  {pet.is_sterilized ? <Badge tone="info">Sudah Steril</Badge> : null}
                </div>

                {pet.allergies_or_notes ? (
                  <p className="bg-surface-muted border-line text-ink-muted mt-3 rounded-md border p-2.5 text-xs">
                    {pet.allergies_or_notes}
                  </p>
                ) : null}

                {owner ? (
                  <div className="border-line mt-4 flex items-center justify-between border-t pt-3 text-xs">
                    <span className="text-ink-muted truncate">Pemilik: {owner.full_name}</span>
                    <Link
                      to={customerDetailPath(owner.id)}
                      className="text-brand-700 shrink-0 font-semibold hover:underline"
                    >
                      Lihat Pemilik →
                    </Link>
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Customer Modal */}
      <Modal
        open={isOwnerModalOpen}
        onOpenChange={setIsOwnerModalOpen}
        title="Registrasi Pelanggan Baru"
        description="Simpan kontak pemilik hewan untuk transaksi POS, Grooming, dan Pet Hotel."
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            createOwnerMutation.mutate()
          }}
          className="space-y-4"
        >
          <Field label="Nama Lengkap" required>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Rina Oktaviani"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomor WhatsApp / Telepon" required>
              <Input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="opsional@email.com"
              />
            </Field>
          </div>
          <Field label="Alamat Domisili">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Catatan Pelanggan">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsOwnerModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={createOwnerMutation.isPending}>
              Simpan Pelanggan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Pet Modal */}
      <Modal
        open={isPetModalOpen}
        onOpenChange={setIsPetModalOpen}
        title="Tambah Profil Hewan Peliharaan"
        description="Data medis singkat & masa berlaku vaksin digunakan otomatis saat booking Grooming & Pet Hotel."
        size="lg"
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            createPetMutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pemilik Hewan" required>
              <Select
                value={petOwnerId}
                onChange={(e) => setPetOwnerId(e.target.value)}
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.full_name} (${c.phone})`,
                }))}
              />
            </Field>
            <Field label="Nama Panggilan Hewan" required>
              <Input
                required
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Contoh: Milo"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Spesies">
              <Select
                value={species}
                onChange={(e) => setSpecies(e.target.value as PetSpecies)}
                options={Object.entries(SPECIES_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Field>
            <Field label="Ras / Breed" required>
              <Input
                required
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="British Shorthair / Shiba Inu"
              />
            </Field>
            <Field label="Jenis Kelamin">
              <Select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                options={[
                  { value: 'male', label: 'Jantan (Male)' },
                  { value: 'female', label: 'Betina (Female)' },
                ]}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal Lahir (Perkiraan)">
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </Field>
            <Field label="Berat Badan (kg)" required>
              <Input
                type="number"
                step="0.1"
                min={0.1}
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </Field>
            <Field label="Sifat / Temperamen">
              <Select
                value={temperament}
                onChange={(e) => setTemperament(e.target.value as Pet['temperament'])}
                options={[
                  { value: 'friendly', label: 'Ramah & Mudah Digrooming' },
                  { value: 'shy', label: 'Pemalu / Sensitif Suara' },
                  { value: 'anxious', label: 'Mudah Cemas' },
                  { value: 'aggressive', label: 'Galak / Perlu Handler Senior' },
                ]}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis Vaksin Terakhir">
              <Input
                value={vaccineName}
                onChange={(e) => setVaccineName(e.target.value)}
                placeholder="Tricat / Rabies / DHPPi"
              />
            </Field>
            <Field label="Berlaku Sampai Tanggal">
              <Input
                type="date"
                value={vaccineExpiresOn}
                onChange={(e) => setVaccineExpiresOn(e.target.value)}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={isSterilized}
              onChange={(e) => setIsSterilized(e.target.checked)}
              className="accent-brand-600 size-3.5 rounded"
            />
            <span>Hewan sudah disteril (neutered / spayed)</span>
          </label>

          <Field label="Catatan Alergi Pakan / Sampo / Medis">
            <Textarea
              rows={2}
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Contoh: Alergi protein ayam, sensitif blow-dryer panas."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsPetModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={createPetMutation.isPending}>
              <Plus className="size-3.5" /> Simpan Profil Hewan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
