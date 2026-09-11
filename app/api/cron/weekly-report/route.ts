import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runWeeklyReportForAgency } from '@/lib/rive/weekly-report'

// Voir app/api/cron/daily-whatsapp/route.ts : sans cette déclaration,
// Vercel peut ne jamais ré-exécuter la fonction au déclenchement planifié
// (ni la loguer).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const { data: agencies } = await supabase.from('agencies').select('id')

  for (const agency of agencies ?? []) {
    try {
      await runWeeklyReportForAgency(supabase, agency.id, today, todayStr)
    } catch (err) {
      console.error(`[weekly-report] Échec pour l'agence ${agency.id} :`, err)
    }
  }

  return NextResponse.json({ ok: true })
}