'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  return { supabase, agencyId: profile?.agency_id ?? null }
}

// Marque des rapprochements acheteur↔bien comme vus, pour qu'ils disparaissent
// du widget "Nouveaux rapprochements" de la vue Aujourd'hui.
export async function markMatchesSeen(pairs: { leadId: string; mandateId: string }[]) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId || !pairs.length) return

  const rows = pairs.map((p) => ({ agency_id: agencyId, lead_id: p.leadId, mandate_id: p.mandateId }))
  await supabase.from('seen_match_pairs').upsert(rows, { onConflict: 'lead_id,mandate_id', ignoreDuplicates: true })
  revalidatePath('/dashboard')
}
