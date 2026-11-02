import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import { Wordmark } from '@/components/brand/Wordmark'
import { Alert, Button, ButtonLink, Card, Field, Input, Select, useToast } from '@/components/ui'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { type CurrencyCode, CURRENCY_META, SUPPORTED_CURRENCIES } from '@/lib/money/money'

export function CreateShopPage() {
  const { organization, refreshSession } = useWorkspace()
  const navigate = useNavigate()
  const { pushToast } = useToast()

  const [name, setName] = useState('')
  const [city, setCity] = useState('Jakarta')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [currency, setCurrency] = useState<CurrencyCode>('IDR')
  const [timeZone, setTimeZone] = useState('Asia/Jakarta')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const created = await api.createOrganization({
        name,
        city,
        phone,
        address,
        default_currency: currency,
        time_zone: timeZone,
      })
      refreshSession()
      pushToast({
        title: `${created.name} berhasil dibuat`,
        description: 'Ruang kerja tenant baru telah aktif dan terisolasi.',
      })
      navigate(paths.overview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat toko.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-canvas flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <Wordmark size="md" />
          {organization ? (
            <ButtonLink variant="ghost" size="sm" to={paths.overview}>
              Batal &amp; Kembali
            </ButtonLink>
          ) : null}
        </div>

        <Card className="p-6 sm:p-7">
          <p className="eyebrow">Tenant Multi-Cabang</p>
          <h1 className="mt-1 text-xl font-semibold">Siapkan Ruang Kerja Pet Shop Baru</h1>
          <p className="text-ink-muted mt-1 text-xs leading-relaxed">
            Setiap toko atau cabang memiliki stok produk, struk POS, jadwal kandang, dan pembukuan
            keuangan yang terpisah sepenuhnya.
          </p>

          {error ? (
            <div className="mt-4">
              <Alert tone="critical" title="Gagal Membuat Toko">
                {error}
              </Alert>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
            <Field label="Nama Pet Shop / Cabang" required>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Pawra Pet Care Surabaya"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kota" required>
                <Input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Surabaya"
                />
              </Field>
              <Field label="No. Telepon / WhatsApp Toko">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                />
              </Field>
            </div>

            <Field label="Alamat Lengkap (Tampil pada Struk POS)">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Raya Gubeng No. 18"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mata Uang Utama">
                <Select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  options={SUPPORTED_CURRENCIES.map((c) => ({
                    value: c,
                    label: CURRENCY_META[c].label,
                  }))}
                />
              </Field>
              <Field label="Zona Waktu Operasional">
                <Select
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
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" disabled={submitting} className="h-10 w-full">
                {submitting ? 'Membuat Tenant...' : 'Aktifkan Ruang Kerja Pet Shop'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
