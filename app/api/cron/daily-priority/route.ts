import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAiPriorityForAgency } from '@/lib/rive/ai-priority'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data: agencies } = await supabase.from('agencies').select('id')

  for (const agency of agencies ?? []) {
    try {
      await runAiPriorityForAgency(supabase, agency.id, today)
    } catch (err) {
      console.error(`[ai-priority] Échec pour l'agence ${agency.id} :`, err)
    }
  }

  return NextResponse.json({ ok: true })
}