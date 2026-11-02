/**
 * Unified Data Repository (Dual-Mode: Supabase Cloud + Local Demo Mode).
 *
 * Jika `VITE_SUPABASE_URL` & `VITE_SUPABASE_PUBLISHABLE_KEY` diisi, operasi baca/tulis
 * dijalankan terhadap tabel & RPC Supabase dengan proteksi Row Level Security (RLS).
 * Jika kosong, otomatis menggunakan Local Demo Engine yang persisten di browser.
 */

import { getEnvironment } from '@/lib/config/env'
import { getSupabaseClient } from '@/lib/supabase/client'
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
  OverviewSummary,
  PaymentMethod,
  Pet,
  PetSpecies,
  PosOrder,
  Product,
  ProductCategory,
  StockMovement,
} from '@/types/domain'
import {
  localAdjustProductStock,
  localCreateBoardingStay,
  localCreateCustomer,
  localCreateExpense,
  localCreateGrooming,
  localCreateOrganization,
  localCreatePet,
  localCreatePosOrder,
  localGetCustomer,
  localGetOverview,
  localInviteMember,
  localListBoardingStays,
  localListCustomers,
  localListExpenses,
  localListGrooming,
  localListKennels,
  localListNotifications,
  localListPets,
  localListPosOrders,
  localListProducts,
  localListTeam,
  localRevokeInvitation,
  localUpdateBoardingStay,
  localUpdateGroomingStatus,
  localUpdateMemberRole,
  localUpdateOrganization,
  localUpsertKennel,
  localUpsertProduct,
  localVoidExpense,
} from './local-store'

function isSupabaseMode(): boolean {
  const env = getEnvironment()
  return env.status === 'ok' && env.mode === 'supabase'
}

