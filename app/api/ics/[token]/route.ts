// Flux ICS public, abonnable depuis un calendrier externe (iPhone, Google
// Agenda, etc.) — contrairement à /dashboard/agenda/ics (protégé par la
// session Supabase, utile pour un export ponctuel en étant connecté), cette
// route n'exige aucune session : elle est protégée par un jeton opaque dans
// l'URL (agencies.ics_token), le seul mécanisme qu'un client de calendrier
// externe peut porter (pas d'en-tête personnalisé possible). Le jeton est
// régénérable à tout moment depuis Réglages si le lien fuite.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { icsDtStamp, icsEvent, type ICSAppointment } from '@/lib/rive/ics'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: agency } = await supabase.from('agencies').select('id').eq('ics_token', token).maybeSingle()
  if (!agency) return new NextResponse('Not found', { status: 404 })

  // Un lead peut désormais avoir plusieurs rendez-vous (table appointments) —
  // le flux exporte chacun d'entre eux, pas seulement le plus proche.
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, label, appointment_date, appointment_time, leads(name, notes)')
    .eq('agency_id', agency.id)

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
METHOD:PUBLISH
X-WR-CALNAME:Rive — Agenda
REFRESH-INTERVAL;VALUE=DURATION:PT4H
${events}
END:VCALENDAR
`
  // Pas de Content-Disposition: attachment ici — un flux abonné doit être lu
  // directement par le client de calendrier, pas proposé en téléchargement.
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  })
}