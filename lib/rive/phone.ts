// Liens "appeler" / "WhatsApp" à un tap depuis un numéro de téléphone saisi
// librement (aucun format imposé au formulaire) — utile surtout sur
// téléphone, où l'agent a le numéro sous les yeux juste avant d'appeler ou
// d'écrire, plutôt que d'avoir à le recopier à la main.

// tel: accepte un numéro local tel quel (l'OS applique ses propres règles de
// composition) — on ne retire que les espaces/points/tirets/parenthèses.
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[\s.\-()]/g, '')}`
}

// wa.me exige en revanche un numéro complet au format international, sans
// "+" ni "00" ni espaces. Les prospects Vendeur/Acheteur/Investisseur France
// sont très majoritairement saisis en format local français (0X XX XX XX
// XX) ; les investisseurs Dubaï/Géorgie sont eux généralement déjà saisis
// avec leur indicatif complet (+971, +995…). Renvoie null si le numéro est
// vide ou trop court pour être un numéro exploitable.
export function waHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null

  if (phone.trim().startsWith('+')) return `https://wa.me/${digits}`
  if (digits.startsWith('00')) return `https://wa.me/${digits.slice(2)}`
  // 0X XX XX XX XX (10 chiffres, commence par 0) : format local français —
  // le plus courant sur le bassin genevois côté français. On ne devine pas
  // au-delà de ce cas précis pour ne pas produire un lien qui compose un
  // faux numéro.
  if (digits.length === 10 && digits.startsWith('0')) return `https://wa.me/33${digits.slice(1)}`

  return `https://wa.me/${digits}`
}