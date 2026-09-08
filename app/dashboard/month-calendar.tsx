'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { createAppointment, deleteAppointment } from '@/app/actions/appointments'
import { MONTH_FULL_FR, DOW_LABELS_FR, daysInMonth, firstWeekdayMonday0, dateStrOf, addMonths } from '@/lib/rive/calendar'

export type AppointmentItem = {
  id: string
  leadId: string
  leadName: string
  label: string
  date: string
  time: string | null
}
export type LeadOption = { id: string; name: string }

export default function MonthCalendar({
  initialYear,
  initialMonth,
  todayStr,
  appointments,
  leadOptions,
}: {
  initialYear: number
  initialMonth: number
  todayStr: string
  appointments: AppointmentItem[]
  leadOptions: LeadOption[]
}) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [addingDate, setAddingDate] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const map: Record<string, AppointmentItem[]> = {}
    for (const a of appointments) {
      if (!map[a.date]) map[a.date] = []
      map[a.date].push(a)
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
    }
    return map
  }, [appointments])

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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              goToday()
              setAddingDate(todayStr)
            }}
            className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
          >
            + Rendez-vous
          </button>
          <a href="/dashboard/agenda/ics" className="text-sm text-neutral-500 hover:underline">
            Exporter l’agenda (.ics) →
          </a>
        </div>
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
              className={`group/day flex min-h-24 flex-col gap-1 rounded-xl border bg-surface p-1.5 ${
                isToday ? 'border-accent ring-1 ring-accent' : 'border-neutral-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-neutral-500">{day}</span>
                <button
                  type="button"
                  onClick={() => setAddingDate(isAdding ? null : dateStr)}
                  aria-label={`Ajouter un rendez-vous le ${day} ${MONTH_FULL_FR[month]}`}
                  className="h-4 w-4 rounded text-xs font-bold leading-none text-neutral-300 opacity-0 transition hover:bg-accent hover:text-white group-hover/day:opacity-100"
                >
                  +
                </button>
              </div>

              {items.slice(0, 3).map((a) => (
                <AppointmentChip key={a.id} appointment={a} />
              ))}
              {items.length > 3 && <span className="px-1 text-[10px] text-neutral-400">+{items.length - 3}</span>}

              {isAdding && (
                <DayAppointmentForm
                  dateStr={dateStr}
                  leadOptions={leadOptions}
                  onDone={() => setAddingDate(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AppointmentChip({ appointment }: { appointment: AppointmentItem }) {
  const [, startTransition] = useTransition()
  const [removed, setRemoved] = useState(false)

  if (removed) return null

  return (
    <div className="group/item flex items-center gap-0.5 rounded bg-neutral-100 py-0.5 pl-1.5 pr-0.5 hover:bg-neutral-200">
      <Link
        href={`/dashboard/prospects/${appointment.leadId}`}
        className="block min-w-0 flex-1 truncate text-[11px] font-medium text-neutral-700"
        title={appointment.label ? `${appointment.label} — ${appointment.leadName}` : appointment.leadName}
      >
        {appointment.time ? `${appointment.time.slice(0, 5)} · ` : ''}
        {appointment.leadName}
      </Link>
      <button
        type="button"
        onClick={() => {
          setRemoved(true)
          startTransition(() => {
            deleteAppointment(appointment.id, appointment.leadId)
          })
        }}
        aria-label={`Annuler le rendez-vous avec ${appointment.leadName}`}
        className="shrink-0 rounded px-1 text-[10px] leading-none text-neutral-400 opacity-0 hover:bg-danger hover:text-white group-hover/item:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}

function DayAppointmentForm({
  dateStr,
  leadOptions,
  onDone,
}: {
  dateStr: string
  leadOptions: LeadOption[]
  onDone: () => void
}) {
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={(formData: FormData) => {
        setPending(true)
        startTransition(async () => {
          const res = await createAppointment(undefined, formData)
          setPending(false)
          if (res?.error) {
            setError(res.error)
          } else {
            setError(null)
            onDone()
          }
        })
      }}
      className="mt-1 flex flex-col gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1.5"
    >
      <input type="hidden" name="appointment_date" value={dateStr} />
      <LeadCombobox options={leadOptions} />
      <div className="flex gap-1">
        <input
          name="appointment_time"
          type="time"
          className="w-16 rounded border border-neutral-300 px-1 py-1 text-[11px] outline-none focus:border-accent"
        />
        <input
          name="label"
          placeholder="RDV, appel…"
          className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-1 text-[11px] outline-none focus:border-accent"
        />
      </div>
      {error && <span className="text-[10px] text-danger">{error}</span>}
      <div className="flex gap-1">
        <button type="submit" disabled={pending} className="flex-1 rounded bg-accent py-1 text-[11px] font-medium text-white disabled:opacity-50">
          Ajouter
        </button>
        <button type="button" onClick={onDone} className="rounded px-1.5 text-[11px] text-neutral-500">
          ✕
        </button>
      </div>
    </form>
  )
}

// Champ prospect avec recherche par nom, à la place d'une liste déroulante
// classique — celle-ci devenait pénible dès que l'agence a beaucoup de
// prospects. Le lead choisi est porté par un input caché ("lead_id"), le
// texte affiché n'est que la recherche/le nom retenu.
function LeadCombobox({ options }: { options: LeadOption[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<LeadOption | null>(null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (selected) return []
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 8)
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8)
  }, [query, selected, options])

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setSelected(null)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        placeholder="Rechercher un prospect…"
        required={!selected}
        className="w-full rounded border border-neutral-300 px-1 py-1 text-[11px] outline-none focus:border-accent"
      />
      <input type="hidden" name="lead_id" value={selected?.id ?? ''} />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-surface shadow-md">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={() => {
                setSelected(o)
                setQuery(o.name)
                setOpen(false)
              }}
              className="block w-full truncate px-2 py-1 text-left text-[11px] text-neutral-700 hover:bg-neutral-100"
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}