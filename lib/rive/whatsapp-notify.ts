// Alertes WhatsApp internes, branchées sur les mêmes déclencheurs que la
// cloche de notifications et les emails : nouveau lead (événementiel),
// rendez-vous du jour, mandat proche de son échéance de préavis, relances
// automatiques et rapprochements acheteur/bien. Réservé à l'équipe pour
// l'instant — les relances automatiques aux clients demandent un mécanisme
// de consentement RGPD séparé, pas encore construit.
//
// La plupart des alertes concernent UN prospect ou UN mandat précis : elles
// partent donc à l'agent assigné (s'il a activé les alertes WhatsApp et
// configuré son numéro dans Réglages), pas à toute l'équipe — avant ce
// changement, tout le monde recevait les alertes de tout le monde. Tant
// qu'aucun agent n'est assigné (prospect/mandat encore "en vrac"), l'alerte
// part à toute l'équipe opted-in, pour que quelqu'un puisse le prendre en
// charge. Exception volontaire : l'alerte "nouveau prospect" reste envoyée à
// toute l'équipe, assigné ou pas — toute l'équipe doit être mise au courant
// dès qu'un prospect arrive, voir notifyNewLeadWhatsApp. Les synthèses qui ne
// portent pas sur un prospect/mandat précis (rapport hebdomadaire, vœux de
// fin d'année) restent elles aussi envoyées à toute l'équipe — voir
// notifyTeamAlertWhatsApp.
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendWhatsAppTemplate } from './whatsapp'
import { CATEGORY_LABEL } from './pipelines'

type TeamRecipient = { to: string; senderPhoneNumberId?: string }

// Chaque agent reçoit ses alertes envoyées depuis SON PROPRE numéro
// professionnel s'il en a configuré un dans Réglages (whatsapp_sender_phone_
// number_id) — sinon l'envoi retombe sur le numéro partagé de l'agence (voir
// lib/rive/whatsapp.ts). Les deux cas coexistent tant que tout le monde n'a
// pas configuré son propre numéro.
async function optedInTeamRecipients(supabase: SupabaseClient, agencyId: string): Promise<TeamRecipient[]> {
  const { data } = await supabase
    .from('profiles')
    .select('whatsapp_number, whatsapp_sender_phone_number_id')
    .eq('agency_id', agencyId)
    .eq('whatsapp_alerts_enabled', true)
  return (data ?? [])
    .filter((p: { whatsapp_number: string }) => !!p.whatsapp_number)
    .map((p: { whatsapp_number: string; whatsapp_sender_phone_number_id: string }) => ({
      to: p.whatsapp_number,
      senderPhoneNumberId: p.whatsapp_sender_phone_number_id || undefined,
    }))
}

// Un seul agent — celui assigné au prospect/mandat concerné — s'il a bien
// activé les alertes WhatsApp et renseigné son numéro. Renvoie une liste
// vide (pas de repli sur toute l'équipe) si l'agent assigné n'a pas activé
// les alertes : il a fait ce choix pour lui-même, comme n'importe quel
// agent non opted-in aujourd'hui.
async function optedInAgentRecipient(
  supabase: SupabaseClient,
  agencyId: string,
  agentId: string
): Promise<TeamRecipient | null> {
  const { data } = await supabase
    .from('profiles')
    .select('whatsapp_number, whatsapp_sender_phone_number_id')
    .eq('id', agentId)
    .eq('agency_id', agencyId)
    .eq('whatsapp_alerts_enabled', true)
    .maybeSingle()
  if (!data?.whatsapp_number) return null
  return { to: data.whatsapp_number, senderPhoneNumberId: data.whatsapp_sender_phone_number_id || undefined }
}

// Agent assigné si renseigné, sinon toute l'équipe opted-in (prospect/mandat
// pas encore pris en charge par un agent précis).
async function recipientsForAssignee(
  supabase: SupabaseClient,
  agencyId: string,
  assignedTo: string | null
): Promise<TeamRecipient[]> {
  if (!assignedTo) return optedInTeamRecipients(supabase, agencyId)
  const recipient = await optedInAgentRecipient(supabase, agencyId, assignedTo)
  return recipient ? [recipient] : []
}

