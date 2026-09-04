'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { fetchCampaigns, subscribePageToLeadgen } from '@/lib/rive/meta'

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  return { supabase, agencyId: profile?.agency_id ?? null }
}

export async function disconnectMeta() {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  // On garde volontairement les mappings campagne → propriétaire/tableau
  // (meta_campaigns) : une reconnexion ultérieure les retrouve telles
  // quelles, pas besoin de tout reconfigurer.
  await supabase.from('meta_connections').delete().eq('agency_id', agencyId)
  revalidatePath('/dashboard/settings')
}

export type MetaSyncState = { error?: string; success?: boolean } | undefined

// Relit la liste des campagnes depuis Meta et les ajoute/actualise en base
// (nom, statut) sans jamais toucher au propriétaire ou au tableau déjà
// choisis pour une campagne existante.
export async function syncMetaCampaigns(_prevState: MetaSyncState, _formData: FormData): Promise<MetaSyncState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { data: connection } = await supabase
    .from('meta_connections')
    .select('ad_account_id, access_token, user_access_token')
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (!connection) return { error: 'Aucun compte Meta connecté.' }

  // La lecture des campagnes d'un compte publicitaire exige la permission
  // ads_read, portée par le jeton UTILISATEUR — pas par le jeton de Page
  // (access_token), qui ne sert qu'à la récupération des leads via le
  // webhook. Repli sur access_token pour les connexions faites avant ce
  // correctif, le temps que l'agence reconnecte son compte Meta.
  const campaignToken = connection.user_access_token || connection.access_token

  try {
    const campaigns = await fetchCampaigns(connection.ad_account_id, campaignToken)
    if (!campaigns.length) return { error: 'Aucune campagne trouvée sur ce compte publicitaire.' }

    const { error } = await supabase.from('meta_campaigns').upsert(
      campaigns.map((c) => ({
        agency_id: agencyId,
        campaign_id: c.id,
        campaign_name: c.name,
        // On stocke le statut RÉEL de diffusion (effective_status), pas le
        // simple statut configuré (status) — voir le commentaire sur
        // MetaCampaign dans lib/rive/meta.ts. Le mapping propriétaire/tableau
        // ne dépend jamais de cette valeur, seuls l'affichage et le tri
        // actives-en-premier l'utilisent.
        status: c.effective_status,
        created_time: c.created_time,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'agency_id,campaign_id' }
    )
    if (error) return { error: 'Campagnes récupérées mais échec de l’enregistrement.' }

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch {
    return { error: 'Impossible de récupérer les campagnes depuis Meta (jeton expiré ? reconnecte le compte).' }
  }
}

// Permet de corriger le compte publicitaire utilisé sans avoir à
// reconnecter tout le compte Meta — utile quand la personne qui s'est
// connectée a accès à plusieurs comptes publicitaires (Rive prend le
// premier par défaut à la connexion, qui n'est pas toujours le bon).
export async function selectMetaAdAccount(formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const adAccountId = String(formData.get('ad_account_id') || '')
  if (!adAccountId) return

  const { data: connection } = await supabase
    .from('meta_connections')
    .select('available_ad_accounts')
    .eq('agency_id', agencyId)
    .maybeSingle()

  const match = (connection?.available_ad_accounts as { id: string; name: string }[] | null)?.find(
    (a) => a.id === adAccountId
  )
  if (!match) return

  await supabase
    .from('meta_connections')
    .update({ ad_account_id: match.id, ad_account_name: match.name, updated_at: new Date().toISOString() })
    .eq('agency_id', agencyId)

  revalidatePath('/dashboard/settings')
}

// Permet de corriger la Page Facebook utilisée sans reconnexion complète —
// même logique que selectMetaAdAccount ci-dessus, pour le même défaut :
// Rive prend la première Page renvoyée par Meta par défaut à la connexion,
// qui n'est pas forcément la bonne si le compte en administre plusieurs.
// Contrairement au compte publicitaire, changer de Page exige aussi de
// réabonner la nouvelle Page aux événements leadgen (l'ancienne y reste
// abonnée mais ce n'est plus elle qui reçoit les leads du formulaire).
export async function selectMetaPage(formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const pageId = String(formData.get('page_id') || '')
  if (!pageId) return

  const { data: connection } = await supabase
    .from('meta_connections')
    .select('available_pages')
    .eq('agency_id', agencyId)
    .maybeSingle()

  const match = (
    connection?.available_pages as { id: string; name: string; access_token: string }[] | null
  )?.find((p) => p.id === pageId)
  if (!match) return

  try {
    await subscribePageToLeadgen(match.id, match.access_token)
  } catch {
    // On continue quand même : mieux vaut enregistrer le bon page_id (le
    // webhook pourra au moins être diagnostiqué correctement) que de rester
    // bloqué sur l'ancienne Page si l'abonnement échoue ponctuellement.
  }

  await supabase
    .from('meta_connections')
    .update({
      page_id: match.id,
      page_name: match.name,
      access_token: match.access_token,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', agencyId)

  revalidatePath('/dashboard/settings')
}

export async function updateMetaCampaignMapping(campaignRowId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const ownerId = String(formData.get('owner_id') || '') || null
  const targetCategory = String(formData.get('target_category') || '') || null

  await supabase
    .from('meta_campaigns')
    .update({ owner_id: ownerId, target_category: targetCategory, updated_at: new Date().toISOString() })
    .eq('id', campaignRowId)
    .eq('agency_id', agencyId)

  revalidatePath('/dashboard/settings')
}