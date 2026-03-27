export type ParsedReportCsv = {
  headers: string[]
  rows: string[][]
}

function isRecordTerminator(ch: string) {
  return ch === '\n' || ch === '\r'
}

export function parseCsv(input: string): ParsedReportCsv {
  const headers: string[] = []
  const rows: string[][] = []

  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]

    if (inQuotes) {
      if (ch === '"') {
        const next = input[i + 1]
        if (next === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }

    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }

    if (isRecordTerminator(ch)) {
      row.push(field)
      field = ''

      if (ch === '\r' && input[i + 1] === '\n') {
        i += 1
      }

      if (headers.length === 0) {
        headers.push(...row)
      } else {
        rows.push(row)
      }
      row = []
      continue
    }

    field += ch
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (headers.length === 0) {
      headers.push(...row)
    } else {
      rows.push(row)
    }
  }

  return { headers, rows }
}

export function normalizeTable(parsed: ParsedReportCsv) {
  const colCount = parsed.headers.length
  const rows = parsed.rows.map((r) => {
    if (r.length === colCount) return r
    const out = Array.from({ length: colCount }, (_, idx) => r[idx] ?? '')
    return out
  })
  return { headers: parsed.headers, rows }
}

export function isProbablyNumber(value: string) {
  const v = value.trim()
  if (!v) return false
  return /^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(v) || /^-?\d+(\.\d+)?$/.test(v)
}

