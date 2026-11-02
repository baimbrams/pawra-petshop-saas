import {
  addDaysIso,
  daysBetweenIso,
  evaluateExpiryStatus,
  rangesOverlap,
  todayIsoDate,
} from '@/lib/datetime/dates'
import { applyBasisPoints } from '@/lib/money/money'
import type { OrgRole } from '@/lib/authz/permissions'
import type {
  AppNotification,
  BoardingCareLog,
  BoardingStatus,
  BoardingStay,
  Customer,
  Expense,
  ExpenseCategory,
  FinancialSeriesPoint,
  GroomingAppointment,
  GroomingStatus,
  Kennel,
  KennelOperationalStatus,
  KennelSize,
  Organization,
  OrganizationMembership,
  OverviewSummary,
  PaymentMethod,
  Pet,
  PetSpecies,
  PosOrder,
  PosOrderItem,
  Product,
  ProductCategory,
  StockMovement,
  TeamAuditEvent,
  TeamInvitation,
  UserProfile,
} from '@/types/domain'
import { type LocalDatabaseState, buildSeedDatabase } from './seed'

const STORAGE_KEY = 'pawra.saas.db.v1'

type Listener = () => void
const listeners = new Set<Listener>()

function uid(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${rand}`
}

function readDb(): LocalDatabaseState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = buildSeedDatabase()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw) as LocalDatabaseState
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.organizations)) {
      const seeded = buildSeedDatabase()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    return parsed
  } catch {
    return buildSeedDatabase()
  }
}

function writeDb(next: LocalDatabaseState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota errors in restricted environments
  }
  listeners.forEach((fn) => fn())
}

export function subscribeLocalStore(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetLocalDemoDatabase(keepSignedIn = true): LocalDatabaseState {
  const seeded = buildSeedDatabase()
  if (keepSignedIn) {
    seeded.currentUserId = 'usr-owner-01'
    seeded.activeOrganizationId = 'org-kemang-01'
  }
  writeDb(seeded)
  return seeded
}

/* ============================================================================
 * Auth & Multi-Tenant Workspace Operations
 * ========================================================================== */

export function getLocalSession(): {
  user: UserProfile | null
  memberships: OrganizationMembership[]
  activeOrganizationId: string | null
} {
  const db = readDb()
  if (!db.currentUserId) {
    return { user: null, memberships: [], activeOrganizationId: null }
  }
  const user = db.users.find((u) => u.id === db.currentUserId) ?? null
  if (!user) {
    return { user: null, memberships: [], activeOrganizationId: null }
  }

  const memberships = db.memberships
    .filter((m) => m.user_id === user.id)
    .map((m) => {
      const org = db.organizations.find((o) => o.id === m.organization_id) ?? m.organization
      return { ...m, user, organization: org }
    })

  const validActive =
    memberships.find((m) => m.organization_id === db.activeOrganizationId)?.organization_id ??
    memberships[0]?.organization_id ??
    null

  return { user, memberships, activeOrganizationId: validActive }
}

export function localSignInDemoOwner(): UserProfile {
  const db = readDb()
  const owner = db.users[0]
  db.currentUserId = owner.id
  db.activeOrganizationId = db.organizations[0]?.id ?? null
  writeDb(db)
  return owner
}

export function localSignInWithEmail(email: string): UserProfile {
  const db = readDb()
  const normalized = email.trim().toLowerCase()
  const existing = db.users.find((u) => u.email.toLowerCase() === normalized)
  if (!existing) {
    throw new Error(
      'Akun dengan email tersebut belum ditemukan. Gunakan tombol "Masuk Demo Instan" atau daftar akun baru.',
    )
  }
  db.currentUserId = existing.id
  const firstMembership = db.memberships.find((m) => m.user_id === existing.id)
  db.activeOrganizationId = firstMembership?.organization_id ?? null
  writeDb(db)
  return existing
}

export function localSignUp(input: {
  fullName: string
  email: string
  shopName?: string
  city?: string
}): UserProfile {
  const db = readDb()
  const normalized = input.email.trim().toLowerCase()
  if (db.users.some((u) => u.email.toLowerCase() === normalized)) {
    throw new Error('Email ini sudah terdaftar. Silakan masuk menggunakan halaman Sign In.')
  }

  const now = new Date().toISOString()
  const newUser: UserProfile = {
    id: uid('usr'),
    email: normalized,
    full_name: input.fullName.trim(),
    created_at: now,
  }
  db.users.push(newUser)
  db.currentUserId = newUser.id

  if (input.shopName?.trim()) {
    const org = createOrganizationInternal(db, newUser, {
      name: input.shopName.trim(),
      city: input.city?.trim() || 'Jakarta',
      phone: '',
      address: '',
      default_currency: 'IDR',
      time_zone: 'Asia/Jakarta',
    })
    db.activeOrganizationId = org.id
  } else {
    db.activeOrganizationId = null
  }

  writeDb(db)
  return newUser
}

export function localSignOut(): void {
  const db = readDb()
  db.currentUserId = null
  writeDb(db)
}

export function localSwitchOrganization(organizationId: string): void {
  const db = readDb()
  db.activeOrganizationId = organizationId
  writeDb(db)
}

export function localSimulateRole(organizationId: string, role: OrgRole): void {
  const db = readDb()
  if (!db.currentUserId) return
  const mem = db.memberships.find(
    (m) => m.organization_id === organizationId && m.user_id === db.currentUserId,
  )
  if (mem) {
    mem.role = role
    writeDb(db)
  }
}

function createOrganizationInternal(
  db: LocalDatabaseState,
  owner: UserProfile,
  input: {
    name: string
    city: string
    phone: string
    address: string
    default_currency: Organization['default_currency']
    time_zone: string
  },
): Organization {
  const now = new Date().toISOString()
  const baseSlug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'pet-shop'

  const org: Organization = {
    id: uid('org'),
    name: input.name.trim(),
    slug: `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`,
    phone: input.phone.trim() || '0812-0000-0000',
    email: owner.email,
    address: input.address.trim() || `Jl. Utama ${input.city}`,
    city: input.city.trim() || 'Jakarta',
    default_currency: input.default_currency,
    locale: input.default_currency === 'IDR' ? 'id-ID' : 'en-US',
    time_zone: input.time_zone || 'Asia/Jakarta',
    tax_rate_bps: 0,
    receipt_footer: `Terima kasih telah berbelanja di ${input.name.trim()}!`,
    plan_tier: 'free',
    created_at: now,
  }

  db.organizations.push(org)
  db.memberships.push({
    id: uid('mem'),
    organization_id: org.id,
    user_id: owner.id,
    role: 'owner',
    joined_at: now,
    user: owner,
    organization: org,
  })

  // Tambahkan 2 kandang awal supaya modul Pet Hotel siap dipakai tetapi tetap bersih
  db.kennels.push(
    {
      id: uid('ken'),
      organization_id: org.id,
      code: 'CAT-01',
      name: 'Cat Condo 01',
      species_allowed: ['cat'],
      size: 'medium',
      daily_rate_minor: org.default_currency === 'IDR' ? 85_000 : 2500,
      currency: org.default_currency,
      operational_status: 'active',
      features: 'AC, Litter box pribadi',
      created_at: now,
    },
    {
      id: uid('ken'),
      organization_id: org.id,
      code: 'DOG-01',
      name: 'Dog Cabin 01',
      species_allowed: ['dog'],
      size: 'large',
      daily_rate_minor: org.default_currency === 'IDR' ? 175_000 : 4500,
      currency: org.default_currency,
      operational_status: 'active',
      features: 'Kabin luas & sesi jalan pagi/sore',
      created_at: now,
    },
  )

  return org
}

export function localCreateOrganization(input: {
  name: string
  city: string
  phone: string
  address: string
  default_currency: Organization['default_currency']
  time_zone: string
}): Organization {
  const db = readDb()
  const user = db.users.find((u) => u.id === db.currentUserId)
  if (!user) throw new Error('Sesi pengguna tidak ditemukan.')
  const org = createOrganizationInternal(db, user, input)
  db.activeOrganizationId = org.id
  writeDb(db)
  return org
}

export function localUpdateOrganization(
  organizationId: string,
  patch: Partial<
    Pick<
      Organization,
      | 'name'
      | 'phone'
      | 'email'
      | 'address'
      | 'city'
      | 'default_currency'
      | 'time_zone'
      | 'tax_rate_bps'
      | 'receipt_footer'
      | 'plan_tier'
    >
  >,
): Organization {
  const db = readDb()
  const idx = db.organizations.findIndex((o) => o.id === organizationId)
  if (idx < 0) throw new Error('Toko tidak ditemukan.')
  const updated: Organization = { ...db.organizations[idx], ...patch }
  db.organizations[idx] = updated
  db.memberships = db.memberships.map((m) =>
    m.organization_id === organizationId ? { ...m, organization: updated } : m,
  )
  writeDb(db)
  return updated
}

/* ============================================================================
 * Kennel Availability Validation (Mirrors PostgreSQL GiST Exclusion Constraint)
 * ========================================================================== */

export function isKennelAvailableBetween(
  kennel: Kennel,
  stays: readonly BoardingStay[],
  checkInDate: string,
  checkOutDate: string,
  excludeStayId?: string,
): { available: boolean; reason?: string } {
  if (kennel.operational_status !== 'active') {
    return {
      available: false,
      reason: `Kandang ${kennel.code} sedang dalam status ${kennel.operational_status === 'maintenance' ? 'Sterilisasi / Perawatan' : 'Nonaktif'}.`,
    }
  }
  if (daysBetweenIso(checkInDate, checkOutDate) <= 0) {
    return {
      available: false,
      reason: 'Tanggal Check-Out harus minimal 1 malam setelah tanggal Check-In.',
    }
  }
  const conflict = stays.find(
    (s) =>
      s.id !== excludeStayId &&
      s.kennel_id === kennel.id &&
      (s.status === 'reserved' || s.status === 'checked_in') &&
      rangesOverlap(s.check_in_date, s.check_out_date, checkInDate, checkOutDate),
  )
  if (conflict) {
    return {
      available: false,
      reason: `Kandang ${kennel.code} sudah terisi/dipesan pada kontrak ${conflict.contract_code} (${conflict.check_in_date} s/d ${conflict.check_out_date}).`,
    }
  }
  return { available: true }
}

/* ============================================================================
 * Domain Queries & Mutations (Scoped Strictly by organizationId)
 * ========================================================================== */

export function localListCustomers(organizationId: string): Customer[] {
  const db = readDb()
  return db.customers
    .filter((c) => c.organization_id === organizationId && !c.is_archived)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function localGetCustomer(organizationId: string, customerId: string): Customer | null {
  const db = readDb()
  return (
    db.customers.find((c) => c.organization_id === organizationId && c.id === customerId) ?? null
  )
}

export function localCreateCustomer(
  organizationId: string,
  input: {
    full_name: string
    phone: string
    email: string
    address: string
    notes: string
  },
): Customer {
  const db = readDb()
  const count = db.customers.filter((c) => c.organization_id === organizationId).length + 1001
  const customer: Customer = {
    id: uid('cust'),
    organization_id: organizationId,
    code: `PLG-${count}`,
    full_name: input.full_name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    notes: input.notes.trim(),
    loyalty_points: 0,
    is_archived: false,
    created_at: new Date().toISOString(),
  }
  db.customers.unshift(customer)
  writeDb(db)
  return customer
}

export function localListPets(organizationId: string, customerId?: string): Pet[] {
  const db = readDb()
  return db.pets
    .filter(
      (p) =>
        p.organization_id === organizationId && (!customerId || p.customer_id === customerId),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function localCreatePet(
  organizationId: string,
  input: {
    customer_id: string
    name: string
    species: PetSpecies
    breed: string
    gender: 'male' | 'female'
    birth_date: string | null
    weight_kg: number
    is_sterilized: boolean
    vaccine_name: string
    vaccine_expires_on: string | null
    allergies_or_notes: string
    temperament: Pet['temperament']
  },
): Pet {
  const db = readDb()
  const owner = db.customers.find(
    (c) => c.id === input.customer_id && c.organization_id === organizationId,
  )
  if (!owner) throw new Error('Pemilik hewan tidak valid untuk toko ini.')

  const count = db.pets.filter((p) => p.organization_id === organizationId).length + 1
  const pet: Pet = {
    id: uid('pet'),
    organization_id: organizationId,
    customer_id: input.customer_id,
    code: `PET-${String(count).padStart(3, '0')}`,
    name: input.name.trim(),
    species: input.species,
    breed: input.breed.trim() || 'Campuran / Domestik',
    gender: input.gender,
    birth_date: input.birth_date || null,
    weight_kg: Number(input.weight_kg) || 1,
    is_sterilized: input.is_sterilized,
    vaccine_name: input.vaccine_name.trim(),
    vaccine_expires_on: input.vaccine_expires_on || null,
    allergies_or_notes: input.allergies_or_notes.trim(),
    temperament: input.temperament,
    created_at: new Date().toISOString(),
  }
  db.pets.push(pet)
  writeDb(db)
  return pet
}

export function localListProducts(organizationId: string): Product[] {
  const db = readDb()
  return db.products
    .filter((p) => p.organization_id === organizationId && p.is_active)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function localUpsertProduct(
  organizationId: string,
  input: {
    id?: string
    sku: string
    barcode: string
    name: string
    brand: string
    category: ProductCategory
    unit: string
    cost_minor: number
    price_minor: number
    stock_qty: number
    min_stock_qty: number
    expires_on: string | null
  },
): Product {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) throw new Error('Toko tidak ditemukan.')

  if (input.id) {
    const idx = db.products.findIndex(
      (p) => p.id === input.id && p.organization_id === organizationId,
    )
    if (idx < 0) throw new Error('Produk tidak ditemukan.')
    const updated: Product = {
      ...db.products[idx],
      sku: input.sku.trim().toUpperCase(),
      barcode: input.barcode.trim(),
      name: input.name.trim(),
      brand: input.brand.trim(),
      category: input.category,
      unit: input.unit.trim() || 'pcs',
      cost_minor: input.cost_minor,
      price_minor: input.price_minor,
      stock_qty: input.stock_qty,
      min_stock_qty: input.min_stock_qty,
      expires_on: input.expires_on || null,
    }
    db.products[idx] = updated
    writeDb(db)
    return updated
  }

  const created: Product = {
    id: uid('prd'),
    organization_id: organizationId,
    sku: input.sku.trim().toUpperCase(),
    barcode: input.barcode.trim(),
    name: input.name.trim(),
    brand: input.brand.trim() || 'Umum',
    category: input.category,
    unit: input.unit.trim() || 'pcs',
    cost_minor: input.cost_minor,
    price_minor: input.price_minor,
    currency: org.default_currency,
    stock_qty: input.stock_qty,
    min_stock_qty: input.min_stock_qty,
    expires_on: input.expires_on || null,
    is_active: true,
    created_at: new Date().toISOString(),
  }
  db.products.push(created)
  writeDb(db)
  return created
}

export function localAdjustProductStock(
  organizationId: string,
  input: {
    product_id: string
    delta_qty: number
    reason: StockMovement['reason']
    note: string
    actor_name: string
  },
): Product {
  const db = readDb()
  const idx = db.products.findIndex(
    (p) => p.id === input.product_id && p.organization_id === organizationId,
  )
  if (idx < 0) throw new Error('Produk tidak ditemukan.')
  const nextQty = db.products[idx].stock_qty + input.delta_qty
  if (nextQty < 0) {
    throw new Error('Stok tidak boleh menjadi negatif.')
  }
  db.products[idx] = { ...db.products[idx], stock_qty: nextQty }
  db.stockMovements.unshift({
    id: uid('mov'),
    organization_id: organizationId,
    product_id: input.product_id,
    delta_qty: input.delta_qty,
    reason: input.reason,
    note: input.note.trim(),
    actor_name: input.actor_name,
    created_at: new Date().toISOString(),
  })
  writeDb(db)
  return db.products[idx]
}

export function localListPosOrders(organizationId: string): PosOrder[] {
  const db = readDb()
  return db.posOrders
    .filter((o) => o.organization_id === organizationId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function localCreatePosOrder(
  organizationId: string,
  input: {
    customer_id: string | null
    cart: { product_id: string; qty: number }[]
    discount_minor: number
    apply_tax: boolean
    payment_method: PaymentMethod
    paid_minor: number
    cashier_name: string
    notes: string
  },
): PosOrder {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) throw new Error('Toko tidak ditemukan.')
  if (input.cart.length === 0) throw new Error('Keranjang kasir masih kosong.')

  const orderItems: PosOrderItem[] = []
  let subtotalMinor = 0

  for (const line of input.cart) {
    const prodIdx = db.products.findIndex(
      (p) => p.id === line.product_id && p.organization_id === organizationId,
    )
    if (prodIdx < 0) throw new Error('Produk di keranjang tidak ditemukan.')
    const prod = db.products[prodIdx]
    if (line.qty <= 0) throw new Error(`Jumlah untuk ${prod.name} tidak valid.`)
    if (prod.stock_qty < line.qty) {
      throw new Error(`Stok "${prod.name}" tidak mencukupi (tersisa ${prod.stock_qty} ${prod.unit}).`)
    }
    const lineSub = prod.price_minor * line.qty
    subtotalMinor += lineSub
    orderItems.push({
      id: uid('item'),
      product_id: prod.id,
      product_name: prod.name,
      sku: prod.sku,
      qty: line.qty,
      unit_price_minor: prod.price_minor,
      subtotal_minor: lineSub,
    })
  }

  const discountMinor = Math.min(Math.max(0, input.discount_minor), subtotalMinor)
  const taxableBase = subtotalMinor - discountMinor
  const taxMinor = input.apply_tax ? applyBasisPoints(taxableBase, org.tax_rate_bps) : 0
  const totalMinor = taxableBase + taxMinor
  const paidMinor = input.payment_method === 'cash' ? Math.max(input.paid_minor, totalMinor) : totalMinor
  if (input.payment_method === 'cash' && input.paid_minor < totalMinor) {
    throw new Error('Nominal uang tunai yang diterima kurang dari total tagihan.')
  }

  const now = new Date().toISOString()
  const seq = db.posOrders.filter((o) => o.organization_id === organizationId).length + 1
  const invoiceNumber = `INV-${now.slice(2, 4)}${now.slice(5, 7)}-${String(seq).padStart(3, '0')}`

  // Deduct stock atomically
  for (const item of orderItems) {
    const pIdx = db.products.findIndex((p) => p.id === item.product_id)
    db.products[pIdx] = {
      ...db.products[pIdx],
      stock_qty: db.products[pIdx].stock_qty - item.qty,
    }
    db.stockMovements.unshift({
      id: uid('mov'),
      organization_id: organizationId,
      product_id: item.product_id,
      delta_qty: -item.qty,
      reason: 'pos_sale',
      note: invoiceNumber,
      actor_name: input.cashier_name,
      created_at: now,
    })
  }

  let customerName = 'Pelanggan Umum (Walk-in)'
  if (input.customer_id) {
    const custIdx = db.customers.findIndex(
      (c) => c.id === input.customer_id && c.organization_id === organizationId,
    )
    if (custIdx >= 0) {
      customerName = db.customers[custIdx].full_name
      const earnedPoints =
        org.default_currency === 'IDR'
          ? Math.floor(totalMinor / 10_000)
          : Math.floor(totalMinor / 100)
      db.customers[custIdx] = {
        ...db.customers[custIdx],
        loyalty_points: db.customers[custIdx].loyalty_points + earnedPoints,
      }
    }
  }

  const order: PosOrder = {
    id: uid('pos'),
    organization_id: organizationId,
    invoice_number: invoiceNumber,
    customer_id: input.customer_id,
    customer_name: customerName,
    items: orderItems,
    subtotal_minor: subtotalMinor,
    discount_minor: discountMinor,
    tax_minor: taxMinor,
    total_minor: totalMinor,
    paid_minor: paidMinor,
    change_minor: Math.max(0, paidMinor - totalMinor),
    currency: org.default_currency,
    payment_method: input.payment_method,
    cashier_name: input.cashier_name,
    notes: input.notes.trim(),
    created_at: now,
  }

  db.posOrders.unshift(order)
  writeDb(db)
  return order
}

export function localListGrooming(organizationId: string): GroomingAppointment[] {
  const db = readDb()
  return db.groomingAppointments
    .filter((g) => g.organization_id === organizationId)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
}

export function localCreateGrooming(
  organizationId: string,
  input: {
    customer_id: string
    pet_id: string
    service_package: string
    scheduled_at: string
    duration_minutes: number
    groomer_name: string
    price_minor: number
    paid_now: boolean
    payment_method: PaymentMethod
    notes: string
  },
): GroomingAppointment {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) throw new Error('Toko tidak ditemukan.')

  const seq = db.groomingAppointments.filter((g) => g.organization_id === organizationId).length + 101
  const created: GroomingAppointment = {
    id: uid('grm'),
    organization_id: organizationId,
    booking_code: `GRM-${seq}`,
    customer_id: input.customer_id,
    pet_id: input.pet_id,
    service_package: input.service_package,
    scheduled_at: input.scheduled_at,
    duration_minutes: input.duration_minutes,
    groomer_name: input.groomer_name.trim() || 'Staf Groomer',
    status: 'scheduled',
    price_minor: input.price_minor,
    paid_minor: input.paid_now ? input.price_minor : 0,
    currency: org.default_currency,
    payment_method: input.paid_now ? input.payment_method : null,
    notes: input.notes.trim(),
    created_at: new Date().toISOString(),
  }
  db.groomingAppointments.unshift(created)
  writeDb(db)
  return created
}

export function localUpdateGroomingStatus(
  organizationId: string,
  appointmentId: string,
  patch: {
    status?: GroomingStatus
    settlePaymentMethod?: PaymentMethod
  },
): GroomingAppointment {
  const db = readDb()
  const idx = db.groomingAppointments.findIndex(
    (g) => g.id === appointmentId && g.organization_id === organizationId,
  )
  if (idx < 0) throw new Error('Jadwal grooming tidak ditemukan.')
  const current = db.groomingAppointments[idx]
  const updated: GroomingAppointment = {
    ...current,
    status: patch.status ?? current.status,
    paid_minor: patch.settlePaymentMethod ? current.price_minor : current.paid_minor,
    payment_method: patch.settlePaymentMethod ?? current.payment_method,
  }
  db.groomingAppointments[idx] = updated
  writeDb(db)
  return updated
}

export function localListKennels(organizationId: string): Kennel[] {
  const db = readDb()
  return db.kennels
    .filter((k) => k.organization_id === organizationId)
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function localUpsertKennel(
  organizationId: string,
  input: {
    id?: string
    code: string
    name: string
    species_allowed: PetSpecies[]
    size: KennelSize
    daily_rate_minor: number
    operational_status: KennelOperationalStatus
    features: string
  },
): Kennel {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) throw new Error('Toko tidak ditemukan.')

  if (input.id) {
    const idx = db.kennels.findIndex(
      (k) => k.id === input.id && k.organization_id === organizationId,
    )
    if (idx < 0) throw new Error('Kandang tidak ditemukan.')
    const updated: Kennel = {
      ...db.kennels[idx],
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      species_allowed: input.species_allowed,
      size: input.size,
      daily_rate_minor: input.daily_rate_minor,
      operational_status: input.operational_status,
      features: input.features.trim(),
    }
    db.kennels[idx] = updated
    writeDb(db)
    return updated
  }

  const created: Kennel = {
    id: uid('ken'),
    organization_id: organizationId,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    species_allowed: input.species_allowed.length > 0 ? input.species_allowed : ['cat'],
    size: input.size,
    daily_rate_minor: input.daily_rate_minor,
    currency: org.default_currency,
    operational_status: input.operational_status,
    features: input.features.trim(),
    created_at: new Date().toISOString(),
  }
  db.kennels.push(created)
  writeDb(db)
  return created
}

export function localListBoardingStays(organizationId: string): BoardingStay[] {
  const db = readDb()
  return db.boardingStays
    .filter((s) => s.organization_id === organizationId)
    .sort((a, b) => b.check_in_date.localeCompare(a.check_in_date))
}

export function localCreateBoardingStay(
  organizationId: string,
  input: {
    kennel_id: string
    customer_id: string
    pet_id: string
    check_in_date: string
    check_out_date: string
    addons_minor: number
    deposit_paid_minor: number
    status: 'reserved' | 'checked_in'
    feeding_instructions: string
    medical_notes: string
  },
): BoardingStay {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) throw new Error('Toko tidak ditemukan.')
  const kennel = db.kennels.find(
    (k) => k.id === input.kennel_id && k.organization_id === organizationId,
  )
  if (!kennel) throw new Error('Kandang tidak ditemukan.')

  const orgStays = db.boardingStays.filter((s) => s.organization_id === organizationId)
  const check = isKennelAvailableBetween(
    kennel,
    orgStays,
    input.check_in_date,
    input.check_out_date,
  )
  if (!check.available) {
    throw new Error(check.reason)
  }

  const nights = daysBetweenIso(input.check_in_date, input.check_out_date)
  const totalMinor = nights * kennel.daily_rate_minor + Math.max(0, input.addons_minor)
  const depositMinor = Math.min(Math.max(0, input.deposit_paid_minor), totalMinor)
  const now = new Date().toISOString()
  const seq = orgStays.length + 1

  const created: BoardingStay = {
    id: uid('brd'),
    organization_id: organizationId,
    contract_code: `HTL-${now.slice(2, 4)}${now.slice(5, 7)}-${String(seq).padStart(3, '0')}`,
    kennel_id: kennel.id,
    customer_id: input.customer_id,
    pet_id: input.pet_id,
    check_in_date: input.check_in_date,
    check_out_date: input.check_out_date,
    nights,
    daily_rate_minor: kennel.daily_rate_minor,
    addons_minor: Math.max(0, input.addons_minor),
    total_minor: totalMinor,
    deposit_paid_minor: depositMinor,
    total_paid_minor: depositMinor,
    currency: org.default_currency,
    status: input.status,
    feeding_instructions: input.feeding_instructions.trim(),
    medical_notes: input.medical_notes.trim(),
    care_logs: [],
    created_at: now,
  }

  db.boardingStays.unshift(created)
  writeDb(db)
  return created
}

export function localUpdateBoardingStay(
  organizationId: string,
  stayId: string,
  patch: {
    status?: BoardingStatus
    settleFullPayment?: boolean
    careLog?: Omit<BoardingCareLog, 'id' | 'logged_at'>
  },
): BoardingStay {
  const db = readDb()
  const idx = db.boardingStays.findIndex(
    (s) => s.id === stayId && s.organization_id === organizationId,
  )
  if (idx < 0) throw new Error('Kontrak Pet Hotel tidak ditemukan.')
  const current = db.boardingStays[idx]
  const nextLogs = patch.careLog
    ? [
        {
          id: uid('log'),
          logged_at: new Date().toISOString(),
          ...patch.careLog,
        },
        ...current.care_logs,
      ]
    : current.care_logs

  const updated: BoardingStay = {
    ...current,
    status: patch.status ?? current.status,
    total_paid_minor: patch.settleFullPayment ? current.total_minor : current.total_paid_minor,
    care_logs: nextLogs,
  }
  db.boardingStays[idx] = updated
  writeDb(db)
  return updated
}

export function localListExpenses(organizationId: string): Expense[] {
  const db = readDb()
  return db.expenses
    .filter((e) => e.organization_id === organizationId)
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
}

export function localCreateExpense(
  organizationId: string,
  input: {
    expense_date: string
    category: ExpenseCategory
    vendor_name: string
    description: string
    amount_minor: number
    recorded_by: string
  },
): Expense {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  if (!org) throw new Error('Toko tidak ditemukan.')
  const seq = db.expenses.filter((e) => e.organization_id === organizationId).length + 1
  const now = new Date().toISOString()

  const created: Expense = {
    id: uid('exp'),
    organization_id: organizationId,
    reference_code: `EXP-${now.slice(2, 4)}${now.slice(5, 7)}-${String(seq).padStart(2, '0')}`,
    expense_date: input.expense_date,
    category: input.category,
    vendor_name: input.vendor_name.trim() || 'Vendor Operasional',
    description: input.description.trim(),
    amount_minor: input.amount_minor,
    currency: org.default_currency,
    is_voided: false,
    recorded_by: input.recorded_by,
    created_at: now,
  }
  db.expenses.unshift(created)
  writeDb(db)
  return created
}

export function localVoidExpense(organizationId: string, expenseId: string): Expense {
  const db = readDb()
  const idx = db.expenses.findIndex(
    (e) => e.id === expenseId && e.organization_id === organizationId,
  )
  if (idx < 0) throw new Error('Catatan biaya tidak ditemukan.')
  db.expenses[idx] = { ...db.expenses[idx], is_voided: true }
  writeDb(db)
  return db.expenses[idx]
}

/* ============================================================================
 * Team & Membership Management
 * ========================================================================== */

export function localListTeam(organizationId: string): {
  members: OrganizationMembership[]
  invitations: TeamInvitation[]
  auditEvents: TeamAuditEvent[]
} {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  const members = db.memberships
    .filter((m) => m.organization_id === organizationId)
    .map((m) => ({
      ...m,
      user: db.users.find((u) => u.id === m.user_id) ?? m.user,
      organization: org ?? m.organization,
    }))
  const invitations = db.invitations.filter((i) => i.organization_id === organizationId)
  const auditEvents = db.auditEvents
    .filter((a) => a.organization_id === organizationId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  return { members, invitations, auditEvents }
}

export function localInviteMember(
  organizationId: string,
  input: {
    email: string
    role: Exclude<OrgRole, 'owner'>
    actorName: string
  },
): { invitation: TeamInvitation; oneTimeLink: string } {
  const db = readDb()
  const now = new Date()
  const rawToken = `pwr_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 10)}`
  const invitation: TeamInvitation = {
    id: uid('inv'),
    organization_id: organizationId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    invited_by_name: input.actorName,
    token_preview: `${rawToken.slice(0, 10)}...${rawToken.slice(-4)}`,
    status: 'pending',
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
  }
  db.invitations.unshift(invitation)
  db.auditEvents.unshift({
    id: uid('aud'),
    organization_id: organizationId,
    actor_name: input.actorName,
    action: 'Membuat tautan undangan anggota',
    target_label: `${invitation.email} (${invitation.role})`,
    created_at: now.toISOString(),
  })
  writeDb(db)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.pawra.id'
  return {
    invitation,
    oneTimeLink: `${origin}/sign-up?invite=${rawToken}`,
  }
}

export function localUpdateMemberRole(
  organizationId: string,
  membershipId: string,
  nextRole: Exclude<OrgRole, 'owner'>,
  actorName: string,
): void {
  const db = readDb()
  const idx = db.memberships.findIndex(
    (m) => m.id === membershipId && m.organization_id === organizationId,
  )
  if (idx < 0) throw new Error('Anggota tim tidak ditemukan.')
  if (db.memberships[idx].role === 'owner') {
    throw new Error('Kepemilikan Owner tidak dapat diubah lewat menu role biasa.')
  }
  db.memberships[idx] = { ...db.memberships[idx], role: nextRole }
  db.auditEvents.unshift({
    id: uid('aud'),
    organization_id: organizationId,
    actor_name: actorName,
    action: 'Mengubah role anggota',
    target_label: `${db.memberships[idx].user.full_name} menjadi ${nextRole}`,
    created_at: new Date().toISOString(),
  })
  writeDb(db)
}

export function localRevokeInvitation(
  organizationId: string,
  invitationId: string,
  actorName: string,
): void {
  const db = readDb()
  const idx = db.invitations.findIndex(
    (i) => i.id === invitationId && i.organization_id === organizationId,
  )
  if (idx < 0) return
  db.invitations[idx] = { ...db.invitations[idx], status: 'revoked' }
  db.auditEvents.unshift({
    id: uid('aud'),
    organization_id: organizationId,
    actor_name: actorName,
    action: 'Membatalkan undangan',
    target_label: db.invitations[idx].email,
    created_at: new Date().toISOString(),
  })
  writeDb(db)
}

/* ============================================================================
 * Smart Notifications & Executive Overview Aggregations
 * ========================================================================== */

export function localListNotifications(organizationId: string): AppNotification[] {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  const today = todayIsoDate(org?.time_zone || 'Asia/Jakarta')
  const items: AppNotification[] = []

  // 1. Low stock alerts
  for (const prod of db.products.filter((p) => p.organization_id === organizationId && p.is_active)) {
    if (prod.stock_qty <= prod.min_stock_qty) {
      items.push({
        id: `ntf-stock-${prod.id}`,
        organization_id: organizationId,
        category: 'stock',
        severity: prod.stock_qty === 0 ? 'critical' : 'caution',
        title: `Stok menipis: ${prod.name}`,
        description: `Tersisa ${prod.stock_qty} ${prod.unit} (batas minimum ${prod.min_stock_qty} ${prod.unit}). Segera jadwalkan PO restock.`,
        link_to: '/products',
        created_at: prod.created_at,
      })
    }

    if (prod.expires_on) {
      const exp = evaluateExpiryStatus(prod.expires_on, today, 30)
      if (exp === 'expired' || exp === 'expiring_soon') {
        items.push({
          id: `ntf-exp-${prod.id}`,
          organization_id: organizationId,
          category: 'expiry',
          severity: exp === 'expired' ? 'critical' : 'caution',
          title:
            exp === 'expired'
              ? `Produk melewati kedaluwarsa: ${prod.name}`
              : `Produk mendekati expired: ${prod.name}`,
          description: `SKU ${prod.sku} memiliki tanggal kedaluwarsa ${prod.expires_on}. Pisahkan dari rak jual utama.`,
          link_to: '/products',
          created_at: prod.created_at,
        })
      }
    }
  }

  // 2. Boarding check-outs & check-ins today
  for (const stay of db.boardingStays.filter((s) => s.organization_id === organizationId)) {
    const pet = db.pets.find((p) => p.id === stay.pet_id)
    if (stay.status === 'checked_in' && stay.check_out_date === today) {
      const due = Math.max(0, stay.total_minor - stay.total_paid_minor)
      items.push({
        id: `ntf-brd-out-${stay.id}`,
        organization_id: organizationId,
        category: 'boarding',
        severity: 'info',
        title: `Jadwal Check-Out Pet Hotel hari ini: ${pet?.name ?? stay.contract_code}`,
        description:
          due > 0
            ? `Kontrak ${stay.contract_code} selesai hari ini. Terdapat sisa pelunasan saat penjemputan.`
            : `Kontrak ${stay.contract_code} telah lunas dan siap dijemput pemilik.`,
        link_to: '/boarding',
        created_at: stay.created_at,
      })
    }
    if (stay.status === 'reserved' && stay.check_in_date === today) {
      items.push({
        id: `ntf-brd-in-${stay.id}`,
        organization_id: organizationId,
        category: 'boarding',
        severity: 'info',
        title: `Reservasi Check-In hari ini: ${pet?.name ?? stay.contract_code}`,
        description: `Pastikan kandang sudah steril dan siap menerima kedatangan (${stay.contract_code}).`,
        link_to: '/boarding',
        created_at: stay.created_at,
      })
    }
  }

  // 3. Pet vaccination warnings
  for (const pet of db.pets.filter((p) => p.organization_id === organizationId)) {
    const vax = evaluateExpiryStatus(pet.vaccine_expires_on, today, 21)
    if (vax === 'expired' || vax === 'expiring_soon') {
      items.push({
        id: `ntf-vax-${pet.id}`,
        organization_id: organizationId,
        category: 'vaccine',
        severity: vax === 'expired' ? 'critical' : 'caution',
        title:
          vax === 'expired'
            ? `Vaksin hewan kedaluwarsa: ${pet.name}`
            : `Vaksin segera berakhir: ${pet.name}`,
        description: `${pet.vaccine_name || 'Vaksin tahunan'} tercatat berakhir ${pet.vaccine_expires_on}. Konfirmasi buku vaksin sebelum menerima penitipan Pet Hotel.`,
        link_to: '/customers',
        created_at: pet.created_at,
      })
    }
  }

  const rank = { critical: 0, caution: 1, info: 2 }
  return items.sort((a, b) => rank[a.severity] - rank[b.severity])
}

export function localGetOverview(
  organizationId: string,
  daysWindow: number,
): { summary: OverviewSummary; series: FinancialSeriesPoint[] } {
  const db = readDb()
  const org = db.organizations.find((o) => o.id === organizationId)
  const currency = org?.default_currency ?? 'IDR'
  const today = todayIsoDate(org?.time_zone || 'Asia/Jakarta')
  const startDate = addDaysIso(today, -(daysWindow - 1))

  const posOrders = db.posOrders.filter(
    (o) => o.organization_id === organizationId && o.created_at.slice(0, 10) >= startDate,
  )
  const grooming = db.groomingAppointments.filter((g) => g.organization_id === organizationId)
  const boarding = db.boardingStays.filter((b) => b.organization_id === organizationId)
  const expenses = db.expenses.filter(
    (e) =>
      e.organization_id === organizationId && !e.is_voided && e.expense_date >= startDate,
  )
  const products = db.products.filter((p) => p.organization_id === organizationId && p.is_active)
  const kennels = db.kennels.filter((k) => k.organization_id === organizationId)

  const revenuePos = posOrders.reduce((acc, o) => acc + o.total_minor, 0)
  const revenueGrooming = grooming
    .filter((g) => g.scheduled_at.slice(0, 10) >= startDate && g.status !== 'cancelled')
    .reduce((acc, g) => acc + g.paid_minor, 0)
  const revenueBoarding = boarding
    .filter((b) => b.created_at.slice(0, 10) >= startDate && b.status !== 'cancelled')
    .reduce((acc, b) => acc + b.total_paid_minor, 0)

  const revenueTotal = revenuePos + revenueGrooming + revenueBoarding
  const expensesTotal = expenses.reduce((acc, e) => acc + e.amount_minor, 0)

  const outstandingBoarding = boarding
    .filter((b) => b.status === 'reserved' || b.status === 'checked_in')
    .reduce((acc, b) => acc + Math.max(0, b.total_minor - b.total_paid_minor), 0)
  const outstandingGrooming = grooming
    .filter((g) => g.status !== 'cancelled' && g.status !== 'completed')
    .reduce((acc, g) => acc + Math.max(0, g.price_minor - g.paid_minor), 0)

  // Kennel occupancy today
  let kennelsMaintenance = 0
  let kennelsOccupied = 0
  let kennelsReservedToday = 0
  let kennelsAvailable = 0

  for (const ken of kennels) {
    if (ken.operational_status !== 'active') {
      kennelsMaintenance += 1
      continue
    }
    const activeStay = boarding.find(
      (s) =>
        s.kennel_id === ken.id &&
        s.status === 'checked_in' &&
        s.check_in_date <= today &&
        s.check_out_date >= today,
    )
    if (activeStay) {
      kennelsOccupied += 1
      continue
    }
    const reservedToday = boarding.find(
      (s) =>
        s.kennel_id === ken.id &&
        s.status === 'reserved' &&
        s.check_in_date <= today &&
        s.check_out_date > today,
    )
    if (reservedToday) {
      kennelsReservedToday += 1
      continue
    }
    kennelsAvailable += 1
  }

  const groomingToday = grooming.filter(
    (g) => g.scheduled_at.slice(0, 10) === today && g.status !== 'cancelled',
  )

  const summary: OverviewSummary = {
    currency,
    revenue_pos_minor: revenuePos,
    revenue_grooming_minor: revenueGrooming,
    revenue_boarding_minor: revenueBoarding,
    revenue_total_minor: revenueTotal,
    expenses_minor: expensesTotal,
    operating_result_minor: revenueTotal - expensesTotal,
    outstanding_minor: outstandingBoarding + outstandingGrooming,
    pos_orders_count: posOrders.length,
    customers_total: db.customers.filter(
      (c) => c.organization_id === organizationId && !c.is_archived,
    ).length,
    pets_total: db.pets.filter((p) => p.organization_id === organizationId).length,
    products_total: products.length,
    low_stock_count: products.filter((p) => p.stock_qty <= p.min_stock_qty).length,
    expiring_products_count: products.filter((p) => {
      if (!p.expires_on) return false
      const st = evaluateExpiryStatus(p.expires_on, today, 30)
      return st === 'expired' || st === 'expiring_soon'
    }).length,
    kennels_total: kennels.length,
    kennels_available: kennelsAvailable,
    kennels_occupied: kennelsOccupied,
    kennels_reserved_today: kennelsReservedToday,
    kennels_maintenance: kennelsMaintenance,
    grooming_today_total: groomingToday.length,
    grooming_today_active: groomingToday.filter((g) => g.status !== 'completed').length,
    boarding_active_count: boarding.filter((b) => b.status === 'checked_in').length,
    boarding_checkins_today: boarding.filter(
      (b) => b.status === 'reserved' && b.check_in_date === today,
    ).length,
    boarding_checkouts_today: boarding.filter(
      (b) => b.status === 'checked_in' && b.check_out_date === today,
    ).length,
  }

  // Daily series (up to 14 buckets for clean chart rendering)
  const bucketCount = Math.min(daysWindow, 14)
  const seriesStart = addDaysIso(today, -(bucketCount - 1))
  const series: FinancialSeriesPoint[] = []

  for (let i = 0; i < bucketCount; i++) {
    const dk = addDaysIso(seriesStart, i)
    const dt = new Date(`${dk}T00:00:00`)
    const label = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(dt)

    const dayPos = db.posOrders
      .filter((o) => o.organization_id === organizationId && o.created_at.slice(0, 10) === dk)
      .reduce((acc, o) => acc + o.total_minor, 0)

    const dayGrm = grooming
      .filter((g) => g.scheduled_at.slice(0, 10) === dk && g.status !== 'cancelled')
      .reduce((acc, g) => acc + g.paid_minor, 0)

    const dayBrd = boarding
      .filter((b) => b.created_at.slice(0, 10) === dk && b.status !== 'cancelled')
      .reduce((acc, b) => acc + b.total_paid_minor, 0)

    const dayExp = db.expenses
      .filter((e) => e.organization_id === organizationId && !e.is_voided && e.expense_date === dk)
      .reduce((acc, e) => acc + e.amount_minor, 0)

    series.push({
      bucket_label: label,
      date_key: dk,
      pos_minor: dayPos,
      services_minor: dayGrm + dayBrd,
      expenses_minor: dayExp,
    })
  }

  return { summary, series }
}
