import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initialPositions } from '@/lib/rive/pipeline-positions'
import { sendLeadAlertEmail } from '@/lib/rive/email'
import { notifyTeamNewLeadWhatsApp } from '@/lib/rive/whatsapp-notify'
import { appBaseUrl, fetchLeadData, mapLeadFields, parseWebhookLeadgenChanges, verifyWebhookSignature } from '@/lib/rive/meta'

// Étape de validation initiale de l'abonnement webhook (une seule fois, au
// moment où l'URL est configurée côté Meta) : Meta appelle cette route en
// GET avec un jeton à renvoyer tel quel pour prouver qu'on contrôle ce
// serveur.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// Reçoit un événement "un lead vient de remplir un formulaire" en temps
// réel. Toujours répondre vite et avec un 200 (même si un lead individuel
// échoue) : Meta réessaie sinon indéfiniment, avec un risque de doublons.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse('Invalid signature', { status: 403 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new NextResponse('Invalid payload', { status: 400 })
  }

  const changes = parseWebhookLeadgenChanges(body)
  if (!changes.length) return NextResponse.json({ received: true })

  const supabase = createAdminClient()

  for (const change of changes) {
    try {
      await processLeadgenChange(supabase, change.pageId, change.leadgenId)
    } catch (err) {
      // On logue et on continue avec les autres leads du même appel plutôt
      // que de faire échouer tout le webhook pour un seul lead problématique.
      console.error(`[meta] Échec du traitement du lead ${change.leadgenId} :`, err)
    }
  }

  return NextResponse.json({ received: true })
}

async function processLeadgenChange(
  supabase: ReturnType<typeof createAdminClient>,
  pageId: string,
  leadgenId: string
) {
  const { data: connection, error: connectionError } = await supabase
    .from('meta_connections')
    .select('agency_id, access_token')
    .eq('page_id', pageId)
    .maybeSingle()

  if (!connection) {
    // Diagnostic temporaire : le code ignorait silencieusement toute erreur
    // renvoyée par Supabase ici (seul le cas "0 résultat" était géré), donc
    // une vraie erreur technique (ex. clé de service invalide, RLS mal
    // contournée) aurait été indiscernable d'un simple page_id qui ne
    // correspond à aucune ligne. On logue aussi la valeur reçue caractère
    // par caractère pour écarter un caractère invisible dans le payload de
    // Meta que l'affichage des logs ne montrerait pas.
    console.warn(`[meta] Aucune agence connectée pour la Page ${pageId} — événement ignoré.`)
    console.warn(
      `[meta] Diagnostic — pageId reçu : "${pageId}" (longueur ${pageId.length}), codes caractères : ${Array.from(
        pageId
      )
        .map((c) => c.charCodeAt(0))
        .join(',')}`
    )
    if (connectionError) {
      console.error('[meta] Diagnostic — erreur Supabase lors de la recherche de connexion :', connectionError)
    }
    // Diagnostic temporaire : liste tous les page_id existants (avec leur
    // longueur et leurs codes caractères) pour comparer directement côté
    // serveur, sans dépendre de l'affichage de l'éditeur SQL de Supabase
    // (dont on a découvert qu'il pouvait tronquer visuellement les longues
    // chaînes de chiffres sans que la vraie donnée soit affectée).
    const { data: allConnections } = await supabase.from('meta_connections').select('agency_id, page_id')
    console.warn(
      '[meta] Diagnostic — page_id en base :',
      (allConnections ?? [])
        .map(
          (c) =>
            `agency=${c.agency_id} page_id="${c.page_id}" (longueur ${c.page_id.length}, codes ${Array.from(
              c.page_id as string
            )
              .map((ch) => ch.charCodeAt(0))
              .join(',')})`
        )
        .join(' | ')
    )
    return
  }

  const leadData = await fetchLeadData(leadgenId, connection.access_token)
  const { name, email, phone } = mapLeadFields(leadData.fieldData)

  let ownerId: string | null = null
  let ownerName: string | null = null
  let category: string | null = null
  let campaignConfigured = false
  if (leadData.campaignId) {
    const { data: campaignMapping } = await supabase
      .from('meta_campaigns')
      .select('owner_id, target_category')
      .eq('agency_id', connection.agency_id)
      .eq('campaign_id', leadData.campaignId)
      .maybeSingle()
    if (campaignMapping) {
      ownerId = campaignMapping.owner_id
      category = campaignMapping.target_category
      campaignConfigured = true
      if (ownerId) {
        const { data: owner } = await supabase.from('profiles').select('full_name').eq('id', ownerId).maybeSingle()
        ownerName = owner?.full_name || null
      }
    }
  }

  const positions = await initialPositions(supabase, connection.agency_id, category)

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      agency_id: connection.agency_id,
      assigned_to: ownerId,
      name,
      phone,
      email,
      category,
      source: 'Meta Ads',
      campaign: leadData.campaignName || '',
      meta_lead_id: leadData.id,
      meta_campaign_id: leadData.campaignId || '',
      positions,
    })
    .select('id')
    .single()

  if (insertError) {
    // Code 23505 = violation de contrainte unique sur meta_lead_id : ce lead
    // a déjà été créé lors d'une précédente livraison du même événement
    // (Meta redélivre si la réponse a tardé) — ce n'est pas une erreur.
    if (insertError.code === '23505') return
    throw new Error(`Insertion du lead échouée : ${insertError.message}`)
  }
  if (!lead) return

  const title = campaignConfigured
    ? `Nouveau lead Meta — ${leadData.campaignName || 'campagne'}`
    : `Nouveau lead Meta (campagne non configurée) — ${name}`
  const body = campaignConfigured
    ? `${name} a rempli le formulaire "${leadData.campaignName}".`
    : `${name} a rempli un formulaire, mais la campagne "${leadData.campaignName || leadData.campaignId}" n'a pas encore de propriétaire/tableau assigné dans Réglages → Meta Ads.`

  await supabase.from('notifications').insert({
    agency_id: connection.agency_id,
    profile_id: null,
    type: 'lead_meta',
    title,
    body,
    lead_id: lead.id,
  })

  const { data: members } = await supabase
    .from('profiles')
    .select('email')
    .eq('agency_id', connection.agency_id)
    .not('email', 'eq', '')

  const recipients = (members ?? []).map((m) => m.email).filter(Boolean)

  await sendLeadAlertEmail({
    to: recipients,
    leadName: name,
    campaignName: leadData.campaignName || '',
    ownerName: campaignConfigured ? ownerName : null,
    category,
    leadUrl: `${appBaseUrl()}/dashboard/prospects/${lead.id}`,
  })

  await notifyTeamNewLeadWhatsApp(supabase, connection.agency_id, {
    name,
    category,
    source: leadData.campaignName || 'Meta Ads',
  })
}