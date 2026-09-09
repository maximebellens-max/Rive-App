// Intégration Meta Lead Ads : tous les appels à l'API Graph de Meta
// (échange de jetons, récupération des Pages/comptes publicitaires/
// campagnes/leads) et la vérification de signature des webhooks entrants.
//
// Documentation Meta pertinente :
// - OAuth : https://developers.facebook.com/docs/facebook-login/guides/access-tokens
// - Lead Ads : https://developers.facebook.com/docs/marketing-api/guides/lead-ads
// - Webhooks : https://developers.facebook.com/docs/graph-api/webhooks

import { createHmac, timingSafeEqual } from 'crypto'

const GRAPH_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} manquante (à ajouter dans les variables d'environnement).`)
  return v
}

export function metaAppId(): string {
  return requireEnv('META_APP_ID')
}

// URL de base publique de l'app (ex. https://rive.hevrest.com), utilisée pour
// construire les URLs de redirection OAuth et de callback webhook.
export function appBaseUrl(): string {
  return requireEnv('NEXT_PUBLIC_APP_URL').replace(/\/$/, '')
}

// Scopes nécessaires : ads_read (lister campagnes), leads_retrieval
// (récupérer le détail d'un lead), pages_show_list + pages_manage_metadata
// (lister les Pages et s'abonner à leur webhook leadgen), pages_read_engagement
// (exigée par Meta pour la récupération des prospects — sans elle l'outil de
// diagnostic de Meta signale "Missing 'pages_read_engagement' permission" et
// bloque la remontée des leads, même avec leads_retrieval déjà présent).
const OAUTH_SCOPES = [
  'ads_read',
  'leads_retrieval',
  'pages_show_list',
  'pages_manage_metadata',
  'pages_read_engagement',
  'business_management',
].join(',')

export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: metaAppId(),
    redirect_uri: `${appBaseUrl()}/api/auth/meta/callback`,
    scope: OAUTH_SCOPES,
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`
}

type GraphTokenResponse = { access_token: string; token_type?: string; expires_in?: number }

export async function exchangeCodeForUserToken(code: string): Promise<GraphTokenResponse> {
  const params = new URLSearchParams({
    client_id: metaAppId(),
    client_secret: requireEnv('META_APP_SECRET'),
    redirect_uri: `${appBaseUrl()}/api/auth/meta/callback`,
    code,
  })
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`)
  if (!res.ok) throw new Error(`Échange du code OAuth refusé par Meta (${res.status}).`)
  return res.json()
}

// Le jeton utilisateur court (1-2h) est échangé contre un jeton long (~60
// jours). Les jetons de Page dérivés d'un jeton utilisateur long ne suivent
// pas cette expiration tant que l'utilisateur garde son rôle sur la Page.
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<GraphTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: metaAppId(),
    client_secret: requireEnv('META_APP_SECRET'),
    fb_exchange_token: shortLivedToken,
  })
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`)
  if (!res.ok) throw new Error(`Échange du jeton longue durée refusé par Meta (${res.status}).`)
  return res.json()
}

export type MetaPage = { id: string; name: string; access_token: string }

export async function fetchUserPages(userAccessToken: string): Promise<MetaPage[]> {
  const params = new URLSearchParams({ access_token: userAccessToken, fields: 'id,name,access_token' })
  const res = await fetch(`${GRAPH_BASE}/me/accounts?${params.toString()}`)
  if (!res.ok) throw new Error(`Impossible de lister les Pages Facebook (${res.status}).`)
  const data = await res.json()
  return data.data ?? []
}

export type MetaAdAccount = { id: string; account_id: string; name: string }

export async function fetchAdAccounts(userAccessToken: string): Promise<MetaAdAccount[]> {
  const params = new URLSearchParams({ access_token: userAccessToken, fields: 'id,account_id,name' })
  const res = await fetch(`${GRAPH_BASE}/me/adaccounts?${params.toString()}`)
  if (!res.ok) throw new Error(`Impossible de lister les comptes publicitaires (${res.status}).`)
  const data = await res.json()
  return data.data ?? []
}

// Abonne la Page aux événements "leadgen" : sans cet appel, Meta ne notifie
// jamais le webhook, même si l'app y est techniquement abonnée globalement.
export async function subscribePageToLeadgen(pageId: string, pageAccessToken: string): Promise<void> {
  const params = new URLSearchParams({ subscribed_fields: 'leadgen', access_token: pageAccessToken })
  const res = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps?${params.toString()}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Impossible d'abonner la Page aux nouveaux leads (${res.status}).`)
}

