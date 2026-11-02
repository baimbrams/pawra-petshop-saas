import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import { Wordmark } from '@/components/brand/Wordmark'
import { Alert, Button, Card, Field, Input } from '@/components/ui'
import { useWorkspace } from '@/features/workspace/workspace-context'

export function SignUpPage() {
  const { signUp } = useWorkspace()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [city, setCity] = useState('Jakarta')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signUp({ fullName, email, password, shopName, city })
      navigate(paths.overview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun baru.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-canvas flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to={paths.overview} className="inline-block">
            <Wordmark size="lg" />
          </Link>
          <h1 className="mt-4 text-xl font-semibold">Buat Akun &amp; Ruang Kerja Pet Shop</h1>
          <p className="text-ink-muted mt-1 text-xs">
            Akun Anda otomatis menjadi Owner pada toko pertama yang Anda buat.
          </p>
        </div>

        <Card className="p-6">
          {error ? (
            <div className="mb-4">
              <Alert tone="critical" title="Pendaftaran Gagal">
                {error}
              </Alert>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Field label="Nama Lengkap Pemilik" required>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Nadia Kusuma"
              />
            </Field>

            <Field label="Email Bisnis / Pribadi" required>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@petshop.id"
              />
            </Field>

            <Field label="Kata Sandi" required>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
              />
            </Field>

            <div className="border-line border-t pt-4">
              <p className="eyebrow mb-3">Identitas Pet Shop Pertama</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama Pet Shop" required className="sm:col-span-2">
                  <Input
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Contoh: Happy Paws Pet Care"
                  />
                </Field>
                <Field label="Kota / Area" required className="sm:col-span-2">
                  <Input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jakarta Selatan"
                  />
                </Field>
              </div>
            </div>

            <Button type="submit" variant="primary" disabled={submitting} className="h-10 w-full">
              {submitting ? 'Menyiapkan Toko...' : 'Buat Akun & Buka Pet Shop'}
            </Button>
          </form>
        </Card>

        <p className="text-ink-muted text-center text-xs">
          Sudah punya akun?{' '}
          <Link to={paths.signIn} className="text-brand-700 font-semibold hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  )
}
