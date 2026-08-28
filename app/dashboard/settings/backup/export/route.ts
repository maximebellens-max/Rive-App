import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BACKUP_VERSION, INSERT_ORDER, type RiveBackup } from '@/lib/rive/backup'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  const agencyId = profile?.agency_id
  if (!agencyId) return new NextResponse('Unauthorized', { status: 401 })

  const { data: agency } = await supabase.from('agencies').select('*').eq('id', agencyId).single()

  const tables: RiveBackup['tables'] = {}
  for (const table of INSERT_ORDER) {
    const { data } = await supabase.from(table).select('*').eq('agency_id', agencyId)
    tables[table] = data ?? []
  }

  const backup: RiveBackup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    agency: agency ? { ...agency } : null,
    tables,
  }

  const today = new Date().toISOString().slice(0, 10)

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="rive-sauvegarde-${today}.json"`,
    },
  })
}
