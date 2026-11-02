/**
 * Matriks Hak Akses Multi-Role (selaras dengan fungsi SQL app.role_rank() & RLS di Supabase).
 *
 * Urutan wewenang: owner (40) > admin (30) > manager (20) > staff (10).
 */

export const ORG_ROLES = ['owner', 'admin', 'manager', 'staff'] as const

export type OrgRole = (typeof ORG_ROLES)[number]

const ROLE_RANK: Readonly<Record<OrgRole, number>> = {
  owner: 40,
  admin: 30,
  manager: 20,
  staff: 10,
}

export const ROLE_LABELS: Readonly<Record<OrgRole, string>> = {
  owner: 'Pemilik (Owner)',
  admin: 'Administrator',
  manager: 'Manajer Toko',
  staff: 'Staf Kasir & Groomer',
}

export const ROLE_DESCRIPTIONS: Readonly<Record<OrgRole, string>> = {
  owner: 'Kendali penuh termasuk paket langganan SaaS, transfer kepemilikan, dan manajemen multi-cabang.',
  admin: 'Mengelola anggota tim, pengaturan toko, kategori produk, kandang, dan seluruh operasional.',
  manager: 'Mengelola stok inventori, harga produk, pengeluaran operasional, kandang, dan laporan keuangan.',
  staff: 'Operasional harian: Kasir POS, antrean Grooming, check-in/out Pet Hotel, serta data pelanggan & hewan.',
}

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === 'string' && (ORG_ROLES as readonly string[]).includes(value)
}

export function roleRank(role: OrgRole): number {
  return ROLE_RANK[role]
}

export function hasMinRole(role: OrgRole | null | undefined, minimum: OrgRole): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export const PERMISSIONS = {
  'organization.view': 'staff',
  'organization.update': 'admin',

  // POS & Transaksi Kasir
  'pos.view': 'staff',
  'pos.checkout': 'staff',
  'pos.void': 'manager',

  // Produk & Stok Inventori
  'products.view': 'staff',
  'products.create': 'manager',
  'products.update': 'manager',
  'products.adjustStock': 'manager',
  'products.delete': 'admin',

  // Layanan Grooming
  'grooming.view': 'staff',
  'grooming.create': 'staff',
  'grooming.update': 'staff',
  'grooming.delete': 'manager',

  // Pet Hotel / Boarding & Kandang
  'boarding.view': 'staff',
  'boarding.create': 'staff',
  'boarding.update': 'staff',
  'boarding.delete': 'manager',

  'kennels.view': 'staff',
  'kennels.create': 'manager',
  'kennels.update': 'manager',
  'kennels.delete': 'admin',

  // CRM Pelanggan & Profil Hewan
  'customers.view': 'staff',
  'customers.create': 'staff',
  'customers.update': 'staff',
  'customers.delete': 'admin',

  // Keuangan & Laporan
  'expenses.view': 'staff',
  'expenses.create': 'manager',
  'expenses.void': 'manager',
  'expenses.delete': 'admin',

  'reports.view': 'manager',

  // Tim & Langganan SaaS
  'team.view': 'staff',
  'team.invite': 'admin',
  'team.update': 'admin',
  'team.remove': 'admin',
  'team.transferOwnership': 'owner',

  'billing.manage': 'owner',
} as const satisfies Record<string, OrgRole>

export type Permission = keyof typeof PERMISSIONS

export function requiredRoleFor(permission: Permission): OrgRole {
  return PERMISSIONS[permission]
}

export function can(role: OrgRole | null | undefined, permission: Permission): boolean {
  return hasMinRole(role, PERMISSIONS[permission])
}
