import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Table as TableIcon } from 'lucide-react'
import { isProbablyNumber } from '@/components/admin/reports/reportCsv'

type ReportPreviewTableProps = {
  title: string
  subtitle?: string
  headers: string[]
  rows: string[][]
  isTruncated?: boolean
}

export function ReportPreviewTable({ title, subtitle, headers, rows, isTruncated }: ReportPreviewTableProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.some((c) => (c || '').toLowerCase().includes(q)))
  }, [rows, query])

  const numericColumns = useMemo(() => {
    const result = new Set<number>()
    headers.forEach((_, colIdx) => {
      let numericCount = 0
      let checked = 0
      for (let i = 0; i < Math.min(20, filteredRows.length); i++) {
        const v = filteredRows[i]?.[colIdx]
        if (v == null) continue
        const t = String(v).trim()
        if (!t) continue
        checked += 1
        if (isProbablyNumber(t)) numericCount += 1
      }
      if (checked > 0 && numericCount / checked >= 0.8) result.add(colIdx)
    })
    return result
  }, [headers, filteredRows])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <TableIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-white truncate">{title}</div>
              {subtitle ? <div className="text-[11px] text-slate-400 truncate">{subtitle}</div> : null}
            </div>
          </div>
          {isTruncated ? (
            <div className="mt-2 text-[10px] text-slate-500">
              {String(
                t('reports.preview_truncated', {
                  defaultValue: 'Showing the first rows only. Download the full report for complete data.',
                } as any)
              )}
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={String(t('reports.search_placeholder', { defaultValue: 'Search in report…' } as any))}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/25"
            />
          </div>
        </div>
      </div>

      <div className="overflow-auto no-scrollbar max-h-[46vh]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/[0.03]">
            <tr>
              {headers.map((h, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap ${numericColumns.has(idx) ? 'text-right' : ''}`}
                >
                  {h || String(t('reports.column_fallback', { index: idx + 1, defaultValue: 'Column {{index}}' } as any))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {String(t('reports.no_rows_match', { defaultValue: 'No rows match your search.' } as any))}
                </td>
              </tr>
            ) : (
              filteredRows.map((r, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`hover:bg-white/[0.03] transition-colors ${rowIdx % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
                >
                  {headers.map((_, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-4 py-3 text-sm text-slate-200 whitespace-nowrap ${numericColumns.has(colIdx) ? 'text-right tabular-nums' : ''}`}
                    >
                      {r[colIdx] ?? ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
