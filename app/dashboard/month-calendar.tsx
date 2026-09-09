'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { createAppointment, deleteAppointment } from '@/app/actions/appointments'
import { MONTH_FULL_FR, DOW_LABELS_FR, daysInMonth, firstWeekdayMonday0, dateStrOf, addMonths } from '@/lib/rive/calendar'

const DOW_FULL_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

// Ex. "2026-08-24" -> "Lundi 24 août 2026" — utilisé dans le titre de la
// fenêtre d'ajout de RDV, pour que la date soit lisible sans avoir à
// comparer avec la grille du calendrier.
function formatDateFrLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const jsDay = new Date(y, m - 1, d).getDay()
  const dow = DOW_FULL_FR[(jsDay + 6) % 7]
  const label = `${dow} ${d} ${MONTH_FULL_FR[m - 1]} ${y}`
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export type AppointmentItem = {
  id: string
  leadId: string | null
  leadName: string | null
  label: string
  lieu: string
  date: string
  time: string | null
  participantNames: string[]
}
export type LeadOption = { id: string; name: string }
export type MemberOption = { id: string; name: string }

export default function MonthCalendar({
  initialYear,
  initialMonth,
  todayStr,
  appointments,
  leadOptions,
  memberOptions,
}: {
  initialYear: number
  initialMonth: number
  todayStr: string
  appointments: AppointmentItem[]
  leadOptions: LeadOption[]
  memberOptions: MemberOption[]
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
            onClick={() => setAddingDate(todayStr)}
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
            </div>
          )
        })}
      </div>

      {addingDate && (
        <AppointmentModal
          dateStr={addingDate}
          leadOptions={leadOptions}
          memberOptions={memberOptions}
          onClose={() => setAddingDate(null)}
        />
      )}
    </div>
  )
}

// Fenêtre modale (plutôt qu'un mini-formulaire coincé dans la case du jour,
// trop petite pour être confortable) pour ajouter un rendez-vous — même
// logique que l'ancien DayAppointmentForm, juste affichée en grand par-dessus
// le calendrier.
function AppointmentModal({
  dateStr,
  leadOptions,
  memberOptions,
  onClose,
}: {
  dateStr: string
  leadOptions: LeadOption[]
  memberOptions: MemberOption[]
  onClose: () => void
}) {
  const [, startTransition] = useTransition()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(dateStr)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Nouveau rendez-vous</h2>
            <p className="text-sm text-neutral-500">{formatDateFrLong(date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            ✕
          </button>
        </div>

        <form
          action={(formData: FormData) => {
            setPending(true)
            startTransition(async () => {
              const res = await createAppointment(undefined, formData)
              setPending(false)
              if (res?.error) {
                setError(res.error)
              } else {
                setError(null)
                onClose()
              }
            })
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Date</label>
            <input
              name="appointment_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Prospect (facultatif)</label>
            <LeadCombobox options={leadOptions} large />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Heure</label>
              <input
                name="appointment_time"
                type="time"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="flex flex-[2] flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Motif</label>
              <input
                name="label"
                placeholder="RDV, appel, visite…"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-500">Lieu (facultatif)</label>
            <input
              name="lieu"
              placeholder="Adresse, agence, visio…"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {memberOptions.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-500">Agents participants (facultatif)</label>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {memberOptions.map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 text-sm text-neutral-700">
                    <input type="checkbox" name="participant_ids" value={m.id} className="accent-accent" />
                    {m.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? 'Ajout…' : 'Ajouter le rendez-vous'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AppointmentChip({ appointment }: { appointment: AppointmentItem }) {
  const [, startTransition] = useTransition()
  const [removed, setRemoved] = useState(false)

  if (removed) return null

  // RDV libre (sans prospect attaché) : pas de fiche vers laquelle pointer,
  // on affiche le motif (ou "Rendez-vous" par défaut) et, si renseignés, le
  // lieu et les agents participants.
  const displayName = appointment.leadName ?? appointment.label ?? 'Rendez-vous'
  const title = [
    appointment.label || (appointment.leadName ? '' : 'Rendez-vous'),
    appointment.leadName,
    appointment.lieu,
    appointment.participantNames.length ? `avec ${appointment.participantNames.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' — ')

  const content = (
    <>
      {appointment.time ? `${appointment.time.slice(0, 5)} · ` : ''}
      {displayName}
    </>
  )

  return (
    <div className="group/item flex items-center gap-0.5 rounded bg-neutral-100 py-0.5 pl-1.5 pr-0.5 hover:bg-neutral-200">
      {appointment.leadId ? (
        <Link
          href={`/dashboard/prospects/${appointment.leadId}`}
          className="block min-w-0 flex-1 truncate text-[11px] font-medium text-neutral-700"
          title={title}
        >
          {content}
        </Link>
      ) : (
        <span
          className="block min-w-0 flex-1 truncate text-[11px] font-medium text-neutral-700"
          title={title}
        >
          {content}
        </span>
      )}
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

// Champ prospect avec recherche par nom, à la place d'une liste déroulante
// classique — celle-ci devenait pénible dès que l'agence a beaucoup de
// prospects. Le lead choisi est porté par un input caché ("lead_id"), le
// texte affiché n'est que la recherche/le nom retenu.
function LeadCombobox({ options, large }: { options: LeadOption[]; large?: boolean }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<LeadOption | null>(null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (selected) return []
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 8)
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8)
  }, [query, selected, options])

  const inputClass = large
    ? 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent'
    : 'w-full rounded border border-neutral-300 px-1 py-1 text-[11px] outline-none focus:border-accent'
  const itemClass = large
    ? 'block w-full truncate px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100'
    : 'block w-full truncate px-2 py-1 text-left text-[11px] text-neutral-700 hover:bg-neutral-100'

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
        className={inputClass}
      />
      <input type="hidden" name="lead_id" value={selected?.id ?? ''} />
      {open && filtered.length > 0 && (
        <div
          className={`absolute left-0 right-0 top-full z-10 mt-1 overflow-y-auto rounded-lg border border-neutral-200 bg-surface shadow-md ${
            large ? 'max-h-56' : 'max-h-40'
          }`}
        >
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={() => {
                setSelected(o)
                setQuery(o.name)
                setOpen(false)
              }}
              className={itemClass}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}