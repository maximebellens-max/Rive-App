// Envoi de messages WhatsApp via l'API Cloud de Meta (WhatsApp Business
// Platform) — pour l'instant réservé aux alertes internes à l'équipe. Comme
// pour Resend (lib/rive/email.ts), si les identifiants ne sont pas
// configurés, l'envoi est simplement ignoré (log serveur) plutôt que de
// faire échouer l'action qui a déclenché l'alerte.
//
// Contrainte importante de la plateforme WhatsApp : en dehors d'une
// conversation initiée par le destinataire dans les 24h précédentes, seul
// l'envoi d'un modèle ("template") pré-approuvé par Meta est autorisé — pas
// de texte libre. Les modèles utilisés par Rive sont documentés dans le
// guide de dépôt correspondant.
// Le numéro d'expéditeur (Phone Number ID) peut être propre à l'agent qui
// déclenche l'envoi (voir lib/rive/whatsapp-notify.ts) — s'il n'en a pas
// configuré un dans Réglages, on retombe sur le numéro partagé de l'agence.
// Les deux restent rattachés au même compte WhatsApp Business (WABA), donc
// au même jeton d'accès : pas besoin d'un jeton différent par numéro.
function whatsappCredentials(phoneNumberId?: string): { accessToken: string; phoneNumberId: string } | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const resolvedPhoneNumberId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !resolvedPhoneNumberId) return null
  return { accessToken, phoneNumberId: resolvedPhoneNumberId }
}

// Meta rejette un paramètre de gabarit contenant un retour à la ligne (ou
// plus de 4 espaces/tabulations d'affilée) — l'envoi échoue net (erreur
// renvoyée par l'API, jamais visible côté destinataire, seulement dans les
// logs serveur). "rive_alerte" est le seul gabarit dont le corps combine
// plusieurs lignes (détails d'un lead Meta, texte + lien sur sa propre
// ligne...) : on remplace ici les retours à la ligne par un séparateur
// lisible plutôt que de compter sur chaque appelant pour y penser.
function sanitizeTemplateParam(text: string): string {
  return text
    .replace(/\s*[\r\n]+\s*/g, ' · ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  params,
  phoneNumberId,
}: {
  to: string
  templateName: string
  params: string[]
  phoneNumberId?: string
}): Promise<void> {
  const creds = whatsappCredentials(phoneNumberId)
  if (!creds || !to) {
    console.warn(
      `[whatsapp] Message "${templateName}" non envoyé (identifiants WhatsApp manquants ou destinataire vide).`
    )
    return
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'fr' },
        components: params.length
          ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: sanitizeTemplateParam(text) })) }]
          : [],
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error(`[whatsapp] Échec de l'envoi du message "${templateName}" (${res.status}). ${detail}`)
  }
}

// Contrairement à sendWhatsAppTemplate ci-dessus (qui ne doit jamais faire
// échouer le traitement d'un événement réel), cette fonction sert uniquement
// au bouton de test dans Réglages : elle renvoie explicitement ce qui a
// bloqué (identifiants manquants, numéro non renseigné, gabarit refusé par
// Meta...) pour diagnostiquer sans attendre un vrai lead/rendez-vous.
export async function sendTestWhatsAppTemplate(
  to: string,
  phoneNumberId?: string
): Promise<{ ok: boolean; error?: string }> {
  const creds = whatsappCredentials(phoneNumberId)
  if (!creds) {
    return {
      ok: false,
      error: 'WHATSAPP_ACCESS_TOKEN et/ou WHATSAPP_PHONE_NUMBER_ID manquants dans les variables d’environnement Vercel.',
    }
  }
  if (!to) return { ok: false, error: 'Aucun numéro WhatsApp enregistré pour toi dans Réglages.' }

  const res = await fetch(`https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'rive_nouveau_lead',
        language: { code: 'fr' },
        components: [
          {
            type: 'body',
            parameters: ['Test Rive', 'Vendeur', 'Test manuel'].map((text) => ({ type: 'text', text })),
          },
        ],
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return { ok: false, error: `Meta a refusé l’envoi (${res.status}). ${detail}` }
  }
  return { ok: true }
}
