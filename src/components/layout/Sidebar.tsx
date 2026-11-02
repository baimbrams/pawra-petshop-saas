import {
  Check,
  ChevronsUpDown,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from '@/components/ui'
import { useWorkspace } from '@/features/workspace/workspace-context'
import { ORG_ROLES, ROLE_LABELS, can } from '@/lib/authz/permissions'
import { cn } from '@/lib/utils/cn'
import { NotificationBell } from './NotificationBell'
import { OrganizationAvatar } from './OrganizationAvatar'
import { navigationGroups } from './navigation'

export interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapsed?: () => void
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ isCollapsed, onToggleCollapsed, onNavigate, className }: SidebarProps) {
  const {
    mode,
    user,
    organization,
    memberships,
    role,
    switchOrganization,
    simulateRole,
    resetDemoData,
    signOut,
  } = useWorkspace()
  const navigate = useNavigate()
  const { pushToast } = useToast()

  return (
    <div
      className={cn(
        'bg-canvas border-line flex h-full flex-col border-e',
        isCollapsed ? 'w-[68px]' : 'w-[262px]',
        className,
      )}
    >
      {/* Store Identity + Multi-Tenant Switcher */}
      <div className="flex h-14 shrink-0 items-center gap-1 px-3">
        {organization ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'hover:bg-surface-inset flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md p-1.5 text-start transition-colors',
                isCollapsed && 'justify-center',
              )}
              aria-label="Ganti cabang atau toko"
            >
              <OrganizationAvatar organization={organization} />
              {!isCollapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-semibold">
                      {organization.name}
                    </span>
                    <span className="text-ink-subtle block truncate text-[0.6875rem]">
                      {role ? ROLE_LABELS[role] : ''}
                    </span>
                  </span>
                  <ChevronsUpDown className="text-ink-subtle size-3.5 shrink-0" />
                </>
              ) : null}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="eyebrow">Cabang / Tenant Anda</DropdownMenuLabel>
              {memberships.map((entry) => (
                <DropdownMenuItem
                  key={entry.organization.id}
                  onSelect={() => {
                    switchOrganization(entry.organization.id)
                    pushToast({
                      title: `Beralih ke ${entry.organization.name}`,
                      description: `Data kini terisolasi khusus cabang ${entry.organization.city}.`,
                      tone: 'info',
                    })
                  }}
                >
                  <OrganizationAvatar organization={entry.organization} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{entry.organization.name}</p>
                    <p className="text-ink-subtle truncate text-[0.6875rem]">
                      {entry.organization.city} · {ROLE_LABELS[entry.role]}
                    </p>
                  </div>
                  {entry.organization.id === organization.id ? (
                    <Check className="text-brand-600 size-4 shrink-0" />
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  onNavigate?.()
                  navigate(paths.createShop)
                }}
              >
                <Plus className="size-4 text-brand-600" />
                <span>Buat Pet Shop / Cabang Baru</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {organization && !isCollapsed ? <NotificationBell /> : null}

        {onToggleCollapsed && !isCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="text-ink-subtle hover:bg-surface-inset hover:text-ink shrink-0 cursor-pointer rounded-md p-1.5 transition-colors"
            aria-label="Kecilkan sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Menu Utama">
        {navigationGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter((item) => can(role, item.permission))
          if (visibleItems.length === 0) return null

          return (
            <div
              key={group.label ?? `group-${groupIndex}`}
              className={groupIndex === 0 ? '' : 'mt-5'}
            >
              {group.label && !isCollapsed ? (
                <p className="eyebrow px-2.5 pb-1.5">{group.label}</p>
              ) : null}
              {group.label && isCollapsed ? (
                <div className="bg-line mx-2 my-2.5 h-px" aria-hidden="true" />
              ) : null}

              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onNavigate}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.8125rem] transition-colors duration-150',
                          isCollapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-surface text-ink border-line border font-medium shadow-raised'
                            : 'text-ink-muted hover:bg-surface-inset hover:text-ink border border-transparent',
                        )
                      }
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden="true" />
                      {!isCollapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Bottom User Menu + Demo Role Switcher */}
      <div className="border-line space-y-1.5 border-t p-3">
        {onToggleCollapsed && isCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="text-ink-subtle hover:bg-surface-inset hover:text-ink flex w-full cursor-pointer items-center justify-center rounded-md p-2 transition-colors"
            aria-label="Perlebar sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              'hover:bg-surface-inset flex w-full cursor-pointer items-center gap-2.5 rounded-md p-1.5 text-start transition-colors',
              isCollapsed && 'justify-center',
            )}
          >
            <span className="bg-surface-inset border-line-strong text-ink inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </span>
            {!isCollapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{user?.full_name}</span>
                <span className="text-ink-subtle block truncate text-[0.6875rem]">
                  {mode === 'demo' ? 'Mode Demo Lokal' : user?.email}
                </span>
              </span>
            ) : null}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>
              <p className="text-ink truncate text-xs font-semibold">{user?.full_name}</p>
              <p className="text-ink-subtle truncate text-[0.6875rem] font-normal">{user?.email}</p>
            </DropdownMenuLabel>

            {mode === 'demo' ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="eyebrow flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-brand-600" />
                  Simulasi Hak Akses Role
                </DropdownMenuLabel>
                {ORG_ROLES.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onSelect={() => {
                      simulateRole(r)
                      pushToast({
                        title: `Simulasi Role: ${ROLE_LABELS[r]}`,
                        description: 'Menu & tombol otomatis menyesuaikan matriks izin RBAC.',
                        tone: 'info',
                      })
                    }}
                  >
                    <span className="flex-1 text-xs">{ROLE_LABELS[r]}</span>
                    {role === r ? <Check className="text-brand-600 size-3.5" /> : null}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    resetDemoData()
                    pushToast({
                      title: 'Data demo dikembalikan seperti semula',
                      tone: 'positive',
                    })
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset Data Demo Awal</span>
                </DropdownMenuItem>
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate(paths.landing)}>
              <ExternalLink className="size-3.5" />
              <span>Lihat Landing Page SaaS</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-critical-600"
              onSelect={() => {
                void signOut().then(() => navigate(paths.overview))
              }}
            >
              <LogOut className="size-3.5" />
              <span>Keluar Sesi</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
