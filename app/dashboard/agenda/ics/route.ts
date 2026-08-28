import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function toICSDate(dateStr: string): string {
  return dateStr.replace(/-/g, '')
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, action_label, action_date, notes')
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
