import { beforeEach, describe, expect, it } from 'vitest'
import { can, hasMinRole } from '@/lib/authz/permissions'
import { resolveEnvironmentFromVars } from '@/lib/config/env'
import {
  isKennelAvailableBetween,
  localCreatePosOrder,
  localListCustomers,
  localListProducts,
  resetLocalDemoDatabase,
} from '@/lib/data/local-store'
import { evaluateExpiryStatus, rangesOverlap } from '@/lib/datetime/dates'
import { applyBasisPoints, formatMoney, toMajorUnits, toMinorUnits } from '@/lib/money/money'
import type { BoardingStay, Kennel } from '@/types/domain'

describe('Money minor-unit arithmetic & formatting', () => {
  it('handles IDR with 0 minor digits and USD with 2 minor digits accurately', () => {
    expect(toMinorUnits(315000, 'IDR')).toBe(315_000)
    expect(toMajorUnits(315_000, 'IDR')).toBe(315000)
    expect(formatMoney(315_000, 'IDR')).toContain('315.000')

    expect(toMinorUnits('19.95', 'USD')).toBe(1995)
    expect(toMajorUnits(1995, 'USD')).toBe(19.95)
  })

  it('computes PPN basis points without floating-point drift', () => {
    // 11% PPN (1100 bps) on Rp700.000 = Rp77.000
    expect(applyBasisPoints(700_000, 1100)).toBe(77_000)
  })
})

describe('Multi-tenant Role & Permission Matrix', () => {
  it('enforces owner > admin > manager > staff hierarchy', () => {
    expect(hasMinRole('owner', 'admin')).toBe(true)
    expect(hasMinRole('staff', 'manager')).toBe(false)

    // Staff can run POS & Grooming, but cannot view executive Reports or Billing
    expect(can('staff', 'pos.checkout')).toBe(true)
    expect(can('staff', 'grooming.create')).toBe(true)
    expect(can('staff', 'reports.view')).toBe(false)
    expect(can('staff', 'billing.manage')).toBe(false)

    // Manager can manage products & view reports, but only Owner can manage SaaS billing
    expect(can('manager', 'products.create')).toBe(true)
    expect(can('manager', 'reports.view')).toBe(true)
    expect(can('manager', 'billing.manage')).toBe(false)
    expect(can('owner', 'billing.manage')).toBe(true)
  })
})

describe('Environment security guard & Dual-Engine resolution', () => {
  it('defaults to local demo mode when Supabase variables are unset', () => {
    const res = resolveEnvironmentFromVars({})
    expect(res).toEqual({ status: 'ok', mode: 'demo' })
  })

  it('blocks startup if a secret key (sb_secret_) or service_role JWT is placed in VITE_', () => {
    const secretKeyRes = resolveEnvironmentFromVars({
      VITE_SUPABASE_URL: 'https://xyz.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_leaked_key',
    })
    expect(secretKeyRes.status).toBe('security_error')

    const fakeServiceJwt = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ role: 'service_role' })),
      'sig',
    ].join('.')

    const jwtRes = resolveEnvironmentFromVars({
      VITE_SUPABASE_URL: 'https://xyz.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: fakeServiceJwt,
    })
    expect(jwtRes.status).toBe('security_error')
  })
})

describe('Pet Hotel Kennel Overlap & Vaccine Compliance Invariants', () => {
  const sampleKennel: Kennel = {
    id: 'ken-test',
    organization_id: 'org-1',
    code: 'CAT-VIP-01',
    name: 'VIP Suite',
    species_allowed: ['cat'],
    size: 'vip',
    daily_rate_minor: 150_000,
    currency: 'IDR',
    operational_status: 'active',
    features: '',
    created_at: '2026-10-01T00:00:00Z',
  }

  const existingStay: BoardingStay = {
    id: 'stay-1',
    organization_id: 'org-1',
    contract_code: 'HTL-001',
    kennel_id: 'ken-test',
    customer_id: 'c-1',
    pet_id: 'p-1',
    check_in_date: '2026-10-24',
    check_out_date: '2026-10-27',
    nights: 3,
    daily_rate_minor: 150_000,
    addons_minor: 0,
    total_minor: 450_000,
    deposit_paid_minor: 200_000,
    total_paid_minor: 200_000,
    currency: 'IDR',
    status: 'checked_in',
    feeding_instructions: '',
    medical_notes: '',
    care_logs: [],
    created_at: '2026-10-24T00:00:00Z',
  }

  it('rejects overlapping dates and allows same-day turnover [checkIn, checkOut)', () => {
    expect(rangesOverlap('2026-10-24', '2026-10-27', '2026-10-26', '2026-10-29')).toBe(true)

    const conflictCheck = isKennelAvailableBetween(
      sampleKennel,
      [existingStay],
      '2026-10-26',
      '2026-10-29',
    )
    expect(conflictCheck.available).toBe(false)

    // Check-in on the exact day the previous guest checks out (2026-10-27) is valid!
    const turnoverCheck = isKennelAvailableBetween(
      sampleKennel,
      [existingStay],
      '2026-10-27',
      '2026-10-30',
    )
    expect(turnoverCheck.available).toBe(true)
  })

  it('evaluates vaccine & product expiry status accurately', () => {
    expect(evaluateExpiryStatus('2026-10-20', '2026-10-26', 30)).toBe('expired')
    expect(evaluateExpiryStatus('2026-11-05', '2026-10-26', 30)).toBe('expiring_soon')
    expect(evaluateExpiryStatus('2027-04-01', '2026-10-26', 30)).toBe('valid')
    expect(evaluateExpiryStatus(null, '2026-10-26', 30)).toBe('unvaccinated')
  })
})

describe('Multi-tenant isolation & Atomic POS Stock Deduction', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetLocalDemoDatabase(true)
  })

  it('isolates tenant data strictly by organization_id and deducts POS stock atomically', () => {
    const kemangCustomers = localListCustomers('org-kemang-01')
    const bandungCustomers = localListCustomers('org-bandung-02')

    expect(kemangCustomers.length).toBeGreaterThan(0)
    expect(bandungCustomers.length).toBeGreaterThan(0)
    expect(kemangCustomers.every((c) => c.organization_id === 'org-kemang-01')).toBe(true)
    expect(bandungCustomers.every((c) => c.organization_id === 'org-bandung-02')).toBe(true)

    const beforeProducts = localListProducts('org-kemang-01')
    const target = beforeProducts.find((p) => p.id === 'prd-01')!
    const initialStock = target.stock_qty

    const order = localCreatePosOrder('org-kemang-01', {
      customer_id: 'cust-01',
      cart: [{ product_id: 'prd-01', qty: 2 }],
      discount_minor: 0,
      apply_tax: true,
      payment_method: 'qris',
      paid_minor: 0,
      cashier_name: 'Dimas',
      notes: 'Unit test checkout',
    })

    expect(order.items[0].qty).toBe(2)
    const afterProducts = localListProducts('org-kemang-01')
    const updatedTarget = afterProducts.find((p) => p.id === 'prd-01')!
    expect(updatedTarget.stock_qty).toBe(initialStock - 2)
  })
})
