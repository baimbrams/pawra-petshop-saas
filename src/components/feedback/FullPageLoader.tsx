import { Wordmark } from '@/components/brand/Wordmark'

export function FullPageLoader() {
  return (
    <div className="bg-canvas flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
      <Wordmark size="md" />
      <div className="flex items-center gap-2">
        <span className="border-brand-600 size-3.5 animate-spin rounded-full border-2 border-t-transparent" />
        <span className="text-ink-muted text-xs">Memuat ruang kerja toko...</span>
      </div>
    </div>
  )
}