export const api = {
  async getOverview(
    organizationId: string,
    daysWindow: number,
  ): Promise<{ summary: OverviewSummary; series: FinancialSeriesPoint[] }> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb.rpc('organization_overview', {
        p_organization_id: organizationId,
        p_days_window: daysWindow,
      })
      if (error) throw new Error(error.message)
      return data as { summary: OverviewSummary; series: FinancialSeriesPoint[] }
    }
    return localGetOverview(organizationId, daysWindow)
  },

  async listCustomers(organizationId: string): Promise<Customer[]> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Customer[]
    }
    return localListCustomers(organizationId)
  },

  async getCustomer(organizationId: string, customerId: string): Promise<Customer | null> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', customerId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data as Customer | null) ?? null
    }
    return localGetCustomer(organizationId, customerId)
  },

  async createCustomer(
    organizationId: string,
    input: { full_name: string; phone: string; email: string; address: string; notes: string },
  ): Promise<Customer> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const code = `PLG-${Math.floor(1000 + Math.random() * 9000)}`
      const { data, error } = await sb
        .from('customers')
        .insert({ organization_id: organizationId, code, ...input })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as Customer
    }
    return localCreateCustomer(organizationId, input)
  },

  async listPets(organizationId: string, customerId?: string): Promise<Pet[]> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      let query = sb.from('pets').select('*').eq('organization_id', organizationId)
      if (customerId) query = query.eq('customer_id', customerId)
      const { data, error } = await query.order('name', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as Pet[]
    }
    return localListPets(organizationId, customerId)
  },

  async createPet(
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
  ): Promise<Pet> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const code = `PET-${Math.floor(100 + Math.random() * 900)}`
      const { data, error } = await sb
        .from('pets')
        .insert({ organization_id: organizationId, code, ...input })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as Pet
    }
    return localCreatePet(organizationId, input)
  },

  async listProducts(organizationId: string): Promise<Product[]> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('products')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as Product[]
    }
    return localListProducts(organizationId)
  },

  async upsertProduct(
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
  ): Promise<Product> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      if (input.id) {
        const { data, error } = await sb
          .from('products')
          .update(input)
          .eq('organization_id', organizationId)
          .eq('id', input.id)
          .select('*')
          .single()
        if (error) throw new Error(error.message)
        return data as Product
      }
      const { data, error } = await sb
        .from('products')
        .insert({ organization_id: organizationId, ...input })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as Product
    }
    return localUpsertProduct(organizationId, input)
  },

  async adjustProductStock(
    organizationId: string,
    input: {
      product_id: string
      delta_qty: number
      reason: StockMovement['reason']
      note: string
      actor_name: string
    },
  ): Promise<Product> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb.rpc('adjust_product_stock', {
        p_organization_id: organizationId,
        p_product_id: input.product_id,
        p_delta_qty: input.delta_qty,
        p_reason: input.reason,
        p_note: input.note,
      })
      if (error) throw new Error(error.message)
      return data as Product
    }
    return localAdjustProductStock(organizationId, input)
  },

  async listPosOrders(organizationId: string): Promise<PosOrder[]> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('pos_orders')
        .select('*, items:pos_order_items(*)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as PosOrder[]
    }
    return localListPosOrders(organizationId)
  },

  async createPosOrder(
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
  ): Promise<PosOrder> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb.rpc('process_pos_checkout', {
        p_organization_id: organizationId,
        p_customer_id: input.customer_id,
        p_cart: input.cart,
        p_discount_minor: input.discount_minor,
        p_apply_tax: input.apply_tax,
        p_payment_method: input.payment_method,
        p_paid_minor: input.paid_minor,
        p_notes: input.notes,
      })
      if (error) throw new Error(error.message)
      return data as PosOrder
    }
    return localCreatePosOrder(organizationId, input)
  },

  async listGrooming(organizationId: string): Promise<GroomingAppointment[]> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('grooming_appointments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('scheduled_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as GroomingAppointment[]
    }
    return localListGrooming(organizationId)
  },

  async createGrooming(
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
  ): Promise<GroomingAppointment> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const booking_code = `GRM-${Math.floor(100 + Math.random() * 900)}`
      const { data, error } = await sb
        .from('grooming_appointments')
        .insert({
          organization_id: organizationId,
          booking_code,
          customer_id: input.customer_id,
          pet_id: input.pet_id,
          service_package: input.service_package,
          scheduled_at: input.scheduled_at,
          duration_minutes: input.duration_minutes,
          groomer_name: input.groomer_name,
          status: 'scheduled',
          price_minor: input.price_minor,
          paid_minor: input.paid_now ? input.price_minor : 0,
          payment_method: input.paid_now ? input.payment_method : null,
          notes: input.notes,
        })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as GroomingAppointment
    }
    return localCreateGrooming(organizationId, input)
  },

  async updateGroomingStatus(
    organizationId: string,
    appointmentId: string,
    patch: { status?: GroomingStatus; settlePaymentMethod?: PaymentMethod },
  ): Promise<GroomingAppointment> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const updatePayload: Record<string, unknown> = {}
      if (patch.status) updatePayload.status = patch.status
      if (patch.settlePaymentMethod) {
        updatePayload.payment_method = patch.settlePaymentMethod
      }
      const { data, error } = await sb
        .from('grooming_appointments')
        .update(updatePayload)
        .eq('organization_id', organizationId)
        .eq('id', appointmentId)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as GroomingAppointment
    }
    return localUpdateGroomingStatus(organizationId, appointmentId, patch)
  },

  async listKennels(organizationId: string): Promise<Kennel[]> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('kennels')
        .select('*')
        .eq('organization_id', organizationId)
        .order('code', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as Kennel[]
    }
    return localListKennels(organizationId)
  },

  async upsertKennel(
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
  ): Promise<Kennel> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const payload = { organization_id: organizationId, ...input }
      const { data, error } = input.id
        ? await sb.from('kennels').update(payload).eq('id', input.id).select('*').single()
        : await sb.from('kennels').insert(payload).select('*').single()
      if (error) throw new Error(error.message)
      return data as Kennel
    }
    return localUpsertKennel(organizationId, input)
  },

  async listBoardingStays(organizationId: string): Promise<BoardingStay[]> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('boarding_stays')
        .select('*, care_logs:boarding_logs(*)')
        .eq('organization_id', organizationId)
        .order('check_in_date', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as BoardingStay[]
    }
    return localListBoardingStays(organizationId)
  },

  async createBoardingStay(
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
  ): Promise<BoardingStay> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb.rpc('create_boarding_stay', {
        p_organization_id: organizationId,
        ...input,
      })
      if (error) throw new Error(error.message)
      return data as BoardingStay
    }
    return localCreateBoardingStay(organizationId, input)
  },

  async updateBoardingStay(
    organizationId: string,
    stayId: string,
    patch: {
      status?: BoardingStatus
      settleFullPayment?: boolean
      careLog?: Omit<BoardingCareLog, 'id' | 'logged_at'>
    },
  ): Promise<BoardingStay> {
    return localUpdateBoardingStay(organizationId, stayId, patch)
  },

  async listExpenses(organizationId: string): Promise<Expense[]> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('expenses')
        .select('*')
        .eq('organization_id', organizationId)
        .order('expense_date', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Expense[]
    }
    return localListExpenses(organizationId)
  },

  async createExpense(
    organizationId: string,
    input: {
      expense_date: string
      category: ExpenseCategory
      vendor_name: string
      description: string
      amount_minor: number
      recorded_by: string
    },
  ): Promise<Expense> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const reference_code = `EXP-${Math.floor(100 + Math.random() * 900)}`
      const { data, error } = await sb
        .from('expenses')
        .insert({ organization_id: organizationId, reference_code, ...input })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as Expense
    }
    return localCreateExpense(organizationId, input)
  },

  async voidExpense(organizationId: string, expenseId: string): Promise<Expense> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('expenses')
        .update({ is_voided: true })
        .eq('organization_id', organizationId)
        .eq('id', expenseId)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as Expense
    }
    return localVoidExpense(organizationId, expenseId)
  },

  async listTeam(organizationId: string) {
    return localListTeam(organizationId)
  },

  async inviteMember(
    organizationId: string,
    input: { email: string; role: Exclude<OrgRole, 'owner'>; actorName: string },
  ) {
    return localInviteMember(organizationId, input)
  },

  async updateMemberRole(
    organizationId: string,
    membershipId: string,
    nextRole: Exclude<OrgRole, 'owner'>,
    actorName: string,
  ) {
    localUpdateMemberRole(organizationId, membershipId, nextRole, actorName)
  },

  async revokeInvitation(organizationId: string, invitationId: string, actorName: string) {
    localRevokeInvitation(organizationId, invitationId, actorName)
  },

  async listNotifications(organizationId: string): Promise<AppNotification[]> {
    return localListNotifications(organizationId)
  },

  async createOrganization(input: {
    name: string
    city: string
    phone: string
    address: string
    default_currency: Organization['default_currency']
    time_zone: string
  }): Promise<Organization> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb.rpc('create_organization_with_owner', {
        p_name: input.name,
        p_city: input.city,
        p_phone: input.phone,
        p_address: input.address,
        p_currency: input.default_currency,
        p_time_zone: input.time_zone,
      })
      if (error) throw new Error(error.message)
      return data as Organization
    }
    return localCreateOrganization(input)
  },

  async updateOrganization(
    organizationId: string,
    patch: Partial<Organization>,
  ): Promise<Organization> {
    if (isSupabaseMode()) {
      const sb = getSupabaseClient()!
      const { data, error } = await sb
        .from('organizations')
        .update(patch)
        .eq('id', organizationId)
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return data as Organization
    }
    return localUpdateOrganization(organizationId, patch)
  },
}
