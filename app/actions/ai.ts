'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateWithClaude } from '@/lib/rive/anthropic'

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  return { supabase, agencyId: profile?.agency_id ?? null }
}

// Génère le texte directement depuis Rive (appel à l'API Claude) — plus de
// copier/coller vers un chat externe. Déclenchée par chaque bouton "Générer"
// de l'app (résumé de mandat, briefing, brouillon de relance, annonce,
// compte-rendu de visite) : avec l'assistant conversationnel
// (lib/rive/assistant-agent.ts), c'est la source la plus fréquente d'appels
// à Claude déclenchés par un agent — sans agencyId ici, ces générations
// resteraient invisibles au compteur mensuel et jamais bloquées, quel que
// soit le palier.
export async function generateAIText(prompt: string): Promise<{ text?: string; error?: string }> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return generateWithClaude(prompt)
  return generateWithClaude(prompt, { supabase, agencyId })
}

export async function saveAISummary(mandateId: string, text: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('mandates').update({ ai_summary: text }).eq('id', mandateId)
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

export async function saveAIBriefing(leadId: string, text: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('leads').update({ ai_briefing: text }).eq('id', leadId)
  revalidatePath(`/dashboard/prospects/${leadId}`)
}

export async function saveAIRelanceDraft(leadId: string, text: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('leads').update({ ai_relance_draft: text }).eq('id', leadId)
  revalidatePath(`/dashboard/prospects/${leadId}`)
}

export async function saveAIListing(mandateId: string, text: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('mandates').update({ ai_listing: text }).eq('id', mandateId)
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

export async function saveAIVisitReport(leadId: string, text: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('leads').update({ ai_visit_report: text }).eq('id', leadId)
  revalidatePath(`/dashboard/prospects/${leadId}`)
}