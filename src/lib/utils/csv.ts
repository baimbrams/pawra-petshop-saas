/**
 * Safe RFC-4180 CSV generator & browser download helper.
 */
export function buildCsv(headers: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const escapeCell = (cell: string | number | null | undefined): string => {
    if (cell === null || cell === undefined) return ''
    const raw = String(cell)
    if (/[",\r\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`
    }
    return raw
  }

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ]
  return lines.join('\r\n')
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
