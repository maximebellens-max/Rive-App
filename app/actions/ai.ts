'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateWithClaude } from '@/lib/rive/anthropic'

// Génère le texte directement depuis Rive (appel à l'API Claude) — plus de
// copier/coller vers un chat externe.
export async function generateAIText(prompt: string): Promise<{ text?: string; error?: string }> {
  return generateWithClaude(prompt)
}

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  return { supabase, agencyId: profile?.agency_id ?? null }
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
