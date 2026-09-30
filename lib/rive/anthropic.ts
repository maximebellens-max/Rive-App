// Appel direct à l'API Claude (Anthropic) pour générer le texte de
// l'assistant IA depuis Rive — plus besoin de copier/coller vers un chat
// externe. Nécessite la variable d'environnement ANTHROPIC_API_KEY.
import type { SupabaseClient } from '@supabase/supabase-js'
import { recordUsage } from './billing/usage'

const MODEL = 'claude-haiku-4-5-20251001'

// `usage`, quand fourni, comptabilise cette génération dans le compteur
// mensuel de l'agence (voir lib/rive/billing/usage.ts) — facultatif pour ne
// pas devoir toucher chaque appelant existant ; branché aujourd'hui sur les
// automatisations qui tournent sans agent au clavier (relances, rapport
// hebdomadaire, priorités IA, briefing de RDV), la source de coût la plus
// difficile à maîtriser sans compteur.
export async function generateWithClaude(
  prompt: string,
  usage?: { supabase: SupabaseClient; agencyId: string }
): Promise<{ text?: string; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { error: "La clé API Claude n'est pas configurée sur ce déploiement (variable ANTHROPIC_API_KEY manquante)." }
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
    if (usage) await recordUsage(usage.supabase, usage.agencyId, 'ai')
    return { text }
  } catch {
    return { error: "Impossible de contacter l'API Claude pour le moment." }
  }
}