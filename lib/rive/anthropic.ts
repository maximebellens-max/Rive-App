// Appel direct à l'API Claude (Anthropic) pour générer le texte de
// l'assistant IA depuis Rive — plus besoin de copier/coller vers un chat
// externe. Nécessite la variable d'environnement ANTHROPIC_API_KEY.
import type { SupabaseClient } from '@supabase/supabase-js'
import { recordUsage, aiUsageStatus } from './billing/usage'

const MODEL = 'claude-haiku-4-5-20251001'

// `usage`, quand fourni, comptabilise cette génération dans le compteur
// mensuel de l'agence — facultatif pour ne pas devoir toucher chaque
// appelant existant, mais tous les appelants actuels le fournissent
// désormais (voir app/actions/ai.ts).
//
// `usage.background` distingue qui a déclenché l'appel :
// - absent/false (ex. app/actions/ai.ts, le bouton "Générer") : un agent a
//   cliqué lui-même, DONC le quota du palier est vérifié avant l'appel et
//   peut le refuser une fois atteint (voir aiUsageStatus, lib/rive/billing/
//   usage.ts) ;
// - true (toutes les automatisations — voir ai-priority.ts, relance-
//   agent.ts, weekly-report.ts, daily-whatsapp/route.ts) : personne n'est
//   au clavier à attendre ce texte, l'appel n'est donc jamais bloqué —
//   chaque automatisation a de toute façon son propre texte de repli si
//   Claude ne répond pas. Compté à part (ai_background_count) pour garder
//   une visibilité sur le coût sans mélanger les deux budgets : sans cette
//   séparation, le scoring de priorité nocturne (qui peut à lui seul
//   solliciter Claude pour chaque prospect actif, chaque nuit) épuiserait
//   le quota d'un agent avant qu'il ait généré quoi que ce soit lui-même.
export async function generateWithClaude(
  prompt: string,
  usage?: { supabase: SupabaseClient; agencyId: string; background?: boolean }
): Promise<{ text?: string; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: "La clé API Claude n'est pas configurée sur ce déploiement (variable ANTHROPIC_API_KEY manquante)." }
  }

  if (usage && !usage.background) {
    const status = await aiUsageStatus(usage.supabase, usage.agencyId)
    if (!status.allowed) {
      return {
        error: `Quota IA mensuel atteint (${status.used}/${status.limit} ce mois-ci). Passez à un palier supérieur pour continuer, ou patientez le mois prochain.`,
      }
    }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { error: `Erreur de l'API Claude (${res.status}) : ${body.slice(0, 200)}` }
    }

    const data = await res.json()
    const text = data?.content?.find((b: { type: string; text?: string }) => b.type === 'text')?.text
    if (!text) return { error: "Réponse inattendue de l'API Claude." }
    if (usage) await recordUsage(usage.supabase, usage.agencyId, usage.background ? 'ai_background' : 'ai')
    return { text }
  } catch {
    return { error: "Impossible de contacter l'API Claude pour le moment." }
  }
}