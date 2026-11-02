/**
 * Aritmetika uang berbasis integer minor-unit (tanpa floating-point drift).
 *
 * - IDR (Rupiah): exponent 0 -> 150000 merepresentasikan Rp150.000
 * - USD, SGD, MYR, EUR: exponent 2 -> 1500 merepresentasikan $15.00
 */

export const SUPPORTED_CURRENCIES = ['IDR', 'SGD', 'MYR', 'USD', 'EUR'] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export interface CurrencyMeta {
  code: CurrencyCode
  label: string
  symbol: string
  minorDigits: 0 | 2
  defaultLocale: string
}

export const CURRENCY_META: Readonly<Record<CurrencyCode, CurrencyMeta>> = {
  IDR: {
    code: 'IDR',
    label: 'Indonesian Rupiah (IDR)',
    symbol: 'Rp',
    minorDigits: 0,
    defaultLocale: 'id-ID',
  },
  SGD: {
    code: 'SGD',
    label: 'Singapore Dollar (SGD)',
    symbol: 'S$',
    minorDigits: 2,
    defaultLocale: 'en-SG',
  },
  MYR: {
    code: 'MYR',
    label: 'Malaysian Ringgit (MYR)',
    symbol: 'RM',
    minorDigits: 2,
    defaultLocale: 'ms-MY',
  },
  USD: {
    code: 'USD',
    label: 'US Dollar (USD)',
    symbol: '$',
    minorDigits: 2,
    defaultLocale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    label: 'Euro (EUR)',
    symbol: '€',
    minorDigits: 2,
    defaultLocale: 'de-DE',
  },
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
}

export function toMajorUnits(amountMinor: number, currency: CurrencyCode): number {
  const { minorDigits } = CURRENCY_META[currency]
  const factor = 10 ** minorDigits
  return amountMinor / factor
}

export function toMinorUnits(majorAmount: number | string, currency: CurrencyCode): number {
  const numeric =
    typeof majorAmount === 'number'
      ? majorAmount
      : Number(String(majorAmount).replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(numeric)) return 0
  const { minorDigits } = CURRENCY_META[currency]
  const factor = 10 ** minorDigits
  return Math.round(numeric * factor)
}

export function applyBasisPoints(amountMinor: number, bps: number): number {
  if (bps <= 0 || amountMinor <= 0) return 0
  return Math.round((amountMinor * bps) / 10_000)
}

export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode = 'IDR',
  options?: { locale?: string; compact?: boolean },
): string {
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.IDR
  const locale = options?.locale || meta.defaultLocale
  const major = toMajorUnits(amountMinor, meta.code)

  if (options?.compact && Math.abs(major) >= 1_000_000 && meta.code === 'IDR') {
    const jt = major / 1_000_000
    const formatted = jt % 1 === 0 ? jt.toFixed(0) : jt.toFixed(1).replace('.', ',')
    return `Rp${formatted} jt`
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: meta.minorDigits,
    maximumFractionDigits: meta.minorDigits,
  }).format(major)
}
