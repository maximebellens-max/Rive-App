import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runRelanceAgent } from '@/lib/rive/relance-agent'

// Agent de relance automatique : détecte plusieurs situations qui méritent
// un rappel (prospect sans retour, anniversaire de vente/achat,
// anniversaire client, vœux de fin d'année, demande d'avis Google,
// estimation sans suite) et alerte l'agent par WhatsApp avec un brouillon
// rédigé par Claude — jamais d'envoi automatique au client (voir
// lib/rive/relance-agent.ts pour le détail et le rappel RGPD). Cron Vercel
// quotidien séparé du digest RDV/mandats (voir /api/cron/daily-whatsapp)
// pour rester lisible malgré le nombre de déclencheurs, même s'ils
// partagent la même table de dédoublonnage.
// Voir daily-whatsapp/route.ts : sans cette déclaration, Vercel peut ne
// jamais ré-exécuter la fonction au déclenchement planifié (ni la loguer).
export const dynamic = 'force-dynamic'

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
      await runRelanceAgent(supabase, agency.id, today)
    } catch (err) {
      // On logue et on continue avec les autres agences plutôt que de faire
      // échouer tout le cron pour un problème isolé à une seule agence.
      console.error(`[relance-agent] Échec pour l'agence ${agency.id} :`, err)
    }
  }

  return NextResponse.json({ ok: true })
}