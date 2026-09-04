import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  appBaseUrl,
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  fetchAdAccounts,
  fetchUserPages,
  subscribePageToLeadgen,
} from '@/lib/rive/meta'

function redirectToSettings(message: { meta?: string; meta_error?: string }) {
  const url = new URL('/dashboard/settings', appBaseUrl())
  for (const [key, value] of Object.entries(message)) {
    if (value) url.searchParams.set(key, value)
  }
  const response = NextResponse.redirect(url)
  response.cookies.delete('meta_oauth_state')
  return response
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error_description') || searchParams.get('error')

  if (oauthError) {
    return redirectToSettings({ meta_error: `Autorisation refusée côté Meta : ${oauthError}` })
  }

  const expectedState = request.cookies.get('meta_oauth_state')?.value
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToSettings({ meta_error: "Requête invalide ou expirée, réessaie depuis les réglages." })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return redirectToSettings({ meta_error: 'Session expirée, reconnecte-toi puis réessaie.' })

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  if (!profile?.agency_id) return redirectToSettings({ meta_error: 'Session expirée, reconnecte-toi puis réessaie.' })

  try {
    const shortLived = await exchangeCodeForUserToken(code)
    const longLived = await exchangeForLongLivedToken(shortLived.access_token)

    const [pages, adAccounts] = await Promise.all([
      fetchUserPages(longLived.access_token),
      fetchAdAccounts(longLived.access_token),
    ])

    if (!pages.length) {
      return redirectToSettings({
        meta_error:
          "Aucune Page Facebook trouvée sur ce compte. Vérifie que tu es bien administrateur de la Page qui diffuse les publicités.",
      })
    }
    if (!adAccounts.length) {
      return redirectToSettings({
        meta_error: 'Aucun compte publicitaire trouvé sur ce compte Meta.',
      })
    }

    // Hevrest n'a qu'une seule Page : on la prend directement. Pour le
    // compte publicitaire en revanche, une personne peut avoir accès à
    // plusieurs comptes Meta (pro, perso, anciens comptes...) — on ne peut
    // pas deviner le bon. On prend le premier par défaut (cas le plus
    // courant : un seul compte), mais on garde la liste complète pour
    // permettre de corriger le choix depuis Réglages sans reconnexion.
    const page = pages[0]
    const adAccount = adAccounts[0]

    await subscribePageToLeadgen(page.id, page.access_token)

    const { error: upsertError } = await supabase.from('meta_connections').upsert(
      {
        agency_id: profile.agency_id,
        connected_by: user.id,
        ad_account_id: adAccount.id,
        ad_account_name: adAccount.name,
        available_ad_accounts: adAccounts.map((a) => ({ id: a.id, name: a.name })),
        page_id: page.id,
        page_name: page.name,
        access_token: page.access_token,
        // Jeton utilisateur longue durée (~60 jours) — distinct du jeton de
        // Page ci-dessus : c'est lui qui porte la permission ads_read, donc
        // celui à utiliser pour lister les campagnes d'un compte
        // publicitaire (voir syncMetaCampaigns dans app/actions/meta.ts).
        user_access_token: longLived.access_token,
        token_expires_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'agency_id' }
    )

    if (upsertError) {
      return redirectToSettings({ meta_error: "Connexion réussie côté Meta mais échec de l'enregistrement — réessaie." })
    }

    return redirectToSettings({ meta: 'connected' })
  } catch (err) {
    console.error('[meta] Échec de la connexion OAuth :', err)
    return redirectToSettings({ meta_error: 'Une erreur est survenue pendant la connexion à Meta. Réessaie.' })
  }
}