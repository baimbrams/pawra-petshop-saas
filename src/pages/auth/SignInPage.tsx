import { Sparkles } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import { Wordmark } from '@/components/brand/Wordmark'
import { Alert, Button, Card, Field, Input } from '@/components/ui'
import { useWorkspace } from '@/features/workspace/workspace-context'

export function SignInPage() {
  const { mode, signInWithEmail, signInDemoOwner } = useWorkspace()
  const navigate = useNavigate()

  const [email, setEmail] = useState(mode === 'demo' ? 'nadia@pawrapetcare.id' : '')
  const [password, setPassword] = useState(mode === 'demo' ? 'demo-password' : '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signInWithEmail(email, password)
      navigate(paths.overview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke akun.')
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
          <h1 className="mt-4 text-xl font-semibold">Masuk ke Ruang Kerja Toko</h1>
          <p className="text-ink-muted mt-1 text-xs">
            Kelola kasir POS, jadwal grooming, dan Pet Hotel Anda.
          </p>
        </div>

        <Card className="p-6">
          {mode === 'demo' ? (
            <div className="mb-5 space-y-3">
              <Button
                variant="primary"
                className="h-10 w-full font-semibold"
                onClick={() => {
                  signInDemoOwner()
                  navigate(paths.overview)
                }}
              >
                <Sparkles className="size-4" />
                Masuk Instan sebagai Owner Demo (2 Cabang)
              </Button>
              <div className="relative flex items-center py-1">
                <div className="border-line flex-grow border-t" />
                <span className="text-ink-subtle mx-3 text-[0.6875rem] uppercase">
                  atau gunakan email akun
                </span>
                <div className="border-line flex-grow border-t" />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mb-4">
              <Alert tone="critical" title="Gagal Masuk">
                {error}
              </Alert>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <Field label="Alamat Email" required>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@petshopanda.id"
              />
            </Field>

            <Field
              label="Kata Sandi"
              hint={
                mode === 'demo'
                  ? 'Mode Demo: akun staf lain tersedia (reza@pawrapetcare.id, sinta@pawrapetcare.id).'
                  : undefined
              }
              required
            >
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button
              type="submit"
              variant={mode === 'demo' ? 'secondary' : 'primary'}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Memverifikasi...' : 'Masuk dengan Email'}
            </Button>
          </form>
        </Card>

        <p className="text-ink-muted text-center text-xs">
          Belum punya akun Pet Shop?{' '}
          <Link to={paths.signUp} className="text-brand-700 font-semibold hover:underline">
            Daftarkan Pet Shop baru
          </Link>
        </p>
      </div>
    </div>
  )
}
