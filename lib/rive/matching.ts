// Moteur de rapprochement acheteur ↔ bien, repris à l'identique du prototype
// Rive : permissif — un critère non renseigné (des deux côtés) est ignoré
// plutôt que traité comme un blocage.

export type MatchLead = {
  id: string
  category: string | null
  budget: number | null
  critere_type: string | null
  critere_lieu: string | null
  surface_min: number | null
  pieces_min: number | null
}

export type MatchMandate = {
  id: string
  type: string
  stage: string
  is_draft: boolean
  signed_date: string | null
  address: string | null
  property_type: string | null
  price: number | null
  surface: number | null
  pieces: number | null
}

// Un bien "actif" : mandat de vente signé, non brouillon, pas encore vendu.
export function bienIsActive(mandate: MatchMandate): boolean {
  return mandate.type === 'vente' && !mandate.is_draft && !!mandate.signed_date && mandate.stage !== 'vendu'
}

function locationTokensMatch(critereLieu: string, address: string): boolean {
  const tokens = critereLieu
    .split(/[,;/]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return true
  const addr = address.toLowerCase()
  return tokens.some((t) => addr.includes(t))
}

export function leadMatchesBien(lead: MatchLead, bien: MatchMandate): boolean {
  if (lead.category !== 'acheteur') return false
  if (!bienIsActive(bien)) return false

  if (lead.budget && bien.price && bien.price > lead.budget) return false
  if (lead.critere_type && bien.property_type && lead.critere_type !== bien.property_type) return false
  if (lead.critere_lieu && bien.address && !locationTokensMatch(lead.critere_lieu, bien.address)) return false
  if (lead.surface_min && bien.surface && bien.surface < lead.surface_min) return false
  if (lead.pieces_min && bien.pieces && bien.pieces < lead.pieces_min) return false

  return true
}

export type MatchPair = { leadId: string; mandateId: string }

export function computeMatchPairs(leads: MatchLead[], mandates: MatchMandate[]): MatchPair[] {
  const buyers = leads.filter((l) => l.category === 'acheteur')
  const activeBiens = mandates.filter(bienIsActive)
  const pairs: MatchPair[] = []
  for (const lead of buyers) {
    for (const bien of activeBiens) {
      if (leadMatchesBien(lead, bien)) pairs.push({ leadId: lead.id, mandateId: bien.id })
    }
  }
  return pairs
}
