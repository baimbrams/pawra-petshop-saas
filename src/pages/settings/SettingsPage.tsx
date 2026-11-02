import { useMutation } from '@tanstack/react-query'
import { Database, Plus, Save } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { paths } from '@/app/routes/paths'
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { useOrganization, usePermission, useWorkspace } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { type CurrencyCode, CURRENCY_META, SUPPORTED_CURRENCIES } from '@/lib/money/money'

export function SettingsPage() {
  const organization = useOrganization()
  const { mode, refreshSession } = useWorkspace()
  const canEdit = usePermission('organization.update')
  const { pushToast } = useToast()

  const [name, setName] = useState(organization.name)
  const [phone, setPhone] = useState(organization.phone)
  const [email, setEmail] = useState(organization.email)
  const [city, setCity] = useState(organization.city)
  const [address, setAddress] = useState(organization.address)
  const [currency, setCurrency] = useState<CurrencyCode>(organization.default_currency)
  const [timeZone, setTimeZone] = useState(organization.time_zone)
  const [taxPercent, setTaxPercent] = useState(String(organization.tax_rate_bps / 100))
  const [receiptFooter, setReceiptFooter] = useState(organization.receipt_footer)

  useEffect(() => {
    setName(organization.name)
    setPhone(organization.phone)
    setEmail(organization.email)
    setCity(organization.city)
    setAddress(organization.address)
    setCurrency(organization.default_currency)
    setTimeZone(organization.time_zone)
    setTaxPercent(String(organization.tax_rate_bps / 100))
    setReceiptFooter(organization.receipt_footer)
  }, [organization])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateOrganization(organization.id, {
        name,
        phone,
        email,
        city,
        address,
        default_currency: currency,
        time_zone: timeZone,
        tax_rate_bps: Math.round((Number(taxPercent) || 0) * 100),
        receipt_footer: receiptFooter,
      }),
    onSuccess: () => {
      refreshSession()
      pushToast({
        title: 'Pengaturan toko berhasil disimpan',
        description: 'Perubahan profil, pajak PPN, dan format struk telah diterapkan.',
      })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Toko & Multi-Tenant"
        description="Konfigurasi identitas cabang, tarif pajak kasir POS, mata uang, serta koneksi database."
        actions={
          <ButtonLink variant="secondary" leadingIcon={<Plus />} to={paths.createShop}>
            Tambah Cabang Baru
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader
          title="Profil & Konfigurasi Operasional Cabang"
          description={`Tenant ID: ${organization.id} · Slug: ${organization.slug}`}
        />
        <CardBody>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              saveMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Pet Shop / Cabang" required>
                <Input
                  disabled={!canEdit}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Kota Operasional" required>
                <Input
                  disabled={!canEdit}
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telepon / WhatsApp Toko">
                <Input
                  disabled={!canEdit}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label="Email Toko">
                <Input
                  disabled={!canEdit}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Alamat Lengkap (Tercetak di Struk Kasir)">
              <Input
                disabled={!canEdit}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Mata Uang Default">
                <Select
                  disabled={!canEdit}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  options={SUPPORTED_CURRENCIES.map((c) => ({
                    value: c,
                    label: CURRENCY_META[c].label,
                  }))}
                />
              </Field>
              <Field label="Zona Waktu">
                <Select
                  disabled={!canEdit}
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  options={[
                    { value: 'Asia/Jakarta', label: 'WIB (Asia/Jakarta)' },
                    { value: 'Asia/Makassar', label: 'WITA (Asia/Makassar)' },
                    { value: 'Asia/Jayapura', label: 'WIT (Asia/Jayapura)' },
                    { value: 'Asia/Singapore', label: 'SGT (Asia/Singapore)' },
                  ]}
                />
              </Field>
              <Field label="Tarif PPN Kasir (%)">
                <Input
                  disabled={!canEdit}
                  type="number"
                  step="0.5"
                  min={0}
                  max={30}
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Pesan Penutup Struk POS">
              <Textarea
                disabled={!canEdit}
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
              />
            </Field>

            {canEdit ? (
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  leadingIcon={<Save />}
                  disabled={saveMutation.isPending}
                >
                  Simpan Perubahan
                </Button>
              </div>
            ) : null}
          </form>
        </CardBody>
      </Card>

      {/* Supabase Cloud Connection Status */}
      <Card>
        <CardHeader
          title="Status Backend & Skema Supabase PostgreSQL"
          description="Arsitektur Dual-Engine siap dihubungkan ke Supabase produksi kapan saja."
        />
        <CardBody className="space-y-3 text-xs">
          <Alert
            tone={mode === 'supabase' ? 'positive' : 'info'}
            title={
              mode === 'supabase'
                ? 'Terhubung ke Supabase Cloud (Row Level Security Aktif)'
                : 'Berjalan dalam Mode Demo Lokal (localStorage Persisten)'
            }
          >
            <div className="flex items-start gap-2">
              <Database className="mt-0.5 size-4 shrink-0" />
              <span>
                Untuk menghubungkan ke proyek Supabase produksi Anda sendiri, jalankan migrasi di
                folder <code>supabase/migrations/</code> menggunakan <code>npx supabase db push</code>{' '}
                lalu isi <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>{' '}
                pada file <code>.env.local</code>.
              </span>
            </div>
          </Alert>
        </CardBody>
      </Card>
    </div>
  )
}
