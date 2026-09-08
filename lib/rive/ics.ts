// Formatage des rendez-vous en événements ICS — partagé entre le flux public
// abonnable (app/api/ics/[token]/route.ts) et le téléchargement ponctuel
// depuis le tableau de bord (app/dashboard/agenda/ics/route.ts), pour éviter
// que les deux dérivent l'un de l'autre.
export type ICSAppointment = {
  id: string
  label: string
  leadName: string
  date: string
  time: string | null
  notes?: string
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function icsDtStamp(): string {
  const now = new Date()
  return (
    `${now.getUTCFullYear()}${pad2(now.getUTCMonth() + 1)}${pad2(now.getUTCDate())}` +
    `T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`
  )
}

// Un rendez-vous sans heure reste un événement "journée entière", un
// rendez-vous avec heure devient un créneau d'une heure — Rive ne connaît
// pas la durée réelle, seulement l'heure de début. Heure locale "flottante"
// (sans TZID) : la plupart des clients de calendrier l'interprètent dans le
// fuseau de l'appareil, ce qui convient pour une agence mono-fuseau.
export function icsEvent(a: ICSAppointment, dtstamp: string): string {
  const dateCompact = a.date.replace(/-/g, '')
  const summary = escapeICS(`${a.label || 'Rendez-vous'} — ${a.leadName}`)
  const description = a.notes ? `\nDESCRIPTION:${escapeICS(a.notes)}` : ''

  if (a.time) {
    const [h, m] = a.time.split(':').map(Number)
    const start = `${pad2(h)}${pad2(m)}00`
    const end = `${pad2((h + 1) % 24)}${pad2(m)}00`
    return `BEGIN:VEVENT
UID:${a.id}@rive.hevrest
DTSTAMP:${dtstamp}
DTSTART:${dateCompact}T${start}
DTEND:${dateCompact}T${end}
SUMMARY:${summary}${description}
END:VEVENT`
  }

  return `BEGIN:VEVENT
UID:${a.id}@rive.hevrest
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${dateCompact}
SUMMARY:${summary}${description}
END:VEVENT`
}