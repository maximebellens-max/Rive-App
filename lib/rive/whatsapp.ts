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
function whatsappCredentials(): { accessToken: string; phoneNumberId: string } | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) return null
  return { accessToken, phoneNumberId }
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  params,
}: {
  to: string
  templateName: string
  params: string[]
}): Promise<void> {
  const creds = whatsappCredentials()
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
          ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
          : [],
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error(`[whatsapp] Échec de l'envoi du message "${templateName}" (${res.status}). ${detail}`)
  }
}