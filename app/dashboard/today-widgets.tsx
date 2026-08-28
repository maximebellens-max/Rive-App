'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { markMatchesSeen } from '@/app/actions/matching'

export type WidgetItem = { id: string; primary: string; secondary?: string; href: string }
export type Widget = { key: string; icon: string; label: string; items: WidgetItem[] }

export default function TodayWidgets({
  widgets,
  matchPairs,
}: {
  widgets: Widget[]
  matchPairs: { leadId: string; mandateId: string }[]
}) {
  const firstNonEmpty = widgets.findIndex((w) => w.items.length > 0)
  const [active, setActive] = useState(firstNonEmpty >= 0 ? firstNonEmpty : 0)
  const [, startTransition] = useTransition()
  const markedRef = useRef(false)

  useEffect(() => {
    if (widgets[active]?.key === 'matches' && !markedRef.current && matchPairs.length) {
      markedRef.current = true
      startTransition(() => {
        markMatchesSeen(matchPairs)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const current = widgets[active]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {widgets.map((w, i) => (
          <button
            key={w.key}
            type="button"
            onClick={() => setActive(i)}
            className={`flex flex-col gap-1 rounded-2xl border p-3 text-left transition ${
              i === active ? 'border-neutral-900 bg-white shadow-sm' : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <span className="text-lg">{w.icon}</span>
            <span className="text-xl font-semibold tabular-nums">{w.items.length}</span>
            <span className="text-xs text-neutral-500">{w.label}</span>
            <span className="truncate text-xs text-neutral-400">
              {w.items.length ? w.items[0].primary : 'À jour ✓'}
            </span>
          </button>
        ))}
      </div>

      {current && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">
            {current.icon} {current.label}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {!current.items.length && <p className="text-sm text-neutral-400">Rien à signaler ici — à jour ✓</p>}
            {current.items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">{item.primary}</span>
                {item.secondary && <span className="text-neutral-500">{item.secondary}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
