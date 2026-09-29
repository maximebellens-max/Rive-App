'use client'

import { useMemo, useState } from 'react'
import SortHeader from '../_components/sort-header'
import { toCSV, downloadCSV } from '@/lib/rive/csv'
import type { SourceStat } from '@/lib/rive/analytics'
import { formatEUR } from '@/lib/rive/mandates'

type SortKey = 'source' | 'leads' | 'mandates' | 'conversion' | 'commissions'

export default function PerformanceTable({ stats }: { stats: SourceStat[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('leads')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [stats, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'source' ? 'asc' : 'desc')
    }
  }

  const exportCSV = () => {
    const csv = toCSV(
      ['Source', 'Leads', 'Mandats', 'Conversion (%)', 'Commissions'],
      sorted.map((s) => [s.source, s.leads, s.mandates, s.conversion, s.commissions])
    )
    downloadCSV(`performance-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={exportCSV}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        >
          ⬇ Export CSV
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="sticky left-0 z-20 whitespace-nowrap border-r border-neutral-200 bg-surface px-4 py-3">
                <SortHeader label="Source" active={sortKey === 'source'} direction={sortDir} onClick={() => toggleSort('source')} />
              </th>
              <th className="px-4 py-3">
                <SortHeader label="Leads" active={sortKey === 'leads'} direction={sortDir} onClick={() => toggleSort('leads')} />
              </th>
              <th className="px-4 py-3">
                <SortHeader label="Mandats" active={sortKey === 'mandates'} direction={sortDir} onClick={() => toggleSort('mandates')} />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Conversion"
                  active={sortKey === 'conversion'}
                  direction={sortDir}
                  onClick={() => toggleSort('conversion')}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeader
                  label="Commissions"
                  active={sortKey === 'commissions'}
                  direction={sortDir}
                  onClick={() => toggleSort('commissions')}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.source} className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="sticky left-0 z-10 whitespace-nowrap border-r border-neutral-200 bg-surface px-4 py-3 font-medium text-neutral-900 group-hover:bg-neutral-50">
                  {s.source}
                </td>
                <td className="px-4 py-3 tabular-nums text-neutral-600">{s.leads}</td>
                <td className="px-4 py-3 tabular-nums text-neutral-600">{s.mandates}</td>
                <td className="px-4 py-3 tabular-nums text-neutral-600">{s.conversion}%</td>
                <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(s.commissions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}