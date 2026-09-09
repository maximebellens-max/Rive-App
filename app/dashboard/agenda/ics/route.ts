import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { icsDtStamp, icsEvent, type ICSAppointment } from '@/lib/rive/ics'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // Un lead peut désormais avoir plusieurs rendez-vous (table appointments) —
  // le flux exporte chacun d'entre eux, pas seulement le plus proche. Un
  // rendez-vous peut aussi n'avoir aucun prospect attaché (RDV libre).
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, label, lieu, appointment_date, appointment_time, leads(name, notes)')

  const dtstamp = icsDtStamp()
  const events = (appointments ?? [])
    .map((a) => {
      // lead_id est une relation simple (un seul prospect par RDV) : Supabase/PostgREST
      // renvoie donc `leads` comme un objet unique, pas un tableau.
      const lead = a.leads as unknown as { name: string; notes: string } | null
      const item: ICSAppointment = {
        id: a.id,
        label: a.label,
        leadName: lead?.name ?? null,
        date: a.appointment_date,
        time: a.appointment_time,
        notes: lead?.notes || '',
        lieu: a.lieu || '',
      }
      return icsEvent(item, dtstamp)
    })
    .join('\n')

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Rive//Agenda//FR
CALSCALE:GREGORIAN
${events}
END:VCALENDAR
`

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rive-agenda.ics"',
    },
  })
}