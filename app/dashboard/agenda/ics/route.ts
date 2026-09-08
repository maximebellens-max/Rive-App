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
  // le flux exporte chacun d'entre eux, pas seulement le plus proche.
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, label, appointment_date, appointment_time, leads(name, notes)')

  const dtstamp = icsDtStamp()
  const events = (appointments ?? [])
    .map((a) => {
      const lead = (a.leads as { name: string; notes: string }[] | null)?.[0]
      const item: ICSAppointment = {
        id: a.id,
        label: a.label,
        leadName: lead?.name ?? 'Prospect',
        date: a.appointment_date,
        time: a.appointment_time,
        notes: lead?.notes || '',
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