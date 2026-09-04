// Envoi d'emails d'alerte via Resend (resend.com) — utilisé uniquement pour
// prévenir l'agence d'un nouveau lead Meta pour l'instant. Si RESEND_API_KEY
// n'est pas configurée, l'envoi est simplement ignoré (log serveur) plutôt
// que de faire échouer tout le traitement du webhook : recevoir le lead dans
// le CRM ne doit jamais dépendre de l'email.
async function resendApiKey(): Promise<string | null> {
  return process.env.RESEND_API_KEY || null
}

export async function sendLeadAlertEmail({
  to,
  leadName,
  campaignName,
  ownerName,
  category,
  leadUrl,
}: {
  to: string[]
  leadName: string
  campaignName: string
  ownerName: string | null
  category: string | null
  leadUrl: string
}): Promise<void> {
  const apiKey = await resendApiKey()
  if (!apiKey || to.length === 0) {
    console.warn('[meta] Email d’alerte non envoyé (RESEND_API_KEY manquante ou aucun destinataire).')
    return
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Rive <onboarding@resend.dev>'
  const categoryLabel =
    category === 'acheteur' ? 'Acheteurs' : category === 'vendeur' ? 'Vendeurs' : category === 'investisseur' ? 'Investisseurs' : null

  const subject = `Nouveau lead Meta — ${leadName}`
  const html = `
    <div style="font-family: -apple-system, sans-serif; color: #2b2b28; max-width: 480px;">
      <h2 style="margin: 0 0 12px;">Nouveau lead Meta Ads</h2>
      <p style="margin: 0 0 8px;"><strong>${leadName}</strong> vient de remplir un formulaire publicitaire.</p>
      <table style="margin: 16px 0; font-size: 14px;">
        <tr><td style="color:#6b6a64; padding-right: 12px;">Campagne</td><td>${campaignName || '—'}</td></tr>
        ${ownerName ? `<tr><td style="color:#6b6a64; padding-right: 12px;">Propriétaire</td><td>${ownerName}</td></tr>` : ''}
        ${categoryLabel ? `<tr><td style="color:#6b6a64; padding-right: 12px;">Tableau</td><td>${categoryLabel}</td></tr>` : ''}
      </table>
      <a href="${leadUrl}" style="display:inline-block; background:#1f6f5c; color:white; padding:10px 18px; border-radius:8px; text-decoration:none; font-size:14px;">
        Voir le prospect dans Rive
      </a>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    console.error(`[meta] Échec de l'envoi de l'email d'alerte (${res.status}).`)
  }
}

// Alerte email quand un rapprochement acheteur ↔ bien apparaît (voir
// lib/rive/match-notify.ts) — même politique que sendLeadAlertEmail : pas de
// clé Resend ou aucun destinataire, on log et on continue sans faire échouer
// l'action serveur qui a déclenché la notification.
export async function sendMatchAlertEmail({
  to,
  title,
  body,
  url,
}: {
  to: string[]
  title: string
  body: string
  url: string
}): Promise<void> {
  const apiKey = await resendApiKey()
  if (!apiKey || to.length === 0) {
    console.warn('[matching] Email d’alerte non envoyé (RESEND_API_KEY manquante ou aucun destinataire).')
    return
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Rive <onboarding@resend.dev>'

  const html = `
    <div style="font-family: -apple-system, sans-serif; color: #2b2b28; max-width: 480px;">
      <h2 style="margin: 0 0 12px;">${title}</h2>
      ${body ? `<p style="margin: 0 0 16px; color:#6b6a64;">${body}</p>` : ''}
      <a href="${url}" style="display:inline-block; background:#1f6f5c; color:white; padding:10px 18px; border-radius:8px; text-decoration:none; font-size:14px;">
        Voir dans Rive
      </a>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject: title, html }),
  })

  if (!res.ok) {
    console.error(`[matching] Échec de l'envoi de l'email d'alerte (${res.status}).`)
  }
}