import type { VaccineStatus } from '@/types/domain'

/**
 * Mengembalikan tanggal hari ini dalam format YYYY-MM-DD sesuai zona waktu toko.
 */
export function todayIsoDate(timeZone = 'Asia/Jakarta', now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days))
  return dt.toISOString().slice(0, 10)
}

export function daysBetweenIso(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)
  const startUtc = Date.UTC(sy, (sm || 1) - 1, sd || 1)
  const endUtc = Date.UTC(ey, (em || 1) - 1, ed || 1)
  return Math.round((endUtc - startUtc) / 86_400_000)
}

/**
 * Deteksi tumpang tindih rentang tanggal penitipan (half-open interval [checkIn, checkOut)).
 * Hewan yang check-out pada tanggal X mengizinkan hewan lain check-in pada tanggal X setelah sterilisasi pagi.
 */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Evaluasi status masa berlaku vaksin hewan atau tanggal kedaluwarsa produk (30 hari ambang peringatan).
 */
export function evaluateExpiryStatus(
  expiresOn: string | null | undefined,
  referenceDate: string = todayIsoDate(),
  warningDays = 30,
): VaccineStatus {
  if (!expiresOn) return 'unvaccinated'
  const diff = daysBetweenIso(referenceDate, expiresOn)
  if (diff < 0) return 'expired'
  if (diff <= warningDays) return 'expiring_soon'
  return 'valid'
}

export function formatDateId(isoDateOrTimestamp: string | null | undefined, includeTime = false): string {
  if (!isoDateOrTimestamp) return '—'
  const date = isoDateOrTimestamp.length === 10
    ? new Date(`${isoDateOrTimestamp}T00:00:00`)
    : new Date(isoDateOrTimestamp)
  if (Number.isNaN(date.getTime())) return isoDateOrTimestamp

  if (includeTime) {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatPetAge(birthDate: string | null): string {
  if (!birthDate) return 'Usia belum tercatat'
  const today = todayIsoDate()
  const totalDays = daysBetweenIso(birthDate, today)
  if (totalDays < 0) return 'Baru lahir'
  const years = Math.floor(totalDays / 365)
  const months = Math.floor((totalDays % 365) / 30)
  if (years > 0 && months > 0) return `${years} thn ${months} bln`
  if (years > 0) return `${years} tahun`
  if (months > 0) return `${months} bulan`
  return `${totalDays} hari`
}
