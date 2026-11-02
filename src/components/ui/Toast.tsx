import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'

export type ToastTone = 'positive' | 'critical' | 'info'

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  pushToast: (input: { title: string; description?: string; tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const pushToast = useCallback(
    (input: { title: string; description?: string; tone?: ToastTone }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const next: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? 'positive',
      }
      setItems((prev) => [...prev.slice(-3), next])
      window.setTimeout(() => {
        dismiss(id)
      }, 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[90] flex w-full max-w-sm flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'overlay-enter bg-surface border-line-strong pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 shadow-[var(--shadow-overlay)]',
            )}
          >
            {item.tone === 'positive' ? (
              <CheckCircle2 className="text-positive-600 mt-0.5 size-4 shrink-0" />
            ) : item.tone === 'critical' ? (
              <AlertCircle className="text-critical-600 mt-0.5 size-4 shrink-0" />
            ) : (
              <Info className="text-info-600 mt-0.5 size-4 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-ink text-[0.8125rem] font-semibold">{item.title}</p>
              {item.description ? (
                <p className="text-ink-muted mt-0.5 text-xs leading-relaxed">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-ink-subtle hover:text-ink rounded p-0.5"
              aria-label="Tutup notifikasi"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
