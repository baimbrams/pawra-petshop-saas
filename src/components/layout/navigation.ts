import {
  Banknote,
  BedDouble,
  CalendarRange,
  CreditCard,
  Home,
  LayoutDashboard,
  Package,
  Scissors,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  UsersRound,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { paths } from '@/app/routes/paths'
import type { Permission } from '@/lib/authz/permissions'

export interface NavigationItem {
  readonly label: string
  readonly to: string
  readonly icon: ComponentType<{ className?: string }>
  readonly permission: Permission
}

export interface NavigationGroup {
  readonly label?: string
  readonly items: readonly NavigationItem[]
}

export const navigationGroups: readonly NavigationGroup[] = [
  {
    items: [
      {
        label: 'Ringkasan',
        to: paths.overview,
        icon: LayoutDashboard,
        permission: 'organization.view',
      },
    ],
  },
  {
    label: 'Operasional',
    items: [
      {
        label: 'Kasir (POS)',
        to: paths.pos,
        icon: ShoppingCart,
        permission: 'pos.view',
      },
      {
        label: 'Grooming',
        to: paths.grooming,
        icon: Scissors,
        permission: 'grooming.view',
      },
      {
        label: 'Pet Hotel',
        to: paths.boarding,
        icon: BedDouble,
        permission: 'boarding.view',
      },
      {
        label: 'Kalender Jadwal',
        to: paths.calendar,
        icon: CalendarRange,
        permission: 'boarding.view',
      },
    ],
  },
  {
    label: 'Inventori & Fasilitas',
    items: [
      {
        label: 'Produk & Stok',
        to: paths.products,
        icon: Package,
        permission: 'products.view',
      },
      {
        label: 'Kandang & Ruang',
        to: paths.kennels,
        icon: Home,
        permission: 'kennels.view',
      },
      {
        label: 'Pelanggan & Hewan',
        to: paths.customers,
        icon: Users,
        permission: 'customers.view',
      },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      {
        label: 'Pengeluaran',
        to: paths.expenses,
        icon: Banknote,
        permission: 'expenses.view',
      },
      {
        label: 'Laporan & Analitik',
        to: paths.reports,
        icon: TrendingUp,
        permission: 'reports.view',
      },
    ],
  },
  {
    label: 'Toko & SaaS',
    items: [
      {
        label: 'Tim & Akses',
        to: paths.team,
        icon: UsersRound,
        permission: 'team.view',
      },
      {
        label: 'Langganan',
        to: paths.billing,
        icon: CreditCard,
        permission: 'billing.manage',
      },
      {
        label: 'Pengaturan Toko',
        to: paths.settings,
        icon: Settings,
        permission: 'organization.view',
      },
    ],
  },
]