async function sendToRecipients(recipients: TeamRecipient[], templateName: string, params: string[]) {
  if (!recipients.length) return
  await Promise.all(
    recipients.map(({ to, senderPhoneNumberId }) =>
      sendWhatsAppTemplate({ to, templateName, params, phoneNumberId: senderPhoneNumberId })
    )
  )
}

async function broadcastToTeam(supabase: SupabaseClient, agencyId: string, templateName: string, params: string[]) {
  await sendToRecipients(await optedInTeamRecipients(supabase, agencyId), templateName, params)
}

// Appelée après la création d'un lead, qu'il vienne d'un formulaire Meta ou
// d'une saisie manuelle dans Rive. Modèle Meta : "rive_nouveau_lead".
// Toujours envoyée à toute l'équipe opted-in, même si le lead a déjà un
// agent assigné (ex. campagne Meta avec propriétaire configuré) — contraire
// aux autres alertes, volontairement : toute l'équipe doit savoir dès
// qu'un nouveau prospect arrive.
export async function notifyNewLeadWhatsApp(
  supabase: SupabaseClient,
  agencyId: string,
  lead: { name: string; category: string | null; source: string }
) {
  const categoryLabel = (lead.category && CATEGORY_LABEL[lead.category]) || 'Non classé'
  await broadcastToTeam(supabase, agencyId, 'rive_nouveau_lead', [lead.name, categoryLabel, lead.source || 'Rive'])
}

// Appelée une fois par jour, une fois par rendez-vous prévu aujourd'hui.
// Modèle Meta : "rive_rendezvous_jour".
export async function notifyAppointmentWhatsApp(
  supabase: SupabaseClient,
  agencyId: string,
  assignedTo: string | null,
  appointment: { leadName: string; actionLabel: string }
) {
  const recipients = await recipientsForAssignee(supabase, agencyId, assignedTo)
  await sendToRecipients(recipients, 'rive_rendezvous_jour', [
    appointment.leadName,
    appointment.actionLabel || 'Rendez-vous',
  ])
}

// Appelée une fois par jour, une fois par mandat entrant dans sa fenêtre de
// préavis de renouvellement. Modèle Meta : "rive_mandat_echeance".
export async function notifyMandateRenewalWhatsApp(
  supabase: SupabaseClient,
  agencyId: string,
  assignedTo: string | null,
  mandate: { address: string; noticeDate: string }
) {
  const recipients = await recipientsForAssignee(supabase, agencyId, assignedTo)
  await sendToRecipients(recipients, 'rive_mandat_echeance', [mandate.address || 'ce bien', mandate.noticeDate])
}

// Alerte générique — rapprochement acheteur/bien, relance, brief du jour, et
// tout futur type d'alerte concernant UN prospect/mandat précis — via un
// unique gabarit à deux variables (titre + contenu rédigé) plutôt qu'un
// gabarit dédié par cas d'usage, pour ne jamais avoir à refaire approuver un
// nouveau gabarit à chaque nouvelle alerte. Modèle Meta : "rive_alerte".
export async function notifyAlertWhatsApp(
  supabase: SupabaseClient,
  agencyId: string,
  assignedTo: string | null,
  title: string,
  body: string
) {
  const recipients = await recipientsForAssignee(supabase, agencyId, assignedTo)
  await sendToRecipients(recipients, 'rive_alerte', [title, body])
}

// Version toujours envoyée à toute l'équipe opted-in — réservée aux
// synthèses qui ne portent pas sur un prospect/mandat précis (rapport
// hebdomadaire, vœux de fin d'année). Modèle Meta : "rive_alerte".
export async function notifyTeamAlertWhatsApp(
  supabase: SupabaseClient,
  agencyId: string,
  title: string,
  body: string
) {
  await broadcastToTeam(supabase, agencyId, 'rive_alerte', [title, body])
}