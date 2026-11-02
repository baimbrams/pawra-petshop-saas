/**
 * Seluruh rute aplikasi terpusat di satu tempat (konvensi Atlas).
 */
export const paths = {
  overview: '/',
  landing: '/landing',

  // Operasional & Kasir
  pos: '/pos',
  grooming: '/grooming',
  boarding: '/boarding',
  calendar: '/calendar',

  // Katalog & Fasilitas
  products: '/products',
  kennels: '/kennels',

  // CRM Pelanggan & Hewan
  customers: '/customers',
  customerDetail: '/customers/:customerId',

  // Keuangan & Analitik
  expenses: '/expenses',
  reports: '/reports',

  // Manajemen Toko / Multi-Tenant
  notifications: '/notifications',
  team: '/team',
  billing: '/billing',
  settings: '/settings',

  // Autentikasi & Onboarding
  signIn: '/sign-in',
  signUp: '/sign-up',
  createShop: '/welcome',
} as const

export function customerDetailPath(customerId: string): string {
  return `/customers/${customerId}`
}
