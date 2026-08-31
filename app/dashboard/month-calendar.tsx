'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { setLeadAppointment } from '@/app/actions/leads'
import { MONTH_FULL_FR, DOW_LABELS_FR, daysInMonth, firstWeekdayMonday0, dateStrOf, addMonths } from '@/lib/rive/calendar'

type EventLead = { id: string; name: string; action_date: string | null }
type LeadOption = { id: string; name: string }

export default function MonthCalendar({
  initialYear,
  initialMonth,
  todayStr,
  leads,
  leadOptions,
}: {
  initialYear: number
  initialMonth: number
  todayStr: string
  leads: EventLead[]
  leadOptions: LeadOption[]
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [addingDate, setAddingDate] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const byDate = useMemo(() => {
    const map: Record<string, EventLead[]> = {}
    for (const lead of leads) {
      if (!lead.action_date) continue
      if (!map[lead.action_date]) map[lead.action_date] = []
      map[lead.action_date].push(lead)
    }
    return map
  }, [leads])

  const nav = (delta: number) => {
    const next = addMonths(year, month, delta)
    setYear(next.year)
    setMonth(next.month)
  }
  const goToday = () => {
    setYear(initialYear)
    setMonth(initialMonth)
  }

  const startWeekday = firstWeekdayMonday0(year, month)
  const total = daysInMonth(year, month)
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => nav(-1)}
            aria-label="Mois précédent"
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            onClick={() => nav(1)}
            aria-label="Mois suivant"
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            →
          </button>
          <span className="ml-1 text-sm font-semibold text-neutral-900">
            {MONTH_FULL_FR[month]} {year}
          </span>
        </div>
        <a href="/dashboard/agenda/ics" className="text-sm text-neutral-500 hover:underline">
          Exporter l’agenda (.ics) →
        </a>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DOW_LABELS_FR.map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />

          const dateStr = dateStrOf(year, month, day)
          const items = byDate[dateStr] ?? []
          const isToday = dateStr === todayStr
          const isAdding = addingDate === dateStr

          return (
            <div
              key={dateStr}
              className={`flex min-h-24 flex-col gap-1 rounded-xl border bg-surface p-1.5 ${
                isToday ? 'border-accent ring-1 ring-accent' : 'border-neutral-200'
              }`}
            >
              <div className="group flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-neutral-500">{day}</span>
                <button
                  type="button"
                  onClick={() => setAddingDate(isAdding ? null : dateStr)}
                  aria-label={`Ajouter un rendez-vous le ${day} ${MONTH_FULL_FR[month]}`}
                  className="h-4 w-4 rounded text-xs font-bold leading-none text-neutral-300 opacity-0 transition hover:bg-accent hover:text-white group-hover:opacity-100"
                >
                  +
                </button>
              </div>

              {items.slice(0, 3).map((l) => (
                <Link
                  key={l.id}
                  href={`/dashboard/prospects/${l.id}`}
                  className="block truncate rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-200"
                >
                  {l.name}
                </Link>
              ))}
              {items.length > 3 && <span className="px-1 text-[10px] text-neutral-400">+{items.length - 3}</span>}

              {isAdding && (
                <form
                  ref={formRef}
                  action={(formData: FormData) => {
                    startTransition(async () => {
                      await setLeadAppointment(formData)
                      setAddingDate(null)
                    })
                  }}
                  className="mt-1 flex flex-col gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1.5"
                >
                  <input type="hidden" name="action_date" value={dateStr} />
                  <select
                    name="lead_id"
                    required
                    autoFocus
                    className="rounded border border-neutral-300 px-1 py-1 text-[11px] outline-none focus:border-accent"
                  >
                    <option value="">— Prospect —</option>
                    {leadOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <input
                    name="action_label"
                    placeholder="RDV, appel…"
                    className="rounded border border-neutral-300 px-1 py-1 text-[11px] outline-none focus:border-accent"
                  />
                  <div className="flex gap-1">
                    <button type="submit" className="flex-1 rounded bg-accent py-1 text-[11px] font-medium text-white">
                      Ajouter
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingDate(null)}
                      className="rounded px-1.5 text-[11px] text-neutral-500"
                    >
                      ✕
                    </button>
                  </div>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
