function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','))
  return lines.join('\r\n')
}

// Excel only picks up UTF-8 without a BOM as UTF-8 sometimes and mojibake's
// Arabic otherwise — the BOM forces it.
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const csv = '﻿' + buildCsv(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