// Rien dans Rive ne revérifiait jamais après coup que la Page restait
// abonnée aux événements leadgen (l'abonnement peut se rompre si le jeton
// de Page est invalidé par Meta après la connexion initiale, sans qu'on en
// soit prévenu autrement qu'en constatant l'absence de leads). Cette
// fonction lit l'état réel de l'abonnement côté Meta, pour un bouton de
// vérification manuelle dans Réglages.
export async function isPageSubscribedToLeadgen(pageId: string, pageAccessToken: string): Promise<boolean> {
  const params = new URLSearchParams({ access_token: pageAccessToken })
  const res = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps?${params.toString()}`)
  if (!res.ok) throw new Error(`Impossible de lire l'état de l'abonnement (${res.status}).`)
  const data = await res.json()
  const apps = (data.data ?? []) as { subscribed_fields?: string[] }[]
  return apps.some((a) => a.subscribed_fields?.includes('leadgen'))
}

// "status" est le statut CONFIGURÉ de la campagne (marche/arrêt manuel côté
// annonceur). On pourrait croire que "effective_status" (fourni par Meta
// directement sur l'objet Campaign) suffit à connaître le statut réel de
// diffusion — mais Meta ne le fait PAS redescendre depuis les ad sets : le
// effective_status d'une campagne ne reflète que son propre interrupteur
// (+ les états de revue comme PENDING_REVIEW/DISAPPROVED). Une campagne
// peut donc rester "effective_status: ACTIVE" au niveau campagne alors
// qu'aucun de ses ad sets ne délivre réellement (tous mis en pause
// individuellement, ou plus aucune planification active) — c'est
// exactement le cas observé chez Hevrest. On calcule donc nous-mêmes le
// vrai statut de diffusion en regardant l'état de chaque ad set de la
// campagne, et c'est CETTE valeur recalculée qui est exposée ci-dessous
// sous le nom effective_status (le champ brut renvoyé par Meta n'est pas
// utile en soi, seulement comme repli si la campagne n'a aucun ad set).
export type MetaCampaign = {
  id: string
  name: string
  status: string
  effective_status: string
  created_time: string | null
}

type RawMetaAdSetStatus = { effective_status: string }
type RawMetaCampaign = {
  id: string
  name: string
  status: string
  effective_status: string
  created_time: string | null
  adsets?: { data: RawMetaAdSetStatus[] }
}

// Quand aucun ad set n'est réellement actif, on essaie de remonter le
// sous-statut le plus parlant plutôt qu'un "en pause" générique — utile
// pour repérer une campagne bloquée en revue ou refusée par Meta.
const ADSET_STATUS_PRIORITY = [
  'WITH_ISSUES',
  'DISAPPROVED',
  'PENDING_REVIEW',
  'PENDING_BILLING_INFO',
  'IN_PROCESS',
  'PREAPPROVED',
]

function resolveCampaignDeliveryStatus(c: RawMetaCampaign): string {
  const adsets = c.adsets?.data ?? []
  if (adsets.some((a) => a.effective_status === 'ACTIVE')) return 'ACTIVE'
  for (const s of ADSET_STATUS_PRIORITY) {
    if (adsets.some((a) => a.effective_status === s)) return s
  }
  if (!adsets.length) {
    // Aucun ad set du tout : rien ne peut diffuser, quel que soit
    // l'interrupteur de la campagne — sauf si elle est explicitement
    // archivée/supprimée, statut qu'on garde tel quel car plus parlant.
    return c.effective_status === 'ARCHIVED' || c.effective_status === 'DELETED' ? c.effective_status : 'PAUSED'
  }
  return 'PAUSED'
}

// Cache léger (Data Cache de Next.js, cf. option next.revalidate) sur les
// deux appels utilisés par la page Campagnes (voir app/dashboard/campaigns) :
// évite de refaire un aller-retour vers l'API Meta à chaque chargement/
// rechargement de la page, tout en gardant des chiffres à jour à quelques
// minutes près — largement suffisant pour du suivi de performance publicitaire.
const CAMPAIGNS_CACHE_SECONDS = 300

export async function fetchCampaigns(adAccountId: string, accessToken: string): Promise<MetaCampaign[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,status,effective_status,created_time,adsets.limit(500){effective_status}',
    limit: '200',
  })
  const res = await fetch(`${GRAPH_BASE}/${adAccountId}/campaigns?${params.toString()}`, {
    next: { revalidate: CAMPAIGNS_CACHE_SECONDS },
  })
  if (!res.ok) throw new Error(`Impossible de récupérer les campagnes (${res.status}).`)
  const data = await res.json()
  const rawCampaigns = (data.data ?? []) as RawMetaCampaign[]
  return rawCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    effective_status: resolveCampaignDeliveryStatus(c),
    created_time: c.created_time ?? null,
  }))
}

// Fenêtres de date supportées côté page Campagnes — reprennent telles
// quelles les valeurs de "date_preset" acceptées par l'API Insights de Meta.
export type MetaDatePreset = 'yesterday' | 'last_7d' | 'last_30d'

export type MetaCampaignInsight = {
  campaignId: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  reach: number
}

type RawMetaInsight = {
  campaign_id: string
  spend?: string
  impressions?: string
  clicks?: string
  ctr?: string
  cpc?: string
  reach?: string
}

// Performance publicitaire (dépense, impressions, clics...) par campagne, sur
// une fenêtre de date donnée — endpoint Insights de l'API Marketing, distinct
// de fetchCampaigns() ci-dessus qui ne renvoie que le nom/statut. Porté par
// le même jeton utilisateur (permission ads_read). Tous les champs numériques
// reviennent en chaîne de caractères côté Meta, d'où la conversion Number().
export async function fetchCampaignInsights(
  adAccountId: string,
  accessToken: string,
  datePreset: MetaDatePreset
): Promise<MetaCampaignInsight[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    level: 'campaign',
    date_preset: datePreset,
    fields: 'campaign_id,spend,impressions,clicks,ctr,cpc,reach',
    limit: '200',
  })
  const res = await fetch(`${GRAPH_BASE}/${adAccountId}/insights?${params.toString()}`, {
    next: { revalidate: CAMPAIGNS_CACHE_SECONDS },
  })
  if (!res.ok) throw new Error(`Impossible de récupérer les performances des campagnes (${res.status}).`)
  const data = await res.json()
  const rows = (data.data ?? []) as RawMetaInsight[]
  return rows.map((r) => ({
    campaignId: r.campaign_id,
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    ctr: Number(r.ctr ?? 0),
    cpc: Number(r.cpc ?? 0),
    reach: Number(r.reach ?? 0),
  }))
}

export type MetaLeadData = {
  id: string
  createdTime: string | null
  campaignId: string | null
  campaignName: string | null
  formId: string | null
  fieldData: { name: string; values: string[] }[]
}

export async function fetchLeadData(leadgenId: string, pageAccessToken: string): Promise<MetaLeadData> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    fields: 'id,created_time,campaign_id,campaign_name,form_id,field_data',
  })
  const res = await fetch(`${GRAPH_BASE}/${leadgenId}?${params.toString()}`)
  if (!res.ok) throw new Error(`Impossible de récupérer le détail du lead ${leadgenId} (${res.status}).`)
  const data = await res.json()
  return {
    id: data.id,
    createdTime: data.created_time ?? null,
    campaignId: data.campaign_id ?? null,
    campaignName: data.campaign_name ?? null,
    formId: data.form_id ?? null,
    fieldData: data.field_data ?? [],
  }
}

// Les formulaires Meta n'ont pas de schéma fixe : les questions standard
// ("full_name", "email", "phone_number") gardent ce nom technique quelle que
// soit la langue affichée à l'utilisateur, mais un champ personnalisé peut
// porter n'importe quel nom. On reconnaît d'abord les clés standard, puis on
// retombe sur une correspondance approximative par mot-clé. On renvoie le
// champ entier (pas seulement sa valeur) pour pouvoir ensuite l'exclure des
// réponses "personnalisées" ci-dessous, sans le dupliquer à l'affichage.
type FieldEntry = MetaLeadData['fieldData'][number]

function findField(fieldData: FieldEntry[], exactKeys: string[], keywords: string[]): FieldEntry | undefined {
  for (const key of exactKeys) {
    const match = fieldData.find((f) => f.name.toLowerCase() === key)
    if (match?.values?.[0]) return match
  }
  for (const kw of keywords) {
    const match = fieldData.find((f) => f.name.toLowerCase().includes(kw))
    if (match?.values?.[0]) return match
  }
  return undefined
}

// Un champ personnalisé Meta porte souvent un nom technique dérivé de la
// question (ex. "de_quel_bien_s_agit_il") plutôt que la question elle-même.
// On le rend lisible du mieux possible pour l'affichage — approximatif, mais
// ça évite de devoir maintenir une correspondance figée par question, qui
// casserait dès qu'Hevrest modifie un formulaire existant ou en crée un
// nouveau (ce qui arrive déjà : deux formulaires différents sont utilisés,
// avec un ordre et un jeu de questions différents).
function prettifyFieldName(name: string): string {
  const spaced = name.replace(/[_-]+/g, ' ').trim().replace(/\s+/g, ' ')
  if (!spaced) return name
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export type MetaLeadDetails = {
  name: string
  email: string
  phone: string
  criterType: string
  criterLieu: string
  // Toute réponse du formulaire qui n'est ni les coordonnées ni le type/lieu
  // du bien (ex. budget indiqué, bien déjà en vente ou non, délai souhaité)
  // — conservée telle quelle, question par question, pour ne perdre aucune
  // information utile même sur un formulaire jamais vu auparavant.
  customAnswers: { question: string; answer: string }[]
}

export function mapLeadFields(fieldData: MetaLeadData['fieldData']): MetaLeadDetails {
  const fullNameField = findField(fieldData, ['full_name'], ['full_name', 'nom_complet'])
  const firstNameField = findField(fieldData, ['first_name'], ['first_name', 'prenom', 'prénom'])
  const lastNameField = findField(fieldData, ['last_name'], ['last_name', 'nom_de_famille'])
  const emailField = findField(fieldData, ['email'], ['email', 'mail'])
  const phoneField = findField(fieldData, ['phone_number'], ['phone', 'tel', 'téléphone'])
  // "de quel bien s'agit-il" / "où est-il situé (ville)" : questions
  // présentes sur les deux formulaires actuellement utilisés par Hevrest,
  // reconnues par mot-clé pour alimenter directement les champs Critères
  // déjà existants sur la fiche prospect (type de bien / secteur).
  const typeField = findField(fieldData, [], ['type_de_bien', 'quel_bien', 'de_bien', 'bien_s_agit', 'bien_agit'])
  const lieuField = findField(fieldData, [], ['ville', 'situe', 'localisation', 'secteur'])

  const consumed = new Set(
    [fullNameField, firstNameField, lastNameField, emailField, phoneField, typeField, lieuField].filter(
      (f): f is FieldEntry => Boolean(f)
    )
  )

  const fullName = fullNameField?.values?.[0] || ''
  const firstName = firstNameField?.values?.[0] || ''
  const lastName = lastNameField?.values?.[0] || ''
  const name = fullName || [firstName, lastName].filter(Boolean).join(' ') || 'Lead Meta sans nom'

  const email = emailField?.values?.[0] || ''
  const phone = phoneField?.values?.[0] || ''
  const criterType = typeField?.values?.[0] || ''
  const criterLieu = lieuField?.values?.[0] || ''

  const customAnswers = fieldData
    .filter((f) => !consumed.has(f) && f.values?.[0])
    .map((f) => ({ question: prettifyFieldName(f.name), answer: f.values[0] }))

  return { name, email, phone, criterType, criterLieu, customAnswers }
}

// Résumé compact des critères d'un lead Meta (type de bien, secteur, et
// toutes les réponses complémentaires du formulaire — budget, délai, bien
// déjà en vente...) pour l'alerte WhatsApp enrichie envoyée à l'arrivée
// d'un nouveau lead : de quoi juger en un coup d'œil si ça vaut le coup de
// rappeler tout de suite, sans avoir à ouvrir la fiche.
export function summarizeLeadDetails(
  criterType: string,
  criterLieu: string,
  customAnswers: { question: string; answer: string }[]
): string {
  const lines: string[] = []
  if (criterType) lines.push(`Type de bien : ${criterType}`)
  if (criterLieu) lines.push(`Secteur : ${criterLieu}`)
  for (const qa of customAnswers) {
    lines.push(`${qa.question} : ${qa.answer}`)
  }
  return lines.length ? lines.join('\n') : 'Aucun détail complémentaire renseigné sur le formulaire.'
}

// Vérifie l'en-tête X-Hub-Signature-256 que Meta ajoute à chaque appel
// webhook, calculé côté Meta comme un HMAC-SHA256 du corps brut de la
// requête avec l'App Secret. Sans cette vérification, n'importe qui
// connaissant l'URL du webhook pourrait injecter de faux leads.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', requireEnv('META_APP_SECRET')).update(rawBody, 'utf8').digest('hex')
  const provided = signatureHeader.slice('sha256='.length)
  const expectedBuf = Buffer.from(expected, 'hex')
  const providedBuf = Buffer.from(provided, 'hex')
  if (expectedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}

export type MetaWebhookLeadgenChange = {
  pageId: string
  leadgenId: string
  formId: string
}

// Parse le corps JSON d'un événement webhook "page" / "leadgen" en une liste
// à plat d'événements exploitables — un seul appel HTTP de Meta peut en
// regrouper plusieurs (plusieurs Pages, plusieurs leads).
export function parseWebhookLeadgenChanges(body: unknown): MetaWebhookLeadgenChange[] {
  const changes: MetaWebhookLeadgenChange[] = []
  const entries = (body as { entry?: unknown[] })?.entry
  if (!Array.isArray(entries)) return changes

  for (const entry of entries) {
    const pageId = (entry as { id?: string })?.id
    const entryChanges = (entry as { changes?: unknown[] })?.changes
    if (!pageId || !Array.isArray(entryChanges)) continue

    for (const change of entryChanges) {
      const field = (change as { field?: string })?.field
      const value = (change as { value?: { leadgen_id?: string; form_id?: string } })?.value
      if (field !== 'leadgen' || !value?.leadgen_id) continue
      changes.push({ pageId, leadgenId: value.leadgen_id, formId: value.form_id ?? '' })
    }
  }

  return changes
}