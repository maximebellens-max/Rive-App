// Branche le moteur de rapprochement (lib/rive/matching.ts) sur les
// notifications. Appelé depuis les Server Actions après la création ou la
// modification d'un lead ou d'un mandat : cherche les nouveaux
// rapprochements et prévient toute l'agence (cloche + email), une seule fois
// par paire (notified_match_pairs), groupé par événement déclencheur (un
// seul message même si plusieurs biens/acheteurs correspondent à la fois)
// pour ne pas spammer.
import type { SupabaseClient } from '@supabase/supabase-js'
import { bienIsActive, leadMatchesBien, type MatchLead, type MatchMandate } from './matching'
import { sendMatchAlertEmail } from './email'

const LEAD_FIELDS = 'id, name, category, budget, critere_type, critere_lieu, surface_min, pieces_min'
const MANDATE_FIELDS = 'id, type, stage, is_draft, signed_date, address, property_type, price, surface, pieces'

type LeadRow = MatchLead & { name: string }

async function agencyMemberEmails(supabase: SupabaseClient, agencyId: string): Promise<string[]> {
  const { data } = await supabase.from('profiles').select('email').eq('agency_id', agencyId)
  return (data ?? []).map((p: { email: string | null }) => p.email).filter((e): e is string => !!e)
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// Appelée après la création/modification d'un lead : si c'est un acheteur,
// cherche les biens actifs qui lui correspondent désormais et notifie
// l'agence pour ceux qui n'ont encore jamais été notifiés pour ce lead.
export async function notifyMatchesForLeadId(supabase: SupabaseClient, agencyId: string, leadId: string) {
  const { data: lead } = await supabase.from('leads').select(LEAD_FIELDS).eq('id', leadId).single()
  if (!lead || (lead as LeadRow).category !== 'acheteur') return

  const { data: mandates } = await supabase.from('mandates').select(MANDATE_FIELDS).eq('agency_id', agencyId)
  const activeBiens = ((mandates ?? []) as MatchMandate[]).filter(bienIsActive)
  const matching = activeBiens.filter((bien) => leadMatchesBien(lead as LeadRow, bien))
  if (!matching.length) return

  const rows = matching.map((b) => ({ agency_id: agencyId, lead_id: leadId, mandate_id: b.id }))
  const { data: newRows } = await supabase
    .from('notified_match_pairs')
    .upsert(rows, { onConflict: 'lead_id,mandate_id', ignoreDuplicates: true })
    .select('mandate_id')
  if (!newRows || !newRows.length) return

  const newMandateIds = new Set(newRows.map((r: { mandate_id: string }) => r.mandate_id))
  const newBiens = matching.filter((b) => newMandateIds.has(b.id))
  const count = newBiens.length
  const leadName = (lead as LeadRow).name
  const title = count === 1 ? `1 bien correspond à ${leadName}` : `${count} biens correspondent à ${leadName}`
  const body = newBiens.map((b) => b.address || 'Adresse non renseignée').join(' · ')

  await supabase.from('notifications').insert({
    agency_id: agencyId,
    type: 'match',
    title,
    body,
    lead_id: leadId,
  })

  const emails = await agencyMemberEmails(supabase, agencyId)
  await sendMatchAlertEmail({
    to: emails,
    title,
    body,
    url: `${appUrl()}/dashboard/prospects/${leadId}`,
  })
}

// Appelée après la création/modification d'un mandat : si le bien est
// effectivement actif, cherche les acheteurs qui lui correspondent désormais
// et notifie l'agence pour les paires jamais notifiées.
export async function notifyMatchesForMandateId(supabase: SupabaseClient, agencyId: string, mandateId: string) {
  const { data: mandate } = await supabase.from('mandates').select(MANDATE_FIELDS).eq('id', mandateId).single()
  if (!mandate || !bienIsActive(mandate as MatchMandate)) return

  const { data: leads } = await supabase
    .from('leads')
    .select(LEAD_FIELDS)
    .eq('agency_id', agencyId)
    .eq('category', 'acheteur')
  const matching = ((leads ?? []) as LeadRow[]).filter((lead) => leadMatchesBien(lead, mandate as MatchMandate))
  if (!matching.length) return

  const rows = matching.map((l) => ({ agency_id: agencyId, lead_id: l.id, mandate_id: mandateId }))
  const { data: newRows } = await supabase
    .from('notified_match_pairs')
    .upsert(rows, { onConflict: 'lead_id,mandate_id', ignoreDuplicates: true })
    .select('lead_id')
  if (!newRows || !newRows.length) return

  const newLeadIds = new Set(newRows.map((r: { lead_id: string }) => r.lead_id))
  const newLeads = matching.filter((l) => newLeadIds.has(l.id))
  const count = newLeads.length
  const address = (mandate as MatchMandate).address || 'ce bien'
  const title = count === 1 ? `1 acheteur correspond à ${address}` : `${count} acheteurs correspondent à ${address}`
  const body = newLeads.map((l) => l.name).join(' · ')

  await supabase.from('notifications').insert({
    agency_id: agencyId,
    type: 'match',
    title,
    body,
    mandate_id: mandateId,
  })

  const emails = await agencyMemberEmails(supabase, agencyId)
  await sendMatchAlertEmail({
    to: emails,
    title,
    body,
    url: `${appUrl()}/dashboard/mandates/${mandateId}`,
  })
}