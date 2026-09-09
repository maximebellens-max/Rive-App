// Notifications déclenchées à la création d'un nouveau lead, quel que soit le
// point d'entrée (formulaire "Nouveau prospect", quick-add sur une colonne de
// pipeline, création à la volée depuis "Nouveau mandat") : recherche de
// rapprochement immédiat si c'est un acheteur, alerte WhatsApp à l'équipe, et
// email. Centralisé ici pour que les différents points d'entrée restent
// alignés au lieu de diverger au fil des évolutions — avant cette
// centralisation, seul le formulaire "Nouveau prospect" envoyait ces
// notifications, ce qui faisait manquer les leads ajoutés depuis un pipeline
// ou un mandat.
import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyMatchesForLeadId } from './match-notify'
import { notifyTeamNewLeadWhatsApp } from './whatsapp-notify'
import { sendLeadAlertEmail } from './email'
import { appBaseUrl } from './meta'

export async function notifyNewLead(
  supabase: SupabaseClient,
  agencyId: string,
  lead: { id: string; name: string; category: string | null; source: string; ownerId: string | null }
) {
  await notifyMatchesForLeadId(supabase, agencyId, lead.id)
  await notifyTeamNewLeadWhatsApp(supabase, agencyId, {
    name: lead.name,
    category: lead.category,
    source: lead.source,
  })

  const [{ data: members }, { data: creator }] = await Promise.all([
    supabase.from('profiles').select('email').eq('agency_id', agencyId).not('email', 'eq', ''),
    lead.ownerId
      ? supabase.from('profiles').select('full_name').eq('id', lead.ownerId).single()
      : Promise.resolve({ data: null }),
  ])
  const recipients = (members ?? []).map((m: { email: string }) => m.email).filter(Boolean)
  await sendLeadAlertEmail({
    to: recipients,
    leadName: lead.name,
    source: lead.source,
    ownerName: creator?.full_name || null,
    category: lead.category,
    leadUrl: `${appBaseUrl()}/dashboard/prospects/${lead.id}`,
  })
}