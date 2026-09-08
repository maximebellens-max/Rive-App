// Flux ICS public, abonnable depuis un calendrier externe (iPhone, Google
// Agenda, etc.) — contrairement à /dashboard/agenda/ics (protégé par la
// session Supabase, utile pour un export ponctuel en étant connecté), cette
// route n'exige aucune session : elle est protégée par un jeton opaque dans
// l'URL (agencies.ics_token), le seul mécanisme qu'un client de calendrier
// externe peut porter (pas d'en-tête personnalisé possible). Le jeton est
// régénérable à tout moment depuis Réglages si le lien fuite.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function toICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, '')
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: agency } = await supabase.from('agencies').select('id').eq('ics_token', token).maybeSingle()
  if (!agency) return new NextResponse('Not found', { status: 404 })

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, action_label, action_date, notes')
    .eq('agency_id', agency.id)
    .not('action_date', 'is', null)

  const now = new Date()
  const dtstamp =
    `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}` +
    `T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`

  const events = (leads ?? [])
    .map(
      (l) => `BEGIN:VEVENT
UID:${l.id}-action@rive.hevrest
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${toICSDate(l.action_date as string)}
SUMMARY:${escapeICS(`${l.action_label || 'Action'} — ${l.name}`)}
DESCRIPTION:${escapeICS(l.notes || '')}
END:VEVENT`
    )
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