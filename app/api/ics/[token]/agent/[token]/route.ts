// Flux ICS personnel, un par agent — contrairement à /api/ics/[token]
// (jeton d'agence, partagé par toute l'équipe), celui-ci ne montre que LES
// rendez-vous de l'agent concerné : ceux qu'il a créés, plus ceux où il est
// explicitement coché comme participant (voir app/dashboard/month-calendar.tsx).
// Comme l'autre flux, protégé par un jeton opaque dans l'URL
// (profiles.ics_token) et lu via createAdminClient() car il n'y a pas de
// session pour un client de calendrier externe.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { icsDtStamp, icsEvent, toCRLF, type ICSAppointment } from '@/lib/rive/ics'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, agency_id, full_name')
    .eq('ics_token', token)
    .maybeSingle()
  if (!profile) return new NextResponse('Not found', { status: 404 })

  // "Mes" rendez-vous : ceux que j'ai créés, plus ceux où je suis coché comme
  // agent participant — un RDV partagé entre plusieurs agents apparaît donc
  // sur le calendrier de chacun, pas seulement sur celui de son créateur.
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, label, lieu, appointment_date, appointment_time, leads(name, notes)')
    .eq('agency_id', profile.agency_id)
    .or(`created_by.eq.${profile.id},participant_ids.cs.{${profile.id}}`)

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
METHOD:PUBLISH
X-WR-CALNAME:Rive — ${profile.full_name || 'Agenda'}
REFRESH-INTERVAL;VALUE=DURATION:PT4H
${events}
END:VCALENDAR
`
  // Pas de Content-Disposition: attachment ici — un flux abonné doit être lu
  // directement par le client de calendrier, pas proposé en téléchargement.
  return new NextResponse(toCRLF(ics), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=1800',
    },
  })
}