import type { OrgRole } from '@/lib/authz/permissions'
import type { CurrencyCode } from '@/lib/money/money'

export type PetSpecies = 'cat' | 'dog' | 'rabbit' | 'bird' | 'hamster' | 'other'

export type VaccineStatus = 'valid' | 'expiring_soon' | 'expired' | 'unvaccinated'

export type ProductCategory =
  | 'cat_food'
  | 'dog_food'
  | 'vitamins_meds'
  | 'litter_hygiene'
  | 'accessories'
  | 'treats'

export type PaymentMethod = 'qris' | 'cash' | 'bank_transfer' | 'card'

export type GroomingStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'ready_pickup'
  | 'completed'
  | 'cancelled'

export type BoardingStatus = 'reserved' | 'checked_in' | 'checked_out' | 'cancelled'

export type KennelOperationalStatus = 'active' | 'maintenance' | 'inactive'

export type KennelSize = 'small' | 'medium' | 'large' | 'vip'

export type ExpenseCategory =
  | 'inventory_restock'
  | 'staff_payroll'
  | 'utilities'
  | 'rent'
  | 'hygiene_supplies'
  | 'equipment_maintenance'
  | 'marketing_other'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone?: string
  created_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  phone: string
  email: string
  address: string
  city: string
  default_currency: CurrencyCode
  locale: string
  time_zone: string
  tax_rate_bps: number // e.g., 1100 = 11.00% PPN, 0 = tanpa PPN
  receipt_footer: string
  plan_tier: 'free' | 'pro' | 'multi_branch'
  created_at: string
}

export interface OrganizationMembership {
  id: string
  organization_id: string
  user_id: string
  role: OrgRole
  joined_at: string
  user: UserProfile
  organization: Organization
}

export interface TeamInvitation {
  id: string
  organization_id: string
  email: string
  role: Exclude<OrgRole, 'owner'>
  invited_by_name: string
  token_preview: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
  expires_at: string
}

export interface TeamAuditEvent {
  id: string
  organization_id: string
  actor_name: string
  action: string
  target_label: string
  created_at: string
}

export interface Customer {
  id: string
  organization_id: string
  code: string
  full_name: string
  phone: string
  email: string
  address: string
  notes: string
  loyalty_points: number
  is_archived: boolean
  created_at: string
}

export interface Pet {
  id: string
  organization_id: string
  customer_id: string
  code: string
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
  temperament: 'friendly' | 'shy' | 'anxious' | 'aggressive'
  created_at: string
}

export interface Product {
  id: string
  organization_id: string
  sku: string
  barcode: string
  name: string
  brand: string
  category: ProductCategory
  unit: string
  cost_minor: number
  price_minor: number
  currency: CurrencyCode
  stock_qty: number
  min_stock_qty: number
  expires_on: string | null
  is_active: boolean
  created_at: string
}

export interface StockMovement {
  id: string
  organization_id: string
  product_id: string
  delta_qty: number
  reason: 'pos_sale' | 'restock' | 'damaged_or_expired' | 'manual_adjustment'
  note: string
  actor_name: string
  created_at: string
}

export interface PosOrderItem {
  id: string
  product_id: string
  product_name: string
  sku: string
  qty: number
  unit_price_minor: number
  subtotal_minor: number
}

export interface PosOrder {
  id: string
  organization_id: string
  invoice_number: string
  customer_id: string | null
  customer_name: string
  items: PosOrderItem[]
  subtotal_minor: number
  discount_minor: number
  tax_minor: number
  total_minor: number
  paid_minor: number
  change_minor: number
  currency: CurrencyCode
  payment_method: PaymentMethod
  cashier_name: string
  notes: string
  created_at: string
}

export interface GroomingAppointment {
  id: string
  organization_id: string
  booking_code: string
  customer_id: string
  pet_id: string
  service_package: string
  scheduled_at: string // ISO datetime
  duration_minutes: number
  groomer_name: string
  status: GroomingStatus
  price_minor: number
  paid_minor: number
  currency: CurrencyCode
  payment_method: PaymentMethod | null
  notes: string
  created_at: string
}

export interface Kennel {
  id: string
  organization_id: string
  code: string
  name: string
  species_allowed: PetSpecies[]
  size: KennelSize
  daily_rate_minor: number
  currency: CurrencyCode
  operational_status: KennelOperationalStatus
  features: string
  created_at: string
}

export interface BoardingCareLog {
  id: string
  logged_at: string
  staff_name: string
  appetite: 'lahap' | 'normal' | 'kurang'
  mood: 'ceria' | 'tenang' | 'gelisah'
  note: string
}

export interface BoardingStay {
  id: string
  organization_id: string
  contract_code: string
  kennel_id: string
  customer_id: string
  pet_id: string
  check_in_date: string // YYYY-MM-DD
  check_out_date: string // YYYY-MM-DD
  nights: number
  daily_rate_minor: number
  addons_minor: number
  total_minor: number
  deposit_paid_minor: number
  total_paid_minor: number
  currency: CurrencyCode
  status: BoardingStatus
  feeding_instructions: string
  medical_notes: string
  care_logs: BoardingCareLog[]
  created_at: string
}

export interface Expense {
  id: string
  organization_id: string
  reference_code: string
  expense_date: string // YYYY-MM-DD
  category: ExpenseCategory
  vendor_name: string
  description: string
  amount_minor: number
  currency: CurrencyCode
  is_voided: boolean
  recorded_by: string
  created_at: string
}

export interface AppNotification {
  id: string
  organization_id: string
  category: 'stock' | 'expiry' | 'boarding' | 'grooming' | 'vaccine' | 'finance'
  severity: 'critical' | 'caution' | 'info'
  title: string
  description: string
  link_to: string
  created_at: string
}

export interface OverviewSummary {
  currency: CurrencyCode
  revenue_pos_minor: number
  revenue_grooming_minor: number
  revenue_boarding_minor: number
  revenue_total_minor: number
  expenses_minor: number
  operating_result_minor: number
  outstanding_minor: number
  pos_orders_count: number
  customers_total: number
  pets_total: number
  products_total: number
  low_stock_count: number
  expiring_products_count: number
  kennels_total: number
  kennels_available: number
  kennels_occupied: number
  kennels_reserved_today: number
  kennels_maintenance: number
  grooming_today_total: number
  grooming_today_active: number
  boarding_active_count: number
  boarding_checkins_today: number
  boarding_checkouts_today: number
}

export interface FinancialSeriesPoint {
  bucket_label: string
  date_key: string
  pos_minor: number
  services_minor: number
  expenses_minor: number
}
