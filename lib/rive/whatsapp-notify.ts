// Alertes internes équipe par WhatsApp, branchées sur les mêmes
// déclencheurs que la cloche de notifications et les emails : nouveau lead
// (événementiel), rendez-vous du jour et mandat proche de son échéance de
// préavis (ces deux derniers via le digest quotidien, voir
// app/api/cron/daily-whatsapp/route.ts). Réservé à l'équipe pour l'instant —
// les relances automatiques aux clients demandent un mécanisme de
// consentement RGPD séparé, pas encore construit.
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppTemplate } from './whatsapp'

async function optedInTeamNumbers(supabase: SupabaseClient, agencyId: string): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('whatsapp_number')
    .eq('agency_id', agencyId)
    .eq('whatsapp_alerts_enabled', true)
  return (data ?? []).map((p: { whatsapp_number: string }) => p.whatsapp_number).filter((n): n is string => !!n)
}

async function broadcastToTeam(supabase: SupabaseClient, agencyId: string, templateName: string, params: string[]) {
  const numbers = await optedInTeamNumbers(supabase, agencyId)
  if (!numbers.length) return
  await Promise.all(numbers.map((to) => sendWhatsAppTemplate({ to, templateName, params })))
}

const CATEGORY_LABELS: Record<string, string> = {
  acheteur: 'Acheteur',
  vendeur: 'Vendeur',
  investisseur: 'Investisseur',
}

// Appelée après la création d'un lead, qu'il vienne d'un formulaire Meta ou
// d'une saisie manuelle dans Rive. Modèle Meta : "rive_nouveau_lead".
export async function notifyTeamNewLeadWhatsApp(
  supabase: SupabaseClient,
  agencyId: string,
  lead: { name: string; category: string | null; source: string }
) {
  const categoryLabel = (lead.category && CATEGORY_LABELS[lead.category]) || 'Non classé'
  await broadcastToTeam(supabase, agencyId, 'rive_nouveau_lead', [lead.name, categoryLabel, lead.source || 'Rive'])
}

// Appelée une fois par jour, une fois par rendez-vous prévu aujourd'hui.
// Modèle Meta : "rive_rendezvous_jour".
export async function notifyTeamAppointmentWhatsApp(
  supabase: SupabaseClient,
  agencyId: string,
  appointment: { leadName: string; actionLabel: string }
) {
  await broadcastToTeam(supabase, agencyId, 'rive_rendezvous_jour', [
    appointment.leadName,
    appointment.actionLabel || 'Rendez-vous',
  ])
}

// Appelée une fois par jour, une fois par mandat entrant dans sa fenêtre de
// préavis de renouvellement. Modèle Meta : "rive_mandat_echeance".
export async function notifyTeamMandateRenewalWhatsApp(
  supabase: SupabaseClient,
  agencyId: string,
  mandate: { address: string; noticeDate: string }
) {
  await broadcastToTeam(supabase, agencyId, 'rive_mandat_echeance', [
    mandate.address || 'ce bien',
    mandate.noticeDate,
  ])
}