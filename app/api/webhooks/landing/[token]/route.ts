// Réception des prospects envoyés par une landing page externe (Netlify ou
// autre) — même finalité que le webhook Meta (app/api/webhooks/meta), mais
// authentifiée par un jeton opaque dans l'URL (comme le flux ICS,
// app/api/ics/[token]) plutôt que par une signature applicative, faute d'un
// équivalent Netlify au flux OAuth de Meta. Chaque landing page a son propre
// jeton ET sa propre catégorie fixe (configurée une fois dans Réglages →
// Publicité & Leads), donc contrairement à Meta il n'y a pas de mapping à
// faire ici : le jeton dit à lui seul l'agence ET le tableau visé.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initialPositions } from '@/lib/rive/pipeline-positions'
import { sendLeadAlertEmail } from '@/lib/rive/email'
import { notifyTeamAlertWhatsApp } from '@/lib/rive/whatsapp-notify'
import { notifyPushTeam } from '@/lib/rive/push-notify'
import { summarizeLeadDetails } from '@/lib/rive/meta'

// La landing page (autre origine, ex. *.netlify.app) appelle ce endpoint
// directement depuis le navigateur du visiteur via fetch() : sans ces
// en-têtes CORS, le navigateur bloquerait la réponse (et Chrome/Firefox
// envoient d'abord une requête OPTIONS de pré-vol, vu le Content-Type JSON).
// Le jeton dans l'URL reste la vraie protection (accès en écriture seule, à
// une seule agence/catégorie) : autoriser toute origine ici est donc sans
// risque, comme pour un simple formulaire de contact public.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: landingPage } = await supabase
    .from('landing_pages')
    .select('id, agency_id, label, category, owner_id')
    .eq('token', token)
    .maybeSingle()

  if (!landingPage) {
    return NextResponse.json({ ok: false, error: 'Lien invalide.' }, { status: 404, headers: CORS_HEADERS })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload invalide (JSON attendu).' }, { status: 400, headers: CORS_HEADERS })
  }

  // Accepte soit prénom/nom séparés (recommandé, c'est le format envoyé par
  // le snippet fourni dans Réglages), soit un champ "name" unique (1er mot →
  // prénom, reste → nom — même convention que la saisie manuelle et le
  // webhook Meta).
  let firstName = str(body.first_name)
  let lastName = str(body.last_name)
  const fullName = str(body.name)
  if (!firstName && !lastName && fullName) {
    const spaceIdx = fullName.indexOf(' ')
    firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName
    lastName = spaceIdx > -1 ? fullName.slice(spaceIdx + 1).trim() : ''
  }
  const phone = str(body.phone)
  const email = str(body.email)

  if (!firstName && !lastName) {
    return NextResponse.json({ ok: false, error: 'Nom du prospect manquant.' }, { status: 400, headers: CORS_HEADERS })
  }
  if (!phone && !email) {
    return NextResponse.json(
      { ok: false, error: 'Au moins un téléphone ou un email est requis.' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const answers = Array.isArray(body.answers)
    ? (body.answers as unknown[])
        .map((a) =>
          a && typeof a === 'object' ? { question: str((a as Record<string, unknown>).question), answer: str((a as Record<string, unknown>).answer) } : null
        )
        .filter((a): a is { question: string; answer: string } => !!a && !!a.question && !!a.answer)
    : []

  const submissionId = str(body.submission_id) || null

  const positions = await initialPositions(supabase, landingPage.agency_id, landingPage.category)

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      agency_id: landingPage.agency_id,
      assigned_to: landingPage.owner_id,
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      category: landingPage.category,
      source: `Landing — ${landingPage.label}`,
      landing_page_id: landingPage.id,
      landing_submission_id: submissionId,
      // Même colonne que les leads Meta (réponses libres du formulaire) —
      // affichée sur la fiche prospect sous un intitulé générique, pas
      // spécifique à Meta (voir prospects/[id]/page.tsx).
      meta_answers: answers,
      positions,
    })
    .select('id')
    .single()

  if (insertError) {
    // Contrainte unique (landing_page_id, landing_submission_id) : ce
    // prospect a déjà été créé (double clic sur "Envoyer" côté visiteur) —
    // pas une erreur.
    if (insertError.code === '23505') return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
    console.error('[landing] Échec de la création du prospect :', insertError)
    return NextResponse.json({ ok: false, error: 'Échec de l’enregistrement.' }, { status: 500, headers: CORS_HEADERS })
  }
  if (!lead) return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })

  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Prospect'

  await supabase.from('notifications').insert({
    agency_id: landingPage.agency_id,
    profile_id: null,
    type: 'lead_landing',
    title: `Nouveau lead — ${landingPage.label}`,
    body: `${name} a rempli le formulaire de la landing page "${landingPage.label}".`,
    lead_id: lead.id,
  })

  const { data: members } = await supabase
    .from('profiles')
    .select('email')
    .eq('agency_id', landingPage.agency_id)
    .not('email', 'eq', '')
  const recipients = (members ?? []).map((m) => m.email).filter(Boolean)

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  let ownerName: string | null = null
  if (landingPage.owner_id) {
    const { data: owner } = await supabase.from('profiles').select('full_name').eq('id', landingPage.owner_id).maybeSingle()
    ownerName = owner?.full_name || null
  }

  await sendLeadAlertEmail({
    to: recipients,
    leadName: name,
    source: landingPage.label,
    ownerName,
    category: landingPage.category,
    leadUrl: `${appUrl}/dashboard/prospects/${lead.id}`,
  })

  const details = summarizeLeadDetails('', '', answers)
  await notifyTeamAlertWhatsApp(
    supabase,
    landingPage.agency_id,
    `Nouveau prospect — ${name}`,
    `Source : ${landingPage.label}\n${details}`
  )
  await notifyPushTeam(supabase, landingPage.agency_id, 'nouveau_prospect', {
    title: 'Nouveau prospect',
    body: `${name} — ${landingPage.label}`,
    url: `${appUrl}/dashboard/prospects/${lead.id}`,
  })

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
}