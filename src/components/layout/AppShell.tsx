import * as Dialog from '@radix-ui/react-dialog'
import { Menu, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { ROLE_LABELS } from '@/lib/authz/permissions'
import { NotificationBell } from './NotificationBell'
import { OrganizationAvatar } from './OrganizationAvatar'
import { Sidebar } from './Sidebar'

const COLLAPSE_KEY = 'pawra.sidebar.collapsed'

export function AppShell() {
  const { mode, organization, role } = useWorkspace()
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(COLLAPSE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsDrawerOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="bg-canvas flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh shrink-0 lg:block">
        <Sidebar isCollapsed={isCollapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Sticky Bar */}
        <header className="border-line bg-canvas/90 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
          <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <Dialog.Trigger
              className="text-ink-muted hover:bg-surface-inset hover:text-ink -ms-2 rounded-md p-2 transition-colors"
              aria-label="Buka navigasi"
            >
              <Menu className="size-5" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-[#16181a]/45 backdrop-blur-[2px]" />
              <Dialog.Content
                className="fixed inset-y-0 start-0 z-50 h-dvh outline-none"
                aria-describedby={undefined}
              >
                <Dialog.Title className="sr-only">Menu Navigasi</Dialog.Title>
                <div className="relative h-full">
                  <Sidebar isCollapsed={false} onNavigate={() => setIsDrawerOpen(false)} />
                  <Dialog.Close
                    className="text-ink-muted hover:bg-surface-inset absolute top-3.5 end-3 rounded-md p-1.5"
                    aria-label="Tutup navigasi"
                  >
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>

          {organization ? (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <OrganizationAvatar organization={organization} size="sm" />
              <span className="truncate text-[0.8125rem] font-semibold">{organization.name}</span>
            </div>
          ) : null}

          <NotificationBell />
        </header>

        {/* Subtle Demo Mode Context Strip */}
        {mode === 'demo' ? (
          <div className="border-line bg-brand-50/70 flex flex-wrap items-center justify-between gap-2 border-b px-4 py-1.5 text-xs sm:px-6 lg:px-8">
            <div className="text-brand-800 flex items-center gap-2">
              <Sparkles className="text-brand-600 size-3.5 shrink-0" />
              <span>
                <strong>Mode Demo Lokal Aktif</strong> — Seluruh perubahan tersimpan di browser Anda
                (Role aktif: <strong>{role ? ROLE_LABELS[role] : '—'}</strong>).
              </span>
            </div>
            <div className="flex items-center gap-3 text-[0.75rem]">
              <Link to={paths.landing} className="text-brand-700 font-medium hover:underline">
                Halaman Landing
              </Link>
              <span className="text-brand-300">·</span>
              <Link to={paths.settings} className="text-brand-700 font-medium hover:underline">
                Koneksi Supabase
              </Link>
            </div>
          </div>
        ) : null}

        <main id="main" className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
