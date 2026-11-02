import { ShieldAlert } from 'lucide-react'
import { Wordmark } from '@/components/brand/Wordmark'
import { Card } from '@/components/ui'

export function SecurityConfigScreen({ problems }: { problems: string[] }) {
  return (
    <div className="bg-canvas flex min-h-dvh items-center justify-center p-6">
      <Card className="max-w-xl p-6 sm:p-8">
        <Wordmark size="md" />
        <div className="bg-critical-50 border-critical-200 text-critical-700 mt-5 flex items-start gap-3 rounded-lg border p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <h1 className="text-sm font-semibold">Konfigurasi Environment Ditolak</h1>
            <p className="mt-1 text-xs leading-relaxed">
              Demi menjaga batas isolasi data multi-tenant (Row Level Security), aplikasi dihentikan
              sebelum memuat sesi.
            </p>
          </div>
        </div>
        <ul className="mt-4 list-disc space-y-2 ps-5 text-xs text-ink-muted">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
