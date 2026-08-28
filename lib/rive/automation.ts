// Chaîne d'automatisation Vendeur/Investisseur → brouillon de mandat → mandat
// signé → commission, reprise à l'identique du prototype Rive : déplacer une
// carte de lead dans le pipeline déclenche silencieusement la création (ou
// l'activation) du mandat correspondant, et faire passer un mandat à "Vendu"
// crée automatiquement la commission.
import type { SupabaseClient } from '@supabase/supabase-js'
import { feeForPrice } from './mandates'

type LeadRow = {
  id: string
  agency_id: string
  category: string | null
  name: string
  critere_lieu: string | null
  critere_type: string | null
  surface_min: number | null
  budget: number | null
}

// Crée un mandat brouillon (invisible du tableau des mandats) pré-rempli
// depuis les critères du lead, si aucun mandat n'existe déjà pour ce lead.
export async function ensureMandateDraftForLead(supabase: SupabaseClient, lead: LeadRow) {
  const { data: existing } = await supabase.from('mandates').select('id').eq('lead_id', lead.id).limit(1)
  if (existing && existing.length > 0) return

  const type = lead.category === 'investisseur' ? 'recherche' : 'vente'

  await supabase.from('mandates').insert({
    agency_id: lead.agency_id,
    lead_id: lead.id,
    type,
    address: lead.critere_lieu || '',
    property_type: lead.critere_type || '',
    surface: lead.surface_min,
    price: lead.budget,
    is_draft: true,
  })
}

// Active le brouillon de mandat existant pour ce lead (ou en crée un directement
// si l'étape estimation a été sautée), à l'entrée dans la dernière colonne
// ("Mandat signé" / "Mandat de recherche").
export async function activateMandateForLead(supabase: SupabaseClient, lead: LeadRow) {
  const { data: existing } = await supabase
    .from('mandates')
    .select('id, is_draft, signed_date')
    .eq('lead_id', lead.id)
    .limit(1)
    .maybeSingle()

  const today = new Date().toISOString().slice(0, 10)

  if (existing) {
    if (!existing.is_draft && existing.signed_date) return
    await supabase
      .from('mandates')
      .update({ is_draft: false, signed_date: existing.signed_date || today })
      .eq('id', existing.id)
    return
  }

  const type = lead.category === 'investisseur' ? 'recherche' : 'vente'
  await supabase.from('mandates').insert({
    agency_id: lead.agency_id,
    lead_id: lead.id,
    type,
    address: lead.critere_lieu || '',
    property_type: lead.critere_type || '',
    surface: lead.surface_min,
    price: lead.budget,
    is_draft: false,
    signed_date: today,
  })
}

type MandateRow = { id: string; agency_id: string; type: string; price: number | null }

// Crée automatiquement la commission (montant selon le barème d'honoraires pour
// une vente, à saisir manuellement pour une recherche) quand un mandat passe à
// l'étape "Vendu" — une seule fois par mandat.
export async function maybeCreateCommissionForMandate(supabase: SupabaseClient, mandate: MandateRow) {
  const { data: existing } = await supabase.from('commissions').select('id').eq('mandate_id', mandate.id).limit(1)
  if (existing && existing.length > 0) return

  const amount = mandate.type === 'vente' ? Math.round(feeForPrice(mandate.price)) : null

  await supabase.from('commissions').insert({
    agency_id: mandate.agency_id,
    mandate_id: mandate.id,
    amount,
    notes: 'Créée automatiquement depuis le mandat vendu.',
  })
}
